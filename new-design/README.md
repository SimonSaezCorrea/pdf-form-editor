# PDF Form Editor — Design System

A design system for **PDF Form Editor**, a browser-based tool for placing,
editing, and filling PDF form fields. The product is a dark-themed Next.js
app with three primary surfaces — an upload empty-state, a three-pane editor
(toolbar + canvas + field sidebar + properties panel), and a two-pane filler
(form input + live PDF preview).

This folder collects the visual foundations, components, and a high-fidelity
UI-kit recreation so a design agent can stay on-brand when extending the
product or producing artifacts about it.

## Sources

- **Codebase** — `src/` (mounted locally, read-only). The source of truth.
  This system was built by reading `src/styles/tokens.css`, `src/App.tsx`,
  `src/App.module.css`, every primitive in `src/components/ui/`, and the
  feature components under `src/features/`.
- **GitHub repo** — <https://github.com/SimonSaezCorrea/pdf-form-editor>.
  If you have access, browse it directly — there is more depth in the field
  store, extraction, and export utilities than this system captures.

> The system mirrors what's actually in the code today (Nov 2025). If the
> product diverges, re-run the create-design-system flow to refresh.

## Index

| File / folder | What it contains |
| --- | --- |
| `README.md` | This document — context, content & visual foundations, iconography, index. |
| `SKILL.md` | Self-contained skill manifest for Claude Code / Agent Skills. |
| `colors_and_type.css` | Single CSS file with every token + semantic role class (`.t-h1`, `.t-body`, `.t-label`…). |
| `assets/` | Logo mark + lucide-style SVG icons + the uploader glyph. See `assets/README.md`. |
| `preview/` | 27 small HTML cards (~700 × 150–340 px) — what the Design System tab shows. |
| `ui_kits/pdf-form-editor/` | Click-through React prototype of the full app (editor + filler). |

## The product in one paragraph

PDF Form Editor lets a user upload a PDF, **place form fields** on it visually
(with drag, resize, snap, multi-select, copy/paste, keyboard shortcuts, etc.),
then export either the editable form-field PDF or — via the separate **filler
mode** — a flattened, pre-filled copy. The interface is in **Spanish** ("Editor
de plantilla", "Rellenar PDF", "Subir otro PDF"); strings inside developer-
facing source like the FieldList header and PropertiesPanel are still in
English ("Fields", "Field Properties", "Delete Field"), reflecting a mixed
i18n state.

## Content fundamentals

**Voice — practical, neutral, Spanish-first.** Verbs are concise imperatives:
*Importar*, *Exportar*, *Cancelar*, *Eliminar*, *Subir otro PDF*. Confirmations
are positive and short: *¡Copiado!*, *Generando…*. There are no "we"s and no
marketing copy anywhere — the app talks to a user who already knows what they
came to do.

**Casing** — Sentence case for everything: button labels (`Exportar PDF`),
modal titles (`Exportar plantilla`), section headers (`Atajos de teclado`).
The eyebrow style (uppercase, letter-spaced) is reserved for shortcut-group
titles inside the Shortcuts panel — that's the only place you'll see ALL CAPS.

**Tu vs Usted** — instructional copy uses the implicit *tú* register
(`Haz clic para seleccionar un archivo PDF`, never `Haga clic`). It's the
casual-but-still-formal middle ground typical of modern Chilean SaaS.

**Tone examples lifted from source:**
- Uploader hint: *"Importa un PDF y añade campos de formulario interactivos."*
- Filler empty state: *"Sube un PDF con campos AcroForm para rellenarlos de forma interactiva."*
- Loading text: *"Analizando campos del PDF…"*
- Validation: *"⚠ Duplicate name — must be unique"* (mixed — English in dev-facing properties, Spanish in user flows).
- Tooltip pattern: *"Acción · Tecla"* — e.g. *"Insertar · I"*.

**Emoji** — none. The only non-text characters used are `←`, `✕`, `−`, `+`,
`▾`, `?`, and `⚠` — chosen for clarity, not personality.

**Pluralization is hand-written**: *"3 campos detectados"*, *"1 campo detectado"*
(see `FillerLayout.tsx`). Don't introduce pluralization libraries; match this
pattern.

## Visual foundations

**Theme.** Dark mode is the default — set on `<html data-theme="dark">` by an
inline script in `src/app/layout.tsx`. Light mode is opt-in via the navbar
toggle. Both palettes share the same semantic roles (`--color-surface`,
`--color-panel-bg`, `--color-input-bg`, etc.) so component CSS is theme-agnostic.

**Color personality.** Teal-tinted neutrals are the through-line: even the
dark mode's "near-black" surface (`#091214`) is biased teal, and the neutral
ramp (`#d6eef2 → #2a5a65`) carries the brand into greys. **`#07575B`** is the
brand teal; in dark mode it shifts to **`#66A5AD`** for legible contrast.
**`#E76F51`** is the accent (clay/coral); in dark mode it warms to
**`#F4A261`**. Danger is plain `#dc2626` red — no teal tint.

**Type.** Brand face is **Geist** (variable, weight axis 100–900), wired via `@font-face` in `colors_and_type.css` from `fonts/Geist_wght_.woff2`. System UI stack remains the fallback. The base UI size is **`13 px`** — a deliberately tight, dense scale appropriate for a power-user tool. Sizes go xs / sm / base / md / lg / xl
(11/12/13/14/16/18) plus 2xl/3xl (22/28) reserved for upload-screen titles
and would-be marketing surfaces. Weights are 400/500/600/700, with 600
("semibold") doing almost all the heavy-lifting for headings.

**Spacing.** Strict 4 px grid — `--space-1` through `--space-16` (4, 8, 12,
16, 20, 24, 32, 40, 48, 64). Panel padding is 12–16 px; control padding is
4–12 px. Density is high.

**Backgrounds.** Flat. **No gradients, no patterns, no full-bleed photos, no
hand-drawn illustration.** The viewer area uses a separate `--color-viewer-bg`
that's intentionally slightly lighter than the app surface so PDF pages stand
out against it. The only place gradient appears in this design system is the
synthesized logo mark in `assets/logo-mark.svg` — a stylistic concession the
product doesn't currently make.

**Animation.** Minimal. `transition: background .15s, opacity .15s` on
interactive elements (hover/active). Tooltip uses a 700 ms-hold open and 0 ms
close. No easing functions named, no spring physics, no entrance choreography.

**Hover states.** Buttons get a darker/lighter background swap (variant-
specific). Navbar buttons darken to `rgba(255,255,255,0.12)`. Icon buttons
fill in with `--color-neutral-200`. Ghost buttons get `--color-neutral-100`.
Field list items get `rgba(102,165,173,0.08)`. **Opacity drops** are used for
the secondary mode-bar buttons (.7 → 1).

**Press / active states.** Toolbar mode buttons show a brighter
`rgba(255,255,255,0.18)` fill with a 1 px transparent border for selection.
Field list items in the selected state get the same teal-tint fill plus a
1 px `--color-primary` border. No shrink, no shadow change.

**Borders.** Always 1 px solid, almost always `--border-color` (resolves to
`#1a3a45` in dark, `#8ec4cc` in light). Selected fields on the canvas use a
**1.5 px** border in `--color-primary` or `--color-danger`. Inputs invert that
on error.

**Shadows.** Four-stop ramp:
- `sm` `0 1px 2px / .05` — tooltips, thumbnails
- `md` `0 2px 8px / .10` — app header, popovers
- `lg` `0 4px 16px / .15` — modals, FABs
- `xl` `0 8px 32px / .20` — reserved (export modal could use it)

No inner shadows. No drop shadows on text or icons.

**Transparency & blur.** Used sparingly: modal backdrop is `rgba(0,0,0,0.5)`,
selected-field overlay is `rgba(220,38,38,0.07)` over a `#fff` field fill.
No `backdrop-filter`, no glass. The product needs the canvas to read true.

**Corner radii.** 4 px (`sm`) on controls, **5 px (`md`)** as the default
control radius, 8 px (`lg`) on modals and panels, 12 px (`xl`) reserved.
Pills (999 px) are used only for tags. **No fully-rounded** primary buttons.

**Cards.** There are no decorative cards in the product. Panels (sidebars,
properties) are flat surfaces with a 1 px border on one edge only —
`border-right` on the sidebar, `border-left` on the properties panel. The
filler form panel and toolbar are similarly partition-style.

**Layout rules.** Fixed top navbar (two 48 px rows when a file is open) +
fixed-width sidebars (thumbnails 110 px, fields 220 px, properties 240 px)
+ a fluid canvas in the middle. The shortcuts FAB is **fixed bottom-right**
(`--space-4`, 40 × 40 px circle). On filler mode the form panel is 320 px.

**Z-layers** — `0` canvas, `10` field overlay, `20` resize handles, `50`
context menu, `100` toolbar, `200` modal, `300` tooltip. Memorize these.

## Iconography

Inline SVG, **Lucide style**: 1.5–2 px stroke, round caps, round joins,
`currentColor`. Drawn at `24 × 24` viewBox, rendered between 14 and 22 px
in UI. No icon font, no PNG sprites. The product has **two committed inline
SVGs** in source (the `<path d="M14 2H6…">` "document" glyph used by both
uploaders and the sun/moon pair in `ThemeToggle.tsx`); everything else
(`+`, `−`, `✕`, `?`, `▾`) is a Unicode glyph rendered as text inside an
`IconButton`.

**For new icons:** import from Lucide
(`https://unpkg.com/lucide-static@0.469.0/icons/<name>.svg`). Match the
1.5–2 px stroke. **Do not** mix in filled icons or another set's flavor.

**Emoji** — never. **Decorative SVG illustrations** — never. The uploader's
document icon is the most ornamental element in the product; that's the
ceiling.

Three SVGs are committed in `assets/`:
- `assets/icon-document.svg` (uploader)
- `assets/icon-sun.svg`, `assets/icon-moon.svg` (theme toggle)

The product has no logo mark — the brand is the plain wordmark "PDF Form Editor".

## Fonts

**Geist** (variable, weight axis 100–900) is the brand face. The variable file lives at `fonts/Geist_wght_.woff2` and is wired via `@font-face` at the top of `colors_and_type.css`. System UI stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, …`) is the fallback before Geist loads or if it 404s.

## Iterate with me

You can hand me a screen description, a section of an existing screen, a new
flow, or a deck-style artifact. I'll stay inside the constraints documented
here unless you tell me otherwise.

Next things you might want me to do:
- Add Storybook-style state matrices for each component (hover/focus/disabled/loading).
- Recreate the import / export modals with real JSON content.
- Add a **light-mode** screenshot pair to the UI kit (currently only dark).
- Bring in a real PDF render preview via `pdfjs-dist` rather than the HTML mock.
