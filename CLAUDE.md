# pdf-form-editor Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-28

## Active Technologies

- TypeScript 5.x + React 18, Vite 5, Express 4, pdf-lib, pdfjs-dist, @dnd-kit/core (001-pdf-form-editor)
- No new dependencies (002-multipage-pdf-navigation)
- No new dependencies (003-field-duplicate-resize)
- No new dependencies (004-field-templates)
- No new dependencies (005-field-default-value)
- No new dependencies (006-canvas-toolbar-modes)
- Next.js 15.x (App Router) replaces React+Vite+Express monorepo; Vitest unified (removes Jest+supertest); CSS Modules + tokens.css (007-nextjs-migration)

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
  hooks/
    useFieldStore.ts    # Global (5 feature consumers)
    useInteractionMode.ts # Global (canvas + toolbar)
  styles/
    tokens.css          # Design tokens (colors, typography, spacing, borders, shadows, z-index)
    reset.css           # Global reset
  types/
    shared.ts           # FormField, FontFamily
  App.tsx               # Root component (keyboard shortcuts, layout)
tests/
  unit/                 # Vitest tests mirroring src/ structure
next.config.ts          # serverExternalPackages: ['pdf-lib']
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

## Key Notes (usePdfRenderer - annotationMode)

- `page.render()` must pass `annotationMode: 2` (ENABLE_FORMS) so pdfjs does NOT draw AcroForm widget boxes on the canvas
- Without this, existing PDF form fields appear as a gray native widget box behind the interactive overlay (BF-005-01)
- AnnotationMode values in pdfjs-dist: DISABLE=0, ENABLE=1, ENABLE_FORMS=2, ENABLE_STORAGE=3

## Recent Changes

- 001-pdf-form-editor: Added TypeScript + React 18, Vite 5, Express 4, pdf-lib, pdfjs-dist, @dnd-kit/core
- 002-multipage-pdf-navigation: PageNavigator + ThumbnailStrip UI; pageDimensionsMap in usePdfRenderer; BF-001 (concurrent pdfjs renders)
- 003-field-duplicate-resize: field duplication (Ctrl+D + context menu) + 8 resize handles
- 004-field-templates: TemplatePanel (save/load/rename/delete/export/import); useTemplateStore (localStorage); templateSchema.ts parse/serialize/validate; Import+Export modals in navbar
- 005-field-default-value: `value?: string` in FormField; PropertiesPanel "Valor predeterminado" input; canvas overlay shows value; server calls textField.setText() before updateAppearances(); extractFields.ts extracts existing AcroForm text fields from uploaded PDFs and loads them as editable canvas overlays
- 006-canvas-toolbar-modes: ToolbarModes (S/I/M/H/Escape); useInteractionMode + useRubberBand hooks; selectionIds replaces selectedFieldId; multi-select via Shift+click/rubber band/Ctrl+A; group move; multi-select PropertiesPanel; pan mode scroll; intersectsRect unit tested
- 007-nextjs-migration: React+Vite+Express monorepo → single Next.js 15 App Router project; Express → Route Handler at src/app/api/generate-pdf/route.ts; Jest+supertest → Vitest unified; src/features/ domain architecture; src/components/ui/ primitives (Button, Modal, Input, Select, Tooltip, IconButton); src/styles/tokens.css + CSS Modules per component; no functional regression

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
