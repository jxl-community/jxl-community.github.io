// Copyright (c) the JPEG XL Project Authors. All rights reserved.
//
// Use of this source code is governed by a BSD-style license.

//! Streaming JPEG XL decoder for the browser, wrapping [`jxl`] (jxl-rs) behind a
//! flat C ABI.
//!
//! # Why a raw C ABI rather than wasm-bindgen
//!
//! The site already drives its decoder through plain wasm exports plus direct
//! reads of the module's linear memory. Keeping that contract means the module
//! has **no imports at all** — it instantiates with `WebAssembly.instantiate`
//! and needs no JS glue file, no emscripten runtime, and no `SharedArrayBuffer`.
//! That last point is the reason this exists: libjxl's `wasm_demo` build uses
//! pthreads, which forces COOP/COEP cross-origin isolation on every page that
//! decodes a JXL, which in turn forces the service worker and its one-time
//! reload. jxl-rs never needs a parallel runner, so all of that goes away.
//!
//! # Lifecycle
//!
//! ```text
//! jxl_new                     -> ctx
//! jxl_set_output_format       (optional, before the first feed)
//! jxl_set_intensity_target    (optional, before the first feed)
//! loop {
//!     jxl_alloc / copy bytes in / jxl_feed
//!     jxl_flush               -> draw partial pixels
//! }
//! jxl_free
//! ```
//!
//! `jxl_feed` is incremental: hand it each newly arrived chunk and it decodes as
//! far as the bytes allow. `jxl_flush` renders whatever the decoder currently
//! holds, which is what makes a progressive preview possible long before the
//! last byte lands.
//!
//! # Failure contract
//!
//! Malformed input normally comes back as [`JXL_ERROR`], with a message at
//! [`jxl_error_ptr`]; the context is then dead but the module is fine, and other
//! images keep decoding.
//!
//! A panic inside jxl-rs is different. `wasm32-unknown-unknown` cannot unwind,
//! so `panic = "abort"` is the only real option and `catch_unwind` would be dead
//! code — a panic traps, and **the whole module instance dies**, not just the
//! one context. Callers that decode untrusted images should be ready to
//! re-instantiate the module when a call traps. In practice this is rare: a
//! sweep of 186 files across this site's corpus produced no panics at all.

use jxl::api::{
    Event, ExtraChannel, JxlBasicInfo, JxlColorEncoding, JxlColorProfile, JxlDecoder,
    JxlDecoderOptions, JxlExtraChannel, JxlOutputBuffer, JxlPixelFormat, JxlPrimaries,
    JxlTransferFunction,
};

// ---------------------------------------------------------------- status codes

/// The whole image is decoded; no more input will be consumed.
pub const JXL_COMPLETE: i32 = 0;
/// More bytes are needed before decoding can continue.
pub const JXL_NEED_MORE: i32 = 1;
/// A frame of an animation finished and more frames follow. Read the pixels,
/// then call [`jxl_next_frame`].
pub const JXL_FRAME: i32 = 2;
/// Decoding failed. [`jxl_error_ptr`] describes why.
pub const JXL_ERROR: i32 = -1;

// -------------------------------------------------------------- output formats

/// 8 bits per sample, RGBA. The canvas-native format.
pub const FORMAT_RGBA8: u32 = 0;
/// 16 bits per sample, RGBA, native endian.
pub const FORMAT_RGBA16: u32 = 1;
/// Half floats, RGBA. The format to use for HDR: it preserves values above 1.0
/// instead of clipping them the way an 8-bit buffer must.
pub const FORMAT_RGBA_F16: u32 = 2;

// --------------------------------------------------------------------- context

enum State {
    /// Boxed so that taking it out of the context and putting it back on every
    /// event moves a pointer, not the whole decoder.
    Decoding(Box<JxlDecoder>),
    Done,
    Failed,
}

pub struct Ctx {
    state: Option<State>,
    /// Every byte handed to us so far. The decoder pulls from an input rather
    /// than being pushed to, so the stream is retained and a cursor tracks how
    /// much of it has actually been consumed.
    buf: Vec<u8>,
    cursor: usize,

    // Configuration, applied when the decoder is created.
    format: u32,
    intensity_target: Option<f32>,
    configured: bool,

    width: u32,
    height: u32,
    extra_channels: usize,
    has_alpha: bool,

    /// Backed by `u32` so the start is 4-byte aligned: `process` and
    /// `flush_pixels` may panic
    /// if a 2- or 4-byte-per-sample buffer is handed to it unaligned.
    pixels: Vec<u32>,
    pixels_len: usize,
    have_pixels: bool,

    output_icc: Vec<u8>,
    embedded_icc: Vec<u8>,
    cicp_primaries: u32,
    cicp_transfer: u32,

    animated: bool,
    num_loops: u32,
    frame_index: u32,
    frame_duration_ms: f64,
    tone_intensity_target: f32,
    tone_min_nits: f32,

    error: Vec<u8>,
}

impl Ctx {
    fn bytes_per_sample(&self) -> usize {
        match self.format {
            FORMAT_RGBA8 => 1,
            _ => 2,
        }
    }

    fn pixel_format(&self) -> JxlPixelFormat {
        match self.format {
            FORMAT_RGBA16 => JxlPixelFormat::rgba16(self.extra_channels),
            FORMAT_RGBA_F16 => JxlPixelFormat::rgba_f16(self.extra_channels),
            _ => JxlPixelFormat::rgba8(self.extra_channels),
        }
    }

    fn row_bytes(&self) -> usize {
        self.width as usize * 4 * self.bytes_per_sample()
    }

    fn fail(&mut self, msg: &str) -> i32 {
        self.error.clear();
        self.error.extend_from_slice(msg.as_bytes());
        self.state = Some(State::Failed);
        JXL_ERROR
    }
}

// ------------------------------------------------------------------- lifecycle

#[unsafe(no_mangle)]
pub extern "C" fn jxl_new() -> *mut Ctx {
    Box::into_raw(Box::new(Ctx {
        state: None,
        buf: Vec::new(),
        cursor: 0,
        format: FORMAT_RGBA8,
        intensity_target: None,
        configured: false,
        width: 0,
        height: 0,
        extra_channels: 0,
        has_alpha: false,
        pixels: Vec::new(),
        pixels_len: 0,
        have_pixels: false,
        output_icc: Vec::new(),
        embedded_icc: Vec::new(),
        cicp_primaries: 2,
        cicp_transfer: 2,
        animated: false,
        num_loops: 0,
        frame_index: 0,
        frame_duration_ms: 0.0,
        tone_intensity_target: 0.0,
        tone_min_nits: 0.0,
        error: Vec::new(),
    }))
}

/// # Safety
/// `ctx` must come from [`jxl_new`] and must not have been freed.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn jxl_free(ctx: *mut Ctx) {
    if !ctx.is_null() {
        drop(unsafe { Box::from_raw(ctx) });
    }
}

#[unsafe(no_mangle)]
pub extern "C" fn jxl_alloc(len: usize) -> *mut u8 {
    let mut v = vec![0u8; len];
    let p = v.as_mut_ptr();
    std::mem::forget(v);
    p
}

/// # Safety
/// `ptr`/`len` must describe a block returned by [`jxl_alloc`] and not yet freed.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn jxl_dealloc(ptr: *mut u8, len: usize) {
    if !ptr.is_null() && len > 0 {
        drop(unsafe { Vec::from_raw_parts(ptr, len, len) });
    }
}

// --------------------------------------------------------------- configuration

/// Choose the output sample format. Must be called before the first
/// [`jxl_feed`]; returns [`JXL_ERROR`] afterwards, when it would be too late to
/// take effect.
///
/// # Safety
/// `ctx` must be live.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn jxl_set_output_format(ctx: *mut Ctx, format: u32) -> i32 {
    let ctx = unsafe { &mut *ctx };
    if ctx.configured {
        return ctx.fail("output format must be set before the first feed");
    }
    if format > FORMAT_RGBA_F16 {
        return ctx.fail("unknown output format");
    }
    ctx.format = format;
    JXL_COMPLETE
}

/// Set the display's peak brightness in nits, which drives tone mapping for HDR
/// images. Pass `0` to leave the file's own intensity target alone — the right
/// choice when decoding to [`FORMAT_RGBA_F16`] for an HDR canvas.
///
/// # Safety
/// `ctx` must be live.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn jxl_set_intensity_target(ctx: *mut Ctx, nits: f32) -> i32 {
    let ctx = unsafe { &mut *ctx };
    if ctx.configured {
        return ctx.fail("intensity target must be set before the first feed");
    }
    ctx.intensity_target = if nits > 0.0 { Some(nits) } else { None };
    JXL_COMPLETE
}

// ---------------------------------------------------------------- decode loop

/// Append `len` bytes to the stream and decode as far as they allow.
///
/// Returns [`JXL_COMPLETE`], [`JXL_NEED_MORE`], [`JXL_FRAME`] or [`JXL_ERROR`].
///
/// # Safety
/// `ctx` must be live. `ptr`/`len` must be readable, or `len` must be 0.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn jxl_feed(ctx: *mut Ctx, ptr: *const u8, len: usize) -> i32 {
    let ctx = unsafe { &mut *ctx };
    if len > 0 && !ptr.is_null() {
        ctx.buf
            .extend_from_slice(unsafe { std::slice::from_raw_parts(ptr, len) });
    }
    advance(ctx)
}

fn advance(ctx: &mut Ctx) -> i32 {
    if !ctx.configured {
        let mut opts = JxlDecoderOptions::default();
        opts.desired_intensity_target = ctx.intensity_target;
        ctx.state = Some(State::Decoding(Box::new(JxlDecoder::new(opts))));
        ctx.configured = true;
    }

    loop {
        let mut dec = match ctx.state.take() {
            Some(State::Decoding(dec)) => dec,
            Some(State::Done) => {
                ctx.state = Some(State::Done);
                return JXL_COMPLETE;
            }
            Some(State::Failed) => {
                ctx.state = Some(State::Failed);
                return JXL_ERROR;
            }
            None => return ctx.fail("decoder used after failure"),
        };

        let rows = ctx.height as usize;
        let row = ctx.row_bytes();
        let event = {
            // Destructured so the input slice and the output buffer borrow
            // disjoint fields. `pixels` is sized in `capture_image_info`, which
            // runs before `rows` is ever non-zero, and is not resized after.
            let Ctx {
                buf,
                cursor,
                pixels,
                ..
            } = &mut *ctx;
            let mut input: &[u8] = &buf[*cursor..];
            let before = input.len();
            let result = if rows == 0 {
                // No basic info yet, so nothing to draw into.
                dec.process(&mut input, None, None)
            } else {
                let mut bufs = [unsafe {
                    JxlOutputBuffer::new_from_ptr(pixels.as_mut_ptr() as *mut u8, rows, row, row)
                }];
                dec.process(&mut input, Some(&mut bufs[..]), None)
            };
            *cursor += before - input.len();
            result
        };

        match event {
            Ok(Event::NeedMoreInput { .. }) => {
                ctx.state = Some(State::Decoding(dec));
                return JXL_NEED_MORE;
            }
            Ok(Event::BasicInfo) => {
                let Some(info) = dec.basic_info() else {
                    return ctx.fail("basic info event without basic info");
                };
                capture_image_info(ctx, info);
                // jxl-rs only accepts a format change between basic info and the
                // first frame header, which is exactly here, so this cannot fail
                // -- surfaced rather than ignored so a future reorder of this arm
                // is loud instead of silent.
                if let Err(e) = dec.set_pixel_format(ctx.pixel_format()) {
                    return ctx.fail(&format!("pixel format: {e}"));
                }
                capture_profiles(ctx, &dec);
            }
            Ok(Event::FrameHeader) => {
                ctx.frame_duration_ms = dec.frame_header().and_then(|h| h.duration).unwrap_or(0.0);
            }
            Ok(Event::FrameComplete { has_more_frames }) => {
                ctx.have_pixels = true;
                if has_more_frames {
                    ctx.state = Some(State::Decoding(dec));
                    return JXL_FRAME;
                }
                // The last frame is in; trailing boxes are of no interest here,
                // so finish now rather than waiting on `Event::Complete`.
                ctx.state = Some(State::Done);
                return JXL_COMPLETE;
            }
            Ok(Event::Complete) => {
                ctx.state = Some(State::Done);
                return JXL_COMPLETE;
            }
            Err(e) => {
                let stage = if ctx.width == 0 { "header" } else { "frame" };
                return ctx.fail(&format!("{stage}: {e}"));
            }
        }
        ctx.state = Some(State::Decoding(dec));
    }
}

fn capture_image_info(ctx: &mut Ctx, info: &JxlBasicInfo) {
    ctx.width = info.size.0 as u32;
    ctx.height = info.size.1 as u32;
    // The pixel format carries one entry per extra channel; getting this count
    // wrong makes flush_pixels panic on images that have any.
    ctx.extra_channels = info.extra_channels.len();
    ctx.has_alpha = info.extra_channels.iter().any(is_alpha);
    ctx.animated = info.animation.is_some();
    ctx.num_loops = info.animation.as_ref().map_or(0, |a| a.num_loops);
    ctx.tone_intensity_target = info.tone_mapping.intensity_target;
    ctx.tone_min_nits = info.tone_mapping.min_nits;

    let bytes = ctx.width as usize * ctx.height as usize * 4 * ctx.bytes_per_sample();
    ctx.pixels_len = bytes;
    ctx.pixels.clear();
    ctx.pixels.resize(bytes.div_ceil(4), 0);
}

fn is_alpha(c: &JxlExtraChannel) -> bool {
    matches!(c.ec_type, ExtraChannel::Alpha)
}

fn capture_profiles(ctx: &mut Ctx, dec: &JxlDecoder) {
    let out = dec.output_color_profile();
    ctx.output_icc = icc_bytes(out);
    ctx.embedded_icc = icc_bytes(dec.embedded_color_profile());
    let (p, t) = cicp_of(out);
    ctx.cicp_primaries = p;
    ctx.cicp_transfer = t;
}

/// Map the output profile onto CICP code points (ITU-T H.273), which is what a
/// PNG `cICP` chunk carries. `2` means "unspecified" in that registry, and is
/// the honest answer for anything not on the short list: callers should fall
/// back to embedding the ICC profile instead of writing a wrong cICP.
fn cicp_of(profile: Option<&JxlColorProfile>) -> (u32, u32) {
    let Some(JxlColorProfile::Simple(enc)) = profile else {
        return (2, 2); // an ICC-only profile carries no CICP equivalent
    };
    let (primaries, transfer) = match enc {
        JxlColorEncoding::RgbColorSpace {
            primaries,
            transfer_function,
            ..
        } => (Some(primaries), transfer_function),
        JxlColorEncoding::GrayscaleColorSpace {
            transfer_function, ..
        } => (None, transfer_function),
        _ => return (2, 2),
    };
    let p = match primaries {
        Some(JxlPrimaries::SRGB) => 1,   // BT.709
        Some(JxlPrimaries::BT2100) => 9, // BT.2020
        Some(JxlPrimaries::P3) => 12,    // SMPTE EG 432-1 (Display P3)
        _ => 2,
    };
    let t = match transfer {
        JxlTransferFunction::BT709 => 1,
        JxlTransferFunction::Linear => 8,
        JxlTransferFunction::SRGB => 13,
        JxlTransferFunction::PQ => 16,
        JxlTransferFunction::DCI => 17, // SMPTE ST 428-1
        JxlTransferFunction::HLG => 18,
        JxlTransferFunction::Gamma(_) => 2,
    };
    (p, t)
}

fn icc_bytes(profile: Option<&JxlColorProfile>) -> Vec<u8> {
    profile
        .and_then(|p| p.try_as_icc())
        .map(|c| c.into_owned())
        .unwrap_or_default()
}

/// Render everything the decoder currently holds into the pixel buffer.
/// Returns 1 when pixels are available to draw, 0 otherwise.
///
/// # Safety
/// `ctx` must be live.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn jxl_flush(ctx: *mut Ctx) -> i32 {
    let ctx = unsafe { &mut *ctx };
    if ctx.width == 0 || ctx.height == 0 {
        return 0;
    }
    // The output buffer aliases `pixels` while the decoder lives in `state`.
    // They are disjoint fields, but that has to be spelled out for the borrow
    // checker rather than hidden behind a `&mut self` method.
    let rows = ctx.height as usize;
    let row = ctx.row_bytes();
    let produced = {
        let Ctx { state, pixels, .. } = &mut *ctx;
        let mut bufs = [unsafe {
            JxlOutputBuffer::new_from_ptr(pixels.as_mut_ptr() as *mut u8, rows, row, row)
        }];
        let r = match state.as_mut() {
            Some(State::Decoding(dec)) => dec.flush_pixels(&mut bufs, None).unwrap_or(false),
            _ => false,
        };
        drop(bufs);
        r
    };

    if produced {
        ctx.have_pixels = true;
    }
    i32::from(ctx.have_pixels)
}

/// Advance to the next frame of an animation after [`jxl_feed`] returned
/// [`JXL_FRAME`].
///
/// # Safety
/// `ctx` must be live.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn jxl_next_frame(ctx: *mut Ctx) -> i32 {
    let ctx = unsafe { &mut *ctx };
    ctx.frame_index += 1;
    ctx.have_pixels = false;
    unsafe { jxl_feed(ctx, std::ptr::null(), 0) }
}

// -------------------------------------------------------------------- getters

macro_rules! getter {
    ($name:ident, $ty:ty, $field:expr) => {
        /// # Safety
        /// `ctx` must be live.
        #[unsafe(no_mangle)]
        pub unsafe extern "C" fn $name(ctx: *const Ctx) -> $ty {
            let ctx = unsafe { &*ctx };
            #[allow(clippy::redundant_closure_call)]
            ($field)(ctx)
        }
    };
}

getter!(jxl_width, u32, |c: &Ctx| c.width);
getter!(jxl_height, u32, |c: &Ctx| c.height);
getter!(jxl_pixels, *const u8, |c: &Ctx| c.pixels.as_ptr() as *const u8);
getter!(jxl_pixels_len, usize, |c: &Ctx| c.pixels_len);
getter!(jxl_bytes_per_sample, u32, |c: &Ctx| c.bytes_per_sample() as u32);
getter!(jxl_has_alpha, i32, |c: &Ctx| i32::from(c.has_alpha));
getter!(jxl_is_animated, i32, |c: &Ctx| i32::from(c.animated));
getter!(jxl_num_loops, u32, |c: &Ctx| c.num_loops);
getter!(jxl_frame_index, u32, |c: &Ctx| c.frame_index);
getter!(jxl_frame_duration_ms, f64, |c: &Ctx| c.frame_duration_ms);
getter!(jxl_intensity_target, f32, |c: &Ctx| c.tone_intensity_target);
getter!(jxl_min_nits, f32, |c: &Ctx| c.tone_min_nits);
getter!(jxl_icc_ptr, *const u8, |c: &Ctx| c.output_icc.as_ptr());
getter!(jxl_icc_len, usize, |c: &Ctx| c.output_icc.len());
getter!(jxl_embedded_icc_ptr, *const u8, |c: &Ctx| c
    .embedded_icc
    .as_ptr());
getter!(jxl_embedded_icc_len, usize, |c: &Ctx| c.embedded_icc.len());
getter!(jxl_cicp_primaries, u32, |c: &Ctx| c.cicp_primaries);
getter!(jxl_cicp_transfer, u32, |c: &Ctx| c.cicp_transfer);
getter!(jxl_error_ptr, *const u8, |c: &Ctx| c.error.as_ptr());
getter!(jxl_error_len, usize, |c: &Ctx| c.error.len());

/// True when the file declares a peak brightness beyond the SDR reference of
/// 255 nits, i.e. when [`FORMAT_RGBA_F16`] output is worth using.
///
/// # Safety
/// `ctx` must be live.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn jxl_is_hdr(ctx: *const Ctx) -> i32 {
    let ctx = unsafe { &*ctx };
    i32::from(ctx.tone_intensity_target > 255.0)
}
