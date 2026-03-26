# Research: Multi-Page PDF Navigation and Field Editing

**Branch**: `002-multipage-pdf-navigation` | **Date**: 2026-03-26

---

## 1. What Already Works (No Changes Needed)

**Decision**: Do not rewrite or duplicate existing multi-page infrastructure.

The existing codebase is already multi-page capable at the data and server layers:

| Layer | What exists | Status |
|-------|-------------|--------|
| `shared/types.ts` | `FormField.page: number` (1-indexed) | Complete — no changes |
| `server/pdfService.ts` | `pdfDoc.getPages()[field.page - 1]` — embeds each field on its correct page | Complete — no changes |
| `usePdfRenderer.ts` | `currentPage`, `totalPages`, `setCurrentPage`, page rendering on navigation | Complete — no changes to core logic |
| `useFieldStore.ts` | Fields stored flat with `page`; `addField` accepts `pageNum` | Complete — no changes |
| `App.tsx` | `currentPageFields = fields.filter(f => f.page === currentPage)` | Already filters by page |

**What is missing**: UI controls to expose `setCurrentPage` / `totalPages` to the user, and a per-page dimension cache.

---

## 2. Per-Page Dimension Caching

**Decision**: Load all page dimensions (at scale 1) eagerly on document load and store in a `Record<number, PageDimensions>` map. Expose this as `pageDimensionsMap` from `usePdfRenderer`.

**Rationale**:
- Different pages may have different sizes (mixed portrait/landscape, cover pages, appendices).
- Coordinate conversion (`canvasToPdf` / `pdfToCanvas`) requires the page height at scale 1 for the *current* page — not the overall document.
- Loading dimensions at scale 1 is cheap: `pdfDoc.getPage(n)` → `page.getViewport({ scale: 1 })` is a synchronous viewport calculation, no pixel rendering required.
- Caching upfront avoids async lookups on every page switch.

**Implementation**:

```typescript
// Inside usePdfRenderer, after document loads:
const map: Record<number, PageDimensions> = {};
for (let i = 1; i <= doc.numPages; i++) {
  const p = await doc.getPage(i);
  const vp = p.getViewport({ scale: 1 });
  map[i] = { width: vp.width, height: vp.height };
}
setPageDimensionsMap(map);
```

**Usage**: `pageDimensionsMap[currentPage]` replaces `pageDimensions` for the current page. The existing `pageDimensions` return value can stay as an alias (`pageDimensionsMap[currentPage] ?? null`) for backwards compatibility.

**Alternatives considered**:
- Lazy-loading per-page dimensions on first visit: more complex, delays first interaction on each new page.
- Using the current page's `pageDimensions` only: works for single-page; breaks coordinate math when mixed-size pages are visited in non-sequential order before they're cached.

---

## 3. Page Navigation UI Pattern

**Decision**: A `PageNavigator` component below (or above) the canvas, with Previous/Next `<button>` elements and a text label "Página X de N".

**Button state rules**:
- Previous is `disabled` when `currentPage === 1`
- Next is `disabled` when `currentPage === totalPages`
- Both are hidden (or the entire component) when `totalPages <= 1`

**Keyboard support**: Wire `ArrowLeft` / `ArrowRight` keyboard shortcuts at the `App` level (document-scoped `keydown` listener) only when a PDF is loaded and the user is not focused on a text input (check `event.target instanceof HTMLInputElement`).

**Alternatives considered**:
- A page number `<input>` for direct entry: adds complexity for the P1 MVP; covered by the thumbnail strip (P3) for direct page jumping.
- Embedding navigation inside `PdfViewer`: couples navigation logic to the renderer; keeping it in `App.tsx` wiring is cleaner.

---

## 4. Thumbnail Generation with pdfjs-dist

**Decision**: Render each thumbnail by calling `pdfDoc.getPage(n)` at a low scale (≈ 0.2), rendering to a temporary off-screen `<canvas>`, and exporting via `canvas.toDataURL('image/jpeg', 0.7)`.

**Scale calculation**: A typical A4 page at scale 1 is ~595 × 842 px. At scale 0.2: ~119 × 168 px — a compact thumbnail that loads quickly.

**Implementation sketch**:

```typescript
async function generateThumbnail(
  pdfDoc: PDFDocumentProxy,
  pageNum: number,
  thumbScale = 0.2,
): Promise<string> {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: thumbScale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d')!;
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL('image/jpeg', 0.7);
}
```

**Lazy loading strategy**: For PDFs ≤ 20 pages, generate all thumbnails eagerly after document load. For PDFs > 20 pages, use an `IntersectionObserver` inside `ThumbnailStrip` to generate each thumbnail only when its slot becomes visible.

**Threshold**: 20 pages × ~15 KB per JPEG ≈ 300 KB total — acceptable for eager loading. Above that, lazy generation prevents a spike on large documents.

**Alternatives considered**:
- Rendering thumbnails at scale 1 and CSS-scaling down: wastes memory and CPU for large pages.
- Using `canvas.toDataURL('image/png')`: larger file size (~3–5× vs JPEG at 0.7 quality); PNG quality unnecessary for thumbnails.
- Rendering thumbnails in a Web Worker: adds complexity; thumbnail generation is not on the critical path (navigation can work before thumbnails finish).

---

## 5. Field List — Page Badge

**Decision**: Add a small "P{N}" badge to each row in `FieldList` showing which page the field belongs to.

**Rationale**: When a user has fields on multiple pages, the sidebar becomes ambiguous without page context. A compact badge (e.g., `p.2`) communicates page affiliation without cluttering the list.

**Scope**: Modify `FieldList.tsx` only. No changes to `useFieldStore`.

**Alternative considered**: Filter the sidebar to show only current-page fields — rejected because the user benefits from seeing all fields globally (to catch naming conflicts and review the full form structure).

---

## 6. Field Name Uniqueness — Multi-Page Constraint

**Decision**: Field name uniqueness remains global across all pages. The AcroForm specification ties field values by name — two fields with the same name on different pages share their value in a PDF reader.

**Impact on UI**: The existing duplicate-name warning in `PropertiesPanel` and the export gate in `App.tsx` (`hasDuplicateNames`) already check the entire `fields` array (not just the current page). No change needed.

**Impact on server**: `pdfService.ts` already validates uniqueness across all fields before embedding. No change needed.

**Documentation note**: Add a comment to `PropertiesPanel` explaining the cross-page scope of the uniqueness constraint, to prevent future confusion.

---

## 7. State Reset on PDF Change

**Decision**: Existing behavior — `store.resetFields()` is called in `handlePdfLoaded` — is correct and sufficient. When a new PDF is loaded, all fields from the previous document are discarded and `currentPage` resets to 1. No change needed.
