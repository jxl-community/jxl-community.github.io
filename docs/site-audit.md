# Site audit — October 8, 2026

Reviewed the local production build of the JPEG XL community website. No application code was changed.

Follow-up: findings 4 and 5 have now been fixed. The linked committee logo has meaningful alt text, and glossary disclosures use plain summary text with separate permalinks. Build/type checks and focused browser checks passed, including keyboard expansion, cross-category deep links, and accessibility checks for the affected elements. Brave's support entry was also updated from Beta 1.98 to stable 1.97.56. The findings and score below describe the original audit snapshot.

## Scope and validation

- `npm run check`: passes, zero errors or warnings; 11 informational hints about unused declarations and deprecated APIs.
- `npm run build`: passes; 20 Astro pages generated and 19 pages indexed by Pagefind.
- Chromium: visited 18 primary routes at 1440 × 900 and 375 × 812; ran axe WCAG A/AA checks on the desktop pages and a focused check of the open mobile comparison information panel.
- Parsed all 30 generated HTML files for local `href`, `src`, `poster`, and fragment targets: no missing local files or broken fragments.
- No uncaught JavaScript exceptions or HTTP 404 responses during the primary-route smoke checks.
- Focused interaction test confirmed that a `readonly` comparison metric range responds to ArrowRight (52 → 53).

This is a technical review, not a WCAG conformance certification. Automated checks do not establish full accessibility. No Safari/Firefox, HDR hardware, slow-network measurements, external-link crawl, or exhaustive demo codec combinations were tested. Hidden tabs were inspected in source but not all states were automatically scanned. Build warnings about relative CSS image paths were checked against output: the referenced files exist, so they are not reported as broken assets.

## Health score (provisional)

| Dimension | Score | Finding |
|---|---:|---|
| Accessibility | 2/4 | Labels, contrast, nested interaction, and keyboard panning need attention. |
| Performance | 3/4 | Static output, local fonts, and lazy decoder delivery are good; runtime/network performance was not benchmarked. |
| Responsive design | 3/4 | Primary pages fit 375px; comparison information icon is only 20 × 20px on narrow layouts. |
| Theming | 3/4 | Broad token palette exists, but component and inline styles still repeat literal colors. No theme switch is advertised, so absent light mode is not treated as a bug. |
| Anti-patterns | 2/4 | Repeated gradient headings and teal accents on dark surfaces are present in the code. |
| **Total** | **13/20** | **Acceptable, with significant accessibility work needed.** |

Anti-pattern verdict: the implementation contains patterns flagged by the audit rubric, particularly gradient text (`src/styles/styles.css:373`). Whether the visual direction suits the brand remains unassessed: there is no saved design context and audience/tone confirmation was requested. These patterns are not evidence that the site was AI-generated and are not counted as functional defects.

## Findings

### 1. [P1] Core image controls lack accessible names

**Category:** Accessibility. **Locations:** `src/components/JpegJxlComparison.astro:517,543`; `src/components/AvifJxlComparison.astro:512,542`; `src/pages/resources/distance-vs-effort-visualizer.astro:36`.

The active homepage controls `#myQualityRange` and `#mySizeRange_AVIF`, and the visualizer's `#image-dropdown`, fail axe's label checks. The alternate comparison sliders have the same missing-label structure. Adjacent text is not programmatically connected to these controls.

**Impact:** Screen-reader users encounter unnamed controls for choosing comparison settings or images. Numeric range values also do not explain the visible preset names.

**Standard:** WCAG 1.3.1 and 4.1.2.

**Fix:** Add explicit labels or `aria-labelledby`; use `aria-valuetext` for presets such as Small/Medium/Large so the range announces meaningful choices rather than internal numeric indexes.

**Suggested command:** `/harden`.

### 2. [P1] Text contrast falls below WCAG AA

**Category:** Accessibility. **Locations:** `src/styles/navbar.css:818`; `src/pages/art/index.astro:19,129`.

Homepage sitemap headings render at **3.55:1** (#707072 on #18191b, 11px bold). The art page's primary action renders at **3.09:1** (white on #17a3a0, 15.2px normal). Both require 4.5:1.

**Impact:** Navigation labels and a primary gallery action are difficult for users with low vision to read.

**Standard:** WCAG 1.4.3.

**Fix:** Increase the sitemap text opacity/lightness; give the gallery button darker text or a darker background. Recheck hover/focus states as well.

**Suggested command:** `/normalize`.

### 3. [P1] Inline links rely on color alone

**Category:** Accessibility. **Locations:** `src/styles/styles.css:295`; `src/styles/art.css:40`; `src/pages/art/index.astro:240`.

The global anchor rule removes underlines. Axe identifies affected links on the homepage, art index, SDR gallery, and Battle of the Codecs. Link-to-surrounding-text contrast is approximately **2.01:1** on the homepage and **1.01–1.02:1** in art copy, below the 3:1 alternative when color is the only indicator.

**Impact:** Readers can miss links within paragraphs, especially with color-vision differences. These measurements concern differentiation from surrounding text, not contrast against the background.

**Standard:** WCAG 1.4.1.

**Fix:** Underline editorial links at rest, with a consistent offset and thickness. Scope this to body copy so navigation and buttons retain their appropriate styling.

**Suggested command:** `/normalize`.

### 4. [P1] Linked committee logo has no accessible name

**Category:** Accessibility. **Location:** `src/pages/index.astro:231–232`.

The linked `.side_image` has no `alt` attribute, and its surrounding anchor contains no other text. Axe reports both image-alt and link-name failures.

**Impact:** Screen-reader users cannot determine the destination of the keyboard-focusable link.

**Standard:** WCAG 1.1.1 and 2.4.4.

**Fix:** Set meaningful alternative text such as “JPEG XL committee” on the logo, or label the link and use an empty alt on the image.

**Suggested command:** `/harden`.

### 5. [P1] Glossary puts links inside disclosure controls

**Category:** Accessibility. **Location:** `src/pages/resources/glossary.astro:202–207`.

Every term's `<summary>` contains a focusable self-link. Axe reports nine instances in the initially visible category; the shared template repeats the pattern across categories.

**Impact:** The same term combines navigation and expansion in nested interactive elements, which can create inconsistent screen-reader announcements and activation behavior.

**Standard:** WCAG 4.1.2; native interactive semantics.

**Fix:** Render the term as plain summary text; put a separately named permalink outside the summary. Keep the stable fragment ID on the term container.

**Suggested command:** `/harden`.

### 6. [P1] Zoomed images can only be panned with a pointer

**Category:** Accessibility. **Locations:** `public/JPEGvsJXL.js:243–274`; `public/AVIFvsJXL.js:250–281`; `public/resources/DistanceVsEffort.js:84–88`.

Zoom controls support keyboard input, but image panning is implemented exclusively through pointer events. The image viewports do not supply keyboard pan controls.

**Impact:** A keyboard-only visitor can zoom in but cannot inspect image regions outside the centered crop. Panning is a core part of examining compression artifacts.

**Standard:** WCAG 2.1.1.

**Fix:** Make each image viewport keyboard focusable and support arrow-key panning, with a clear focus indicator and instruction. Add a reset-view action. Handle arrows only while the viewport has focus so range inputs retain their normal keyboard behavior.

**Suggested command:** `/harden`.

### 7. [P2] Display-only metric sliders are editable and unnamed

**Category:** Accessibility / functional correctness. **Locations:** `src/components/JpegJxlComparison.astro:151,213,268,337,396,451`; corresponding inputs in `src/components/AvifJxlComparison.astro`.

The information panels use `<input type="range" readonly>` to visualize SSIMULACRA2, Butteraugli, and BPP. HTML range inputs do not honor readonly. A focused browser test changed the first metric from 52 to 53 with ArrowRight, while the adjacent reported score and comparison image stayed unchanged. The open JPEG panel also produces six axe missing-label failures.

**Impact:** Visitors can accidentally make a metric visualization disagree with the actual data; keyboard users must traverse controls that serve no editing purpose.

**Fix:** Replace these ranges with appropriately labeled `<meter>` elements or noninteractive visual indicators. Where lower values are better, explain that direction in accompanying text rather than presenting an editable control.

**Suggested command:** `/harden`.

### 8. [P2] Third-party software-support embed has contrast failures

**Category:** Accessibility. **Location:** Can I Use iframe on `src/pages/resources/software-support.astro`.

Axe reports nine low-contrast elements inside the remote iframe, including format links at **2.13:1** and footer text at **3.02:1**. These are external embed styles, not the site's own CSS.

**Impact:** The embedded compatibility details are harder to read even though the site's surrounding content passes the sampled automated checks.

**Standard:** WCAG 1.4.3.

**Fix:** Keep the site's native software-support information usable independently of the embed, and offer a clear direct link to the source. Consider replacing the iframe with a native accessible summary. Parent-page styles cannot fix a cross-origin iframe.

**Suggested command:** `/adapt`.

## Systemic issues and positive findings

The main accessibility gaps come from bespoke demo controls, unassociated visual labels, and global link styling. Reuse the site's stronger category-tab implementation when updating comparison controls: it already manages selected state and keyboard navigation.

Good practices to preserve include static Astro output, self-hosted fonts with `font-display: swap`, lazy WASM loading, a skip link, labeled navigation/search, focus management in search and mobile navigation, reduced-motion rules, fluid headings, and responsive category selectors. The primary-route mobile checks found no document-level horizontal overflow; the wide codec table has its own scrolling container.

## Recommended order

1. **[P1/P2] `/harden`** — label controls and logo link; remove nested glossary links; make metrics noninteractive; add keyboard panning.
2. **[P1] `/normalize`** — fix verified text contrast and establish an underlined body-link rule.
3. **[P2] `/adapt`** — ensure compatibility information is accessible independently of the third-party embed.
4. **`/polish`** — finish focus/hover consistency and touch target sizing after functional fixes.

You can ask me to run these one at a time, all at once, or in any order you prefer. Re-run `/audit` after fixes to see your score improve.
