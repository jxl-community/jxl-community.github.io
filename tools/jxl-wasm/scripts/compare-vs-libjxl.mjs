// Decode every given .jxl with both jxl-rs (this wasm module) and libjxl's djxl,
// then compare pixels. Reports max channel delta and PSNR per file.
//
//   node compare-vs-libjxl.mjs <file-list.txt> [limit]
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
import zlib from 'zlib';

const WASM = new URL('../target/wasm32-unknown-unknown/release/jxl_wasm.wasm', import.meta.url);
const wasmBytes = fs.readFileSync(WASM);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jxlcmp-'));

// --- minimal PNG reader (djxl writes PNG) -----------------------------------
function readPng(buf) {
  let i = 8, w = 0, h = 0, depth = 0, color = 0, idat = [];
  while (i < buf.length) {
    const len = buf.readUInt32BE(i); const type = buf.toString('ascii', i + 4, i + 8);
    const data = buf.subarray(i + 8, i + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; color = data[9]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    i += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const ch = { 0: 1, 2: 3, 4: 2, 6: 4 }[color];
  const bypp = ch * (depth / 8);
  const stride = w * bypp;
  const out = Buffer.alloc(h * stride);
  let pos = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[pos++];
    const line = raw.subarray(pos, pos + stride); pos += stride;
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    const cur = out.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bypp ? cur[x - bypp] : 0, b = prev[x], c = x >= bypp ? prev[x - bypp] : 0;
      let v = line[x];
      if (filter === 1) v += a; else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }
      cur[x] = v & 255;
    }
  }
  return { w, h, ch, depth, data: out };
}

const files = fs.readFileSync(process.argv[2], 'utf8').trim().split('\n').filter(Boolean);
const limit = process.argv[3] ? +process.argv[3] : files.length;
let same = 0, close = 0, differ = 0, refFail = 0, ourFail = 0, sizeMismatch = 0;
const worst = [];

let done = 0;
const t0 = Date.now();
for (const f of files.slice(0, limit)) {
  if (++done % 250 === 0) {
    const rate = done / ((Date.now() - t0) / 1000);
    console.log(`  ...${done}/${Math.min(limit, files.length)}  (${rate.toFixed(1)}/s)  identical=${same} close=${close} differ=${differ} fail=${ourFail + refFail}`);
  }
  // --- reference: djxl
  const refPng = path.join(tmp, 'ref.png');
  try {
    execFileSync('djxl', [f, refPng], { stdio: 'ignore', timeout: 120000 });
  } catch { refFail++; continue; }
  let ref;
  try { ref = readPng(fs.readFileSync(refPng)); } catch { refFail++; continue; }

  // --- ours: jxl-rs wasm
  let ours;
  try {
    const { instance: I } = await WebAssembly.instantiate(wasmBytes, {});
    const X = I.exports;
    const bytes = new Uint8Array(fs.readFileSync(f));
    const c = X.jxl_new();
    const p = X.jxl_alloc(bytes.length);
    new Uint8Array(X.memory.buffer, p, bytes.length).set(bytes);
    const ret = X.jxl_feed(c, p, bytes.length);
    X.jxl_flush(c);
    const w = X.jxl_width(c), h = X.jxl_height(c);
    // 0 = complete, 2 = first frame of an animation decoded with more to come.
    // Both mean we hold valid pixels; djxl writes the first frame as the PNG's
    // default image, so that is what gets compared.
    if ((ret !== 0 && ret !== 2) || !w) { ourFail++; X.jxl_free(c); continue; }
    ours = { w, h, data: Buffer.from(new Uint8Array(X.memory.buffer, X.jxl_pixels(c), w * h * 4)) };
    X.jxl_free(c);
  } catch (e) { ourFail++; continue; }

  if (ref.w !== ours.w || ref.h !== ours.h) { sizeMismatch++; worst.push(`${path.basename(f)} SIZE ${ref.w}x${ref.h} vs ${ours.w}x${ours.h}`); continue; }

  // compare RGB (ignore alpha differences from PNG colour type)
  let maxDelta = 0, sumSq = 0, n = 0;
  const refBypp = ref.ch * (ref.depth / 8);
  const step = ref.depth === 16 ? 2 : 1;
  for (let y = 0; y < ref.h; y++) {
    for (let x = 0; x < ref.w; x++) {
      const ri = y * ref.w * refBypp + x * refBypp;
      const oi = (y * ours.w + x) * 4;
      for (let ci = 0; ci < Math.min(3, ref.ch); ci++) {
        const rv = ref.depth === 16 ? ref.data[ri + ci * 2] : ref.data[ri + ci * step];
        const ov = ours.data[oi + ci];
        const d = Math.abs(rv - ov);
        if (d > maxDelta) maxDelta = d;
        sumSq += d * d; n++;
      }
    }
  }
  const mse = sumSq / n;
  const psnr = mse === 0 ? Infinity : 10 * Math.log10(255 * 255 / mse);
  if (maxDelta === 0) same++;
  else if (maxDelta <= 2) close++;
  else { differ++; worst.push(`${path.basename(f)} maxDelta=${maxDelta} psnr=${psnr.toFixed(1)}dB`); }
}

const tested = same + close + differ;
console.log(`\ncompared        : ${tested}`);
console.log(`  bit-identical : ${same}`);
console.log(`  <= 2/255 diff : ${close}`);
console.log(`  > 2/255 diff  : ${differ}`);
console.log(`size mismatch   : ${sizeMismatch}`);
console.log(`djxl failed     : ${refFail}`);
console.log(`jxl-rs failed   : ${ourFail}`);
if (worst.length) { console.log('\nnotable:'); worst.slice(0, 20).forEach(w => console.log('  ' + w)); }
fs.rmSync(tmp, { recursive: true, force: true });
