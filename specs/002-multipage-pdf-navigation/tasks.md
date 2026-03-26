# Tasks: Multi-Page PDF Navigation and Field Editing

**Input**: Design documents from `/specs/002-multipage-pdf-navigation/`
**Prerequisites**: plan.md ✓ spec.md ✓ research.md ✓ data-model.md ✓ contracts/ ✓ quickstart.md ✓

**Tests**: Included for `PageNavigator` (clear behavioral rules), `ThumbnailStrip` (interaction contract), and multi-page PDF export (critical path). Tests for trivially-wired components are omitted.

**Organization**: Tasks grouped by user story (US1, US4, US2, US3 from spec.md — ordered by priority and dependency) to enable independent implementation and testing.

**Key insight from codebase analysis**: The server (`pdfService.ts`), shared types (`FormField.page`), and `useFieldStore` are already fully multi-page capable. Zero server changes needed. `usePdfRenderer` already exposes `currentPage`/`totalPages`/`setCurrentPage`. The primary new work is UI navigation controls and thumbnail strip.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete sibling tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)

---

## Phase 2: Foundational (Blocking Prerequisite)

**Purpose**: Extend `usePdfRenderer` with per-page dimension cache and expose `pdfDoc` — required by both `PageNavigator` (page count) and `ThumbnailStrip` (thumbnail generation).

**⚠️ CRITICAL**: No user story work can begin until this task is complete.

- [x] T001Extend `client/src/hooks/usePdfRenderer.ts`: (1) after document loads, iterate all pages with `pdfDoc.getPage(n)` and `page.getViewport({ scale: 1 })` to populate `pageDimensionsMap: Record<number, PageDimensions>`; (2) add `pdfDoc: PDFDocumentProxy | null` and `pageDimensionsMap` to the `PdfRenderer` interface return value; keep existing `pageDimensions` as alias `pageDimensionsMap[currentPage] ?? null` for backward compatibility

**Checkpoint**: `usePdfRenderer` exposes `pageDimensionsMap` and `pdfDoc` without breaking existing tests.

---

## Phase 3: User Story 1 — Navigate Between Pages (Priority: P1) 🎯 MVP

**Goal**: User sees Previous/Next buttons and "Página X de N" when a multi-page PDF is loaded; navigation renders the correct page; single-page PDFs show no navigation.

**Independent Test**: Load any multi-page PDF → verify indicator shows "Página 1 de N" → click Next → indicator updates → click Prev on page 1 → button is disabled. Load a single-page PDF → verify navigation is absent.

### Implementation

- [x] T002[US1] Create `client/src/components/PageNavigator/PageNavigator.tsx`: accepts props `currentPage: number`, `totalPages: number`, `onPrev: () => void`, `onNext: () => void`; renders Previous button (disabled when `currentPage === 1`), "Página {currentPage} de {totalPages}" label, Next button (disabled when `currentPage === totalPages`); returns `null` when `totalPages <= 1`; include component CSS in `client/src/index.css` under a `.page-navigator` class
- [x] T003[P] [US1] Write Vitest unit tests for `PageNavigator` in `client/tests/unit/PageNavigator.test.tsx`: (a) Previous disabled and Next enabled on page 1; (b) Next disabled and Previous enabled on last page; (c) both enabled on a middle page; (d) label text is "Página 2 de 5" for currentPage=2/totalPages=5; (e) component returns null when totalPages=1
- [x] T004[US1] Integrate `PageNavigator` into `client/src/App.tsx`: import and render `PageNavigator` in the `viewer-area` section with `currentPage={pdfRenderer.currentPage}`, `totalPages={pdfRenderer.totalPages}`, `onPrev={() => pdfRenderer.setCurrentPage(pdfRenderer.currentPage - 1)}`, `onNext={() => pdfRenderer.setCurrentPage(pdfRenderer.currentPage + 1)}`; check whether `PdfViewer.tsx` already renders nav controls and remove duplicates if so
- [x] T005[US1] Add keyboard navigation in `client/src/App.tsx`: attach a `keydown` listener to `window` inside a `useEffect` that is active only when `pdfBytes` is not null; on `ArrowLeft` call `setCurrentPage(currentPage - 1)` if `currentPage > 1` and `document.activeElement` is not an `HTMLInputElement` or `HTMLTextAreaElement`; on `ArrowRight` call `setCurrentPage(currentPage + 1)` if `currentPage < totalPages`; clean up listener on effect teardown

**Checkpoint**: US1 fully functional — import any multi-page PDF, navigate pages with buttons and arrow keys, single-page PDFs show no navigation.

---

## Phase 4: User Story 4 — Export All Fields Across All Pages (Priority: P1)

**Goal**: After adding fields on multiple pages via navigation, the exported PDF contains all fields on their correct pages.

**Independent Test**: Via cURL with the example in `quickstart.md § Testing Multi-Page Navigation Manually` — POST a 12-page PDF with fields on pages 1, 7, and 12; verify the exported PDF has exactly those 6 fields on the correct pages in any standard PDF reader.

**Note**: The export path is already fully implemented — `App.tsx` calls `exportPdf(pdfBytes, store.fields)` (all fields, not filtered to current page), and `pdfService.ts` routes each field to its page via `field.page`. This phase is verification and test coverage.

### Implementation

- [x] T006[US4] Audit `client/src/components/PdfViewer/PdfViewer.tsx`: confirm the canvas `onClick` handler calls `onFieldAdd` with `pdfRenderer.currentPage` (or equivalent) as the `pageNum` argument; if missing or hardcoded to `1`, update the call so newly placed fields are assigned the correct page; add an inline comment `// field.page = active page at time of placement`
- [x] T007[P] [US4] Add Jest test for multi-page embedding in `server/tests/unit/pdfService.test.ts`: create a 3-page PDF with `pdf-lib`, call `generatePdf(buffer, [fieldOnPage1, fieldOnPage2, fieldOnPage3])`, load the result with `pdf-lib`, get its AcroForm, and assert all 3 field names are present; assert `pdfDoc.getPages()` has 3 pages (no pages dropped or duplicated)

**Checkpoint**: US4 verified — end-to-end export with multi-page fields confirmed; Jest test passes.

---

## Phase 5: User Story 2 — Add and Edit Fields Per Page (Priority: P2)

**Goal**: Fields added on page 3 appear only while viewing page 3; navigating away and back shows only those fields; editing fields on one page does not affect another page's fields.

**Independent Test**: Add 3 fields on page 1 → navigate to page 2 → verify canvas overlay is empty → add 2 fields on page 2 → navigate back to page 1 → verify only 3 fields shown; sidebar shows all 5 fields with page badges `p.1` and `p.2`.

**Note**: Per-page isolation is already implemented in `App.tsx` (`currentPageFields = store.fields.filter(f => f.page === pdfRenderer.currentPage)`) and `useFieldStore`. The work here is the sidebar page badge and confirming the `addField` page assignment is correct (covered in T006).

### Implementation

- [x] T008[US2] Update `client/src/components/FieldList/FieldList.tsx`: add a page badge element to each field row rendering `p.{field.page}` (e.g., `<span className="field-page-badge">p.{field.page}</span>`); add `.field-page-badge` CSS in `client/src/index.css` with a subtle background (e.g., light gray pill); badge should be visible but not dominant relative to the field name
- [x] T009[US2] Add `useEffect` reset in `client/src/App.tsx` that calls `pdfRenderer.setCurrentPage(1)` when a new PDF is loaded (i.e., when `pdfBytes` changes to a non-null value) — prevents stale `currentPage` if user loads a shorter PDF while on a high page; confirm `store.resetFields()` is already called in `handlePdfLoaded` (it is — no change needed there)

**Checkpoint**: US2 verified — field isolation works per page; sidebar shows page badges; loading a new PDF resets to page 1.

---

## Phase 6: User Story 3 — Jump to Page via Thumbnail Strip (Priority: P3)

**Goal**: A scrollable panel shows miniature previews of all pages; clicking any thumbnail instantly navigates to that page; the active thumbnail is visually highlighted.

**Independent Test**: Load a 12-page PDF → verify 12 thumbnail slots appear → click thumbnail 7 → page 7 renders and thumbnail 7 is highlighted → thumbnail strip renders lazily for a 25-page PDF (only visible thumbnails are rendered initially).

### Implementation

- [x] T010[P] [US3] Create thumbnail utility `client/src/utils/thumbnails.ts`: export `async function generateThumbnail(pdfDoc: PDFDocumentProxy, pageNum: number, scale = 0.2): Promise<string>` — creates an off-screen `<canvas>`, renders the page via `pdfDoc.getPage(pageNum)` at the given scale, returns `canvas.toDataURL('image/jpeg', 0.7)`
- [x] T011[US3] Create `client/src/components/ThumbnailStrip/ThumbnailStrip.tsx`: accepts props `pdfDoc: PDFDocumentProxy`, `totalPages: number`, `currentPage: number`, `onPageSelect: (page: number) => void`; renders a scrollable vertical container with one slot per page; for PDFs ≤ 20 pages: generate all thumbnails eagerly in a `useEffect` on mount; for PDFs > 20 pages: use `IntersectionObserver` per slot to generate thumbnails lazily when the slot becomes visible; each slot is a `<button>` with an `<img src={dataUrl}>` or a loading placeholder; active slot (matching `currentPage`) gets class `thumbnail-active`; include CSS in `client/src/index.css` under `.thumbnail-strip` and `.thumbnail-active`
- [x] T012[P] [US3] Write Vitest tests for `ThumbnailStrip` in `client/tests/unit/ThumbnailStrip.test.tsx`: (a) renders exactly `totalPages` thumbnail slots; (b) the slot for `currentPage` has the `thumbnail-active` class; (c) clicking slot N calls `onPageSelect(N)`; mock `generateThumbnail` to return a stable data URL string
- [x] T013[US3] Wire `ThumbnailStrip` into `client/src/App.tsx`: render it in the `editor-layout` section when `pdfRenderer.pdfDoc !== null && pdfRenderer.totalPages > 1`; pass `pdfDoc={pdfRenderer.pdfDoc}`, `totalPages={pdfRenderer.totalPages}`, `currentPage={pdfRenderer.currentPage}`, `onPageSelect={pdfRenderer.setCurrentPage}`; position as a sidebar panel or horizontal strip above the viewer area

**Checkpoint**: US3 functional — thumbnail strip navigates any page in one click; lazy loading confirmed on a 25+ page PDF.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end validation and any final UX adjustments.

- [x] T014[P] Review and tighten CSS for `PageNavigator` and `ThumbnailStrip` in `client/src/index.css`: ensure consistent button sizing, disabled state opacity, active thumbnail contrast, and correct overflow/scroll behavior for the thumbnail strip on small viewports
- [ ] T015 Run full end-to-end validation per `specs/002-multipage-pdf-navigation/quickstart.md`: `npm run dev` → import a 12-page PDF → add 3 fields on page 1 → navigate to page 7 → add 2 fields → navigate to page 12 → add 1 field → click Export → open result in a PDF reader → confirm all 6 fields appear on their correct pages and are fillable

---

## Bug Fixes

### BF-001 — Concurrent pdfjs renders cause "Failed to load PDF" on load

**Reported**: 2026-03-26
**Status**: Fixed

**Symptom**: After loading any PDF with the thumbnail strip visible, the app displayed "Failed to load PDF. The file may be corrupted or password-protected." or the main canvas remained blank despite a valid PDF.

**Root cause**: pdfjs-dist only allows one active `render()` call per page proxy object at a time. When `ThumbnailStrip` mounted, it called `generateThumbnail(pdfDoc, 1)` (eager for ≤20 pages), which called `pdfDoc.getPage(1)` → `page.render()` on an off-screen canvas. Simultaneously, `usePdfRenderer`'s page-render effect called `pdfDoc.getPage(1)` → `page.render()` on the main canvas. pdfjs cancelled one of the two renders, throwing `RenderingCancelledException`. `generateThumbnail` had no error handling, causing an unhandled promise rejection. Additionally, the document-loading `.catch()` in `usePdfRenderer` swallowed errors without `console.error`, making the actual pdfjs error invisible in the console.

**Files changed**:

- `client/src/utils/thumbnails.ts` — Added retry loop (up to 5 attempts, linear 100 ms backoff per attempt) that catches `RenderingCancelledException` and waits for the main render to finish before retrying. Non-cancellation errors re-thrown immediately.
- `client/src/components/ThumbnailStrip/ThumbnailStrip.tsx` — Added `.catch(() => {})` to both `generateThumbnail` call sites (eager and lazy) to prevent unhandled rejections; the thumbnail slot falls back to the page-number placeholder on failure.
- `client/src/hooks/usePdfRenderer.ts` — Added `console.error('[usePdfRenderer] Failed to load PDF document:', err)` to the document-loading `.catch()` handler so the raw pdfjs error is visible in the browser console for future diagnostics.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 2 (Foundational — T001)**: No dependencies — start immediately. Blocks all user story phases.
- **Phase 3 (US1 — T002–T005)**: Requires T001. Independent of US2/US3/US4.
- **Phase 4 (US4 — T006–T007)**: Requires T001 + US1 complete (navigation needed to place multi-page fields manually for end-to-end testing).
- **Phase 5 (US2 — T008–T009)**: Requires US1 complete.
- **Phase 6 (US3 — T010–T013)**: Requires T001 (needs `pdfDoc` from `usePdfRenderer`) and US1 complete.
- **Phase 7 (Polish — T014–T015)**: Requires all desired stories complete.

### User Story Dependencies

- **US1 (P1)**: Requires T001 only — no story dependencies
- **US4 (P1)**: Requires US1 (navigate to add multi-page fields for test); server implementation already complete
- **US2 (P2)**: Requires US1 complete (navigation must work to observe field isolation)
- **US3 (P3)**: Requires T001 (needs `pdfDoc`) and US1 complete

### Within Each Phase

- T003 (PageNavigator tests) parallelizable with T002 (write tests while component is built)
- T007 (Jest multi-page test) parallelizable with T006
- T010 (thumbnail utility) parallelizable with T011 (write utility while building component)
- T012 (ThumbnailStrip tests) parallelizable with T011

---

## Parallel Example: Phase 3 (US1 Navigation)

```bash
# After T001, launch T002 and T003 in parallel:
Task T002: "Create PageNavigator component in client/src/components/PageNavigator/PageNavigator.tsx"
Task T003: "Write Vitest tests for PageNavigator in client/tests/unit/PageNavigator.test.tsx"

# Then T004 and T005 sequentially (T004 first — wires component; T005 adds keyboard on top)
```

## Parallel Example: Phase 6 (US3 Thumbnails)

```bash
# Launch T010 and T011 together (independent files):
Task T010: "Create generateThumbnail utility in client/src/utils/thumbnails.ts"
Task T011: "Create ThumbnailStrip component in client/src/components/ThumbnailStrip/ThumbnailStrip.tsx"

# Launch T012 (tests) in parallel with T010+T011:
Task T012: "Write Vitest tests for ThumbnailStrip in client/tests/unit/ThumbnailStrip.test.tsx"

# Then T013 (wire into App.tsx — depends on T011 complete):
Task T013: "Wire ThumbnailStrip into client/src/App.tsx"
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete T001 (Foundational)
2. Complete T002–T005 (US1 — Navigation)
3. **STOP and VALIDATE**: Multi-page PDF opens, Previous/Next navigate pages, keyboard shortcuts work
4. Deliverable: Users can navigate any PDF; field placement on correct pages works automatically

### Incremental Delivery

1. T001 → Foundation ready
2. T002–T005 (US1) → Page navigation working → **Demo: navigate 12-page PDF**
3. T006–T007 (US4) → Export verified → **Demo: 6 fields across 3 pages export correctly**
4. T008–T009 (US2) → Field badges + isolation confirmed → **Demo: field list shows page badges**
5. T010–T013 (US3) → Thumbnail strip → **Demo: direct page jump in one click**
6. T014–T015 (Polish) → Production-ready

### Single Developer Order

T001 → T002 → T003 (parallel with T002) → T004 → T005 → T006 → T007 (parallel with T006) → T008 → T009 → T010 → T011 (parallel with T010) → T012 (parallel with T010+T011) → T013 → T014 → T015

---

## Notes

- `[P]` tasks operate on different files with no cross-task dependencies within the same phase
- T003 and T012 (test tasks marked `[P]`) should be written before or during implementation so they fail first, then pass after implementation
- T006 is a verification task — if `PdfViewer.tsx` already passes the correct `pageNum`, it becomes a 1-line comment addition
- `pageDimensionsMap[currentPage]` in T001 must be populated before `PdfViewer` renders — ensure the `dimensionCaching` step in `usePdfRenderer` completes before exposing `isLoading = false`
- The `ThumbnailStrip` uses `IntersectionObserver` which is available in all target browsers (Chrome 120+, Firefox 120+, Safari 17+) — no polyfill needed
- Commit after each Phase checkpoint
