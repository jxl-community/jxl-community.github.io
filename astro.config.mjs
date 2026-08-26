import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

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
