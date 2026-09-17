import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// The jxl-rs version behind public/resources/jxl_decoder_rs*.wasm, taken from
// the exact pin in the decoder crate so the nav notice cannot drift from what
// is actually shipped. See src/lib/jxl-decoder-version.ts.
const JXL_WASM_CARGO_TOML = new URL('./tools/jxl-wasm/Cargo.toml', import.meta.url);
const jxlDecoderVersion = (() => {
  const toml = readFileSync(JXL_WASM_CARGO_TOML, 'utf8');
  // Matches `jxl = "=0.7.4"` and the table form `jxl = { version = "=0.7.4" }`.
  const match = toml.match(/^jxl\s*=\s*(?:"=?([^"]+)"|\{[^}]*version\s*=\s*"=?([^"]+)")/m);
  const version = (match?.[1] ?? match?.[2])?.trim();
  if (!version) {
    throw new Error(
      `Could not find the jxl dependency pin in ${fileURLToPath(JXL_WASM_CARGO_TOML)}; ` +
        'the nav decoder notice is labelled from it.',
    );
  }
  return version;
})();

export default defineConfig({
  // Canonical production origin. Enables Astro.site, absolute URL helpers,
  // and the sitemap integration.
  site: 'https://jpegxl.info',
  // Keep default output (static) for GitHub Pages.
  build: {
    // `preserve` mirrors the pages/ tree: `foo.astro` → `foo.html` (keeping the
    // flat legacy URLs), while `art/index.astro` → `art/index.html` so the
    // directory URL `/art/` resolves on GitHub Pages.
    format: 'preserve',
  },
  vite: {
    define: {
      __JXL_DECODER_VERSION__: JSON.stringify(jxlDecoderVersion),
    },
  },
  integrations: [
    sitemap({
      // @astrojs/sitemap ignores `build.format: 'file'` and emits extension-less
      // URLs (e.g. /resources/glossary). Rewrite them to the deployed flat .html
      // files so sitemap entries match the canonical tags. Leaves the homepage,
      // directory URLs, and already-suffixed customPages untouched.
      serialize(item) {
        const { origin, pathname } = new URL(item.url);
        if (pathname === '/') {
          item.url = `${origin}/`;
        } else if (pathname === '/art') {
          // `art/index.astro` is a directory index served at `/art/`, not `/art.html`.
          item.url = `${origin}/art/`;
        } else if (!pathname.endsWith('/') && !pathname.includes('.')) {
          item.url = `${origin}${pathname}.html`;
        }
        return item;
      },
    }),
  ],
});
