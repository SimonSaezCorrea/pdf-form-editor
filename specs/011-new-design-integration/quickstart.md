# Quickstart: New Design System Integration

**Branch**: `011-new-design-integration`

---

## Pre-conditions

1. You are on branch `011-new-design-integration`.
2. `new-design/` folder is present at repo root (read-only reference).
3. `npm run dev` starts without errors on current code.
4. `npm test` passes (baseline green).

---

## Migration Checklist (sequential)

### Step 1 — Copy assets

```bash
# Geist font → public/fonts/
cp new-design/fonts/Geist_wght_.woff2 public/fonts/Geist_wght_.woff2

# Document icon → src/assets/
mkdir -p src/assets
cp new-design/assets/icon-document.svg src/assets/icon-document.svg
cp new-design/assets/icon-sun.svg src/assets/icon-sun.svg
cp new-design/assets/icon-moon.svg src/assets/icon-moon.svg
```

### Step 2 — Replace `tokens.css`

Replace `src/styles/tokens.css` entirely using the token schema from:
- Primary source: `new-design/colors_and_type.css`
- Reference: `specs/011-new-design-integration/data-model.md` (complete token table)

Token strategy: dark-first (`:root` = dark defaults; `[data-theme="light"]` = light overrides).
Remove: `@media (prefers-color-scheme: dark)` block (no longer needed; dark is default).
Keep: `[data-theme="dark"]` block identical to the new `:root` block (for explicit manual override via localStorage).

Verify: `npm run dev` — open app → dark mode renders with teal palette → Geist font loads.

### Step 3 — Add `Kbd` primitive

Create `src/components/ui/Kbd/` with:
- `Kbd.tsx` — renders `<kbd className={styles.kbd}>{children}</kbd>`
- `Kbd.module.css` — key-cap styles from research.md R-004
- `index.ts` — barrel export

### Step 4 — Restyle primitives

Update CSS Modules for: `Button`, `IconButton`, `Input`, `Select`, `Modal`, `Tooltip`.

Reference files:
- `new-design/preview/components-button.html`
- `new-design/preview/components-icon-button.html`
- `new-design/preview/components-input.html`
- `new-design/preview/components-select.html`
- `new-design/preview/components-modal.html`
- `new-design/preview/components-tooltip.html`
- `new-design/ui_kits/pdf-form-editor/primitives.jsx` (CSS class names + variant logic)

Key changes per primitive:
- **Button**: `border-radius: var(--radius-md)`, `padding: var(--space-1) var(--space-3)`, `transition: background .15s, opacity .15s`
- **IconButton**: add `.navbar` variant with `rgba(255,255,255,0.12)` hover
- **Input/Select**: `font-size: var(--font-size-base)`, `background: var(--color-input-bg)`, `border-radius: var(--radius-sm)`, error state
- **Modal**: `border-radius: var(--radius-lg)`, `box-shadow: var(--shadow-lg)`, backdrop `rgba(0,0,0,0.5)`
- **Tooltip**: open delay 700ms, close 0ms, `box-shadow: var(--shadow-sm)`

### Step 5 — App shell wiring

In `App.tsx`:
1. Add `const showEditorToolbar = !!pdfBytes && appMode === 'editor';`
2. Add conditional mode nav: when `!!pdfBytes && appMode === 'filler'` → render "← Cambiar PDF"; else → render mode tabs.
3. ThemeToggle: read `const { theme, toggle } = useTheme()` in App.tsx; pass `theme` + `onToggleTheme={toggle}` to header section; ThemeToggle component becomes prop-driven.

In `App.module.css`:
- `.app-header`: `background: var(--color-navbar-bg)`
- `.viewer-area`: `background: var(--color-viewer-bg)`

### Step 6 — Canvas & toolbar components

Reference: `new-design/ui_kits/pdf-form-editor/EditorScreen.jsx` + `new-design/prototype/editor/enhancements.css`

- `ThumbnailStrip.module.css`: thumb `box-shadow: var(--shadow-sm)`, selected `border: 1px solid var(--color-primary)`, strip width 110px.
- `ToolbarModes.module.css`: active button `background: rgba(255,255,255,0.18)`, inactive opacity `.7`, `transition: background .15s, opacity .15s`.
- `ShortcutsPanel.module.css`: update panel styles; replace `<kbd>` spans with `<Kbd>` primitive in TSX.
- `ThemeToggle.tsx`: change from self-managing to prop-driven (`theme` + `onToggleTheme`).

### Step 7 — Field components

Reference: `new-design/preview/components-field-overlay.html`, `new-design/preview/components-field-list-item.html`

- `DraggableField.module.css`: selected = `1.5px solid var(--color-primary)` border; `.field-bg` keeps `background-color: #fff !important`.
- `FieldList.module.css`: item hover `background: rgba(102,165,173,0.08)`, selected `border: 1px solid var(--color-primary)` + same teal-tint fill.
- `PropertiesPanel.module.css`: 13px base size, section headers via token.
- `FieldOverlay.module.css`: rubber-band selection styles.

### Step 8 — Filler components

Reference: `new-design/ui_kits/pdf-form-editor/FillerScreen.jsx` + `new-design/prototype/filler/filler-enhancements.css`

- `FillerLayout.module.css`: form panel `width: 320px`, `border-right: 1px solid var(--border-color)`.
- `DynamicForm.module.css`: uses restyled `Input` primitive (no direct style override needed if Input CSS is updated in Step 4).
- Integrate `live-pulse` and `jump-pulse` keyframes into `FillerLayout.module.css`.
- Token check: confirm all `--space-N` (not `--spacing-N`) and `--border-color` (not `--color-border`).

### Step 9 — PDF uploader & templates

- `PdfUploader.tsx` (editor + filler): replace current icon SVG with `src/assets/icon-document.svg` — inline it via `import IconDocument from '@/assets/icon-document.svg?raw'` or as a React component.
- `TemplatePanel.module.css`, `ExportModal.module.css`, `ImportModal.module.css`: apply token updates (panel bg, border colors, button styles already handled by Step 4).

### Step 10 — Typography pass

Apply `.t-*` semantic classes where appropriate:
- Upload screen title → `.t-h1`
- Section headers in panels → `.t-label` or `.t-eyebrow`
- Body text → verify `font-size: var(--font-size-base)` (13px) is inherited; no explicit overrides needed in most cases.
- Shortcuts panel group titles → `.t-eyebrow` (uppercase, letter-spaced).

### Step 11 — Animation audit

Scan all `.module.css` files for transitions longer than `.15s` or spring-based animations. Remove or reduce to `background .15s, opacity .15s`. Integrate enhancement keyframes (Step 6 and Step 8 cover the main ones).

---

## Verification

After each step:
```bash
npm run typecheck   # TypeScript must pass
npm test            # All tests must pass (zero modifications)
npm run build       # Build must succeed
```

Visual verification checklist:
- [ ] Dark mode default (cold start, no localStorage)
- [ ] Light mode toggle (sun/moon button)
- [ ] No FOUC on cold start
- [ ] Geist renders (check DevTools → Fonts)
- [ ] Field overlay: white background in dark mode
- [ ] Filler live-preview canvas aligned with PDF canvas at all zoom levels
- [ ] All modal shadows visible
- [ ] Tooltips delay 700ms
- [ ] Kbd keys visible in ShortcutsPanel
- [ ] Thumbnail strip 110px, left of FieldList

---

## Reference files (quick access)

| What | Where |
|------|-------|
| Full token set | `new-design/colors_and_type.css` |
| App shell layout | `new-design/ui_kits/pdf-form-editor/app.css` |
| Editor UI | `new-design/ui_kits/pdf-form-editor/EditorScreen.jsx` |
| Filler UI | `new-design/ui_kits/pdf-form-editor/FillerScreen.jsx` |
| Editor enhancements | `new-design/prototype/editor/enhancements.css` |
| Filler enhancements | `new-design/prototype/filler/filler-enhancements.css` |
| Component previews | `new-design/preview/components-*.html` |
| Token schema | `specs/011-new-design-integration/data-model.md` |
| Research decisions | `specs/011-new-design-integration/research.md` |
