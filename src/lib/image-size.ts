// Build-time only: reads pixel dimensions from JPEG, PNG, and WebP headers so
// captions and aspect ratios cannot drift from the files on disk.
import fs from 'node:fs';

export function imageSize(file: string) {
  const b = fs.readFileSync(file);
  const size = (width: number, height: number) => ({ width, height, bytes: b.length });

  // PNG: IHDR is always the first chunk.
  if (b.readUInt32BE(0) === 0x89504e47) return size(b.readUInt32BE(16), b.readUInt32BE(20));

  // JPEG: walk the markers to the first start-of-frame.
  if (b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i + 9 < b.length && b[i] === 0xff;) {
      const marker = b[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker))
        return size(b.readUInt16BE(i + 7), b.readUInt16BE(i + 5));
      i += 2 + b.readUInt16BE(i + 2);
    }
  }

  // WebP: the first chunk is VP8X (extended), VP8 (lossy) or VP8L (lossless).
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = b.toString('ascii', 12, 16);
    if (chunk === 'VP8X') return size(1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3));
    if (chunk === 'VP8 ') return size(b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff);
    if (chunk === 'VP8L') {
      const bits = b.readUInt32LE(21);
      return size(1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff));
    }
  }

  throw new Error(`Cannot read image dimensions from ${file}`);
}

export const kib = (bytes: number) => `${Math.round(bytes / 1024).toLocaleString('en-US')} KiB`;
