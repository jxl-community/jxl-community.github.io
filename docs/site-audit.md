# Site audit — October 8, 2026

Reviewed the local production build of the JPEG XL community website on October 8. Follow-up implementation status updated October 9, 2026. Changes are in the local project; this report does not establish deployment status.

## Current completion status

**6 findings completed, 1 deferred, 1 accepted limitation.** Only #3 awaits a separately chosen link treatment. The Can I Use embed (#8) is retained as required by the user.

| Finding | Status | Completed / remaining work |
|---|---|---|
| 1. Core image control names | Completed | Four comparison sliders have accessible names and spoken preset labels; the visualizer image picker is labeled. Appearance is unchanged. |
| 2. Text contrast | Completed | Sitemap headings measure approximately **4.63:1**; the art gallery primary button uses a darker teal background and passes contrast checks at rest, hover, and focus. |
| 3. Inline link differentiation | Deferred | Body links still need a visual indicator beyond color. Underlines were explicitly declined; an alternative treatment is pending. |
| 4. Committee logo link name | Completed | Added `alt="JPEG XL committee"` to the linked logo. |
| 5. Nested glossary controls | Completed | Summary text is a native disclosure control; separately labeled permalinks preserve deep links. |
| 6. Keyboard image panning | Completed | All three image views support arrow-key panning and Home to reset zoom/pan, with focus indicators and instructions. |
| 7. Editable metric displays | Completed | All 12 metric ranges are noninteractive visual indicators; readable metric text remains accessible, with markers synchronized to comparison data. |
| 8. Third-party embed contrast | Accepted limitation | The Can I Use iframe must remain. Its external contrast failures are documented; no changes are planned. |

Additional completed changes:

- Updated Brave from Beta 1.98 to **stable 1.97.56**, based on Chromium 155, and changed its link to the regular download page.
- Fixed navigation backdrop layering and applied **24px blur** with a darker background to desktop and mobile menus. This readability improvement is separate from finding #2.

Follow-up validation: production builds and type checks passed. Focused browser/axe checks verified the control names, keyboard updates to spoken presets, logo link name, glossary Enter/Space activation and cross-category deep links, and all three sitemap headings' contrast. Desktop Escape and mobile menu open/close behavior were verified after the blur change. Keyboard pan/reset, pan limits, preservation of native divider-slider keys, focus instructions, mobile width, and art-button contrast at rest/hover/focus also passed. Both mobile comparison information panels pass focused axe checks; their 12 metric indicators have no tab stops or keyboard editing, and marker positions update with comparison presets. The support embed remains present. The health score below is the **original audit baseline**, not a newly scored full audit.

## Scope and validation

- `npm run check`: passes, zero errors or warnings; 11 informational hints about unused declarations and deprecated APIs.
- `npm run build`: passes; 20 Astro pages generated and 19 pages indexed by Pagefind.
- Chromium: visited 18 primary routes at 1440 × 900 and 375 × 812; ran axe WCAG A/AA checks on the desktop pages and a focused check of the open mobile comparison information panel.
- Parsed all 30 generated HTML files for local `href`, `src`, `poster`, and fragment targets: no missing local files or broken fragments.
- No uncaught JavaScript exceptions or HTTP 404 responses during the primary-route smoke checks.
- Focused interaction test confirmed that a `readonly` comparison metric range responds to ArrowRight (52 → 53).

This is a technical review, not a WCAG conformance certification. Automated checks do not establish full accessibility. No Safari/Firefox, HDR hardware, slow-network measurements, external-link crawl, or exhaustive demo codec combinations were tested. Hidden tabs were inspected in source but not all states were automatically scanned. Build warnings about relative CSS image paths were checked against output: the referenced files exist, so they are not reported as broken assets.

## Original health score (provisional baseline)

| Dimension | Score | Finding |
|---|---:|---|
| Accessibility | 2/4 | Labels, contrast, nested interaction, and keyboard panning need attention. |
| Performance | 3/4 | Static output, local fonts, and lazy decoder delivery are good; runtime/network performance was not benchmarked. |
| Responsive design | 3/4 | Primary pages fit 375px; comparison information icon is only 20 × 20px on narrow layouts. |
| Theming | 3/4 | Broad token palette exists, but component and inline styles still repeat literal colors. No theme switch is advertised, so absent light mode is not treated as a bug. |
| Anti-patterns | 2/4 | Repeated gradient headings and teal accents on dark surfaces are present in the code. |
| **Total** | **13/20** | **Acceptable, with significant accessibility work needed.** |

Anti-pattern verdict: the implementation contains patterns flagged by the audit rubric, particularly gradient text (`src/styles/styles.css:373`). Whether the visual direction suits the brand remains unassessed: there is no saved design context and audience/tone confirmation was requested. These patterns are not evidence that the site was AI-generated and are not counted as functional defects.

## Findings and resolution details

Descriptions below preserve the original findings. Status and resolution notes identify the work completed since the audit.

### 1. [P1] Core image controls lack accessible names

**Status: Completed.** Added `aria-label` to all four preset sliders and the image picker. Preset sliders use `aria-valuetext`, synchronized with their visible labels on input/change. Keyboard and focused label checks passed; no styling changed.

**Category:** Accessibility. **Locations:** `src/components/JpegJxlComparison.astro:517,543`; `src/components/AvifJxlComparison.astro:512,542`; `src/pages/resources/distance-vs-effort-visualizer.astro:36`.

The active homepage controls `#myQualityRange` and `#mySizeRange_AVIF`, and the visualizer's `#image-dropdown`, fail axe's label checks. The alternate comparison sliders have the same missing-label structure. Adjacent text is not programmatically connected to these controls.

**Impact:** Screen-reader users encounter unnamed controls for choosing comparison settings or images. Numeric range values also do not explain the visible preset names.

**Standard:** WCAG 1.3.1 and 4.1.2.

**Fix:** Add explicit labels or `aria-labelledby`; use `aria-valuetext` for presets such as Small/Medium/Large so the range announces meaningful choices rather than internal numeric indexes.

**Suggested command:** `/harden`.

### 2. [P1] Text contrast falls below WCAG AA

**Status: Completed.** Homepage sitemap headings were brightened from 38% to 46% white, reaching approximately **4.63:1**. The art primary action now uses the teal-800 token instead of teal-700; focused contrast checks pass at rest, hover, and focus.

**Category:** Accessibility. **Locations:** `src/styles/navbar.css:818`; `src/pages/art/index.astro:19,129`.

Homepage sitemap headings render at **3.55:1** (#707072 on #18191b, 11px bold). The art page's primary action renders at **3.09:1** (white on #17a3a0, 15.2px normal). Both require 4.5:1.

**Impact:** Navigation labels and a primary gallery action are difficult for users with low vision to read.

**Standard:** WCAG 1.4.3.

**Resolution:** Increased sitemap text opacity and darkened the gallery button background. Hover/focus contrast was verified.

**Suggested command:** `/normalize`.

### 3. [P1] Inline links rely on color alone

**Status: Deferred at the user's request.** Do not add underlines; a different visual treatment will be chosen separately.

**Category:** Accessibility. **Locations:** `src/styles/styles.css:295`; `src/styles/art.css:40`; `src/pages/art/index.astro:240`.

The global anchor rule removes underlines. Axe identifies affected links on the homepage, art index, SDR gallery, and Battle of the Codecs. Link-to-surrounding-text contrast is approximately **2.01:1** on the homepage and **1.01–1.02:1** in art copy, below the 3:1 alternative when color is the only indicator.

**Impact:** Readers can miss links within paragraphs, especially with color-vision differences. These measurements concern differentiation from surrounding text, not contrast against the background.

**Standard:** WCAG 1.4.1.

**Pending fix:** Choose a persistent non-color indicator for editorial links without underlines, or ensure at least 3:1 contrast against surrounding text plus an additional non-color indicator on hover/focus. Scope this to body copy so navigation and buttons retain their appropriate styling.

**Suggested command:** `/normalize`.

### 4. [P1] Linked committee logo has no accessible name

**Status: Completed.** Added `alt="JPEG XL committee"`; focused image-alt and link-name checks passed.

**Category:** Accessibility. **Location:** `src/pages/index.astro:231–232`.

The linked `.side_image` has no `alt` attribute, and its surrounding anchor contains no other text. Axe reports both image-alt and link-name failures.

**Impact:** Screen-reader users cannot determine the destination of the keyboard-focusable link.

**Standard:** WCAG 1.1.1 and 2.4.4.

**Fix:** Set meaningful alternative text such as “JPEG XL committee” on the logo, or label the link and use an empty alt on the image.

**Suggested command:** `/harden`.

### 5. [P1] Glossary puts links inside disclosure controls

**Status: Completed.** Removed links from summaries and the custom click interception. Each summary keeps its stable fragment ID; a separately named permalink appears within the expanded details. Added focus indicators and verified Enter/Space activation, cross-category deep links, mobile width, and the absence of nested-interactive violations.

**Category:** Accessibility. **Location:** `src/pages/resources/glossary.astro:202–207`.

Every term's `<summary>` contains a focusable self-link. Axe reports nine instances in the initially visible category; the shared template repeats the pattern across categories.

**Impact:** The same term combines navigation and expansion in nested interactive elements, which can create inconsistent screen-reader announcements and activation behavior.

**Standard:** WCAG 4.1.2; native interactive semantics.

**Fix:** Render the term as plain summary text; put a separately named permalink outside the summary. Keep the stable fragment ID on the term container.

**Suggested command:** `/harden`.

### 6. [P1] Zoomed images can only be panned with a pointer

**Status: Completed.** JPEG/JXL, AVIF/JXL, and Distance vs Effort image viewports are keyboard focusable and labeled, with arrow-key panning and Home to restore 1× zoom and centered pan. Instructions appear on keyboard focus and are associated with each viewport. Native keys for nested comparison sliders remain unchanged. Browser checks confirmed pan limits, reset, focus instructions, and mobile width.

**Category:** Accessibility. **Locations:** `public/JPEGvsJXL.js:243–274`; `public/AVIFvsJXL.js:250–281`; `public/resources/DistanceVsEffort.js:84–88`.

Zoom controls support keyboard input, but image panning is implemented exclusively through pointer events. The image viewports do not supply keyboard pan controls.

**Impact:** A keyboard-only visitor can zoom in but cannot inspect image regions outside the centered crop. Panning is a core part of examining compression artifacts.

**Standard:** WCAG 2.1.1.

**Fix:** Make each image viewport keyboard focusable and support arrow-key panning, with a clear focus indicator and instruction. Add a reset-view action. Handle arrows only while the viewport has focus so range inputs retain their normal keyboard behavior.

**Suggested command:** `/harden`.

### 7. [P2] Display-only metric sliders are editable and unnamed

**Status: Completed.** Replaced all 12 `readonly` ranges with noninteractive spans and CSS triangle markers. The decorative scales are hidden from assistive technology because adjacent labeled text already supplies each metric's value. JavaScript updates the marker position and text together, clamping the visual position to the scale. No keyboard editing or tab stops remain; focused axe checks pass in both open panels, and preset changes update the markers correctly.

**Category:** Accessibility / functional correctness. **Locations:** `src/components/JpegJxlComparison.astro:151,213,268,337,396,451`; corresponding inputs in `src/components/AvifJxlComparison.astro`.

The original information panels used `<input type="range" readonly>` to visualize SSIMULACRA2, Butteraugli, and DSSIM. HTML range inputs do not honor readonly. A focused browser test changed the first metric from 52 to 53 with ArrowRight, while the adjacent reported score and comparison image stayed unchanged. The open JPEG panel also produced six axe missing-label failures.

**Impact:** Visitors can accidentally make a metric visualization disagree with the actual data; keyboard users must traverse controls that serve no editing purpose.

**Fix:** Replace these ranges with appropriately labeled `<meter>` elements or noninteractive visual indicators. Where lower values are better, explain that direction in accompanying text rather than presenting an editable control.

**Suggested command:** `/harden`.

### 8. [P2] Third-party software-support embed has contrast failures

**Status: Accepted limitation at the user's request.** The Can I Use embed must remain. Its contrast limitations are recorded, but remediation is excluded from the current work.

**Category:** Accessibility. **Location:** Can I Use iframe on `src/pages/resources/software-support.astro`.

Axe reports nine low-contrast elements inside the remote iframe, including format links at **2.13:1** and footer text at **3.02:1**. These are external embed styles, not the site's own CSS.

**Impact:** The embedded compatibility details are harder to read even though the site's surrounding content passes the sampled automated checks.

**Standard:** WCAG 1.4.3.

**Decision:** Retain the iframe. Parent-page styles cannot fix its cross-origin content; do not remove or replace it as part of this audit follow-up.

**Suggested command:** `/adapt`.

## Systemic issues and positive findings

Body-link styling remains deferred, and the third-party embed's contrast is an accepted limitation. The metric displays, named controls, keyboard panning, glossary disclosures, logo link, and first-party text contrast findings are resolved.

Good practices to preserve include static Astro output, self-hosted fonts with `font-display: swap`, lazy WASM loading, a skip link, labeled navigation/search, focus management in search and mobile navigation, reduced-motion rules, fluid headings, and responsive category selectors. The primary-route mobile checks found no document-level horizontal overflow; the wide codec table has its own scrolling container.

## Recommended remaining work

1. **[P1, deferred] `/normalize`** — apply the separately chosen non-underlined body-link treatment (#3).
2. **`/polish`** — finish focus/hover consistency and touch target sizing after the link treatment is chosen.

You can ask me to run these one at a time, all at once, or in any order you prefer. Re-run `/audit` after fixes to see your score improve.
