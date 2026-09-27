# Decode speed test

The Explore menu links to `/resources/decode-speed-test.html`.

## Replacing the starter images

Edit `src/data/decode-speed-images.json`. The three current images reuse the
progressive demo's files as a working starter set, not final benchmark assets.
The manifest's `note` is shown above the images; replace it with a description
of the final dataset and encoding settings when those are ready.

Put the new files under `public/DecodeSpeedImages/` (or another public folder).
Each image needs a stable `id`, a `title`, a browser-readable `preview`, photo
credits (`photographer`, `portfolio`, `url`), and a `variants` array:

```json
{
  "label": "JPEG XL fd2",
  "mime": "image/jxl",
  "url": "/DecodeSpeedImages/example-fd2.jxl"
}
```

Variants are independent: add recompressed JPEG XL, fd1/fd2/fd3, AVIF bit depths,
JPEGli, or other encodings without editing the runner. Supported MIME types are
`image/jpeg`, `image/png`, `image/webp`, `image/avif`, and `image/jxl`. Labels must
be unique within an image. Every JXL variant automatically gets separate WASM
and native rows backed by the same downloaded bytes. Other formats use native
decoding. The build checks that all referenced files exist.

Use still images with the same pixel dimensions, orientation, and color space
across variants. Document the quality target and encoding parameters in the
dataset note. The table reads dimensions from each decoder rather than trusting
metadata, so accidental size differences are visible. The benchmark does not
measure visual quality. Animated and HDR inputs are outside this benchmark's
scope; the WASM path requests RGBA8 and rejects animated JXL.

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

1. A run reveals all rows and chart bars together; the starter set has 15 rows.
2. Three JXL WASM rows complete. Native JXL succeeds only where supported for
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
