# Tasks: PDF Form Editor

**Input**: Design documents from `/specs/001-pdf-form-editor/`
**Prerequisites**: plan.md ✓ spec.md ✓ research.md ✓ data-model.md ✓ contracts/ ✓ quickstart.md ✓

**Tests**: Included for coordinate conversion (mathematically critical — wrong conversion = silent visual/export mismatch) and API validation logic. Frontend component tests not included.

**Organization**: Tasks grouped by user story (US1–US5 from spec.md) to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete sibling tasks)
- **[Story]**: Which user story this task belongs to (US1–US5)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Monorepo initialization — all packages scaffolded, scripts working.

- [x] T001 Create monorepo root directory structure: `client/`, `server/`, `shared/` per plan.md
- [x] T002 Create root `package.json` with npm workspaces (`client`, `server`, `shared`), `dev` script using `concurrently`, `test` script running both workspace test commands
- [x] T003 [P] Initialize client package: `client/package.json` (React 18, Vite 5, TypeScript 5, pdfjs-dist, @dnd-kit/core, @dnd-kit/utilities), `client/vite.config.ts`, `client/tsconfig.json`, `client/index.html`, `client/src/main.tsx`, `client/src/App.tsx`
- [x] T004 [P] Initialize server package: `server/package.json` (Express 4, TypeScript 5, multer, pdf-lib, tsx), `server/tsconfig.json`, `server/src/index.ts` (bare Express app on port 3002)
- [x] T005 [P] Initialize shared package: `shared/package.json`, `shared/tsconfig.json`, `shared/types.ts` (empty placeholder); add `shared` as a dependency in both `client/package.json` and `server/package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared type contract, PDF worker configuration, and coordinate math — required by every subsequent phase.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T006 Define `FormField` interface and `FontFamily` type in `shared/types.ts` per `data-model.md § FormField`
- [x] T007 Configure pdfjs-dist worker in `client/vite.config.ts`: Vite URL resolution via `new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)` in `client/src/main.tsx`
- [x] T008 Implement `canvasToPdf()` and `pdfToCanvas()` conversion functions in `client/src/utils/coordinates.ts` per exact formulas in `research.md § 3`
- [x] T009 [P] Write Vitest unit tests for `canvasToPdf()` and `pdfToCanvas()` in `client/tests/unit/coordinates.test.ts` — cover: round-trip accuracy, Y-axis flip, scale ≠ 1.0, page height edge cases

**Checkpoint**: Foundation ready — `npm run dev` starts both servers; coordinate functions pass all tests. ✓ **8/8 Vitest tests pass**

---

## Phase 3: User Story 1 — Import and Preview PDF (Priority: P1) 🎯 MVP

**Goal**: User can select a PDF from disk and see it rendered as a visual preview with page navigation.

**Independent Test**: Load any PDF via the UI → confirm all pages render correctly → no fields required.

### Implementation

- [x] T010 [US1] Create `usePdfRenderer` hook in `client/src/hooks/usePdfRenderer.ts`: accepts `ArrayBuffer | null`, loads with `pdfjs-dist`, renders current page to a `canvasRef`, exposes `{ totalPages, currentPage, setCurrentPage, pageDimensions, renderScale, isLoading, error }`
- [x] T011 [US1] Create `PdfUploader` component in `client/src/components/PdfUploader/PdfUploader.tsx`: file `<input accept=".pdf">`, reads selected file as `ArrayBuffer`, calls `onPdfLoaded(bytes: ArrayBuffer, filename: string)` prop; shows error if non-PDF selected
- [x] T012 [US1] Create `PdfViewer` component shell in `client/src/components/PdfViewer/PdfViewer.tsx`: `position: relative` container, `<canvas>` element (sized to viewport output), page navigation controls (Previous / Page N of M / Next), accepts `pdfRenderer` from `usePdfRenderer` as prop
- [x] T013 [US1] Wire `PdfViewer` to `usePdfRenderer` in `client/src/components/PdfViewer/PdfViewer.tsx`: attach `canvasRef` from hook to `<canvas>`, trigger re-render on page change
- [x] T014 [US1] Integrate `PdfUploader` and `PdfViewer` into `client/src/App.tsx`: manage `pdfBytes` state, conditionally show uploader or viewer, pass `renderScale = 1.5`

**Checkpoint**: US1 fully functional — import any PDF, navigate pages, canvas renders each page correctly.

---

## Phase 4: User Story 2 — Place and Position Form Fields (Priority: P2)

**Goal**: User can click the PDF canvas to add a text field and drag existing fields to reposition them; x/y coordinates update automatically.

**Independent Test**: Load a PDF → click two locations → verify each field appears and has correct PDF-point coordinates displayed.

### Implementation

- [x] T015 [US2] Implement `useFieldStore` hook in `client/src/hooks/useFieldStore.ts`: manages `fields: FormField[]` and `selectedFieldId: string | null`; exposes `addField`, `updateField`, `deleteField`, `selectField`, `resetFields` — `addField` calls `canvasToPdf()` internally and assigns auto-name `field_N`
- [x] T016 [US2] Create `FieldDropZone` component (inline in `PdfViewer`): `position: absolute; top:0; left:0` overlay div matching canvas dimensions; `onClick` on background resolves canvas coordinates and calls `addField`
- [x] T017 [US2] Create `DraggableField` component in `client/src/components/FieldOverlay/DraggableField.tsx`: absolutely-positioned div at `pdfToCanvas(field, renderScale, pdfPageHeight)` position; uses `@dnd-kit useDraggable`; displays field name as label; click selects the field
- [x] T018 [US2] Integrate `@dnd-kit DndContext` in `client/src/components/PdfViewer/PdfViewer.tsx`: wrap canvas + overlay + `DraggableField` instances; `onDragEnd` handler calls `updateField` with recalculated PDF coordinates from final pointer position
- [x] T019 [US2] [P] Create `FieldList` sidebar component in `client/src/components/FieldList/FieldList.tsx`: scrollable list showing each field's name and page number; clicking a row calls `selectField(id)`
- [x] T020 [US2] Wire `useFieldStore` and `DraggableField` into `client/src/App.tsx`: pass `fields`, `selectedFieldId`, and store actions as props; render `FieldList` beside the viewer

**Checkpoint**: US2 functional — fields appear where clicked, drag-to-reposition works, coordinates update correctly.

---

## Phase 5: User Story 3 — Configure Field Properties (Priority: P3)

**Goal**: User can select a field and edit its name, width, height, font family, and font size; changes reflect immediately in the canvas overlay.

**Independent Test**: Place a field → open Properties panel → change all properties → verify canvas overlay updates instantly and no export needed to see changes.

### Implementation

- [x] T021 [US3] Create `PropertiesPanel` component in `client/src/components/PropertiesPanel/PropertiesPanel.tsx`: inputs for `name` (text), `x` / `y` (number, PDF points), `width` / `height` (number, PDF points), `fontSize` (number), `fontFamily` (select with Helvetica / Times Roman / Courier options); each input's `onChange` calls `updateField(id, { prop: value })`; shows "no field selected" state when `selectedFieldId` is null
- [x] T022 [US3] Add duplicate name validation in `PropertiesPanel`: show inline warning when `name` matches another field's name in `fields[]`; disable Export button (via `canExport` flag in App) while duplicates exist
- [x] T023 [US3] Add numeric x/y inputs to `PropertiesPanel` that trigger `updateField` on change, causing `DraggableField` to re-render at new `pdfToCanvas()` position — verifies coordinate round-trip works correctly
- [x] T024 [US3] Wire `PropertiesPanel` into `client/src/App.tsx`: render beside `FieldList`, pass selected field and `updateField` from `useFieldStore`, pass `hasDuplicates` flag

**Checkpoint**: US3 functional — all field properties editable; canvas overlay updates in real time; duplicate warning visible.

---

## Phase 6: User Story 4 — Export PDF with Embedded Form Fields (Priority: P4)

**Goal**: User clicks Export → server embeds all fields as AcroForm text fields → browser downloads the modified PDF → fields are fillable in Adobe Acrobat.

**Independent Test**: Place one field, click Export, open downloaded PDF in Acrobat/Chrome PDF viewer, click the field — it must be interactive and fillable.

### Implementation

- [x] T025 [US4] Implement `pdfService.generatePdf(pdfBytes: Buffer, fields: FormField[]): Promise<Uint8Array>` in `server/src/services/pdfService.ts`: validate uniqueness of field names; for each field load the correct page (0-indexed), call `form.createTextField(name)`, `field.addToPage(page, { x, y, width, height, borderWidth: 1 })`, `field.setFontSize(fontSize)`, `field.updateAppearances(embeddedFont)` per `research.md § 4`; return `pdfDoc.save()`
- [x] T026 [US4] Implement `POST /api/generate-pdf` route handler in `server/src/routes/generatePdf.ts`: multer `single('pdf')` upload, parse `req.body.fields` JSON, validate schema (required properties, value ranges, page ≤ totalPages), call `pdfService.generatePdf()`, respond with `Content-Type: application/pdf` binary per `contracts/generate-pdf.md`
- [x] T027 [US4] Register `/api/generate-pdf` route and multer in `server/src/index.ts`; set file size limit to 50 MB; add global error handler returning `{ error: string }` JSON; guard `app.listen()` with `require.main === module`
- [x] T028 [US4] [P] Write Jest unit tests for `pdfService` validation logic in `server/tests/unit/pdfService.test.ts`: duplicate name detection, page-out-of-range, empty fields array (returns original PDF unchanged), encrypted PDF rejection
- [x] T029 [US4] [P] Write Jest unit tests for `generatePdf` route validation in `server/tests/unit/generatePdf.test.ts`: missing `pdf` part → 400, invalid JSON `fields` → 400, duplicate names → 400, valid request returns `application/pdf`
- [x] T030 [US4] Implement `exportPdf(pdfBytes, fields)` in `client/src/utils/export.ts` per `contracts/generate-pdf.md § Client Usage Pattern`: `FormData` + `fetch`, receive blob, trigger anchor download as `form.pdf`
- [x] T031 [US4] Add Export button to `client/src/App.tsx`: disabled when `fields` is empty or `hasDuplicates`; shows loading spinner during upload; displays error message on server error

**Checkpoint**: US4 functional — end-to-end export works, downloaded PDF is fillable in standard readers. ✓ **16/16 Jest tests pass**

---

## Phase 7: User Story 5 — Manage Existing Fields (Priority: P5)

**Goal**: User can select any field, edit its properties, and delete it without affecting other fields.

**Independent Test**: Place 3 fields → delete the middle one → edit the name of another → export → verify only 2 fields appear in the PDF with correct names.

### Implementation

- [x] T032 [US5] `deleteField(id)` implemented in `useFieldStore` (T015); Delete button in `DraggableField` (`client/src/components/FieldOverlay/DraggableField.tsx`) — shown on hover/selection; clicking calls `deleteField(id)` and clears `selectedFieldId`
- [x] T033 [US5] Delete button in `PropertiesPanel` (`client/src/components/PropertiesPanel/PropertiesPanel.tsx`) as an alternative action
- [x] T034 [US5] `client/src/App.tsx` wires delete correctly: field removed from `fields[]`, `selectedFieldId` cleared, disappears from `FieldList`, absent on next export

**Checkpoint**: US5 functional — full CRUD cycle works; deleted fields absent from export; edits round-trip correctly.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Error handling, loading states, UX guards, and quickstart validation.

- [x] T035 Error handling in `client/src/hooks/usePdfRenderer.ts` for invalid/unreadable PDFs: catch pdfjs-dist load errors, expose `error: string | null`, display in `PdfViewer` instead of blank canvas
- [x] T036 [P] Error handling in `server/src/routes/generatePdf.ts` for encrypted/corrupt PDFs: catch pdf-lib `PDFDocument.load()` errors, return HTTP 422 with `{ error: "Cannot load PDF: ..." }` per contract
- [x] T037 [P] Loading state in `client/src/App.tsx`: `isLoading` from `usePdfRenderer` disables Export during page rendering; `isExporting` state disables Export during upload
- [x] T038 Run full quickstart.md validation: `npm install` → `npm run dev` → import PDF → place 3+ fields → configure each → export → open in PDF reader; confirm fields are fillable and positioned correctly

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Requires Phase 1 — blocks all user story phases
- **Phase 3–7 (User Stories)**: All require Phase 2; proceed in priority order or in parallel
- **Phase 8 (Polish)**: Requires all desired user stories complete

### User Story Dependencies

- **US1 (P1)**: Requires Phase 2 only — no story dependencies
- **US2 (P2)**: Requires US1 complete (needs PdfViewer canvas for overlay)
- **US3 (P3)**: Requires US2 complete (needs fields in store to configure)
- **US4 (P4)**: Requires US1 + Phase 2 (needs pdfBytes from US1 state; backend is independent of US2/US3 but useful to test with real fields)
- **US5 (P5)**: Requires US2 + US3 complete (extends existing field management)

### Within Each Phase

- Phase 3–7: Implementation tasks ordered as listed (hooks before components, components before integration)
- Test tasks marked [P] in Phase 6 can be written before or in parallel with implementation
- T009 (coordinate tests) should be written and passing before Phase 4 begins

### Parallel Opportunities

Within Phase 1: T003, T004, T005 run in parallel after T001+T002
Within Phase 2: T007, T008, T009 run in parallel after T006
Within Phase 4: T019 (FieldList) parallelizable with T015–T018
Within Phase 6: T028, T029 (tests) and T030 (client export) parallelizable with T025–T027

---

## Parallel Example: Phase 2

```bash
# After T006 (shared types), launch in parallel:
Task: "Configure pdfjs worker in client/vite.config.ts"         # T007
Task: "Implement coordinate conversion in coordinates.ts"        # T008
Task: "Write coordinate unit tests in coordinates.test.ts"       # T009
```

## Parallel Example: Phase 6 (Export)

```bash
# Backend implementation (T025, T026, T027) and client export util (T030) can run in parallel:
Task: "Implement pdfService.generatePdf() in server/src/services/pdfService.ts"
Task: "Implement exportPdf() client function in client/src/utils/export.ts"

# Tests can run in parallel with implementation:
Task: "Write Jest tests for pdfService validation in server/tests/unit/pdfService.test.ts"
Task: "Write Jest tests for route validation in server/tests/unit/generatePdf.test.ts"
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (critical — blocks all stories)
3. Complete Phase 3: US1 (import + preview)
4. **STOP and VALIDATE**: Can import any PDF and navigate pages
5. Deliverable: Working PDF viewer in browser

### Incremental Delivery

1. Phase 1 + 2 → Monorepo running, types defined, coordinate math verified
2. Phase 3 (US1) → PDF viewer working → **Demo: visual preview**
3. Phase 4 (US2) → Drag-and-drop fields → **Demo: visual placement**
4. Phase 5 (US3) → Properties panel → **Demo: configurable fields**
5. Phase 6 (US4) → Export → **Demo: complete end-to-end workflow** ← Full success criteria met
6. Phase 7 (US5) → Delete/edit → **Demo: iterative refinement**
7. Phase 8 → Polish → Production-ready

### Single Developer Order

T001 → T002 → T003–T005 (parallel) → T006 → T007–T009 (parallel) → T010 → T011 → T012 → T013 → T014 → T015 → T016 → T017 → T018 → T019 → T020 → T021 → T022 → T023 → T024 → T025 → T026 → T027 → T028–T030 (parallel) → T031 → T032 → T033 → T034 → T035–T037 (parallel) → T038

---

## Notes

- `[P]` tasks operate on different files with no cross-task dependencies within the same phase
- Each user story produces a testable, demonstrable increment
- The coordinate conversion in `coordinates.ts` (T008) is mathematically critical — verify with unit tests (T009) before building any drag-and-drop UI
- `field.updateAppearances(embeddedFont)` in `pdfService.ts` is mandatory — omitting it causes invisible fields in most PDF readers
- Avoid putting any PDF-specific logic in React components — keep it in hooks and utils
- Commit after each checkpoint (end of each Phase)

---

## Bug Fixes

### BF-001 — Export fails with "Missing required field: pdf" (2026-03-26)

**Root cause**: `pdfjs.getDocument({ data: pdfBytes })` transfers the `ArrayBuffer` to the pdfjs web worker, which **detaches** it in the main thread (`pdfBytes.byteLength` becomes 0). When the user later clicks Export, `new Blob([pdfBytes])` creates a zero-byte blob, the server receives no file, and returns the 400 error.

**Fix**: Pass a copy of the buffer to pdfjs so the original stays intact:

```typescript
// client/src/hooks/usePdfRenderer.ts
pdfjs.getDocument({ data: pdfBytes.slice(0) })  // .slice(0) creates a detachable copy
```

**Affected file**: `client/src/hooks/usePdfRenderer.ts` line 52.
