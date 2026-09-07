# jxl-wasm

A streaming JPEG XL decoder for the browser, wrapping [jxl-rs](https://github.com/libjxl/jxl-rs)
(the decoder Chrome and Firefox ship) behind a flat C ABI.

**Status: the site's only JPEG XL decoder.** libjxl's `wasm_demo` build and the
COOP/COEP service worker it required are gone; `public/resources/jxl-rs.js` is
the `<img>`/`<source>`/background-image polyfill on every page, and the
progressive-loading demo drives this module directly.

Ship `dist/jxl_decoder_rs{,_simd}.wasm` to `public/resources/` after building.

## Why replace libjxl's wasm build

The current decoder (`public/resources/jxl_decoder*.wasm` + its 24 KB JS glue)
is libjxl compiled through emscripten **with pthreads**. Threads mean
`SharedArrayBuffer`, which means every page that decodes a JXL has to be
cross-origin isolated, which is why the site ships `serviceworker.min.js` to
inject COOP/COEP headers and reloads once on first visit.

jxl-rs never needs a parallel runner. The module built here has **zero
imports** — no JS glue, no emscripten runtime, no `SharedArrayBuffer`:

```js
const { instance } = await WebAssembly.instantiate(bytes);   // that's all
```

| | libjxl `wasm_demo` (current) | jxl-rs 0.7.1 (here) |
| --- | --- | --- |
| wasm imports | emscripten runtime | **none** |
| threads / `SharedArrayBuffer` | yes | no |
| needs COOP/COEP + service worker | **yes** | **no** |
| first pixels, `portrait.jxl` | ~25–30 % of file | **2 % (1 381 B)** |
| first pixels, 1 MB pair | ~25 % | **1 % (8 698 B)** |
| HDR | tone-mapped to SDR at 100 nits | PQ data and ICC passed through |
| payload | 1 062 KB wasm + 24 KB JS | 1 326 KB wasm, no glue |

It is ~240 KB larger, against removing a JS glue file, a service worker, and a
full page reload.

## Building

Needs a Rust toolchain with the `wasm32-unknown-unknown` target, and
[binaryen](https://github.com/WebAssembly/binaryen)'s `wasm-opt` on `PATH` (or
in `$WASM_OPT`) for the size pass.

```sh
rustup target add wasm32-unknown-unknown
./build.sh            # -> dist/jxl_decoder_rs{,_simd}.wasm
```

Two modules are produced, mirroring the libjxl pair the site already serves:
`_simd` for browsers reporting wasm SIMD support, and a scalar fallback.
`build.sh` fails if either module ends up with an import — that property is the
main reason to prefer this decoder, so it is checked rather than assumed.

Deliberately **not** enabled: threads, and wasm exception handling. A JXL
fallback decoder mostly runs on browsers that lack native JXL, which skew old,
so the module sticks to widely supported wasm features.

## Using it

```js
const { instance } = await WebAssembly.instantiate(wasmBytes);
const X = instance.exports;

const ctx = X.jxl_new();
X.jxl_set_output_format(ctx, 0);        // 0 rgba8, 1 rgba16, 2 f16 (HDR)

for (const chunk of stream) {           // feed as bytes arrive
  const p = X.jxl_alloc(chunk.length);
  new Uint8Array(X.memory.buffer, p, chunk.length).set(chunk);
  const status = X.jxl_feed(ctx, p, chunk.length);
  X.jxl_dealloc(p, chunk.length);

  if (X.jxl_flush(ctx)) {               // partial pixels are ready
    const w = X.jxl_width(ctx), h = X.jxl_height(ctx);
    const px = new Uint8Array(X.memory.buffer, X.jxl_pixels(ctx), w * h * 4);
    ctx2d.putImageData(new ImageData(new Uint8ClampedArray(px), w, h), 0, 0);
  }
  if (status !== 1) break;              // 1 = needs more input
}
X.jxl_free(ctx);
```

`jxl_flush` is the progressive preview: it renders whatever has decoded so far,
which is why a recognisable image appears at 1–2 % of the file.

Re-read `jxl_pixels` after any call that can grow the wasm heap — the buffer
moves when linear memory is resized, and a stale view will read freed bytes.

### Status codes

| code | meaning |
| --- | --- |
| `0` | complete |
| `1` | needs more input |
| `2` | animation frame done, more follow — call `jxl_next_frame` |
| `-1` | failed; read `jxl_error_ptr` / `jxl_error_len` |

### Animation

When `jxl_feed` returns `2`, read the pixels, then call `jxl_next_frame`.
`jxl_frame_duration_ms` and `jxl_num_loops` drive playback timing.

### HDR

`jxl_is_hdr` is true when the file declares a peak above 255 nits. For those,
select `FORMAT_RGBA_F16` and honour `jxl_icc_ptr` — the decoder returns the
image **in its own colour space, untouched**: on a PQ test file the output ICC
came back byte-identical to the embedded profile, with no tone mapping. The
current libjxl build instead calls `jxlCreateInstance(want_sdr = true, 100)`,
which flattens HDR to SDR before the page ever sees it.

Values stay within `[0, 1]` because that is what PQ encoding means (1.0 =
10 000 nits); the gain is precision, not range — 45 393 distinct levels at
`rgba16` and 5 800 at f16, against 190 at `rgba8` on the same image.

## Verification

`scripts/compare-vs-libjxl.mjs` decodes a list of files with both this module
and libjxl's `djxl`, then compares pixels:

```sh
find public -name '*.jxl' > /tmp/all.txt
node scripts/compare-vs-libjxl.mjs /tmp/all.txt
```

Run against every `.jxl` in `public/` (7 435 files) versus djxl 0.12.0, on
jxl-rs 0.7.1:

| | |
| --- | --- |
| compared | 7 435 |
| bit-identical | 67 |
| within 2/255 | 7 366 |
| **differing by more than 2/255** | **2** (the same file twice — see below) |
| size mismatches | 0 |
| failures (either decoder) | 0 |

### The one file that does not match

`images/art/2021-08_monad.jxl` (and its copy under `old/art/`) decodes wrong on
jxl-rs 0.7.1: the right-hand region comes out as black/white banding instead of
a clean wedge, at `maxDelta=255`, 13.8 dB PSNR. djxl 0.12.0 and jxl-rs **0.6.0**
agree with each other exactly, so this is a 0.7.x change, not a long-standing
gap. Both the SIMD and scalar modules are affected identically, so it is not a
lane-width bug in the SIMD path.

The likely cause is the 16-bit modular buffers added in 0.7.0:
`Frame::modular_storage` selects `ModularStorage::I16` whenever the bitstream
sets `modular_16bit_sufficient`, and the banding is what wraparound looks like.
jxl-art files exist precisely to push modular arithmetic to its limits, so they
are the files that would expose it. jxl-rs's own `allow_16bit_modular_buffers`
escape hatch is `#[cfg(test)]`-only, so this wrapper cannot opt out of it.

The rest of the art directory is unaffected beyond rounding: the other six
files differ from 0.6.0 by at most 1/255. It was shipped anyway, as one wrong
image on the art page against 0.7.x's progressive-rendering work, memory
reductions, and several decoder panic fixes. Recheck it on the next jxl-rs
release: it is the canary for this whole class of bug.

Nothing in the corpus decodes visibly differently. The 2/255 band is ordinary
rounding divergence between two independent implementations.

Animation, HDR and metadata were checked separately: 12 frames stepped on
`anim_jxl_logo.jxl` with distinct contents and correct 100 ms durations; ICC
recovered for 1 200/1 200 files scanned; PQ output profile byte-identical to the
embedded one.

## Failure contract

Malformed input returns `-1` with a message; the context is dead but the module
is fine and other images keep decoding.

A panic inside jxl-rs is different. `wasm32-unknown-unknown` cannot unwind, so
`panic = "abort"` is the honest setting and `catch_unwind` would be dead code:
a panic traps and **the whole module instance dies**, not just one context. Code
decoding untrusted images should re-instantiate the module when a call traps.

## Known gaps

- `jxl_set_intensity_target` is plumbed to `desired_intensity_target` but had no
  observable effect on the PQ file tested, because no tone mapping is applied at
  all. Driving an explicit output profile would need `jxl_cms`. Untested.
- Only RGBA output. Greyscale and CMYK decode through the RGBA path rather than
  natively.
- Extra channels beyond alpha (spot colour, depth, selection masks) are parsed
  and counted, but not exposed.
- jxl-rs is pre-1.0 and its typestate API can still churn, so the dependency is
  pinned to `=0.7.1`. 0.7.1 broke `set_pixel_format`'s signature (it returns
  `Result` now), which is the kind of churn the pin exists for.
- One jxl-art file decodes wrong on 0.7.1 — see [Verification](#verification).
