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

Selected image-heavy pages provide a locally hosted WebAssembly fallback for
browsers without native JPEG XL support. The fallback uses a customized
[JXL.js](https://github.com/niutech/jxl.js) wrapper and a decoder rebuilt from
libjxl. The homepage probes for native JPEG XL support and loads the fallback
only when that probe fails.

The wrapper at [`public/resources/jxl.min.js`](public/resources/jxl.min.js)
detects SIMD support and loads either the SIMD decoder or the scalar fallback:

- `public/resources/jxl_decoder_simd.min.js` and
  `public/resources/jxl_decoder_simd.wasm`
- `public/resources/jxl_decoder.min.js` and `public/resources/jxl_decoder.wasm`

The decoder needs cross-origin isolation for its threaded WebAssembly runtime.
[`public/serviceworker.min.js`](public/serviceworker.min.js) supplies the
required COOP/COEP headers only for pages that use the fallback. On first use,
the service worker may reload the page once before decoding begins.

To enable the fallback on a new page, pass `usesJxlWasmFallback` to
`BaseLayout`, load `/serviceworker.min.js` and `/resources/jxl.min.js` in the
page's head, and add the route to `ISOLATED_PAGES` in
`public/serviceworker.min.js`. Pages with embedded `data:image/jxl` images must
also load `/resources/jxl-mark-embedded.js` before the decoder wrapper.

The wrapper contains site-specific reliability and HDR handling. Do not replace
the decoder assets with an upstream build without reviewing the notes at the top
of `jxl.min.js` and testing the affected galleries and comparison pages.

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
