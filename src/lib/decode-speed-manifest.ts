// Build-time only: the supplied encoder metadata is the source of truth for
// variants and settings. PNG masters stay on disk and never enter the manifest.
import fs from 'node:fs';
import path from 'node:path';
import dataset from '../data/decode-speed-images.json';

type EncodingMetadata = {
  source: string;
  encoders: { cjxl: string; avifenc: string; cwebp: string; pillow: string };
  settings: {
    jpeg_quality: number;
    jxl_lossless_outputs: { from_png_master: string; transcoded_from_generated_jpeg: string };
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
    const variants = [
      {
        label: 'JPEG',
        encoder: `Pillow ${version(metadata.encoders.pillow)}`,
        specifics: `Quality ${settings.jpeg_quality}`,
        mime: 'image/jpeg',
        url: asset(`${stem}.jpg`),
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
        label: 'JPEG XL transcode',
        encoder: jxlEncoder,
        specifics: `Lossless JPEG transcode · JPEG quality ${settings.jpeg_quality} · effort ${settings.jxl_effort}`,
        mime: 'image/jxl',
        url: asset(settings.jxl_lossless_outputs.transcoded_from_generated_jpeg),
      },
    ];
    return { ...image, preview: asset(`${stem}.jpg`), variants };
  }),
};
