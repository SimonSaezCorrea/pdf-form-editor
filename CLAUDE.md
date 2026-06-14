# pdf-form-editor Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-05-27

## Active Technologies

- TypeScript 5.x + React 18, Vite 5, Express 4, pdf-lib, pdfjs-dist, @dnd-kit/core (001-pdf-form-editor)
- No new dependencies (002-multipage-pdf-navigation)
- No new dependencies (003-field-duplicate-resize)
- No new dependencies (004-field-templates)
- No new dependencies (005-field-default-value)
- No new dependencies (006-canvas-toolbar-modes)
- Next.js 15.x (App Router) replaces React+Vite+Express monorepo; Vitest unified (removes Jest+supertest); CSS Modules + tokens.css (007-nextjs-migration)
- No new dependencies; CSS custom properties dark mode + useTheme hook + inline anti-FOUC script (008-dark-mode-toggle)
- No new npm dependencies; Google Fonts API via dynamic `<link>` injection (CDN only) (009-precision-ux-fixes)
- No new npm dependencies; pdfjs-dist (already present) for client field detection; pdf-lib (already present) for server-side fill + flatten (010-pdf-filler-mode)
- No new npm dependencies; Geist variable font via local `public/fonts/Geist_wght_.woff2`; new `Kbd` primitive in `src/components/ui/Kbd/` (011-new-design-integration)

## Project Structure

```text
src/
  app/
    api/generate-pdf/
      route.ts          # Next.js Route Handler (replaces Express server)
      pdfService.ts     # PDF generation logic (pdf-lib)
    layout.tsx          # Root layout: imports tokens.css + reset.css
    page.tsx            # Entry point: dynamic import of App
  components/
    ui/                 # Reusable primitives: Button, Modal, Input, Select, Tooltip, IconButton
  features/
    canvas/             # PdfViewer, ThumbnailStrip, usePdfRenderer, useRubberBand
    toolbar/            # ToolbarModes, ShortcutsPanel, useInteractionMode (re-export)
    fields/             # FieldOverlay, DraggableField, ResizeHandles, FieldList,
                        # PropertiesPanel, PageNavigator, useFieldResize
    templates/          # TemplatePanel, ExportModal, ImportModal, useTemplateStore
    pdf/                # PdfUploader + utils (coordinates, export, extractFields,
                        #   fieldName, templateSchema, thumbnails)
    filler/             # Filler mode (010): useFillerStore, useFieldDetection,
                        #   FillerMode, PdfUploadScreen, FillerLayout, DynamicForm
  hooks/
    useFieldStore.ts    # Global (5 feature consumers)
    useInteractionMode.ts # Global (canvas + toolbar)
  styles/
    tokens.css          # Design tokens (colors, typography, spacing, borders, shadows, z-index)
    reset.css           # Global reset
  types/
    shared.ts           # FormField, FontFamily
  App.tsx               # Root component (keyboard shortcuts, layout)
  hooks/
    useTheme.ts         # Theme read/write/reset; localStorage key 'pdf-editor-theme'
  features/
    toolbar/
      components/
        ThemeToggle/    # Sun/moon toggle button; consumes useTheme
tests/
  unit/                 # Vitest tests mirroring src/ structure
next.config.ts          # serverExternalPackages: ['pdf-lib', '@pdf-lib/fontkit']
tsconfig.json           # strict, moduleResolution: bundler, paths: @/*
package.json            # Single unified package (no workspaces)
vitest.config.ts        # jsdom, globals, @/ alias
```

## Commands

npm test; npm run typecheck; npm run build; npm run dev

## Code Style

TypeScript: Follow standard conventions

## Key Notes (002-multipage-pdf-navigation)

- Server and FormField.page are already multi-page capable — no server changes needed
- usePdfRenderer exposes pageDimensionsMap: Record<number, PageDimensions> (all pages)
- Field name uniqueness is global across all pages (AcroForm constraint)
- Thumbnails: render at scale 0.2 via pdfjs-dist → JPEG dataURL; lazy (IntersectionObserver) for >20 pages

## Key Notes (006-canvas-toolbar-modes)

- NO server or shared-types changes — entirely client-side
- `InteractionMode = 'select' | 'insert' | 'move' | 'pan'` lives in `useInteractionMode` hook (NOT in useFieldStore)
- `selectedFieldId: string | null` in useFieldStore is REPLACED by `selectionIds: ReadonlySet<string>` + derived `selectedFieldId` getter (size===1 ? id : null)
- `selectField()` is removed; replaced by `selectSingle(id)`, `clearSelection()`, `toggleSelect(id)`, `selectAll(page)`, `setSelection(ids[])`
- `updateFields(ids[], partial)` is new bulk-update method for multi-selection properties panel
- Rubber band uses native `onPointerDown` on the `.field-overlay` div (NOT @dnd-kit); fires only when no `[data-field-id]` ancestor is hit
- `intersectsRect(a, b): boolean` is an exported pure function in `useRubberBand.ts`, unit tested
- Group move: `handleDragEnd` in PdfViewer checks `selectionIds.has(draggedId)` → if true, applies same delta to all selected fields via `updateFields`
- Resize handles render only when `selectionIds.size === 1`; DraggableField receives `isSingleSelection: boolean` prop
- @dnd-kit `disabled` prop = `mode === 'pan'`; rubber band and pan mode use native pointer events
- Pan mode: `setPointerCapture` + `scrollLeft`/`scrollTop` on the `.viewer-area` scroll container
- Keyboard shortcuts in App.tsx `keydown` handler: S/I/M/H switch mode; Escape → select; Ctrl+A → selectAll(currentPage)

## Key Notes (005-field-default-value)

- `value?: string` is optional in FormField — old templates/requests without it remain valid
- `isValidField` guards (both server route AND client templateSchema) MUST accept `value === undefined`
- `textField.setText(value)` MUST be called BEFORE `textField.updateAppearances(font)` — reversing silently drops text from appearance stream (constitution §IV)
- Canvas overlay: when value is non-empty shows value text (dark `#1f2937`); falls back to field name (indigo) when empty
- `extractFieldsFromPdf(pdfDoc)`: reads `page.getAnnotations()` for all pages, filters `subtype='Widget' + fieldType='Tx'`; rect [x1,y1,x2,y2] maps directly to FormField (PDF bottom-left coords — no conversion needed); font names mapped via prefix table (Helv→Helvetica, TiRo→TimesRoman, Cour→Courier); defaults to Helvetica/12pt when info absent
- App.tsx useEffect on `pdfRenderer.pdfDoc`: runs extraction after each PDF load; only loads if extracted.length > 0 (PDFs without fields keep empty canvas)

## Key Notes (003-field-duplicate-resize)

- NO server changes — duplication and resize are client-side only
- duplicateField(id, offsetX, offsetY): offset in PDF points; caller converts from canvas px ÷ renderScale
- duplicatedName(): strips trailing _N suffix from source name, finds next available integer ≥ 2; "campo" base for empty names
- Resize drag uses native mouse events on document (NOT @dnd-kit); resize handles MUST stop BOTH onPointerDown AND onMouseDown — stopping only onMouseDown leaves the native pointerdown free to bubble to @dnd-kit's PointerSensor, causing a simultaneous move drag (BF-003-01)
- Resize math: all deltas in canvas px ÷ renderScale → PDF points; see research.md §4 for full direction table
- MIN_FIELD_WIDTH_PX=20, MIN_FIELD_HEIGHT_PX=10 (canvas pixels); clamp before storing to PDF points
- Shift+corner = proportional resize using aspect ratio at drag start
- Context menu: position:fixed at cursor; dismissed on mousedown outside or Escape; all action handlers MUST call e.stopPropagation() — position:fixed is visual only, the DOM node is still inside field-overlay so clicks bubble to handleOverlayClick (BF-003-02)

## Key Notes (pdfService - field deduplication on export)

- `generatePdf()` MUST call `form.removeField()` on all existing fields before adding new ones
- Without this, re-exporting a previously-exported PDF duplicates all AcroForm fields (BF-005-02)
- Pattern: `for (const f of form.getFields()) form.removeField(f);` runs before `form.createTextField()`

## Key Notes (pdfService - shared fields by name)

- Duplicate field names are INTENTIONAL and supported: same `name` → ONE AcroForm field with MULTIPLE widget annotations → typing in one widget fills all (shared value). Standard PDF behavior the user explicitly wants.
- `addTextField` takes a `fieldByName: Map<string, PDFTextField>` accumulator: `form.createTextField(name)` runs ONCE per unique name (first occurrence); later same-name fields reuse the existing `PDFTextField`. `addToPage(...)` runs for EVERY FormField (adds each widget). `setText`/`setFontSize`/`updateAppearances` are idempotent for the shared field — last write wins on value.
- Do NOT re-add a duplicate-name guard. `form.createTextField()` throws "Duplicate field" if called twice with the same name — that's why dedup via the Map is mandatory. The `'Duplicate field'` branch in route.ts is now dead (kept harmless).
- PropertiesPanel shows an INFO hint (NOT an `error` — error renders red and reads as "blocked") for duplicate names: "🔗 Mismo nombre: se rellenan juntos". Nothing in the editor blocks duplicate names — there is no guard; the red styling was the only thing that *looked* like a block.
- Shared default value: `useFieldStore.updateField` propagates a `value` edit to every same-name sibling, and renaming a field into an existing same-name group adopts that group's current value. So the default value stays consistent across the shared group both on canvas and on export.
- Caveat: a field with a baked default value (`hasBakedValue`) is drawn as static text at each position and skips the widget path. With the store value-sync, all same-name copies carry the SAME value, so they bake identical text at their positions (visually shared, non-editable). Leave `value` empty if you instead want ONE interactive shared field (widgets linked, type-once-fills-all).

## Key Notes (usePdfRenderer - annotationMode)

- `page.render()` must pass `annotationMode: 2` (ENABLE_FORMS) so pdfjs does NOT draw AcroForm widget boxes on the canvas
- Without this, existing PDF form fields appear as a gray native widget box behind the interactive overlay (BF-005-01)
- AnnotationMode values in pdfjs-dist: DISABLE=0, ENABLE=1, ENABLE_FORMS=2, ENABLE_STORAGE=3

## Key Notes (008-dark-mode-toggle)

- `useTheme()` in `src/hooks/useTheme.ts` is the ONLY consumer of `localStorage['pdf-editor-theme']` — no component may read/write this key directly (FR-009)
- Anti-FOUC: inline `<script dangerouslySetInnerHTML>` in `<head>` of `layout.tsx` reads localStorage + matchMedia and sets `document.documentElement.dataset.theme` before first paint (FR-005)
- Dark-mode CSS in `tokens.css`: two blocks — `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … } }` + `[data-theme="dark"] { … }`. Manual preference wins because `[data-theme="dark"]` has higher specificity than the media query block.
- New semantic tokens added: `--color-panel-bg`, `--color-input-bg`, `--color-text`, `--color-text-muted` (light defaults in `:root`, dark overrides in dark blocks)
- Form field overlays (`DraggableField .field-bg`): `background-color: #fff !important` — dark tokens MUST NOT bleed into PDF canvas field fill (FR-008)
- OS change listener in `useTheme`: only fires when `preference === null` (no stored manual pref); ignored when manual preference is active (FR-004)
- `resetTheme()`: removes localStorage key + dataset.theme attribute; reverts to OS detection — exposed on `useTheme` even if no UI exposes it in v1 (FR-010)

## Recent Changes

- 001-pdf-form-editor: Added TypeScript + React 18, Vite 5, Express 4, pdf-lib, pdfjs-dist, @dnd-kit/core
- 002-multipage-pdf-navigation: PageNavigator + ThumbnailStrip UI; pageDimensionsMap in usePdfRenderer; BF-001 (concurrent pdfjs renders)
- 003-field-duplicate-resize: field duplication (Ctrl+D + context menu) + 8 resize handles
- 004-field-templates: TemplatePanel (save/load/rename/delete/export/import); useTemplateStore (localStorage); templateSchema.ts parse/serialize/validate; Import+Export modals in navbar
- 005-field-default-value: `value?: string` in FormField; PropertiesPanel "Valor predeterminado" input; canvas overlay shows value; server calls textField.setText() before updateAppearances(); extractFields.ts extracts existing AcroForm text fields from uploaded PDFs and loads them as editable canvas overlays
- 006-canvas-toolbar-modes: ToolbarModes (S/I/M/H/Escape); useInteractionMode + useRubberBand hooks; selectionIds replaces selectedFieldId; multi-select via Shift+click/rubber band/Ctrl+A; group move; multi-select PropertiesPanel; pan mode scroll; intersectsRect unit tested
- 007-nextjs-migration: React+Vite+Express monorepo → single Next.js 15 App Router project; Express → Route Handler at src/app/api/generate-pdf/route.ts; Jest+supertest → Vitest unified; src/features/ domain architecture; src/components/ui/ primitives (Button, Modal, Input, Select, Tooltip, IconButton); src/styles/tokens.css + CSS Modules per component; no functional regression
- 008-dark-mode-toggle: useTheme hook (src/hooks/useTheme.ts); ThemeToggle in toolbar; dark-mode CSS blocks in tokens.css; inline anti-FOUC script in layout.tsx <head>; DraggableField field-bg white !important
- 009-precision-ux-fixes: overflow:visible on .draggable-field; decimal coords in PropertiesPanel (step 0.5, no Math.round); displayFont?: string in FormField; src/features/pdf/config/fonts.ts with 20 Google Fonts + lazy link injection; viewerAreaRef in App.tsx for scroll-page-nav + Ctrl+Scroll non-passive wheel zoom
- 010-pdf-filler-mode: Filler mode under src/features/filler/ (own store, no cross-imports with fields/templates); POST /api/fill-pdf (multipart, fill+flatten); useFieldDetection hook (pdfjs getAnnotations); mode: AppMode state in App.tsx; navbar mode selector
- 011-new-design-integration: tokens.css full replacement (dark-first, Geist font, complete teal ramp); new Kbd primitive; primitives restyle; App.tsx showEditorToolbar wiring; all feature component CSS Modules restyled; zero logic changes

## Key Notes (010-pdf-filler-mode)

- `src/features/filler/` is INDEPENDENT of `src/features/fields/` and `src/features/templates/` — NO cross-imports (Principle XXIX). Shared: `PdfViewer`, `usePdfRenderer` (canvas/), `PdfUploader` (pdf/)
- `useFillerStore` uses `useState` local to `FillerMode` component — resets on unmount (filler state is ephemeral by design). NOT Zustand.
- `mode: 'editor' | 'filler'` state lives in `App.tsx`. FillerMode is conditionally rendered — editor state (pdfBytes, useFieldStore) persists in App.tsx across mode switches.
- `POST /api/fill-pdf` in `src/app/api/fill-pdf/route.ts` — separate from generate-pdf. Uses `request.formData()` natively (no parser library needed in Next.js 15).
- `fillService.ts` fill order (Principle XXXI): `field.setText(value)` → `form.updateFieldAppearances(helvetica)` → `form.flatten()` → `pdfDoc.save()`. Do NOT reorder.
- PDF validation: check first 4 bytes for `%PDF` magic (0x25 0x50 0x44 0x46) — extension/MIME type not trusted.
- `FieldNotFoundError` in fillService — caught in route.ts to return 400 `{error:'FIELD_NOT_FOUND', field: name}` instead of 500.
- `useFieldDetection.ts`: uses `page.getAnnotations()` from pdfjs, filters `subtype==='Widget' && fieldType==='Tx'`, collapses same-`fieldName` widgets (across pages AND same page) into ONE `AcroFormField` that accumulates `placements: {page, rect}[]` (every widget). `page`/`rect` mirror the FIRST placement for back-compat. Also extracts `fontSize` from `defaultAppearanceData`. A duplicated field (shared name) = one form input + one shared value, but EVERY placement is drawn/clickable.
- `FillerLayout` draws the live-preview overlay and click targets PER PLACEMENT, not per field: the parent expands `fields` → `FieldPlacement[]` (`{field, rect}`) for each page via `f.placements`. Duplicated widgets all show the same typed value.
- **pdfjs v4**: `annotation.defaultAppearance` string is `undefined` — pdfjs parses it internally and exposes `annotation.defaultAppearanceData.fontSize` (number). Use `defaultAppearanceData` first; fall back to regex on raw DA string for older PDFs.
- **ArrayBuffer detach**: `useFillerStore.handleFileSelected` calls `pdfjs.getDocument({ data: buffer.slice(0) })` — must pass a COPY because `getDocument` transfers the buffer to the worker (detaching it). The original `buffer` is stored in `pdfBytes` state for `usePdfRenderer`.
- **AcroFormField** (`src/features/filler/types.ts`): `{ name, type:'text', page, rect:[x1,y1,x2,y2], fontSize }`. `rect` is PDF user-space coords (bottom-left origin). `fontSize===0` means auto-size.
- **Live preview overlay** (`FillerLayout.tsx`): A second `<canvas>` (same pixel dimensions as the PDF canvas) is positioned `absolute` over the PDF canvas via `.canvas-wrapper`. Drawn via Canvas 2D API in a `useEffect` triggered by `values`, `fields`, `currentPage`, `pageDimensions`, `renderScale`. CSS applies `max-width:100%` identically to both canvases — no CSS-scale mismatch. Coordinate conversion: `canvasX = rect[0]*s`, `canvasY = (pageH - rect[3])*s`.
- **Font size in overlay**: `field.fontSize > 0 ? field.fontSize * renderScale : ch * 0.80` where `ch = (rect[3]-rect[1]) * renderScale`.
- **FillerLayout layout**: Form panel (DynamicForm) is on the LEFT (`border-right`), PDF viewer is on the RIGHT. NOT the original spec order (spec said PDF left, form right — reversed by UX decision post-implementation).
- **Zoom in FillerLayout**: `zoom` state (default 1.0), `BASE_SCALE=1.5`, range 25%–300%, step 10%. `usePdfRenderer(pdfBytes, BASE_SCALE * zoom)`. Zoom controls (`IconButton` +/−) in header. Ctrl+Scroll on `pdfPanelRef` with `{ passive: false }` non-passive wheel listener (same pattern as editor).
- **CSS tokens in filler**: ALL filler CSS files use `--space-N` (NOT `--spacing-N`) and `--border-color` (NOT `--color-border`). These are the only tokens defined in `tokens.css`.
- DynamicForm filters empty values before POST: only `Object.entries(values).filter(([,v]) => v !== '')` sent as `fields` JSON (FR-009).
- `src/app/api/fill-pdf/README.md` MUST exist and stay in sync with any contract changes (Principle XXX).

## Key Notes (009-precision-ux-fixes)

- `DraggableField.module.css` `.draggable-field`: `overflow: hidden` → `overflow: visible` — fix for delete button clipping at field edges (BF-009-01)
- `PropertiesPanel` x/y/width/height inputs: `step=0.5`, value = `parseFloat(field.x.toFixed(2))` — no `Math.round()` anywhere (BF-009-02; Principle XXIV)
- `displayFont?: string` is optional in FormField — old fields without it render using `field.font` (FontFamily). `isValidField` MUST accept `displayFont === undefined`
- `FONT_CATALOG` in `src/features/pdf/config/fonts.ts` is the SOLE source of Google Font names — no component may hardcode a font name (Principle XXVII)
- `loadGoogleFont(googleFamily)` checks for existing `<link>` before injecting — idempotent; safe to call multiple times for the same font
- PDF export (`pdfService.ts`) uses `field.font: FontFamily` exclusively — `displayFont` is IGNORED by the API route
- `viewerAreaRef` in App.tsx refs the `<main className={viewer-area}>` scroll container; shared by BOTH the scroll-page-nav handler AND the Ctrl+Scroll useEffect
- Ctrl+Scroll `useEffect` uses `{ passive: false }` — MUST use native `addEventListener`, NOT `onWheel` JSX (React makes wheel passive in React 17+, preventing `preventDefault`)
- Scroll-page-nav: `requestAnimationFrame(() => { el.scrollTop = ... })` needed after `setCurrentPage` because setState is async; direct `el.scrollTop` assignment before re-render has no effect
- `zoomIn`/`zoomOut` in Ctrl+Scroll `useEffect` deps array — wrap with `useCallback` if they cause infinite re-registration

## Key Notes (011-new-design-integration)

- `tokens.css` strategy: dark-first — `:root` defines dark-mode values; `[data-theme="light"]` block overrides to light. Remove `@media (prefers-color-scheme: dark)` block.
- Anti-FOUC inline script in `layout.tsx` MUST NOT change — it already writes `[data-theme]` attribute which is the hook for both old and new token strategy.
- Geist font: `@font-face` in `tokens.css`, file at `public/fonts/Geist_wght_.woff2`. NOT loaded via next/font/local. Fallback: system UI stack.
- `--color-primary` dark value = `#66A5AD` (was `#07575B`). Intentional — legibility. Constitution Principle XII already documents this.
- `DraggableField .field-bg`: `background-color: #fff !important` MUST survive token migration — no dark token bleeds into PDF field fill.
- `showEditorToolbar` in App.tsx: derived boolean (`!!pdfBytes && appMode === 'editor'`). NOT new state — derivation only.
- Filler CSS: ONLY `--space-N` tokens (not `--spacing-N`) and `--border-color` (not `--color-border`). Both defined in new tokens.css.
- `Kbd` primitive at `src/components/ui/Kbd/` — one call-site (ShortcutsPanel). Justified as design-system primitive per Principle XIII.
- `enhancements.css` keyframes go into specific feature `.module.css` files — NOT a new global CSS file (Principle XI).
- All feature component logic (hooks, stores, API routes) MUST NOT be modified — CSS Modules only.

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
