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
page's head. Pages with embedded `data:image/jxl` images must also load
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
compares what JPEG and JPEG XL can put on screen from a partial download.

Both files are fetched in full, then the slider hands each decoder only the
first *N* bytes — the same prefix a browser would hold part-way through a
download. The counter is absolute bytes, not a percentage, so both panes always
show the same amount of transfer; the smaller file simply finishes first.

Switching the JPEG pane between **Baseline** and **Progressive** swaps in a
different encoding of the same picture. Baseline arrives strictly top to bottom;
progressive fills the whole frame coarsely and then sharpens.

Both panes paint into a `<canvas>`. The JPEG side decodes the truncated prefix
in a detached `<img>` — browsers render a truncated JPEG scanline by scanline,
which is the effect being demonstrated — and blits it once `img.decode()`
resolves. Waiting for `decode()` rather than `load` matters: `load` fires before
the frame is rasterised, and drawing then copies nothing. Swapping two stacked
`<img>` buffers instead of using a canvas produces horizontal bands of image
separated by empty stage, because a hidden `<img>` is not rasterised and
revealing one shows whichever compositor tiles happen to be ready.

The `decode()` step is best effort, not a gate. Firefox rejects `decode()` on a
truncated JPEG even though it fires `load` and renders the partial scanlines, so
treating a rejection as failure blanks the pane there while Chromium and WebKit
are unaffected. `load` decides whether a frame exists; `decode()` only improves
the chance it is ready to copy.

The JPEG XL side drives `tools/jxl-wasm` directly, feeding it the prefix and
calling `jxl_flush` to pull out whatever partial image exists. Unlike the rest of
the site this pane is not conditional on native support — every browser runs the
wasm decoder, because Safari decodes JPEG XL natively but not progressively and
would otherwise show a finished image next to a partial one.

The three pairs are matched on quality rather than size: the cjxl distance was
picked per image so the JPEG XL file scores at or above the JPEG on ssimulacra2,
which makes the remaining difference in byte counts real compression rather than
a quality handicap.

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
