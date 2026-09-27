// Build-time only: the supplied encoder metadata is the source of truth for
// variants and settings. PNG masters stay on disk and never enter the manifest.
import fs from 'node:fs';
import path from 'node:path';
import dataset from '../data/decode-speed-images.json';

type EncodingMetadata = {
  source: string;
  encoders: { cjpegli: string; cjxl: string; avifenc: string; cwebp: string; pillow: string };
  settings: {
    jpeg_quality: number;
    jpegli_quality: number;
    jpegli_progressive_level: number;
    jxl_lossless_outputs: {
      from_png_master: string;
      transcoded_from_pillow_jpeg: string;
      transcoded_from_jpegli_jpeg: string;
    };
    jxl_lossy_distance: number;
    jxl_effort: number;
    jxl_faster_decoding_levels: number[];
    avif_quality: number;
    avif_speed: number;
    avif_depths: number[];
    webp_quality: number;
    webp_method: number;
  };
};

function version(value: string) {
  const match = value.match(/\d+\.\d+\.\d+/);
  if (!match) throw new Error(`Missing encoder version in ${value}`);
  return match[0];
}

// Reads pixel dimensions from a JPEG's start-of-frame marker for the preview
// card's hover details, so they cannot drift from the file on disk.
function jpegSize(file: string) {
  const bytes = fs.readFileSync(file);
  for (let i = 2; i + 9 < bytes.length;) {
    if (bytes[i] !== 0xff) break;
    const marker = bytes[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return {
        width: bytes.readUInt16BE(i + 7),
        height: bytes.readUInt16BE(i + 5),
        bytes: bytes.length,
      };
    }
    i += 2 + bytes.readUInt16BE(i + 2);
  }
  throw new Error(`No JPEG frame header in ${file}`);
}

export const decodeSpeedManifest = {
  note: dataset.note,
  images: dataset.images.map((image) => {
    if (!image.settings.startsWith('/images/decode-speed/') || image.settings.includes('..')) {
      throw new Error(`Invalid benchmark settings path: ${image.settings}`);
    }
    const metadata: EncodingMetadata = JSON.parse(
      fs.readFileSync(`public${image.settings}`, 'utf8'),
    );
    const settings = metadata.settings;
    const directory = path.posix.dirname(image.settings);
    const stem = metadata.source.replace(/\.png$/, '');
    const asset = (filename: string) => {
      if (path.posix.basename(filename) !== filename)
        throw new Error(`Invalid filename: ${filename}`);
      const url = `${directory}/${filename}`;
      fs.accessSync(`public${url}`);
      return url;
    };
    const jxlEncoder = `cjxl ${version(metadata.encoders.cjxl)}`;
    const jpegliEncoder = path.posix.basename(metadata.encoders.cjpegli);
    if (jpegliEncoder !== 'cjpegli') {
      throw new Error(`Unexpected JPEGli encoder in ${image.settings}`);
    }
    const variants = [
      {
        label: 'JPEG',
        encoder: `Pillow ${version(metadata.encoders.pillow)}`,
        specifics: `Quality ${settings.jpeg_quality}`,
        mime: 'image/jpeg',
        url: asset(`${stem}.jpg`),
      },
      {
        label: 'JPEGli',
        encoder: jpegliEncoder,
        specifics: `Quality ${settings.jpegli_quality} · progressive level ${settings.jpegli_progressive_level}`,
        mime: 'image/jpeg',
        url: asset(`${stem}-jpegli.jpg`),
      },
      {
        label: 'WebP',
        encoder: `cwebp ${version(metadata.encoders.cwebp)}`,
        specifics: `Quality ${settings.webp_quality} · method ${settings.webp_method}`,
        mime: 'image/webp',
        url: asset(`${stem}.webp`),
      },
      ...settings.avif_depths.map((depth) => ({
        label: `AVIF ${depth}-bit`,
        encoder: `avifenc ${version(metadata.encoders.avifenc)}`,
        specifics: `${depth}-bit · quality ${settings.avif_quality} · speed ${settings.avif_speed}`,
        mime: 'image/avif',
        url: asset(`${stem}-${depth}bit.avif`),
      })),
      ...settings.jxl_faster_decoding_levels.map((level) => ({
        label: `JPEG XL fd${level}`,
        encoder: jxlEncoder,
        specifics: `--faster-decoding=${level} · distance ${settings.jxl_lossy_distance} · effort ${settings.jxl_effort}`,
        mime: 'image/jxl',
        url: asset(`${stem}${level === 0 ? '' : `-fd${level}`}.jxl`),
      })),
      {
        label: 'JPEG XL lossless',
        encoder: jxlEncoder,
        specifics: `Lossless from master · effort ${settings.jxl_effort}`,
        mime: 'image/jxl',
        url: asset(settings.jxl_lossless_outputs.from_png_master),
      },
      {
        label: 'JPEG XL · JPEG transcode',
        encoder: jxlEncoder,
        specifics: `Lossless JPEG transcode · JPEG quality ${settings.jpeg_quality} · effort ${settings.jxl_effort}`,
        mime: 'image/jxl',
        url: asset(settings.jxl_lossless_outputs.transcoded_from_pillow_jpeg),
      },
      {
        label: 'JPEG XL · JPEGli transcode',
        encoder: jxlEncoder,
        specifics: `Lossless JPEGli transcode · JPEGli quality ${settings.jpegli_quality} · progressive level ${settings.jpegli_progressive_level} · effort ${settings.jxl_effort}`,
        mime: 'image/jxl',
        url: asset(settings.jxl_lossless_outputs.transcoded_from_jpegli_jpeg),
      },
    ];
    const preview = asset(`${stem}.jpg`);
    return { ...image, preview, previewFile: jpegSize(`public${preview}`), variants };
  }),
};
