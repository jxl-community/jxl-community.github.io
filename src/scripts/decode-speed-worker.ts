// Runs the shipped decoder off the UI thread. A worker can be terminated even
// if malformed input traps or a synchronous WASM decode takes too long.
type Decoder = {
  memory: WebAssembly.Memory;
  jxl_new(): number;
  jxl_free(ctx: number): void;
  jxl_alloc(size: number): number;
  jxl_dealloc(ptr: number, size: number): void;
  jxl_set_output_format(ctx: number, format: number): void;
  jxl_feed(ctx: number, ptr: number, size: number): number;
  jxl_flush(ctx: number): number;
  jxl_width(ctx: number): number;
  jxl_height(ctx: number): number;
  jxl_pixels(ctx: number): number;
};

let module: WebAssembly.Module | undefined;
let simd = false;

async function loadDecoder() {
  if (!module) {
    simd = WebAssembly.validate(
      new Uint8Array([
        0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0,
        253, 15, 253, 98, 11,
      ]),
    );
    const response = await fetch(`/resources/jxl_decoder_rs${simd ? '_simd' : ''}.wasm`);
    if (!response.ok) throw new Error(`WASM download failed (HTTP ${response.status})`);
    module = await WebAssembly.compile(await response.arrayBuffer());
  }
  return module;
}

function decode(X: Decoder, bytes: Uint8Array) {
  const start = performance.now();
  const ctx = X.jxl_new();
  let ptr = 0;
  let trapped = false;
  try {
    ptr = X.jxl_alloc(bytes.length);
    X.jxl_set_output_format(ctx, 0);
    new Uint8Array(X.memory.buffer, ptr, bytes.length).set(bytes);
    const status = X.jxl_feed(ctx, ptr, bytes.length);
    if (status === 2) throw new Error('Animated files are not supported by this still-image test');
    if (status !== 0 || X.jxl_flush(ctx) !== 1)
      throw new Error('WASM could not decode the complete file');
    const width = X.jxl_width(ctx);
    const height = X.jxl_height(ctx);
    if (!width || !height) throw new Error('Decoder returned no pixels');
    // Include the copy needed to use these pixels outside WASM, but not drawing
    // or re-encoding them. A new view is required after WASM memory growth.
    const pixels = new Uint8Array(X.memory.buffer, X.jxl_pixels(ctx), width * height * 4).slice();
    const ms = performance.now() - start;
    if (pixels.length !== width * height * 4) throw new Error('Incomplete output');
    return { width, height, ms };
  } catch (error) {
    trapped = error instanceof WebAssembly.RuntimeError;
    throw error;
  } finally {
    // A trapped Rust instance is dead; do not re-enter it to free allocations.
    if (!trapped) {
      X.jxl_free(ctx);
      if (ptr) X.jxl_dealloc(ptr, bytes.length);
    }
  }
}

self.onmessage = async (event: MessageEvent) => {
  try {
    const compiled = await loadDecoder();
    if (event.data.type === 'init') {
      self.postMessage({ ready: true });
      return;
    }
    // Re-instantiate for each file so a failed image cannot poison later ones.
    const X = (await WebAssembly.instantiate(compiled, {})).exports as unknown as Decoder;
    const bytes = new Uint8Array(event.data.bytes);
    const warmup = decode(X, bytes);
    const samples: number[] = [];
    for (let i = 0; i < event.data.repeats; i++) samples.push(decode(X, bytes).ms);
    self.postMessage({
      width: warmup.width,
      height: warmup.height,
      samples,
      api: `jxl-rs · ${simd ? 'SIMD' : 'scalar'}`,
    });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'WASM decode failed' });
  }
};

export {};
