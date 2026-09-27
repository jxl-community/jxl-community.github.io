# Decode speed test

The Explore menu links to `/resources/decode-speed-test.html`.

## Image set and encoding metadata

The five photos live under `public/images/decode-speed/`, with one variants
folder and `settings.json` per photo. `src/data/decode-speed-images.json` lists
photo titles, credits, and settings paths. `src/lib/decode-speed-manifest.ts`
reads those settings at build time to produce the benchmark manifest.

The current set includes 13 encodes per image:

- JPEG (Pillow 12.1.1, quality 90).
- JPEGli (cjpegli, quality 90, progressive level 2).
- WebP (cwebp 1.6.0, quality 75, method 4).
- AVIF at 8, 10, and 12 bits (avifenc 1.4.2, quality 60, speed 6).
- Four lossy JPEG XL variants (cjxl 0.12.0, distance 1.5, effort 7,
  `--faster-decoding` levels 0–3).
- Lossless JPEG XL from the master, a lossless transcode of the Pillow JPEG,
  and a lossless transcode of the JPEGli JPEG.

Each JPEG XL file gets separate WASM and native rows, so the current dataset has
100 result rows for 65 files. The Pillow JPEGs supply previews and thumbnails.
PNG masters remain in the folders for reference; the page never requests them.

Encoder names, versions, and specifics come from each photo's settings JSON,
not a second hand-maintained list. To retire an AVIF depth, remove it from that
photo's `avif_depths` array; an unreferenced file can stay on disk or be removed.
The loader checks that all referenced files exist. Lossless JXL filenames come
from `jxl_lossless_outputs`, including distinct Pillow and JPEGli transcodes;
lossy variants follow the supplied naming scheme
(`.jxl` for fd0, `-fdN.jxl` for other levels).

The first table column groups each image's rows under one thumbnail and title.
The Encoder column shows the short encoding label; its tooltip contains the
encoder version and full settings. Decoder API details also appear in tooltips.
Hover or keyboard focus shows details; Escape dismisses them. CSV exports keep
the full Encoder and Specifics fields.

Charts use one row per encoded file, sorted fastest first within each image.
The sort key and the number at the right of each bar are native speed when it
completed, otherwise WASM. A JPEG XL track draws native at full height with a
half-height WASM bar overlaid on it, both from the same zero on a shared scale;
their speeds are never added. When only WASM completed, its bar is full height.
A missing decoder draws no bar and its error is shown in the tooltip. Hover or
focus any chart row for both MP/s values.

An image may set `focus` (a CSS `object-position`) in the data file so its face
or subject stays visible in the cropped preview card. Table thumbnails are
uncropped, 80px tall at the photo's own aspect ratio. Use a
percentage, not a length: a `calc()` offset can push the crop past the image
edge at some card sizes.

On devices with a fine pointer, hovering a preview card lifts it forward and
grows it to the photo's full aspect ratio, with pixel dimensions and the preview
JPEG's file size underneath. Both are read from the JPEG at build time. Touch
devices keep the static crop; reduced motion removes the transitions.

Use still images with the same pixel dimensions, orientation, and color space
across variants. The table reads dimensions from each decoder rather than
trusting metadata, so accidental size differences are visible. This dataset
uses format-specific quality settings, not matched visual quality; the page
states that explicitly. Animated and HDR inputs are outside the benchmark's
scope; WASM requests RGBA8 and rejects animated JXL.

## Timing contract

- Download all encoded files before starting any measurements, with at most
  three simultaneous fetches. A failed download becomes an error row.
- Load and compile the site's existing SIMD/scalar jxl-rs WASM before timing.
- Shuffle case execution order each run, preserving manifest order in the table.
- Perform one untimed warm-up per case, then 7 or 21 sequential decodes.
- Native: time from setting a fresh object URL on a fresh detached image through
  `HTMLImageElement.decode()`. Make a fresh Blob for every call; revoke URLs and
  release images afterward. No JXL polyfill is loaded on this page.
- WASM: in a worker, time context creation, allocation/input copy, full decode,
  pixel flush, and output copy to JavaScript RGBA8 memory. Exclude worker startup,
  module compilation/instantiation, message transfer, cleanup, and drawing.
  Each file has a fresh WASM instance, each iteration a fresh context. Do not
  re-enter an instance that traps.
- Report the median sample. MP/s = width × height / (median milliseconds × 1000).
  These are API-level timings, not equivalent isolated codec CPU measurements.
  Browser scheduling, caching, color conversion, and threading still differ.
- Publish the table and shared-scale chart together only after all cases settle.
  A failed/unsupported case has no speed and no bar. Never substitute a WASM
  result for a failed native result. A zero timer reading is reported as an error.
- Cancel when the tab is hidden; discard partial results. A previous completed
  result remains available. Downloads, native decodes, and worker requests have
  timeouts; cancelling terminates the worker and aborts downloads.

## Verification

Run `npm run check` and `npm run build`. In Chromium and Safari/WebKit, verify:

1. A run reveals all rows and chart bars together; the current set has 100 rows.
2. All 35 JXL WASM rows complete. Native JXL succeeds only where supported for
   these files, and appears separately. Other unsupported files show an error.
3. CSV values correspond to the completed table. Running again replaces results.
4. Cancel during downloads and decoding; no partial result is published. Hiding
   the tab cancels too. The button becomes usable again.
5. Block an image or the WASM download; unaffected native cases still complete.
6. At 390px width, the table scrolls within its container and the page does not
   overflow horizontally. Controls are keyboard accessible.

The page credits the original experiment at
<https://sneyers.info/browserspeedtest/>. Its concurrent batch timing is not
directly comparable to this page's sequential median timings.
