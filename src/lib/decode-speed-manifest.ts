// Build-time only: the supplied encoder metadata is the source of truth for
// variants and settings. The PNG master is tested too, as the lossless baseline.
import fs from 'node:fs';
import path from 'node:path';
import dataset from '../data/decode-speed-images.json';
import { imageSize } from './image-size';

type EncodingMetadata = {
  source: string;
  encoders: { cjpegli: string; cjxl: string; avifenc: string; cwebp: string; pillow: string };
  settings: {
    jpeg_quality: number;
    jpegli_quality: number;
    jpegli_progressive_level: number;
    jxl_lossless_outputs: {
      from_png_master_faster_decoding_levels: string[];
      transcoded_from_pillow_jpeg: string;
      transcoded_from_jpegli_jpeg: string;
    };
    jxl_lossy_distance: number;
    jxl_effort: number;
    jxl_faster_decoding_levels: number[];
    jxl_lossless_faster_decoding_levels: number[];
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
    const losslessFiles = settings.jxl_lossless_outputs.from_png_master_faster_decoding_levels;
    if (losslessFiles.length !== settings.jxl_lossless_faster_decoding_levels.length) {
      throw new Error(`Mismatched lossless JPEG XL levels and files in ${image.settings}`);
    }
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
      {
        label: 'PNG',
        encoder: 'PNG master',
        specifics: 'Lossless source for every other encode',
        mime: 'image/png',
        url: asset(metadata.source),
      },
      ...settings.jxl_faster_decoding_levels.map((level) => ({
        label: `JPEG XL fd${level}`,
        encoder: jxlEncoder,
        specifics: `--faster-decoding=${level} · distance ${settings.jxl_lossy_distance} · effort ${settings.jxl_effort}`,
        mime: 'image/jxl',
        url: asset(`${stem}${level === 0 ? '' : `-fd${level}`}.jxl`),
      })),
      ...settings.jxl_lossless_faster_decoding_levels.map((level, index) => ({
        label: `JPEG XL lossless fd${level}`,
        encoder: jxlEncoder,
        specifics: `Lossless from PNG master · --faster-decoding=${level} · effort ${settings.jxl_effort}`,
        mime: 'image/jxl',
        url: asset(losslessFiles[index]),
      })),
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
    return { ...image, preview, previewFile: imageSize(`public${preview}`), variants };
  }),
};
