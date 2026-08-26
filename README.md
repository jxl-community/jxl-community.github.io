# JPEG XL Community Website

Source for the public [JPEG XL community website](https://jpegxl.info).

The site is built with [Astro](https://astro.build/) and deployed as a static
site on GitHub Pages. Astro turns the routes in `src/pages/` and the shared
components into HTML at build time, keeping the published site fast and simple
to host. Interactive features use small, purpose-built browser scripts only
where needed.

## Requirements

- Node.js 22 or newer
- npm (included with Node.js)

## Run locally

Install the locked dependencies and start Astro's development server:

```bash
npm ci
npm run dev
```

The terminal prints the local address. Astro watches the source files and
refreshes the browser as you edit.

## Common commands

```bash
npm run check    # Type-check and validate the Astro project
npm run build    # Create the production site in dist/ and generate Pagefind search
npm run preview  # Serve the production build locally
```

`dist/` is generated output and should not be edited or committed. Run `npm run
check` and `npm run build` before opening a pull request. Continuous integration
runs both checks for every pull request and every push to `main`.

## Working with the site

- **Pages:** Add or update routes in `src/pages/`. File names determine the
  generated URL; for example, `src/pages/resources/glossary.astro` builds to
  `/resources/glossary.html`.
- **Shared UI:** Reusable components are in `src/components/`; the common page
  shell is in `src/layouts/BaseLayout.astro`.
- **Editorial content:** FAQ entries are Markdown in `src/content/faq/`.
  Other structured content, such as news and the glossary, is in `src/data/`.
- **Styling and browser behavior:** Styles live in `src/styles/`; client-side
  behavior lives in `src/scripts/`.
- **Static files:** Put images, downloads, `robots.txt`, and other files that
  should be copied unchanged into `public/`.

The production URL and sitemap behavior are configured in
[`astro.config.mjs`](astro.config.mjs). Keep the configured URL format in mind
when adding pages so canonical links and sitemap entries stay correct.

## JPEG XL WASM decoder

Pages that display `.jxl` images ship a WebAssembly fallback for browsers
without native JPEG XL support. The decoder is
[jxl-rs](https://github.com/libjxl/jxl-rs) — the same implementation Chrome and
Firefox use — wrapped for the browser by [`tools/jxl-wasm`](tools/jxl-wasm),
whose README covers building it and the verification against libjxl.

Two pieces are served:

- [`public/resources/jxl-rs.js`](public/resources/jxl-rs.js) — the polyfill. It
  watches for `<img>`, `<source srcset>` and CSS `background-image` values
  ending in `.jxl` and decodes the ones the browser could not.
- `public/resources/jxl_decoder_rs_simd.wasm` and `jxl_decoder_rs.wasm` — the
  decoder itself. The polyfill picks the SIMD build where wasm SIMD is
  supported.

The wasm module has **no imports**: no JS glue, no emscripten runtime, and no
threads. That means no `SharedArrayBuffer`, so pages need no cross-origin
isolation and there is no service worker and no first-visit reload. It also
means no native-support probe — the polyfill only acts on images the browser
itself failed to decode, and the module is fetched lazily, so browsers with
native JPEG XL never download it.

To enable the fallback on a new page, pass `usesJxlWasmFallback` to `BaseLayout`
(this shows the nav's decoder-info notice) and load `/resources/jxl-rs.js` in the
page's head.

Only load it where it is actually needed. A page whose every `.jxl` sits in a
`<picture>` behind a renderable `.webp` fallback never invokes the polyfill —
the browser takes the fallback — so the script is 13 KB and a document-wide
MutationObserver for no effect. Photo Credits is exactly that case and
deliberately does not load it. Pages with embedded `data:image/jxl` images must also load
`/resources/jxl-mark-embedded.js` first, which tags those URLs so the polyfill
recognises them.

The polyfill carries several site-specific behaviours that each fixed a real
bug — a serialised decode queue for gallery pages, `<picture>` fallback
detection, an HDR path that emits a cICP-tagged 16-bit PNG so Rec.2100 PQ/HLG
survives, CacheStorage handling, and re-attaching the source ICC profile to the
encoded output. That last one matters because the decode goes through a canvas,
and `putImageData` + `toBlob` drops the profile and tags the result sRGB, so
wide-gamut images came out visibly wrong wherever the fallback ran. Read the
notes at the top of `jxl-rs.js` before changing it.

### Retiring the old service worker

`public/serviceworker.min.js` is no longer referenced. It supplied the COOP/COEP
headers libjxl's threaded build required. Because a stale registration would
keep injecting those headers — which is what blocks cross-origin embeds such as
the hits.sh badge — `BaseLayout.astro` unregisters it on every page load. The
file can be deleted once traffic has cycled through.

## Progressive loading demo

[`/resources/progressive-loading-demo.html`](src/pages/resources/progressive-loading-demo.astro)
compares what each image format can put on screen from a partial download.

Both files are fetched in full, then the slider hands each decoder only the
first *N* bytes — the same prefix a browser would hold part-way through a
download. The counter is absolute bytes, not a percentage, so both panes always
show the same amount of transfer; the smaller file simply finishes first.

The left pane is chosen with three controls — image, codec, and encoding mode —
and is always compared against JPEG XL on the right.

### The image set

`public/ProgressiveDemoImages/ssimu2-85/` holds seven photographs, each encoded
five ways, every file tuned to land at **ssimulacra2 85** so the byte counts are
a compression result rather than a quality handicap. `results.csv` in that
folder is the encoder's own output and is the source of truth: the page reads it
at build time and derives the pickers, file paths, sizes and scores from it.
Re-run the encoder, drop in a new CSV, and the page follows.

Codecs differ in which modes they even have, which is why the mode control is
per-codec rather than a global toggle:

| codec | modes | paints from a partial file? |
| --- | --- | --- |
| JPEG | sequential, progressive | yes |
| JPEGli | sequential, progressive-level-2 | yes |
| AVIF | standard, progressive | only the layered one, and only in Chrome |
| WebP | standard only | Chrome only |
| JPEG XL | progressive (the comparison pane) | yes, from ~1–2% |

### Simulating a partial download

The slider does not hand the pane a truncated file. It asks
[`public/resources/pd-stream-sw.js`](public/resources/pd-stream-sw.js) for a
response that carries the first *N* bytes and is then **left open**, so the
browser sees a download still in progress.

That distinction decides what gets drawn, and getting it wrong is easy:

| what the browser is given | JPEG | AVIF (layered) | WebP |
| --- | --- | --- | --- |
| complete response, truncated bytes | paints | **nothing** | **nothing** |
| response still open, N bytes sent | paints | **paints (Chrome)** | paints (Chrome) |

Only the second row is what an interrupted download actually looks like. A
`Blob` of the first N bytes is the first row — it reads as a corrupt whole file,
and an earlier version of this page used it and concluded, wrongly, that
browsers cannot render partial AVIF at all.

There is no way to hand a streaming `Response` to an `<img>` from the page,
which is why a service worker is involved. It caches nothing and touches no
other request.

Two consequences shape the implementation:

- **Each slider position opens its own stream.** Feeding more bytes into an
  already-open response is the tidier model and is what a real download does,
  but only JPEG re-decodes as they trickle in — Chrome decodes an AVIF once,
  when data first arrives, and ignores later chunks on the same response.
  Measured: 7% of the pane filled when advancing an open stream, 100% when
  opening a fresh one at the same byte count.
- **Each stream gets a brand new `<img>`.** Reassigning `src` aborts the
  previous load, and these loads are streams that never finish by design;
  aborting one leaves the element unable to paint progressively from the next,
  so the pane stays blank while the bytes arrive perfectly well.
- **Restarts are throttled, not debounced, and old elements retire on a timer.**
  Playback advances the target every frame, so a debounce is reset by each one
  and never fires until playback stops — which froze the pane until you hit
  pause. A fresh stream also takes 300-500 ms to put pixels on screen, so the
  element it replaces has to stay in place for a grace period rather than being
  dropped at the next restart, or neither it nor its replacement has painted.

### Known limitation: WebP during playback

WebP paints correctly when the slider is dragged or set, but its pane stays
empty while Play runs. The cause is understood and the fix costs more than it
buys.

Restarting a stream closes the outgoing one, and a closed response is a
*complete* file as far as the browser is concerned. A complete truncated WebP
renders nothing, so closing throws away the partial picture it was already
showing. A truncated JPEG survives that, which is why only WebP is affected:
during playback the visible element is always either the incoming one (not yet
decoded, ~300–500 ms) or the outgoing one (just closed, pixels discarded).

Keeping streams open past their replacement does fix WebP — and breaks
everything else, because it leaves more never-completing requests in flight than
the browser will run at once, so nothing loads at all. Confirmed by trying it.
Scrubbing is unaffected either way, since only one stream is open at a time.

It is not CPU contention with the JPEG XL pane: blocking the wasm decoder
entirely changes nothing.

### What each format does with a partial download

Measured in the page itself, as a percentage of the pane showing image:

| | 10% | 50% | notes |
| --- | --- | --- | --- |
| JPEG sequential | 9% | 47% | top-down, both engines |
| JPEG progressive | full | full | coarse then sharpens |
| JPEGli sequential | 8% | 46% | as JPEG |
| JPEGli progressive | full | full | as JPEG |
| **AVIF standard** | **0%** | **0%** | single layer: needs the whole file |
| **AVIF progressive** | **full (Chrome)** | **full (Chrome)** | base layer complete at 2.5% of the file; Safari paints none of it |
| WebP | 5% (Chrome) | 44% (Chrome) | scrubbing only — see the limitation above; Safari paints none of it |
| JPEG XL | full | full | from ~1–2% |

The AVIF pair is worth keeping precisely because the two differ: the layered
file carries an `a1lx` box whose base layer is complete at 2.5%, and Chrome
paints a full-frame preview from it while the standard file shows nothing. That
the same toggle changes nothing in Safari is part of what the page shows.

The state line under each pane therefore describes how the *file* is laid out
rather than claiming what is on screen. There is no reliable way to ask the
latter: `naturalWidth` turns non-zero in WebKit as soon as an AVIF header
parses, well before any pixels exist, and `drawImage` is a no-op for an
in-flight image so the canvas cannot be sampled either.

### How the panes decode

The left pane is a plain `<img>` fed by the stream above. It cannot blit into a
canvas: `drawImage` is a no-op for an image whose load has not completed, which
is every in-flight frame. The element draws itself, and the stage shows through
wherever nothing has decoded yet.

It is also deliberately not hidden until it looks painted. Chrome does not
rasterise a hidden element, so an image hidden while its bytes arrive never
decodes them — and because the stream then stalls on purpose, revealing it later
brings no further data to trigger a decode.

The JPEG XL side is different: it drives `tools/jxl-wasm` directly, feeding it
the prefix and calling `jxl_flush` to pull out whatever partial image exists,
then painting that into a canvas. Unlike the rest of the site this pane is not
conditional on native support — every browser runs the wasm decoder, because
Safari decodes JPEG XL natively but not progressively and would otherwise show a
finished image next to a partial one.

Without a service worker (private browsing blocks them) the left pane cannot
simulate a partial download at all; the page says so and the JPEG XL pane still
works.

## Deployment

The site is publicly deployed to [jpegxl.info](https://jpegxl.info) through
GitHub Pages. Every push to `main` builds and deploys the contents of `dist/` via
the [Pages workflow](.github/workflows/pages.yml). The custom domain is configured
in [`public/CNAME`](public/CNAME).

Astro generates the sitemap at `/sitemap-index.xml`. The deployment also publishes
the same sitemap at the legacy `/sitemap.xml` URL for compatibility with existing
crawlers and tools.

## Contributing

Create a branch, make the focused change, and open a pull request. Keep third-party
assets properly attributed and ensure new content is appropriate for the community
site. The CI workflow checks the Astro project and verifies a production build
before changes are merged.

## License

The project is available under the [Creative Commons Attribution 4.0
International License](LICENSE). Third-party assets retain their respective
licenses and attribution requirements.
