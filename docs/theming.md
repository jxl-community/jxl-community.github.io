# Theming conventions

The Astro site keeps its shared design tokens in `src/styles/tokens.css`, imported by `BaseLayout.astro`. The token migration preserves the existing palette, transparency, gradients, and typography. It does not introduce a theme switch.

## Choosing tokens

- Reuse palette primitives such as `--brand--teal--800` and `--neutrals--gray--200` for existing brand colors.
- Use role tokens such as `--surface--nav-dropdown`, `--surface--control`, `--text--color--caption`, and `--focus--ring` for UI surfaces, text, and focus treatments. Add new shared color values here rather than repeating literals in component rules.
- Keep component aliases, such as `--visualizer-surface`, in the component stylesheet and point them at shared tokens. These aliases allow local customization without changing unrelated components.
- Keep chart effort colors in `--chart--effort-1` through `--chart--effort-8` and the active series in `--chart--selected`. SVG markers, curves, and legend swatches use the same tokens.
- Use the existing font and spacing tokens where they represent the intended design value. Image dimensions, viewport geometry, and measured data are not palette tokens.

For example:

```css
.panel {
  background: var(--surface--panel);
  color: var(--text--color--cool-white);
  border: 1px solid var(--overlay--white-border);
}
```

## Stylesheet placement

Shared rules live in `src/styles/`. The former inline page style blocks now live under `src/styles/pages/`, matching their route paths. Small component-specific rules can stay in Astro's scoped `<style>` blocks.

Preserve import order when editing these pages. Astro's bundled global styles originally followed the inline head blocks, so most extracted page styles are imported before `BaseLayout`. The homepage imports its extracted rules after `homepage-inline.css` to retain its existing overrides. Changing this order can change equal-specificity rules, including comparison panels and history headings.

Use classes for static presentation rather than HTML `style` attributes. Inline custom properties remain appropriate for content or runtime data: codec ratings and percentages, photo aspect ratios and focal positions, slider positions, chart series selection, and image zoom/pan transforms.

## Boundaries

Vendor reset/export foundations (`normalize.css` and `webflow.css`), embedded image/SVG URLs, test-image color data, external badges, and the third-party support iframe keep their own values. CSS variables do not propagate into embedded SVG image URLs or cross-origin frames. Legacy standalone HTML in `public/` still uses its archived styles; it is outside the Astro theme bundle.

## Verification

Run `npm run check` and `npm run build`. Preview the production build when checking cascade order. For palette changes, check desktop and mobile layouts, menu surfaces, focus/hover states, comparison metrics, and chart markers/legends. Contrast should be rechecked whenever a text or background token changes.

The October 9 migration was checked against computed-style snapshots of 19 routes at 1440px and 375px widths. Colors and typography matched the baseline; animation timing and image loading can affect transient dimensions. Browser checks also verified token overrides in SVG/chart elements, menu blur, keyboard pan/reset, metric indicators, and gallery button contrast.
