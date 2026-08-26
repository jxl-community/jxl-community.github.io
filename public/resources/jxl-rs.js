/*! jxl-rs.js — <img>/<source>/background-image polyfill for JPEG XL, decoding
    with tools/jxl-wasm (a jxl-rs build). Replaces the libjxl `wasm_demo` build
    that jxl.min.js drove.

    What changed, and why:

    - No COOP/COEP. The libjxl build used pthreads, so every page carrying a JXL
      had to be cross-origin isolated, which meant registering a service worker
      to inject the headers and reloading once. This module has no imports and
      no threads, so pages just load it. Safari benefits most: it decodes JXL
      natively but not progressively, so the site's native-JXL probe skipped the
      worker for it, and any page relying on the fallback got nothing.
    - No end-of-stream drain. libjxl needed to be pumped with zero-length reads
      after the last byte or small files kept only their blurry DC preview.
      jxl-rs finishes the image in the call that receives the final byte.
    - Previews land far earlier — around 1-2% of a file rather than 25-30%.

    Behaviours carried over from jxl.min.js, all of which fixed real bugs:

    1. The MutationObserver watches `src` attribute changes as well as inserted
       nodes, so swapping the src of an existing <img> triggers a decode
       (DistanceVsEffort.js does this).
    2. One shared module and a serialised queue. Gallery pages have enough
       images to exhaust address space if each decode gets its own heap.
    3. Optional HDR path: with `window.jxl = { preferHdr: true }`, images on an
       HDR display are decoded to a 16-bit PNG carrying a cICP chunk so the
       browser renders them in true HDR, rather than going through the
       canvas->JPEG path which is 8-bit and SDR. `forceHdr` bypasses the
       display/browser gate for testing.
    4. <source srcset="*.jxl"> inside a <picture> that offers a renderable
       non-JXL fallback is left alone. Rewriting it made the browser prefer our
       SDR decode over an HDR-capable AVIF on the homepage.
    5. CacheStorage reads/writes are skipped for data: URIs, which the Cache API
       rejects. */
(() => {
  'use strict';

  const opts = {
    useCache: true,
    imageType: 'jpeg',
    preferHdr: false,
    forceHdr: false,
    ...window.jxl,
  };

  const SIMD = WebAssembly.validate(
    new Uint8Array([
      0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253,
      15, 253, 98, 11,
    ]),
  );
  const DECODER_URL = SIMD
    ? '/resources/jxl_decoder_rs_simd.wasm'
    : '/resources/jxl_decoder_rs.wasm';

  const CHUNK = 262144;
  const PREVIEW_GAP = 150; // ms between progressive repaints of one image

  // HDR output is worth the extra work only where it can actually be shown.
  const WANT_HDR =
    opts.preferHdr &&
    (opts.forceHdr ||
      (matchMedia('(dynamic-range: high)').matches && !!navigator.userAgentData));

  /* ---------- decoder module ---------- */

  let modulePromise = null;
  let instance = null; // shared across images; see behaviour 2

  function loadModule() {
    if (!modulePromise) {
      modulePromise = fetch(DECODER_URL)
        .then((r) => {
          if (!r.ok) throw new Error(`decoder: HTTP ${r.status}`);
          return r.arrayBuffer();
        })
        .then((buf) => WebAssembly.compile(buf));
    }
    return modulePromise;
  }

  async function exports() {
    if (instance) return instance;
    instance = (await WebAssembly.instantiate(await loadModule(), {})).exports;
    return instance;
  }

  // A panic inside the decoder traps and kills the whole instance, not just the
  // one context, so a failed image has to take the instance down with it.
  function resetInstance() {
    instance = null;
  }

  /* ---------- PNG writer, for the HDR path ---------- */

  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const out = new Uint8Array(12 + data.length);
    const view = new DataView(out.buffer);
    view.setUint32(0, data.length);
    for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
    out.set(data, 8);
    view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
    return out;
  }

  /* 16-bit RGBA PNG carrying a cICP chunk, which is how the colour space
     survives: the browser reads cICP and renders PQ/HLG in true HDR. Falls back
     to the caller's SDR path when the profile has no CICP equivalent. */
  async function encodePng16(rgba16, w, h, primaries, transfer) {
    const ihdr = new Uint8Array(13);
    const dv = new DataView(ihdr.buffer);
    dv.setUint32(0, w);
    dv.setUint32(4, h);
    ihdr[8] = 16; // bit depth
    ihdr[9] = 6; // colour type: RGBA
    // cICP: primaries, transfer, matrix 0 (identity/RGB), full range.
    const cicp = new Uint8Array([primaries, transfer, 0, 1]);

    // One filter byte per row (type 0, none) then big-endian 16-bit samples.
    const stride = w * 8;
    const raw = new Uint8Array(h * (stride + 1));
    for (let y = 0; y < h; y++) {
      const src = y * w * 4;
      let o = y * (stride + 1);
      raw[o++] = 0;
      for (let x = 0; x < w * 4; x++) {
        const v = rgba16[src + x];
        raw[o++] = v >>> 8;
        raw[o++] = v & 255;
      }
    }

    const deflated = new Uint8Array(
      await new Response(
        new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate')),
      ).arrayBuffer(),
    );

    return new Blob(
      [
        new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
        chunk('IHDR', ihdr),
        chunk('cICP', cicp),
        chunk('IDAT', deflated),
        chunk('IEND', new Uint8Array(0)),
      ],
      { type: 'image/png' },
    );
  }

  /* ---------- element handling ---------- */

  let cache = null;
  const queue = [];
  let active = 0;

  function pump() {
    if (active < 1 && queue.length > 0) {
      active++;
      queue.shift()();
    }
  }

  function done() {
    active--;
    setTimeout(pump, 0);
  }

  // A <picture> that already offers something renderable does not need us; see
  // behaviour 4.
  function hasRenderableFallback(el) {
    const parent = el.parentElement;
    if (!(parent instanceof HTMLPictureElement)) return false;
    for (const sib of parent.children) {
      if (sib === el) continue;
      if (sib instanceof HTMLSourceElement && sib.srcset && !sib.srcset.endsWith('.jxl')) return true;
      if (sib instanceof HTMLImageElement && sib.getAttribute('src') && !sib.src.endsWith('.jxl'))
        return true;
    }
    return false;
  }

  function consider(el) {
    if (el instanceof HTMLImageElement && el.src.endsWith('.jxl')) {
      // Only step in where the browser could not decode it itself.
      if (el.complete && el.naturalHeight === 0) start(el, false, false);
      else el.onerror = () => start(el, false, false);
    } else if (el instanceof HTMLSourceElement && el.srcset.endsWith('.jxl')) {
      if (!hasRenderableFallback(el)) start(el, false, true);
    } else if (
      el instanceof Element &&
      getComputedStyle(el).backgroundImage.endsWith('.jxl")')
    ) {
      start(el, true, false);
    }
  }

  function apply(el, url, isBackground, isSource) {
    if (isBackground) el.style.backgroundImage = `url("${url}")`;
    else if (isSource) {
      el.srcset = url;
      el.type = 'image/' + opts.imageType;
    } else el.src = url;
  }

  // Turn decoded pixels into something the element can show. Blobs go straight
  // on; ImageData goes through a canvas, and that encode is what gets cached.
  function present(el, payload, isBackground, isSource) {
    const key = el.dataset.jxlSrc;
    if (payload instanceof Blob) {
      apply(el, URL.createObjectURL(payload), isBackground, isSource);
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = payload.width;
    canvas.height = payload.height;
    canvas.getContext('2d').putImageData(payload, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      apply(el, URL.createObjectURL(blob), isBackground, isSource);
      if (opts.useCache && cache && key && !key.startsWith('data:')) {
        cache.put(key, new Response(blob)).catch(() => {});
      }
    }, 'image/' + opts.imageType);
  }

  async function start(el, isBackground, isSource) {
    const src = (el.dataset.jxlSrc = isBackground
      ? getComputedStyle(el).backgroundImage.slice(5, -2)
      : isSource
        ? el.srcset
        : el.currentSrc);

    // Blank the element so the broken-image glyph does not flash.
    if (!isBackground && !isSource) {
      el.srcset = '';
      el.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
    }

    if (opts.useCache && !WANT_HDR) {
      try {
        cache = cache || (await caches.open('jxl'));
      } catch {}
      const hit =
        cache && !src.startsWith('data:') && (await cache.match(src).catch(() => undefined));
      if (hit) {
        const blob = await hit.blob();
        requestAnimationFrame(() => present(el, blob, isBackground, isSource));
        return;
      }
    }

    queue.push(() => {
      decode(src, el, isBackground, isSource)
        .catch((err) => console.error('jxl-rs:', src, err))
        .then(done);
    });
    pump();
  }

  async function decode(src, el, isBackground, isSource) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    let X;
    try {
      X = await exports();
    } catch (err) {
      resetInstance();
      throw err;
    }

    const ctx = X.jxl_new();
    const buf = X.jxl_alloc(CHUNK);
    let lastPreview = 0;
    let painted = false;

    try {
      if (WANT_HDR) X.jxl_set_output_format(ctx, 1); // RGBA16 for the PNG path

      const reader = res.body.getReader();
      let status = 1;
      for (;;) {
        const { done: eof, value } = await reader.read();
        if (eof) break;
        for (let off = 0; off < value.length; ) {
          const len = Math.min(CHUNK, value.length - off);
          new Uint8Array(X.memory.buffer, buf, len).set(value.subarray(off, off + len));
          status = X.jxl_feed(ctx, buf, len);
          off += len;
          if (status === -1) throw new Error(errorText(X, ctx));
          if (status === 0) break;
        }
        if (status === 0) break;

        // Progressive preview, throttled: each one costs a full canvas encode.
        if (!WANT_HDR && performance.now() - lastPreview > PREVIEW_GAP) {
          if (X.jxl_flush(ctx) === 1) {
            lastPreview = performance.now();
            painted = true;
            emit(X, ctx, el, isBackground, isSource);
          }
        }
      }

      if (X.jxl_flush(ctx) !== 1 && !painted) throw new Error('no pixels decoded');

      if (WANT_HDR) {
        const w = X.jxl_width(ctx);
        const h = X.jxl_height(ctx);
        const primaries = X.jxl_cicp_primaries(ctx);
        const transfer = X.jxl_cicp_transfer(ctx);
        // 2 = "unspecified": writing that would claim a colour space we do not
        // know, so fall through to the ordinary 8-bit path instead.
        if (primaries !== 2 && transfer !== 2) {
          const px = new Uint16Array(X.memory.buffer, X.jxl_pixels(ctx), w * h * 4).slice();
          const blob = await encodePng16(px, w, h, primaries, transfer);
          requestAnimationFrame(() => present(el, blob, isBackground, isSource));
          return;
        }
      }
      emit(X, ctx, el, isBackground, isSource);
    } catch (err) {
      // A trap takes the shared instance with it; drop it so the next image
      // starts from a clean module rather than a dead one.
      resetInstance();
      throw err;
    } finally {
      if (instance === X) {
        X.jxl_free(ctx);
        X.jxl_dealloc(buf, CHUNK);
      }
    }
  }

  function errorText(X, ctx) {
    const len = X.jxl_error_len(ctx);
    if (!len) return 'decode failed';
    return new TextDecoder().decode(new Uint8Array(X.memory.buffer, X.jxl_error_ptr(ctx), len));
  }

  function emit(X, ctx, el, isBackground, isSource) {
    const w = X.jxl_width(ctx);
    const h = X.jxl_height(ctx);
    if (!w || !h) return;
    // Copy out of wasm memory before yielding: the heap can be replaced when it
    // grows, leaving any view pointing at a dead buffer.
    const px = new Uint8ClampedArray(
      new Uint8Array(X.memory.buffer, X.jxl_pixels(ctx), w * h * 4),
    );
    const image = new ImageData(px, w, h);
    requestAnimationFrame(() => present(el, image, isBackground, isSource));
  }

  /* ---------- bootstrap ---------- */

  function scan() {
    if (document.body) document.body.querySelectorAll('*').forEach(consider);
    new MutationObserver((records) =>
      records.forEach((rec) => {
        rec.addedNodes.forEach(consider);
        if (rec.type === 'attributes') consider(rec.target);
      }),
    ).observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['src'],
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan, { once: true });
  } else {
    scan();
  }
})();
