# Assets

Visual primitives lifted from the codebase.

## Logo
The product **does not ship a logo mark** — the brand is the wordmark "PDF Form Editor" rendered in the navbar text. Don't synthesize a mark unless directed.

## Iconography
The product uses inline SVGs (Lucide-style: `stroke-width: 1.5–2`, `stroke-linecap: round`, `currentColor`). Three icons are committed directly:
- `icon-document.svg` — uploader empty-state glyph (also used in PdfUploadScreen).
- `icon-sun.svg`, `icon-moon.svg` — theme toggle icons.

For everything else, link Lucide from CDN: `https://unpkg.com/lucide-static@0.469.0/icons/<name>.svg` (e.g. `trash-2.svg`, `copy.svg`, `download.svg`, `arrow-left.svg`, `chevron-down.svg`, `minus.svg`, `plus.svg`, `x.svg`).

No icon font, no emoji. Stick to Lucide's stroke language.
