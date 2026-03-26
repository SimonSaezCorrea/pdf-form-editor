# Quickstart: Multi-Page PDF Navigation and Field Editing

**Branch**: `002-multipage-pdf-navigation` | **Date**: 2026-03-26

> This document extends [001-pdf-form-editor/quickstart.md](../../001-pdf-form-editor/quickstart.md). Prerequisites, project bootstrap, and development commands are unchanged.

---

## What's New in This Feature

- **Page navigation**: Previous/Next buttons + "Página X de N" indicator appear when the loaded PDF has more than one page.
- **Per-page field isolation**: Fields placed on page 3 are visible only when viewing page 3.
- **Page badge in sidebar**: Each field row in the field list shows which page it belongs to (e.g., `p.3`).
- **Thumbnail strip** (P3): Clickable page thumbnails for direct page jumping.
- **Keyboard shortcuts**: `←` / `→` arrow keys navigate pages when not focused in a text field.

---

## Development Setup

```bash
git checkout 002-multipage-pdf-navigation
npm install       # no new dependencies
npm run dev       # starts client (5173) + server (3002)
```

---

## Testing Multi-Page Navigation Manually

### 1. Prepare a multi-page PDF

Any multi-page PDF works. To create a quick test fixture:

```bash
# Option A: Use any existing multi-page PDF you have on disk

# Option B: Create a minimal 3-page PDF with pdf-lib (Node.js script)
node -e "
const { PDFDocument } = require('pdf-lib');
async function go() {
  const doc = await PDFDocument.create();
  for (let i = 0; i < 12; i++) doc.addPage([595, 842]);
  const fs = require('fs');
  fs.writeFileSync('test-12pages.pdf', await doc.save());
  console.log('Created test-12pages.pdf');
}
go();
" -w server
```

### 2. Verify navigation

1. Open `http://localhost:5173`
2. Upload a multi-page PDF
3. Verify "Página 1 de N" appears with Previous (disabled) and Next (enabled) buttons
4. Click Next — page 2 renders, indicator updates to "Página 2 de N"
5. Navigate to the last page — Next button becomes disabled

### 3. Verify per-page field isolation

1. On page 1, click the canvas to add 3 fields
2. Navigate to page 7 — page 1 fields are not shown
3. Add 2 fields on page 7
4. Navigate back to page 1 — only the 3 original fields are shown
5. Field list sidebar shows all 5 fields with `p.1` / `p.7` badges

### 4. Verify export with multi-page fields

```bash
# Using the success-criteria scenario: 3 fields on p1, 2 on p7, 1 on p12
curl -X POST http://localhost:3002/api/generate-pdf \
  -F "pdf=@./test-12pages.pdf" \
  -F 'fields=[
    {"id":"1","name":"field_p1_a","page":1,"x":72,"y":750,"width":200,"height":24,"fontSize":12,"fontFamily":"Helvetica"},
    {"id":"2","name":"field_p1_b","page":1,"x":72,"y":710,"width":200,"height":24,"fontSize":12,"fontFamily":"Helvetica"},
    {"id":"3","name":"field_p1_c","page":1,"x":72,"y":670,"width":200,"height":24,"fontSize":12,"fontFamily":"Helvetica"},
    {"id":"4","name":"field_p7_a","page":7,"x":72,"y":400,"width":200,"height":24,"fontSize":12,"fontFamily":"Helvetica"},
    {"id":"5","name":"field_p7_b","page":7,"x":72,"y":360,"width":200,"height":24,"fontSize":12,"fontFamily":"Helvetica"},
    {"id":"6","name":"field_p12","page":12,"x":72,"y":200,"width":200,"height":24,"fontSize":12,"fontFamily":"Helvetica"}
  ]' \
  --output result-multipage.pdf

# Open result-multipage.pdf in Adobe Acrobat or any PDF reader.
# Expected: 3 fillable fields on page 1, 2 on page 7, 1 on page 12.
# All other pages have no fields.
```

---

## Running Tests

```bash
npm test              # all tests (Vitest + Jest)
npm test -w client    # Vitest — includes PageNavigator.test.tsx
npm test -w server    # Jest — unchanged (server needs no changes)
```

---

## Key Implementation Notes

- **Page dimension map**: `usePdfRenderer` now exposes `pageDimensionsMap: Record<number, PageDimensions>` (all pages at scale 1). Used for coordinate conversion on every page — essential for PDFs with mixed page sizes.
- **Field add uses current page**: When the user clicks the canvas, `pageNum = pdfRenderer.currentPage` is passed to `store.addField`. Fields cannot be added to a non-visible page.
- **Export sends all fields**: `exportPdf(pdfBytes, store.fields)` sends the entire flat `fields` array. The server already routes each field to its correct page via `field.page`.
- **Duplicate name warning is global**: The duplicate-name check covers all pages. The same field name on page 1 and page 7 is invalid (AcroForm constraint).
- **Thumbnail scale**: Thumbnails are rendered at scale 0.2 and exported as JPEG at 0.7 quality. For PDFs > 20 pages, thumbnails are generated lazily via `IntersectionObserver`.

---

## Architecture Decision Quick Reference

| Decision | Choice | See |
|----------|--------|-----|
| Per-page dimension caching | Eager load all pages on document load | research.md § 2 |
| Navigation UI placement | `PageNavigator` component below canvas | research.md § 3 |
| Thumbnail generation | pdfjs-dist at scale 0.2 → JPEG dataURL | research.md § 4 |
| Thumbnail loading strategy | Eager ≤ 20 pages; IntersectionObserver > 20 | research.md § 4 |
| Field sidebar display | Show all pages with page badge | research.md § 5 |
| Name uniqueness scope | Global (all pages) | research.md § 6 |
| Server changes | None (already multi-page capable) | research.md § 1 |
