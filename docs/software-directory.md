# Maintaining the software directory

All software and external demo listings live in `src/data/software.ts`. The
Software Support page groups entries by task and sorts them alphabetically.
Demos & experiments selects the `demo` entries from the same collection. Its
existing `/resources/external-tools.html` URL is retained for compatibility.

## Adding or updating a listing

Add one `SoftwareEntry` record. Choose the task that best describes its primary
purpose:

| Category    | Purpose                                                      |
| ----------- | ------------------------------------------------------------ |
| `view`      | Viewers, Quick Look, thumbnails, desktop and toolkit plugins |
| `edit`      | Image editors and photo management                           |
| `convert`   | Desktop, browser, and command-line conversion tools          |
| `build`     | Codec implementations, libraries, and language bindings      |
| `deliver`   | Image hosting, optimization, and delivery services           |
| `utilities` | Metadata tools, duplicate finders, and other utilities       |
| `demo`      | Interactive demonstrations, test pages, and experiments      |

```ts
{
  id: 'example-viewer',
  name: 'Example Viewer',
  url: 'https://example.org/',
  category: 'view',
  platforms: ['windows'],
  description: 'Image viewer with JPEG XL previews.',
  capabilities: ['open'],
  requirements: 'Version 2 or newer; install the JPEG XL plugin.',
  sources: [{ label: 'JPEG XL release notes', url: 'https://example.org/releases/2' }],
}
```

- Use a stable, unique `id`; it also creates a `#software-example-viewer` link.
- Include a concise, factual description and a supporting source. Prefer project
  documentation, release notes, or a reproducible demonstration to marketing claims.
- List the platforms where the relevant workflow is available. `browser` means a
  web tool, not a claim of native browser support. Use `runtime` for libraries
  whose availability depends on a language runtime or target rather than a
  verified desktop build, and explain the requirement.
- Leave `platforms` empty when availability cannot be verified; the directory
  labels this explicitly. Remove listings whose project link no longer works.
- Use `also` to list an entry under an additional task, such as a command-line
  library that is also a converter. The entry keeps its anchor in its primary
  `category` and is counted once in search results.
- Add capability labels only when supported by evidence. `open` and `export` are
  independent. Missing labels mean undocumented here, not unsupported.
- `jpeg-reconstruction` specifically means lossless reconstruction of the original
  JPEG, not just lossless pixel encoding. Do not apply it to every lossless encoder.
- Put minimum versions, plugin requirements, build dependencies, edition
  restrictions, and relevant pricing restrictions in `requirements`.
- Use `links` for installation instructions or additional evidence. Keep
  contributor credits in `contributors`. Use `keywords` for useful search aliases.
- Prefer an SVG `logo`. For a raster logo, add the PNG plus a lossless JPEG XL
  copy with the same name (`cjxl -q 100 -e 9 sw_example.png sw_example.jxl`);
  the page serves the `.jxl` first and falls back to the PNG.
- Keep styling and placement consistent. Listings are alphabetical; new
  submissions do not receive featured placement or individual call-to-action styles.
- Avoid duplicating a listing across pages. Update the shared record instead.

Existing entries were migrated with their version and plugin notes. This migration
is not a complete capability audit: entries without capability labels need
project-specific evidence before those labels are added. The three additions
from PRs #119, #120, and #121 link to their submissions or supplied evidence;
listing them does not merge or approve those PRs.

Browser and operating system information is in
`src/data/software-compatibility.ts`. Keep explicit browser versions tied to vendor
announcements and distinguish system integration from individual app support.

## Check changes

Run `npm run check` and `npm run build`. Preview both resource pages at desktop
and mobile sizes. For directory behavior, verify combined search/platform/capability
filters, an empty result, clearing filters, shared filter URLs, keyboard use,
and the complete directory with JavaScript disabled.
