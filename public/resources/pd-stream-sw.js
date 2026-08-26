/*! Partial-download simulator for the progressive loading demo.

    The page needs an <img> whose download is genuinely *in flight* — not a
    complete response that happens to contain truncated bytes. The difference
    decides what the browser will draw:

      complete response, truncated bytes  ->  a corrupt whole file. JPEG still
                                              paints the scanlines it parsed,
                                              but AVIF and WebP show nothing.
      response still open, N bytes sent   ->  a download in progress. Chrome
                                              decodes AVIF and WebP from this.

    Only the second case is what an interrupted download actually looks like,
    and there is no way to hand a streaming Response to an <img> from the page,
    hence a service worker.

    A stream stays open for the life of a selection. Dragging the slider forward
    posts `advance`, which enqueues the next slice into that same open response,
    so the <img> refines in place with no src change — no reload, no flash, and
    none of the compositor banding that swapping two <img> buffers caused.

    Bytes cannot be un-sent, so dragging backwards has to start a new stream.
    The page handles that by requesting a new id.

    Scope note: this file sits in /resources/ so its scope covers the demo page
    and the /resources/pd-stream URLs it serves. It caches nothing and touches
    no other request. */

const STREAM_PATH = '/resources/pd-stream';

/** id -> { bytes, sent, target, controller, closed } */
const streams = new Map();

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'pd-advance') {
    const stream = streams.get(data.id);
    if (!stream) return;
    stream.target = data.bytes;
    pump(stream);
  } else if (data.type === 'pd-release') {
    release(data.id);
  }
});

function release(id) {
  const stream = streams.get(id);
  if (!stream) return;
  streams.delete(id);
  if (stream.closed) return;
  stream.closed = true;
  try {
    stream.controller.close();
  } catch {
    // The consumer may already have gone away; nothing to do.
  }
}

function pump(stream) {
  if (stream.closed || !stream.bytes) return;
  const end = Math.min(stream.target, stream.bytes.length);
  if (end <= stream.sent) return;
  stream.controller.enqueue(stream.bytes.slice(stream.sent, end));
  stream.sent = end;
  // Closing at the end is what lets the <img> fire `load` and report complete;
  // a stream left open would leave it decoding forever.
  if (stream.sent >= stream.bytes.length) {
    stream.closed = true;
    try {
      stream.controller.close();
    } catch {
      /* consumer gone */
    }
  }
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname !== STREAM_PATH) return;
  event.respondWith(serve(url));
});

async function serve(url) {
  const id = url.searchParams.get('id');
  const src = url.searchParams.get('src');
  if (!id || !src) return new Response('missing id or src', { status: 400 });

  // Same-origin only: this worker must not become a general purpose proxy.
  const target = new URL(src, self.location.origin);
  if (target.origin !== self.location.origin) {
    return new Response('cross-origin source refused', { status: 403 });
  }

  const upstream = await fetch(target.href);
  if (!upstream.ok) return new Response('upstream failed', { status: upstream.status });
  const bytes = new Uint8Array(await upstream.arrayBuffer());

  const stream = {
    bytes,
    sent: 0,
    target: Number(url.searchParams.get('bytes')) || 0,
    controller: null,
    closed: false,
  };

  const body = new ReadableStream({
    start(controller) {
      stream.controller = controller;
      release(id); // a re-request for the same id supersedes the old stream
      streams.set(id, stream);
      pump(stream);
    },
    cancel() {
      stream.closed = true;
      streams.delete(id);
    },
  });

  return new Response(body, {
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') || 'application/octet-stream',
      'Cache-Control': 'no-store',
    },
  });
}
