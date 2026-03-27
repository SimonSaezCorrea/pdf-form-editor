# pdf-form-editor Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-26

## Active Technologies

- TypeScript 5.x + React 18, Vite 5, Express 4, pdf-lib, pdfjs-dist, @dnd-kit/core (001-pdf-form-editor)
- No new dependencies (002-multipage-pdf-navigation)
- No new dependencies (003-field-duplicate-resize)

## Project Structure

```text
client/
  src/
    components/
      PageNavigator/   # NEW (002): prev/next buttons + page indicator
      ThumbnailStrip/  # NEW (002, P3): clickable thumbnail panel
      FieldOverlay/
        DraggableField.tsx  # MODIFIED (003): ResizeHandles + context menu
        ResizeHandles.tsx   # NEW (003): 8 handle divs with directional cursors
    hooks/
      usePdfRenderer.ts   # MODIFIED (002): pageDimensionsMap added
      useFieldStore.ts    # MODIFIED (003): duplicateField() added
      useFieldResize.ts   # NEW (003): mouse drag logic for resize
    utils/
      fieldName.ts        # NEW (003): duplicatedName() pure utility + MIN constants
    App.tsx               # MODIFIED (003): Ctrl+D shortcut
server/                   # UNCHANGED
shared/                   # UNCHANGED
tests/
  unit/
    fieldName.test.ts     # NEW (003)
    ResizeHandles.test.tsx # NEW (003)
```

## Commands

npm test; npm run lint

## Code Style

TypeScript: Follow standard conventions

## Key Notes (002-multipage-pdf-navigation)

- Server and FormField.page are already multi-page capable — no server changes needed
- usePdfRenderer exposes pageDimensionsMap: Record<number, PageDimensions> (all pages)
- Field name uniqueness is global across all pages (AcroForm constraint)
- Thumbnails: render at scale 0.2 via pdfjs-dist → JPEG dataURL; lazy (IntersectionObserver) for >20 pages

## Key Notes (003-field-duplicate-resize)

- NO server changes — duplication and resize are client-side only
- duplicateField(id, offsetX, offsetY): offset in PDF points; caller converts from canvas px ÷ renderScale
- duplicatedName(): strips trailing _N suffix from source name, finds next available integer ≥ 2; "campo" base for empty names
- Resize drag uses native mouse events on document (NOT @dnd-kit); resize handles MUST stop BOTH onPointerDown AND onMouseDown — stopping only onMouseDown leaves the native pointerdown free to bubble to @dnd-kit's PointerSensor, causing a simultaneous move drag (BF-003-01)
- Resize math: all deltas in canvas px ÷ renderScale → PDF points; see research.md §4 for full direction table
- MIN_FIELD_WIDTH_PX=20, MIN_FIELD_HEIGHT_PX=10 (canvas pixels); clamp before storing to PDF points
- Shift+corner = proportional resize using aspect ratio at drag start
- Context menu: position:fixed at cursor; dismissed on mousedown outside or Escape; all action handlers MUST call e.stopPropagation() — position:fixed is visual only, the DOM node is still inside field-overlay so clicks bubble to handleOverlayClick (BF-003-02)

## Recent Changes

- 001-pdf-form-editor: Added TypeScript + React 18, Vite 5, Express 4, pdf-lib, pdfjs-dist, @dnd-kit/core
- 002-multipage-pdf-navigation: PageNavigator + ThumbnailStrip UI; pageDimensionsMap in usePdfRenderer; BF-001 (concurrent pdfjs renders)
- 003-field-duplicate-resize: field duplication (Ctrl+D + context menu) + 8 resize handles

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
