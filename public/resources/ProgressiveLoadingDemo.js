/* Live progressive-delivery demo: JPEG vs JPEG XL decoded from a truncated
   prefix of each file, so the "bytes received" slider shows what a browser
   would actually have on screen part-way through a download.

   JPEG side: a Blob of the first N bytes handed to an <img>. Browsers paint the
   scanlines they managed to decode and leave the rest transparent, so the pane
   background shows through as the undecoded area. No EOI marker is appended —
   adding one makes browsers fill the remainder themselves and we lose control
   of the backdrop.

   JPEG XL side: jxl-rs, built by tools/jxl-wasm into a wasm module with no
   imports at all — no glue script, no emscripten runtime, and crucially no
   pthreads. The libjxl wasm_demo build this replaced needed SharedArrayBuffer,
   so the page had to be cross-origin isolated, which meant registering a
   service worker to inject COOP/COEP and reloading once. Safari was the casualty:
   it decodes JXL natively but not progressively, so it skipped the worker as a
   "native JXL" browser and was then left with no decoder for this page. Nothing
   here is conditional on native support any more — every browser runs the same
   wasm decoder, which is the only way the comparison is honest.

     jxl_new()                     -> ctx
     jxl_set_output_format(ctx, 0) -> RGBA8
     jxl_feed(ctx, ptr, len)       -> 0 complete | 1 needs more | 2 frame | -1 error
     jxl_flush(ctx)                -> 1 once partial pixels exist
     jxl_width / jxl_height / jxl_pixels(ctx)

   The decoder is streaming-only: it can be fed forward but never rewound, so
   dragging the slider backwards tears down the context and re-feeds from 0.

   jxl-rs surfaces its first flushable pixels far earlier than libjxl did —
   around 1-2% of these files rather than 25-30% — so the pane shows a coarse
   full-frame preview almost immediately. */
(() => {
  'use strict';

  const SIMD = WebAssembly.validate(
    new Uint8Array([
      0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253,
      15, 253, 98, 11,
    ]),
  );
  const DECODER_SRC = SIMD
    ? '/resources/jxl_decoder_rs_simd.wasm'
    : '/resources/jxl_decoder_rs.wasm';
  const CHUNK = 262144;
  const MIN_FLUSH_GAP = 60; // ms — cap JXL re-renders at ~16/sec during a sweep
  const MIN_FEED = 16384; // bytes — smallest worthwhile jxl_feed call

  const root = document.getElementById('progressive-demo');
  if (!root) return;

  const manifest = JSON.parse(document.getElementById('progressive-demo-data').textContent);

  const el = {
    picker: root.querySelector('#pd-image-picker'),
    jpegMode: root.querySelectorAll('[data-jpeg-mode]'),
    slider: root.querySelector('#pd-slider'),
    play: root.querySelector('#pd-play'),
    panes: root.querySelector('#pd-panes'),
    jpegCanvas: root.querySelector('#pd-jpeg-canvas'),
    dimensions: root.querySelectorAll('.pd-dimensions'),
    jxlCanvas: root.querySelector('#pd-jxl-canvas'),
    jpegLabel: root.querySelector('#pd-jpeg-label'),
    jpegBytes: root.querySelector('#pd-jpeg-bytes'),
    jpegTotal: root.querySelector('#pd-jpeg-total'),
    jpegReadout: root.querySelector('#pd-jpeg-readout'),
    jpegState: root.querySelector('#pd-jpeg-state'),
    jxlBytes: root.querySelector('#pd-jxl-bytes'),
    jxlTotal: root.querySelector('#pd-jxl-total'),
    jxlReadout: root.querySelector('#pd-jxl-readout'),
    jxlState: root.querySelector('#pd-jxl-state'),
    received: root.querySelector('#pd-received'),
    status: root.querySelector('#pd-status'),
    note: root.querySelector('#pd-note'),
    credit: root.querySelector('#pd-credit'),
  };

  const fmt = new Intl.NumberFormat('en-US');
  const files = new Map(); // url -> Uint8Array
  let current = manifest.images[0];
  let jpegMode = 'baseline';
  let bytesReceived = 0;
  let playing = false;
  let playRaf = 0;

  /* ---------- asset loading ---------- */

  async function bytesFor(url) {
    if (!files.has(url)) {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
      files.set(url, new Uint8Array(await res.arrayBuffer()));
    }
    return files.get(url);
  }

  const jpegUrl = (image, mode) =>
    mode === 'progressive' ? image.progressiveJpeg.url : image.jpeg.url;
  const jpegMeta = (image, mode) => (mode === 'progressive' ? image.progressiveJpeg : image.jpeg);

  // Only the variant on screen is worth downloading — the homepage-video pair
  // alone is close to 3 MB across its three files.
  async function loadCurrent() {
    await Promise.all([bytesFor(jpegUrl(current, jpegMode)), bytesFor(current.jxl.url)]);
  }

  /* ---------- JPEG pane ---------- */

  /* A truncated prefix is decoded in a detached <img> and then blitted into the
     canvas. Two details make this work where the obvious versions do not:

       - The <img> is what decodes. Browsers paint a truncated JPEG scanline by
         scanline, and drawImage copies exactly that partial raster, so the pane
         still shows the honest top-down fill. createImageBitmap is not an
         option: Chrome rejects it outright on truncated data.
       - The blit waits for decode(), not load. The load event fires once the
         bytes are in and the header is parsed, while the frame may still be
         undecoded — drawing then copies nothing at all.

     Painting into a canvas rather than swapping two stacked <img> buffers also
     removes the banding this pane used to show. A hidden <img> is not
     rasterized, so revealing one hands the compositor a layer it fills in
     lazily, tile by tile, which appears as strips of image separated by empty
     stage. The canvas is rasterized from pixels we already hold, so each update
     lands whole.

     Decodes are coalesced and rate limited: every slider step is a full
     re-decode from byte 0 (JPEG cannot be resumed), so at most one runs at a
     time and they start no more often than MIN_DECODE_GAP. The newest request
     always wins, and a trailing timer guarantees the position the slider
     actually stopped at is the one left on screen. */

  const MIN_DECODE_GAP = 60; // ms — ~16 updates/sec, smooth enough for the sweep

  const jpegCtx = el.jpegCanvas.getContext('2d');
  const jpegLoader = new Image();

  const jpeg = {
    url: null,
    wanted: null, // latest byte count asked for
    pending: null, // byte count currently decoding
    shown: null, // byte count last decoded
    visible: null, // byte count actually on the canvas, null when blank
    lastStart: 0,
    timer: 0,
  };

  function releaseJpegUrl() {
    if (jpeg.url) {
      URL.revokeObjectURL(jpeg.url);
      jpeg.url = null;
    }
  }

  function clearJpegCanvas() {
    jpegCtx.clearRect(0, 0, el.jpegCanvas.width, el.jpegCanvas.height);
    el.jpegCanvas.classList.remove('is-painted');
    jpeg.visible = null;
  }

  function resetJpeg() {
    window.clearTimeout(jpeg.timer);
    jpeg.timer = 0;
    jpeg.wanted = null;
    jpeg.pending = null;
    jpeg.shown = null;
    jpegLoader.removeAttribute('src');
    releaseJpegUrl();
    clearJpegCanvas();
  }

  function renderJpeg(n) {
    const bytes = files.get(jpegUrl(current, jpegMode));
    if (!bytes) return;
    jpeg.wanted = Math.min(n, bytes.length);
    scheduleJpeg();
  }

  function scheduleJpeg() {
    if (jpeg.pending !== null) return; // a decode is in flight; it re-checks on settle
    if (jpeg.wanted === null || jpeg.wanted === jpeg.shown) return;
    const wait = MIN_DECODE_GAP - (performance.now() - jpeg.lastStart);
    if (wait <= 0) {
      decodeJpeg();
      return;
    }
    if (!jpeg.timer) {
      jpeg.timer = window.setTimeout(() => {
        jpeg.timer = 0;
        scheduleJpeg();
      }, wait);
    }
  }

  function decodeJpeg() {
    const bytes = files.get(jpegUrl(current, jpegMode));
    if (!bytes || jpeg.wanted === null) return;

    const take = jpeg.wanted;
    jpeg.pending = take;
    jpeg.lastStart = performance.now();
    releaseJpegUrl();
    jpeg.url = URL.createObjectURL(new Blob([bytes.subarray(0, take)], { type: 'image/jpeg' }));
    jpegLoader.src = jpeg.url;

    const settle = (ok) => {
      if (jpeg.pending !== take) return; // superseded by a reset or a newer prefix
      jpeg.pending = null;
      jpeg.shown = take;
      const w = jpegLoader.naturalWidth;
      const h = jpegLoader.naturalHeight;
      if (ok && w && h) {
        if (el.jpegCanvas.width !== w || el.jpegCanvas.height !== h) {
          el.jpegCanvas.width = w;
          el.jpegCanvas.height = h;
        }
        // Clear first: a shorter prefix decodes fewer scanlines, and the taller
        // previous frame must not remain visible below the new one.
        jpegCtx.clearRect(0, 0, w, h);
        jpegCtx.drawImage(jpegLoader, 0, 0);
        el.jpegCanvas.classList.add('is-painted');
        jpeg.visible = take;
      } else if (jpeg.visible === null || take < jpeg.visible) {
        /* Too few bytes to establish a frame, and nothing safe to fall back to.
           Keeping a frame decoded from MORE bytes than have arrived would claim
           more image than the slider says, so show nothing. A prefix failing
           while a shorter one is up is fine to leave alone — that frame is
           still an honest view of less data. */
        clearJpegCanvas();
      }
      // The slider may have moved on while this prefix was decoding.
      scheduleJpeg();
    };

    const ready =
      typeof jpegLoader.decode === 'function'
        ? jpegLoader.decode()
        : new Promise((resolve, reject) => {
            jpegLoader.onload = resolve;
            jpegLoader.onerror = reject;
          });
    ready.then(
      () => settle(true),
      () => settle(false),
    );
  }

  /* ---------- JPEG XL pane ---------- */

  /* Decoded by tools/jxl-wasm, a jxl-rs build exposed over a flat C ABI:

       jxl_new()                     -> ctx
       jxl_set_output_format(ctx, 0) -> RGBA8
       jxl_feed(ctx, ptr, len)       -> 0 complete | 1 needs more | 2 frame | -1 error
       jxl_flush(ctx)                -> 1 once partial pixels exist
       jxl_width / jxl_height / jxl_pixels

     The module has no imports, so there is no glue script to load and — the
     reason this page uses it — no pthreads, no SharedArrayBuffer and therefore
     no COOP/COEP requirement. The previous libjxl build needed all three, which
     meant a service worker and a one-time reload, and left Safari unable to run
     the demo at all: Safari decodes JXL natively but not progressively, so it
     skipped the worker and then had no decoder to fall back on.

     Like the JPEG side the decoder is streaming-only — it can be fed forward but
     never rewound — so dragging the slider backwards tears down the context and
     re-feeds from zero. */

  const jxl = {
    module: null, // compiled WebAssembly.Module, instantiated per session
    X: null, // current instance exports
    ctx: 0,
    buf: 0, // scratch block inside wasm memory for incoming bytes
    bufLen: 0,
    fed: 0,
    done: false,
    painted: false,
    target: -1,
    running: false,
    source: null,
    image: null, // reused ImageData; see paint()
    lastFlush: 0,
    dirty: false, // fed bytes not yet reflected on the canvas
    flushTimer: 0,
    force: false, // trailing pass: ignore the rate limits and settle the frame
    errorShown: false, // a decoder message is currently on screen
  };

  const ctx = el.jxlCanvas.getContext('2d');

  async function ensureModule() {
    if (jxl.module) return jxl.module;
    const res = await fetch(DECODER_SRC);
    if (!res.ok) throw new Error(`decoder: HTTP ${res.status}`);
    jxl.module = await WebAssembly.compile(await res.arrayBuffer());
    return jxl.module;
  }

  function teardownSession() {
    if (jxl.X && jxl.ctx) jxl.X.jxl_free(jxl.ctx);
    if (jxl.X && jxl.buf) jxl.X.jxl_dealloc(jxl.buf, jxl.bufLen);
    jxl.ctx = 0;
    jxl.buf = 0;
    jxl.bufLen = 0;
    jxl.fed = 0;
    jxl.done = false;
    jxl.painted = false;
    jxl.image = null;
    jxl.dirty = false;
    jxl.force = false;
    window.clearTimeout(jxl.flushTimer);
    jxl.flushTimer = 0;
  }

  async function startSession(sourceUrl) {
    const module = await ensureModule();
    teardownSession();
    // A fresh instance per session: the decoder cannot rewind, and this also
    // releases the previous image's memory instead of growing the heap forever.
    const instance = await WebAssembly.instantiate(module, {});
    jxl.X = instance.exports;
    jxl.source = sourceUrl;
    jxl.ctx = jxl.X.jxl_new();
    if (!jxl.ctx) throw new Error('cannot create decoder context');
    jxl.X.jxl_set_output_format(jxl.ctx, 0); // RGBA8, canvas-native
    jxl.buf = jxl.X.jxl_alloc(CHUNK);
    jxl.bufLen = CHUNK;
    // A failed module fetch is usually transient. Once a retry gets through,
    // clear the message rather than leaving the pane looking broken while it is
    // visibly decoding.
    if (jxl.errorShown) {
      jxl.errorShown = false;
      setStatus('');
    }
  }

  function decoderError() {
    const len = jxl.X.jxl_error_len(jxl.ctx);
    if (!len) return 'decode failed';
    const bytes = new Uint8Array(jxl.X.memory.buffer, jxl.X.jxl_error_ptr(jxl.ctx), len);
    return new TextDecoder().decode(bytes);
  }

  /* Called on every flush, which during a sweep means many times a second on a
     buffer as large as 41 MB. Copy exactly once, into an ImageData kept between
     calls: allocating a fresh one each time accounted for a quarter of
     main-thread time and starved both panes of frames. */
  function paint() {
    const X = jxl.X;
    const w = X.jxl_width(jxl.ctx);
    const h = X.jxl_height(jxl.ctx);
    const px = X.jxl_pixels(jxl.ctx);
    if (!w || !h || !px) return false;
    if (el.jxlCanvas.width !== w || el.jxlCanvas.height !== h) {
      el.jxlCanvas.width = w;
      el.jxlCanvas.height = h;
    }
    if (!jxl.image || jxl.image.width !== w || jxl.image.height !== h) {
      jxl.image = new ImageData(w, h);
    }
    // A fresh view each time: wasm memory can be detached and replaced when the
    // heap grows, which would leave a cached view pointing at a dead buffer.
    jxl.image.data.set(new Uint8Array(X.memory.buffer, px, w * h * 4));
    ctx.putImageData(jxl.image, 0, 0);
    return true;
  }

  function clearCanvas() {
    ctx.clearRect(0, 0, el.jxlCanvas.width, el.jxlCanvas.height);
    el.jxlCanvas.classList.remove('is-painted');
  }

  /* Feed the decoder up to `jxl.target` bytes, yielding between chunks so a drag
     stays responsive. Only one pump runs at a time; a newer target simply
     extends (or restarts) the one in flight.

     Two rate limits keep a 60 fps sweep off the main thread, because each frame
     only advances the target by a couple of KB while a feed and a flush both
     cost as if the whole image had changed:
       - MIN_FEED       smallest delta worth handing the decoder
       - MIN_FLUSH_GAP  smallest interval between full re-renders
     plus a trailing forced pass, so bytes held back by either limit still land
     once the slider settles rather than leaving a stale frame. */
  async function pumpJxl() {
    if (jxl.running) return;
    jxl.running = true;
    const force = jxl.force;
    jxl.force = false;
    try {
      const url = current.jxl.url;
      const bytes = files.get(url);
      if (!bytes) return;

      const flushNow = () => {
        jxl.lastFlush = performance.now();
        jxl.dirty = false;
        if (jxl.X.jxl_flush(jxl.ctx) === 1 && paint()) {
          jxl.painted = true;
          el.jxlCanvas.classList.add('is-painted');
        }
      };

      for (;;) {
        const target = Math.min(jxl.target, bytes.length);
        if (jxl.source !== url || target < jxl.fed || !jxl.ctx) {
          await startSession(url);
          clearCanvas();
        }
        if (jxl.done) break;

        const remaining = target - jxl.fed;
        if (remaining <= 0) {
          // Settle a flush deferred by the rate limit, or this pump exits still
          // dirty and the trailing timer below re-arms itself forever.
          if (jxl.dirty) flushNow();
          break;
        }
        // Sub-threshold delta: wait for the trailing forced pass rather than pay
        // a full decode step for a couple of KB.
        if (!force && remaining < MIN_FEED && target < bytes.length) {
          jxl.dirty = true;
          break;
        }

        const end = Math.min(jxl.fed + CHUNK, target);
        const len = end - jxl.fed;
        new Uint8Array(jxl.X.memory.buffer, jxl.buf, len).set(bytes.subarray(jxl.fed, end));
        const ret = jxl.X.jxl_feed(jxl.ctx, jxl.buf, len);
        jxl.fed = end;

        if (ret === -1) {
          jxl.errorShown = true;
          setStatus('The JPEG XL decoder failed: ' + decoderError());
          jxl.done = true;
          break;
        }
        // 0 = whole image decoded. 2 = an animation frame landed; these stills
        // never report it, but treating it as "done" keeps the loop honest.
        if (ret === 0 || ret === 2) jxl.done = true;

        const finished = jxl.done || jxl.fed >= bytes.length;
        if (finished || force || performance.now() - jxl.lastFlush >= MIN_FLUSH_GAP) {
          flushNow();
        } else {
          jxl.dirty = true;
        }
        updateJxlReadout();
        if (jxl.done) break;
        await new Promise((r) => setTimeout(r, 0));
      }
    } catch (err) {
      console.error(err);
      jxl.errorShown = true;
      setStatus('The JPEG XL decoder failed to start: ' + (err && err.message));
      // Not `done`: the module fetch can fail transiently, and the next slider
      // move should be free to try again rather than wedging the pane forever.
      jxl.source = null;
    } finally {
      jxl.running = false;
      updateJxlReadout();
      const pendingFeed = jxl.target - jxl.fed;
      /* A target that moved while we were pumping needs another pass — but only
         when there is enough of it to clear MIN_FEED. Recursing on a remainder
         the feed gate then refuses is an infinite synchronous loop: the pump
         breaks without progress, lands here with the same shortfall, and calls
         itself again. Anything smaller waits for the forced pass below, which
         ignores the gate. */
      if (!jxl.done && pendingFeed >= MIN_FEED) pumpJxl();
      // Bytes or a flush held back by the rate limits still have to land once
      // the slider settles, or the pane keeps showing a stale frame.
      else if (!jxl.done && (jxl.dirty || pendingFeed > 0) && !jxl.flushTimer) {
        jxl.flushTimer = window.setTimeout(() => {
          jxl.flushTimer = 0;
          if (jxl.running || jxl.done) return;
          jxl.force = true;
          pumpJxl();
        }, MIN_FLUSH_GAP);
      }
    }
  }

  /* ---------- readouts ---------- */

  function setStatus(text) {
    el.status.textContent = text || '';
    el.status.hidden = !text;
  }

  // Floor, not round: 110,523 of 110,639 bytes is not "100% received".
  function pct(n, total) {
    return total ? Math.min(100, Math.floor((n / total) * 100)) : 0;
  }

  function updateJpegReadout() {
    const meta = jpegMeta(current, jpegMode);
    const shown = Math.min(bytesReceived, meta.size);
    el.jpegLabel.textContent = jpegMode === 'progressive' ? 'Progressive JPEG' : 'JPEG';
    el.jpegBytes.textContent = fmt.format(shown);
    el.jpegTotal.textContent = `of ${fmt.format(meta.size)} B`;
    const jpegDone = shown >= meta.size;
    // Complete here means "every byte has arrived", which is what this block
    // counts — not whether the decoder has finished its last refinement pass.
    el.jpegReadout.classList.toggle('is-complete', jpegDone);
    el.jpegState.textContent = jpegDone
      ? 'Complete'
      : jpegMode === 'progressive'
        ? `Coarse passes only — ${pct(shown, meta.size)}% received`
        : `Top of the image only — ${pct(shown, meta.size)}% received`;
  }

  function updateJxlReadout() {
    const total = current.jxl.size;
    const shown = Math.min(bytesReceived, total);
    el.jxlBytes.textContent = fmt.format(shown);
    el.jxlTotal.textContent = `of ${fmt.format(total)} B`;
    el.jxlReadout.classList.toggle('is-complete', shown >= total);
    el.jxlState.textContent = jxl.done
      ? 'Complete'
      : jxl.painted
        ? `Full frame, still refining — ${pct(shown, total)}% received`
        : `Nothing decodable yet — ${pct(shown, total)}% received`;
  }

  function updateReceived() {
    el.received.textContent = `${fmt.format(bytesReceived)} bytes received`;
  }

  /* ---------- state ---------- */

  function maxBytes() {
    return Math.max(jpegMeta(current, jpegMode).size, current.jxl.size);
  }

  function setBytes(n, fromSlider) {
    bytesReceived = Math.max(0, Math.min(Math.round(n), maxBytes()));
    if (!fromSlider) el.slider.value = String(bytesReceived);
    renderJpeg(bytesReceived);
    jxl.target = Math.min(bytesReceived, current.jxl.size);
    pumpJxl();
    updateReceived();
    updateJpegReadout();
    updateJxlReadout();
  }

  function syncSliderRange() {
    el.slider.max = String(maxBytes());
  }

  async function selectImage(key) {
    stopPlayback();
    current = manifest.images.find((i) => i.key === key) || manifest.images[0];
    el.credit.innerHTML = `“${current.title}” by <a href="${current.photographerUrl}" target="_blank" rel="noopener noreferrer">${current.photographer}</a> on Unsplash`;
    el.note.textContent = current.note || '';
    el.jpegCanvas.setAttribute('aria-label', current.title + ', decoded from a truncated JPEG');
    el.dimensions.forEach((node) => {
      node.textContent = `${current.width} × ${current.height}`;
    });
    // The pairs are not all the same shape, so the panes reserve this image's
    // aspect ratio before anything decodes into them.
    el.panes.style.setProperty('--pd-aspect', `${current.width} / ${current.height}`);
    el.jxlCanvas.setAttribute(
      'aria-label',
      current.title + ', decoded from a truncated JPEG XL file',
    );
    resetJpeg();
    clearCanvas();
    await withLoadingStatus();
    setBytes(0);
  }

  // Fetching the selected variant can take a moment on the larger pairs.
  async function withLoadingStatus() {
    setStatus('Loading images…');
    try {
      await loadCurrent();
      setStatus('');
    } catch (err) {
      console.error(err);
      setStatus('Could not load the demo images: ' + (err && err.message));
    }
    syncSliderRange();
  }

  /* ---------- playback ---------- */

  const PLAY_MS = 7000;
  const HOLD_MS = 1600;

  let holdTimer = 0;

  function stopPlayback() {
    playing = false;
    cancelAnimationFrame(playRaf);
    window.clearTimeout(holdTimer);
    el.play.setAttribute('aria-pressed', 'false');
    el.play.textContent = 'Play';
  }

  function startPlayback() {
    playing = true;
    el.play.setAttribute('aria-pressed', 'true');
    el.play.textContent = 'Pause';
    const total = maxBytes();
    const from = bytesReceived >= total ? 0 : bytesReceived;
    const start = performance.now();
    const step = (now) => {
      if (!playing) return;
      const t = (now - start) / PLAY_MS;
      if (t >= 1) {
        setBytes(total);
        // Hold on the finished frame, then run it again from the top.
        holdTimer = window.setTimeout(() => {
          if (!playing) return;
          setBytes(0);
          startPlayback();
        }, HOLD_MS);
        return;
      }
      setBytes(from + (total - from) * t);
      playRaf = requestAnimationFrame(step);
    };
    playRaf = requestAnimationFrame(step);
  }

  /* ---------- wiring ---------- */

  el.picker.addEventListener('change', (e) => selectImage(e.target.value));

  el.jpegMode.forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (jpegMode === btn.dataset.jpegMode) return;
      jpegMode = btn.dataset.jpegMode;
      el.jpegMode.forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-selected', on);
        b.setAttribute('aria-pressed', String(on));
      });
      const at = bytesReceived;
      resetJpeg();
      await withLoadingStatus();
      setBytes(at);
    });
  });

  el.slider.addEventListener('input', () => {
    stopPlayback();
    setBytes(Number(el.slider.value), true);
  });

  el.play.addEventListener('click', () => (playing ? stopPlayback() : startPlayback()));

  selectImage(manifest.images[0].key);
})();
