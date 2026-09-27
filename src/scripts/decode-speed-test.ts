type Variant = { label: string; encoder?: string; specifics?: string; mime: string; url: string };
type TestImage = {
  id: string;
  title: string;
  preview: string;
  previewFile: { width: number; height: number };
  variants: Variant[];
};
type Result = {
  image: TestImage;
  variant: Variant;
  decoder: 'native' | 'wasm';
  bytes?: number;
  width?: number;
  height?: number;
  ms?: number;
  speed?: number;
  api?: string;
  error?: string;
};
type Measurement = { width: number; height: number; samples: number[]; api: string };
const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const manifest = JSON.parse(element('ds-manifest').textContent!) as { images: TestImage[] };
const start = element<HTMLButtonElement>('ds-start');
const stop = element<HTMLButtonElement>('ds-stop');
const repeats = element<HTMLSelectElement>('ds-repeats');
const wasmOption = element('ds-wasm-option');
const includeWasm = element<HTMLInputElement>('ds-wasm');
const status = element('ds-status');
const progress = element<HTMLProgressElement>('ds-progress');
const results = element('ds-results');
let controller: AbortController | undefined;
let worker: Worker | undefined;
let lastResults: Result[] = [];
let lastRepeats = 7;
// Set once the page knows whether this browser decodes JPEG XL natively.
let nativeJxl = false;

const message = (error: unknown) => (error instanceof Error ? error.message : 'Decode failed');
const number = (n: number) =>
  n.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const median = (samples: number[]) =>
  [...samples].sort((a, b) => a - b)[Math.floor(samples.length / 2)];
const decoderName = (r: Result) => (r.decoder === 'wasm' ? 'WASM' : 'Native');

function workerRequest(data: object, signal: AbortSignal): Promise<Measurement> {
  signal.throwIfAborted();
  worker ??= new Worker(new URL('./decode-speed-worker.ts', import.meta.url), { type: 'module' });
  const current = worker;
  return new Promise((resolve, reject) => {
    const finish = (error?: Error, value?: Measurement) => {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      current.onmessage = null;
      current.onerror = null;
      if (error) {
        current.terminate();
        if (worker === current) worker = undefined;
        reject(error);
      } else resolve(value!);
    };
    const abort = () => finish(new Error('Test cancelled'));
    const timer = window.setTimeout(
      () => finish(new Error('WASM test timed out after 60 seconds')),
      60_000,
    );
    signal.addEventListener('abort', abort, { once: true });
    current.onmessage = (event) =>
      event.data.error ? finish(new Error(event.data.error)) : finish(undefined, event.data);
    current.onerror = () => finish(new Error('WASM worker could not run'));
    current.postMessage(data);
  });
}

// No polyfill is loaded on this page. Each call uses a new Blob, URL, and
// detached image; native support is tested on the actual bytes, not the UA.
async function nativeDecode(bytes: ArrayBuffer, mime: string, signal: AbortSignal) {
  signal.throwIfAborted();
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const image = new Image();
  try {
    return await new Promise<{ width: number; height: number; ms: number }>((resolve, reject) => {
      const finish = (error?: Error) => {
        clearTimeout(timer);
        signal.removeEventListener('abort', abort);
        if (error) reject(error);
        else
          resolve({
            width: image.naturalWidth,
            height: image.naturalHeight,
            ms: performance.now() - begin,
          });
      };
      const abort = () => finish(new Error('Test cancelled'));
      const timer = window.setTimeout(() => finish(new Error('Native decode timed out')), 15_000);
      signal.addEventListener('abort', abort, { once: true });
      const begin = performance.now();
      image.src = url;
      image.decode().then(
        () => {
          if (!image.naturalWidth || !image.naturalHeight) finish(new Error('No decoded pixels'));
          else finish();
        },
        () => finish(new Error('Native decode unavailable.')),
      );
    });
  } finally {
    image.removeAttribute('src');
    URL.revokeObjectURL(url);
  }
}

async function measureNative(
  bytes: ArrayBuffer,
  mime: string,
  count: number,
  signal: AbortSignal,
): Promise<Measurement> {
  const warmup = await nativeDecode(bytes, mime, signal);
  const samples: number[] = [];
  for (let i = 0; i < count; i++) samples.push((await nativeDecode(bytes, mime, signal)).ms);
  return { width: warmup.width, height: warmup.height, samples, api: 'HTMLImageElement.decode' };
}

function node<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (className) el.className = className;
  return el;
}

let tooltipId = 0;
// The tooltip shows while `trigger` is hovered or focused; `anchor` (inside
// the trigger) is the box it is positioned against.
function addTooltip(trigger: HTMLElement, content: string | HTMLElement, anchor = trigger) {
  trigger.classList.add('ds-tip-trigger');
  const tooltip = node('span', undefined, 'ds-tooltip');
  tooltip.id = `ds-tip-${++tooltipId}`;
  tooltip.role = 'tooltip';
  tooltip.append(content);
  trigger.tabIndex = 0;
  trigger.setAttribute('aria-describedby', tooltip.id);
  trigger.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') trigger.dataset.dismissed = 'true';
  });
  trigger.addEventListener('blur', () => delete trigger.dataset.dismissed);
  trigger.addEventListener('mouseleave', () => delete trigger.dataset.dismissed);
  anchor.append(tooltip);
  return trigger;
}

function render(rows: Result[], count: number) {
  const body = document.createDocumentFragment();
  let group: HTMLTableSectionElement;
  let imageId: string | undefined;
  for (const r of rows) {
    const row = node('tr');
    row.dataset.decoder = r.decoder;
    if (r.image.id !== imageId) {
      imageId = r.image.id;
      group = node('tbody');
      body.append(group);
      const imageCell = node('th', undefined, 'ds-image-cell');
      imageCell.scope = 'rowgroup';
      imageCell.rowSpan = rows.filter((result) => result.image.id === imageId).length;
      const thumbnail = node('img');
      thumbnail.src = r.image.preview;
      thumbnail.alt = '';
      // Uncropped: one width for every photo; height follows its aspect ratio.
      thumbnail.width = 80;
      thumbnail.height = Math.round((80 * r.image.previewFile.height) / r.image.previewFile.width);
      thumbnail.decoding = 'async';
      imageCell.append(thumbnail, node('span', r.image.title));
      row.append(imageCell);
    }
    const title = node('th');
    title.scope = 'row';
    const encoderDetails = node('span', undefined, 'ds-tooltip-lines');
    encoderDetails.append(node('strong', r.variant.encoder || r.variant.label));
    if (r.variant.specifics) encoderDetails.append(node('span', r.variant.specifics, 'ds-mono'));
    title.append(addTooltip(node('span', r.variant.label, 'ds-info-label'), encoderDetails));
    const decoder = node('td');
    const api = r.api || (r.decoder === 'native' ? 'HTMLImageElement.decode' : undefined);
    if (api) {
      decoder.append(addTooltip(node('span', decoderName(r), 'ds-info-label'), api));
    } else decoder.textContent = decoderName(r);
    row.append(
      title,
      decoder,
      node('td', r.width ? `${r.width} × ${r.height}` : '—'),
      node('td', r.bytes === undefined ? '—' : `${number(r.bytes / 1024)} KiB`),
      node('td', r.ms === undefined ? '—' : `${number(r.ms)} ms`),
      node('td', r.speed === undefined ? '—' : `${number(r.speed)} MP/s`),
      node('td', r.error || 'Complete', r.error ? 'ds-unavailable' : 'ds-good'),
    );
    group!.append(row);
  }
  const table = element('ds-table');
  table.querySelectorAll('tbody').forEach((group) => group.remove());
  table.append(body);

  const chart = document.createDocumentFragment();
  const max = Math.max(0, ...rows.map((r) => r.speed ?? 0));
  for (const image of manifest.images) {
    const group = node('div', undefined, 'ds-chart-group');
    group.append(node('h3', image.title));
    const measured = rows.filter((r) => r.image.id === image.id && r.speed !== undefined);
    if (!measured.length)
      group.append(node('p', 'No completed decodes for this image.', 'ds-muted'));
    // One track per file, fastest first. The headline speed is native when it
    // ran, otherwise WASM. JPEG XL overlays a half-height WASM bar on the
    // full-height native bar; both start at zero and are never summed.
    const tracks = image.variants
      .map((variant) => {
        const matching = rows.filter(
          (r) => r.image.id === image.id && r.variant.url === variant.url,
        );
        const speeds = {
          native: matching.find((r) => r.decoder === 'native')?.speed,
          wasm: matching.find((r) => r.decoder === 'wasm')?.speed,
        };
        return { variant, matching, speeds, headline: speeds.native ?? speeds.wasm };
      })
      .filter((t) => t.headline !== undefined)
      .sort((a, b) => b.headline! - a.headline!);
    for (const { variant, matching, speeds, headline } of tracks) {
      const barRow = node('div', undefined, 'ds-bar-row');
      barRow.dataset.file = variant.url;
      const track = node('div', undefined, 'ds-bar-track');
      const isJxl = variant.mime === 'image/jxl';
      track.setAttribute('aria-hidden', 'true');
      const details = node('span', undefined, 'ds-tooltip-lines');
      details.append(node('strong', variant.label));
      for (const decoder of isJxl ? (['native', 'wasm'] as const) : (['native'] as const)) {
        const result = matching.find((r) => r.decoder === decoder);
        if (result?.speed !== undefined) {
          const bar = node('span', undefined, 'ds-bar');
          bar.dataset.decoder = decoder;
          bar.dataset.jxl = String(isJxl);
          if (decoder === 'wasm' && speeds.native !== undefined) bar.dataset.overlay = 'true';
          bar.style.width = `${(result.speed / max) * 100}%`;
          track.append(bar);
        }
        details.append(
          node(
            'span',
            `${decoder === 'native' ? 'Native' : 'WASM'}: ${
              result?.speed !== undefined
                ? `${number(result.speed)} MP/s`
                : result?.error || 'Unavailable'
            }`,
          ),
        );
      }
      const cell = node('div', undefined, 'ds-bar-cell');
      cell.style.setProperty(
        '--ds-tip-x',
        String(Math.max(speeds.native ?? 0, speeds.wasm ?? 0) / max),
      );
      cell.append(track);
      barRow.append(
        node('span', variant.label),
        cell,
        node('span', number(headline!), 'ds-bar-value'),
      );
      addTooltip(barRow, details, cell);
      group.append(barRow);
    }
    chart.append(group);
  }
  element('ds-chart').replaceChildren(chart);
  element('ds-legend-wasm').hidden = !rows.some((r) => r.decoder === 'wasm');
  const complete = rows.filter((r) => !r.error).length;
  element('ds-summary').textContent =
    `${complete} of ${rows.length} results completed · Median of ${count} decodes after one warm-up · ${new Date().toLocaleString()}`;
  results.hidden = false;
}

async function run() {
  if (controller) return;
  controller = new AbortController();
  const signal = controller.signal;
  const count = Number(repeats.value);
  // WASM is optional only when native JPEG XL can stand in for it.
  const withWasm = !nativeJxl || includeWasm.checked;
  start.disabled = repeats.disabled = includeWasm.disabled = true;
  stop.hidden = false;
  results.hidden = true;
  progress.hidden = false;
  progress.value = 0;
  status.textContent = 'Downloading test files and preparing the decoder…';
  const rows: Result[] = manifest.images.flatMap((image) =>
    image.variants.flatMap((variant): Result[] =>
      variant.mime === 'image/jxl' && withWasm
        ? [
            { image, variant, decoder: 'wasm' },
            { image, variant, decoder: 'native' },
          ]
        : [{ image, variant, decoder: 'native' }],
    ),
  );
  try {
    const downloads = new Map<string, { bytes?: ArrayBuffer; error?: string }>();
    const urls = [...new Set(rows.map((r) => r.variant.url))];
    let loaded = 0;
    // Bounded download concurrency; no network work overlaps the timed phase.
    const queue = [...urls];
    await Promise.all(
      Array.from({ length: Math.min(3, queue.length) }, async () => {
        while (queue.length) {
          signal.throwIfAborted();
          const url = queue.shift()!;
          const fetchController = new AbortController();
          const abort = () => fetchController.abort();
          signal.addEventListener('abort', abort, { once: true });
          const timeout = window.setTimeout(abort, 30_000);
          try {
            const response = await fetch(url, { signal: fetchController.signal });
            if (!response.ok) throw new Error(`Download failed (HTTP ${response.status})`);
            const bytes = await response.arrayBuffer();
            if (!bytes.byteLength) throw new Error('Downloaded file is empty');
            downloads.set(url, { bytes });
          } catch (error) {
            signal.throwIfAborted();
            downloads.set(url, {
              error: fetchController.signal.aborted ? 'Download timed out' : message(error),
            });
          } finally {
            clearTimeout(timeout);
            signal.removeEventListener('abort', abort);
          }
          progress.value = (++loaded / urls.length) * 0.2;
        }
      }),
    );
    let wasmError: string | undefined;
    if (withWasm) {
      try {
        await workerRequest({ type: 'init' }, signal);
      } catch (error) {
        signal.throwIfAborted();
        wasmError = message(error);
      }
    }

    // Shuffle the execution order to avoid always giving one codec the coldest
    // device. The displayed rows remain in the manifest's predictable order.
    const order = [...rows];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    for (const [index, row] of order.entries()) {
      signal.throwIfAborted();
      status.textContent = `Testing ${index + 1} of ${rows.length}: ${row.image.title} · ${row.variant.label} · ${decoderName(row)}`;
      const download = downloads.get(row.variant.url)!;
      row.bytes = download.bytes?.byteLength;
      try {
        if (download.error) throw new Error(download.error);
        if (row.decoder === 'wasm' && wasmError) throw new Error(wasmError);
        const measured =
          row.decoder === 'wasm'
            ? await workerRequest({ type: 'decode', bytes: download.bytes, repeats: count }, signal)
            : await measureNative(download.bytes!, row.variant.mime, count, signal);
        signal.throwIfAborted();
        const ms = median(measured.samples);
        if (ms <= 0) throw new Error('Timer precision is too low to measure this file');
        Object.assign(row, {
          width: measured.width,
          height: measured.height,
          api: measured.api,
          ms,
          speed: (measured.width * measured.height) / (ms * 1000),
        });
      } catch (error) {
        signal.throwIfAborted();
        row.error = message(error);
      }
      progress.value = 0.2 + ((index + 1) / rows.length) * 0.8;
    }
    lastResults = rows;
    lastRepeats = count;
    render(rows, count);
    status.textContent = 'Test complete. The full results table and chart are ready below.';
    start.textContent = 'Run again';
  } catch (error) {
    status.textContent = signal.aborted
      ? `${typeof signal.reason === 'string' ? signal.reason : 'Test cancelled.'} Run again when you’re ready.`
      : `The test could not finish: ${message(error)}. Try again.`;
    // Keep a previous completed run available; never publish a partial run.
    if (lastResults.length) results.hidden = false;
  } finally {
    worker?.terminate();
    worker = undefined;
    controller = undefined;
    start.disabled = repeats.disabled = includeWasm.disabled = false;
    stop.hidden = progress.hidden = true;
  }
}

// A 1×1 lossless JPEG XL codestream. If it decodes, native JPEG XL exists and
// WASM timings become optional; each test file is still checked on its own.
const JXL_PROBE = '/woAEBAUNwIIAAEAJABLGIsVwknkAAA=';
nativeDecode(
  Uint8Array.from(atob(JXL_PROBE), (c) => c.charCodeAt(0)).buffer,
  'image/jxl',
  new AbortController().signal,
)
  .then(
    () => true,
    () => false,
  )
  .then((supported) => {
    nativeJxl = supported;
    wasmOption.hidden = !supported;
    start.disabled = false;
    status.textContent = supported
      ? 'Ready. Your browser decodes JPEG XL natively; WASM timings are optional.'
      : 'Ready. Your browser has no native JPEG XL, so JPEG XL will be tested with WASM.';
  });
start.addEventListener('click', run);
stop.addEventListener('click', () => controller?.abort('Test cancelled.'));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) controller?.abort('Test stopped because the tab was hidden.');
});
window.addEventListener('pagehide', () => controller?.abort());
element('ds-export').addEventListener('click', () => {
  const rows = [
    [
      'Image',
      'Encoding',
      'Encoder',
      'Specifics',
      'Decoder',
      'API',
      'Bytes',
      'Width',
      'Height',
      'Decodes',
      'Median ms',
      'MP/s',
      'Status',
    ],
    ...lastResults.map((r) => [
      r.image.title,
      r.variant.label,
      r.variant.encoder || r.variant.label,
      r.variant.specifics,
      decoderName(r),
      r.api,
      r.bytes,
      r.width,
      r.height,
      lastRepeats,
      r.ms,
      r.speed,
      r.error || 'Complete',
    ]),
  ];
  const csv = rows
    .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = node('a');
  link.href = url;
  link.download = 'jpeg-xl-decode-speed.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
