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
    codecPicker: root.querySelector('#pd-codec-picker'),
    modeButtons: root.querySelectorAll('[data-mode]'),
    modeLabel: root.querySelector('#pd-mode-label'),
    slider: root.querySelector('#pd-slider'),
    play: root.querySelector('#pd-play'),
    panes: root.querySelector('#pd-panes'),
    srcImg: root.querySelector('#pd-src-img'),
    srcStage: root.querySelector('#pd-src-stage'),
    meta: root.querySelector('#pd-meta'),
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
    credit: root.querySelector('#pd-credit'),
  };

  const fmt = new Intl.NumberFormat('en-US');
  const files = new Map(); // url -> Uint8Array
  let current = manifest.images[0];
  let codecKey = manifest.codecs[0].key;
  let modeKey = 'sequential';

  const codecDef = () => manifest.codecs.find((c) => c.key === codecKey);
  const modeDef = () => codecDef().modes.find((m) => m.key === modeKey) || codecDef().modes[0];
  // Every variant is keyed "codec:mode" in the manifest the page ships.
  const variant = () => current.variants[`${codecKey}:${modeDef().key}`];
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

  const jpegUrl = () => variant().url;
  const jpegMeta = () => variant();

  // Only the variant on screen is worth downloading — the homepage-video pair
  // alone is close to 3 MB across its three files.
  async function loadCurrent() {
    // Only the JPEG XL pane decodes in-page; the worker fetches the other.
    await bytesFor(current.jxl.url);
  }

  /* ---------- source pane ---------- */

  /* The left pane is an <img> whose download is deliberately left in flight,
     served by pd-stream-sw.js. That distinction is the whole point: a complete
     response containing truncated bytes reads as a corrupt file, and AVIF and
     WebP show nothing at all for it, while a response still open is a download
     in progress and Chrome decodes both. Only the second is what an interrupted
     download actually looks like.

     Two consequences follow. The pane cannot blit to a canvas, because
     drawImage does nothing for an image whose load has not completed — so the
     element draws itself. And dragging forward never changes `src`: the worker
     enqueues more bytes into the same open response and the picture refines in
     place, which also means there is no per-frame swap to band.

     Bytes cannot be un-sent, so dragging backwards starts a new stream under a
     new id and the pane blanks for that moment. */

  const STREAM_URL = '/resources/pd-stream';
  /* The stream restarts on each new position, so requests are throttled rather
     than issued per pointer move or per animation frame.

     A throttle, not a debounce: playback advances the target every frame, and a
     debounce is reset by each one, so it never fires until playback stops —
     which left the pane frozen until you hit pause. */
  const RESTART_INTERVAL = 200;
  /* How long an element is left in place before being retired. Measured: a
     fresh stream takes 300-500 ms to put pixels on screen, so retiring the
     previous element on the next restart (200 ms) removed it while neither it
     nor its replacement had painted, and the pane sat frozen. */
  const PAINT_GRACE = 700;
  /* A 1x1 transparent GIF, used as the "showing nothing" source. An <img> with
     no `src` at all draws a broken-image icon in Chrome, which is just as
     distracting as the alt text was. */
  const BLANK_PIXEL =
    'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

  const jpeg = {
    id: null, // current stream id, null when nothing is streaming
    wanted: 0,
    seq: 0,
    timer: 0,
    lastStart: 0,
    layers: [], // elements awaiting retirement, newest last
  };

  let swReady = null;
  let swAvailable = false;

  function registerStreamWorker() {
    if (swReady) return swReady;
    if (!('serviceWorker' in navigator)) {
      swReady = Promise.resolve(null);
      return swReady;
    }
    swReady = navigator.serviceWorker
      .register('/resources/pd-stream-sw.js', { scope: '/resources/' })
      .then(async () => {
        await navigator.serviceWorker.ready;
        // A freshly installed worker does not control this page until it takes
        // over, and the <img> request has to go through it.
        if (!navigator.serviceWorker.controller) {
          await new Promise((resolve) => {
            navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
          });
        }
        return navigator.serviceWorker.controller;
      })
      .catch(() => null);
    return swReady;
  }

  function tellWorker(message) {
    const worker = navigator.serviceWorker && navigator.serviceWorker.controller;
    if (worker) worker.postMessage(message);
  }

  /* Closing a stream is destructive, not just tidy-up: a closed response is a
     *complete* file as far as the browser is concerned, and a complete
     truncated WebP renders nothing, so closing one throws away the partial
     picture it was already showing. A truncated JPEG survives it, which is why
     this only shows on WebP: during playback its pane stays empty, because at
     any instant the visible element is either the incoming one (not yet
     decoded) or the outgoing one (just closed, pixels discarded).

     Holding streams open past their replacement fixes WebP and breaks
     everything else — more never-completing requests than the browser will run
     at once, so nothing loads at all. Scrubbing is unaffected either way, since
     only one stream is open at a time. */
  function releaseId(id) {
    if (id) tellWorker({ type: 'pd-release', id });
  }

  function clearSource() {
    for (const layer of jpeg.layers.splice(0)) {
      if (layer.el === el.srcImg) continue;
      layer.el.remove();
      releaseId(layer.id);
    }
    releaseId(jpeg.id);
    jpeg.id = null;
    el.srcImg.src = BLANK_PIXEL;
  }

  function resetJpeg() {
    window.clearTimeout(jpeg.timer);
    jpeg.timer = 0;
    clearSource();
    jpeg.wanted = 0;
  }

  /* Each slider position gets its own stream, opened with that many bytes
     already queued and then left hanging.

     Feeding more bytes into an *existing* open response looks like the tidier
     model, and it is what a real download does — but only JPEG re-decodes as
     those bytes trickle in. Chrome decodes an AVIF once, when data first
     arrives, and ignores later chunks on the same response: advancing an open
     stream leaves the AVIF pane blank while opening a fresh one at the same
     byte count renders it. Measured at 7% of the pane versus 100%. So the
     stream restarts, which is also what the reference implementation this was
     modelled on does. */
  function startStream(bytes) {
    const id = `pd-${++jpeg.seq}`;
    const params = new URLSearchParams({
      id,
      src: jpegUrl(),
      bytes: String(bytes),
    });

    /* A fresh element every time, rather than re-pointing the existing one.

       Reassigning `src` aborts the previous load, and these loads are streams
       that never finish by design — aborting one leaves the element unable to
       paint progressively from the next, so the pane stays blank while the
       bytes arrive perfectly well. A brand new element in the same place
       renders exactly as expected. (The reference implementation reaches the
       same place from the other direction: it keys the element on the slider
       value, so the framework replaces it per position.)

       The one it replaces stays in the DOM underneath until the next swap. A
       new element has nothing decoded for the first moment of its life, and
       during playback a new one arrives several times a second — removing the
       old one immediately left the pane showing whichever element had not
       painted yet, which looked frozen until playback stopped. Keeping the
       previous frame beneath means the new one simply paints over it.

       Both stay visible: a hidden element is not rasterised, so hiding the
       incoming one until it "looks ready" would stop it ever decoding. The
       incoming element is transparent until it has pixels, which is exactly the
       behaviour needed for the old frame to show through. */
    const fresh = el.srcImg.cloneNode(false);
    fresh.src = `${STREAM_URL}?${params}`;

    const previous = el.srcImg;
    const previousId = jpeg.id;
    jpeg.id = id;
    el.srcImg.after(fresh); // later sibling paints on top
    el.srcImg = fresh;

    /* Close the outgoing stream now, and retire its element after a grace
       period. Leaving the stream open instead would keep more of them in flight
       than the browser will run at once, and everything stalls — including the
       formats that were working. See the WebP note above for what that costs. */
    releaseId(previousId);
    const layer = { el: previous, id: previousId };
    jpeg.layers.push(layer);
    window.setTimeout(() => {
      const i = jpeg.layers.indexOf(layer);
      if (i !== -1) jpeg.layers.splice(i, 1);
      if (layer.el === el.srcImg) return;
      layer.el.remove();
    }, PAINT_GRACE);
  }

  function renderJpeg(n) {
    const meta = jpegMeta();
    if (!meta || !swAvailable) return;
    jpeg.wanted = Math.min(n, meta.size);
    scheduleStream();
  }

  /* Leading edge plus a trailing catch-up: the first move opens a stream at
     once, anything inside the interval collapses into one more when it elapses.
     Dragging and playback both keep updating, and whatever position is landed
     on last always gets a stream of its own. */
  function scheduleStream() {
    if (jpeg.timer) return;
    const since = performance.now() - jpeg.lastStart;
    if (since >= RESTART_INTERVAL) {
      jpeg.lastStart = performance.now();
      startStream(jpeg.wanted);
      return;
    }
    jpeg.timer = window.setTimeout(() => {
      jpeg.timer = 0;
      jpeg.lastStart = performance.now();
      startStream(jpeg.wanted);
    }, RESTART_INTERVAL - since);
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

  /* What the pane is actually showing at this point in the download. AVIF and
     WebP get their own wording because they show nothing at all until the last
     byte — including the AVIF encoded with progressive layers, which no current
     browser paints incrementally. Saying so is the honest version of a blank
     pane, and it is half of what this page is for. */
  /* Describes how the file is laid out, not what is currently on screen.

     There is no reliable way to ask the second question: `naturalWidth` turns
     non-zero in WebKit as soon as an AVIF header parses, well before any pixels
     exist, and drawImage is a no-op for an in-flight image so the canvas cannot
     be sampled either. The answer is also browser-dependent — Chrome paints a
     layered AVIF from its base layer, Safari paints nothing — so the pane is
     left to show that for itself while the wording stays true everywhere. */
  function partialWording(received) {
    if (codecKey === 'avif') {
      return modeKey === 'progressive'
        ? `Layered — base layer first — ${received}% received`
        : `Single layer — needs the whole file — ${received}% received`;
    }
    if (codecKey === 'webp') return `Partial file — ${received}% received`;
    return modeKey === 'progressive'
      ? `Coarse passes only — ${received}% received`
      : `Top of the image only — ${received}% received`;
  }

  function updateJpegReadout() {
    const meta = jpegMeta();
    const shown = Math.min(bytesReceived, meta.size);
    const codec = codecDef();
    const mode = modeDef();
    el.jpegLabel.textContent =
      codec.modes.length > 1 ? `${mode.label} ${codec.label}` : codec.label;
    el.jpegBytes.textContent = fmt.format(shown);
    el.jpegTotal.textContent = `of ${fmt.format(meta.size)} B`;
    const jpegDone = shown >= meta.size;
    // Complete here means "every byte has arrived", which is what this block
    // counts — not whether the decoder has finished its last refinement pass.
    el.jpegReadout.classList.toggle('is-complete', jpegDone);
    el.jpegState.textContent = jpegDone ? 'Complete' : partialWording(pct(shown, meta.size));
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

  /* Size and both ssimulacra2 scores, so the byte counts in the panes can be
     read as a compression result rather than a quality difference. The scores
     come from the encode run's own CSV, and the left one follows the codec and
     mode currently selected. */
  function updateMeta() {
    const variantScore = variant().ssimulacra2.toFixed(1);
    const jxlScore = current.jxl.ssimulacra2.toFixed(1);
    el.meta.textContent =
      `${current.width} × ${current.height}, ${codecDef().label} ssimu2: ${variantScore}, ` +
      `JPEG XL ssimu2: ${jxlScore}`;
  }

  function updateReceived() {
    el.received.textContent = `${fmt.format(bytesReceived)} bytes received`;
  }

  /* ---------- state ---------- */

  function maxBytes() {
    return Math.max(jpegMeta().size, current.jxl.size);
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
    updateMeta();
    /* Two links, the way Unsplash asks for attribution: the photographer's name
       goes to their portfolio, "Unsplash" goes to the photo itself. Previously
       the name pointed at the photo, which credited the picture but not the
       person. */
    const link = (href, text) =>
      `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    el.credit.innerHTML =
      `“${current.title}” by ${link(current.portfolio, current.photographer)} ` +
      `on ${link(current.url, 'Unsplash')}`;
    // Never on the <img> itself: alt text is drawn whenever there are no
    // pixels, which is most of what this pane does.
    el.srcStage.setAttribute(
      'aria-label',
      `${current.title} by ${current.photographer}, from a partial ${codecDef().label} download`,
    );
    // The pairs are not all the same shape, so the panes reserve this image's
    // aspect ratio before anything decodes into them.
    el.panes.style.setProperty('--pd-aspect', `${current.width} / ${current.height}`);
    el.jxlCanvas.setAttribute(
      'aria-label',
      `${current.title} by ${current.photographer}, decoded from a partial JPEG XL download`,
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
      swAvailable = Boolean(await registerStreamWorker());
      if (!swAvailable) {
        setStatus(
          'The left pane needs a service worker to simulate a partial download, and one is not available here (private browsing blocks them). The JPEG XL pane still works.',
        );
      }
      await loadCurrent();
      if (swAvailable) setStatus('');
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

  /* Relabel the mode buttons for the selected codec and disable the ones it
     does not offer. WebP has a single mode, so its control is inert rather than
     presenting a choice that changes nothing. */
  function syncModeControl() {
    const codec = codecDef();
    el.modeLabel.textContent = `${codec.label} encoding`;
    el.modeButtons.forEach((btn) => {
      const def = codec.modes.find((m) => m.key === btn.dataset.mode);
      btn.hidden = !def;
      if (!def) {
        // Leave nothing stale behind: a hidden button that kept `is-selected`
        // would light up again the moment a codec offering it is chosen.
        btn.classList.remove('is-selected');
        btn.setAttribute('aria-pressed', 'false');
        return;
      }
      btn.textContent = def.label;
      const on = def.key === modeDef().key;
      btn.classList.toggle('is-selected', on);
      btn.setAttribute('aria-pressed', String(on));
      btn.disabled = codec.modes.length === 1;
    });
  }

  async function reloadPane(at) {
    resetJpeg();
    await withLoadingStatus();
    setBytes(at);
  }

  el.codecPicker.addEventListener('change', async (e) => {
    codecKey = e.target.value;
    // Carry the mode across where the new codec has it; fall back to its first.
    if (!codecDef().modes.some((m) => m.key === modeKey)) modeKey = codecDef().modes[0].key;
    syncModeControl();
    updateMeta();
    await reloadPane(bytesReceived);
  });

  el.modeButtons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (btn.disabled || modeKey === btn.dataset.mode) return;
      modeKey = btn.dataset.mode;
      syncModeControl();
      updateMeta();
      await reloadPane(bytesReceived);
    });
  });

  el.slider.addEventListener('input', () => {
    stopPlayback();
    setBytes(Number(el.slider.value), true);
  });

  el.play.addEventListener('click', () => (playing ? stopPlayback() : startPlayback()));

  syncModeControl();
  selectImage(manifest.images[0].key);
})();
