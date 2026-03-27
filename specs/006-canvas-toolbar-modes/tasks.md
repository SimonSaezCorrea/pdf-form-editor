# Tasks: Canvas Toolbar — Interaction Modes

**Input**: Design documents from `specs/006-canvas-toolbar-modes/`
**Branch**: `006-canvas-toolbar-modes`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅

**Tests**: Included where Constitution §VII mandates them — pure functions (intersectsRect) and non-trivial interaction components (ToolbarModes). Not TDD-first; tests follow implementation within each story.

**Organization**: Tasks grouped by user story. Foundational phase completes before any story phase begins.

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: User story label — maps to spec.md stories
- Exact file paths in every task description

---

## Phase 1: Setup (CSS & Shared Infrastructure)

**Purpose**: Add CSS classes needed across all stories; no logic changes yet.

- [x] T001 Add CSS rules for `.toolbar-modes`, `.mode-btn`, `.mode-btn.active`, `.rubber-band-rect`, and `cursor: grab` / `cursor: grabbing` for Pan mode to `client/src/index.css`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core state and hook changes that every user story depends on. TypeScript will not compile until these are complete — no story can start before this phase.

**⚠️ CRITICAL**: All user story phases depend on T002–T004 being complete.

- [x] T002 Extend `client/src/hooks/useFieldStore.ts`: replace `selectedFieldId: string | null` state with `selectionIds: ReadonlySet<string>` (useState with `new Set()`); add derived `selectedFieldId = selectionIds.size === 1 ? [...selectionIds][0] : null`; implement `selectSingle(id)`, `clearSelection()`, `toggleSelect(id)`, `selectAll(page)`, `setSelection(ids[])`, `updateFields(ids[], partial)`; remove `selectField`; update `deleteField` to remove deleted id from selectionIds; update `resetFields` and `loadTemplateFields` to clear selectionIds; update `FieldStore` interface with all new/removed members

- [x] T003 [P] Create `client/src/hooks/useInteractionMode.ts`: export `type InteractionMode = 'select' | 'insert' | 'move' | 'pan'`; implement hook that holds `useState<InteractionMode>('select')` and a `useEffect` keyboard listener mapping S→select, I→insert, M→move, H→pan, Escape→select (guarded: skip if `e.target` is HTMLInputElement or HTMLTextAreaElement); return `{ mode, setMode }`

- [x] T004 Update all `selectField()` call sites to use the new API — in `client/src/App.tsx`: change `store.selectField` → `store.selectSingle` or `store.clearSelection` at each call site; in `client/src/components/PdfViewer/PdfViewer.tsx`: rename `onFieldSelect` prop to `onFieldSelectSingle` (type `(id: string) => void`) and add `onFieldClearSelection: () => void` prop; in `client/src/components/FieldOverlay/DraggableField.tsx`: rename `onSelect` → `onSelectSingle` and update `handleClick` accordingly; in `client/src/components/FieldList/FieldList.tsx`: update `onSelect` prop signature if it accepted `string | null`

**Checkpoint**: `npm run build` (or `tsc --noEmit`) must pass before any story phase begins.

---

## Phase 3: User Story 1 — Mode Toolbar & Keyboard Shortcuts (Priority: P1) 🎯 MVP

**Goal**: Visible toolbar with 4 mode buttons; active mode highlighted; S/I/M/H/Escape keyboard shortcuts work.

**Independent Test**: Open the editor with a PDF loaded → four buttons visible → click each → active highlight moves → press S/I/M/H → mode changes → press Escape → Select activates.

- [x] T005 [US1] Create `client/src/components/ToolbarModes/ToolbarModes.tsx`: render four `<button>` elements (Select, Insertar, Mover, Pan) each with the `.mode-btn` class and `.active` when `mode === value`; accept props `mode: InteractionMode` and `onModeChange: (m: InteractionMode) => void`; each button calls `onModeChange` with its mode value and displays the keyboard shortcut hint (S / I / M / H)

- [x] T006 [US1] Wire `ToolbarModes` into `client/src/App.tsx`: call `useInteractionMode()` at the top of App; render `<ToolbarModes mode={mode} onModeChange={setMode} />` inside `.header-actions` (only when `pdfBytes` is set); pass `mode` as a new prop to `<PdfViewer>`; add `mode: InteractionMode` to `PdfViewerProps` interface in `client/src/components/PdfViewer/PdfViewer.tsx`

- [x] T007 [US1] Write `client/tests/unit/ToolbarModes.test.tsx` (Constitution §VII — non-trivial interaction component): test that clicking each button calls `onModeChange` with the correct value; test that the active button has the `active` CSS class; test that keyboard events S/I/M/H (dispatched on `window`) change mode; test that Escape reverts to `'select'`

**Checkpoint**: Toolbar renders and modes switch via button click and keyboard shortcuts. US1 independently verified.

---

## Phase 4: User Story 6 — Insert Mode (Priority: P1)

**Goal**: Canvas click creates a field only when mode is `insert`. Click on empty area in `select` mode deselects all fields.

**Independent Test**: Switch to Insert mode → click empty canvas → new field created. Switch to Select mode → click empty canvas → no field created, all fields deselected.

- [x] T008 [US6] Update `handleOverlayClick` in `client/src/components/PdfViewer/PdfViewer.tsx`: add `mode` to the function's scope; when `mode === 'insert'`: call `onFieldAdd(...)` as before; when `mode === 'select'`: call `onFieldClearSelection()`; for other modes (`move`, `pan`): do nothing; update `PdfViewerProps` to include `onFieldClearSelection: () => void`; update `client/src/App.tsx` to pass `onFieldClearSelection={store.clearSelection}` to `<PdfViewer>`

**Checkpoint**: Field creation is now gated to Insert mode. Select-mode click deselects. US6 independently verified.

---

## Phase 5: User Story 2 — Select Mode & Single-Field Selection (Priority: P1)

**Goal**: Click selects a field; Shift+click toggles; Ctrl+A selects all on current page; resize handles appear only on single selection.

**Independent Test**: Load PDF with fields → Click field A → selected (properties panel shows). Shift+click field B → both selected. Shift+click A → only B selected. Ctrl+A → all page fields selected. Click empty → all deselected.

- [x] T009 [US2] Update `client/src/components/FieldOverlay/DraggableField.tsx`: change `handleClick` to check `e.shiftKey` — if true: call `onToggleSelect(field.id)`; else: call `onSelectSingle(field.id)`; add `onToggleSelect: (id: string) => void` to `DraggableFieldProps`; add `isSingleSelection: boolean` prop; change the `{isSelected && <ResizeHandles ...>}` render to `{isSelected && isSingleSelection && <ResizeHandles ...>}`

- [x] T010 [US2] Update `client/src/components/PdfViewer/PdfViewer.tsx`: receive `selectionIds: ReadonlySet<string>` as a new prop; change each `<DraggableField isSelected={field.id === selectedFieldId}` to `isSelected={selectionIds.has(field.id)}`; pass `isSingleSelection={selectionIds.size === 1}` to each `DraggableField`; add `onToggleSelect: (id: string) => void` prop and pass it to `DraggableField`; update `client/src/App.tsx` to pass `selectionIds={store.selectionIds}` and `onToggleSelect={store.toggleSelect}` to `<PdfViewer>`

- [x] T011 [US2] Add Ctrl+A handler to the existing `keydown` useEffect in `client/src/App.tsx`: when `e.key === 'a' && (e.ctrlKey || e.metaKey)` and no input is focused: call `e.preventDefault()` then `store.selectAll(pdfRenderer.currentPage)`

**Checkpoint**: Single-field selection, Shift+click toggle, Ctrl+A, and resize-handles-on-single-selection all work. US2 independently verified.

---

## Phase 6: User Story 3 — Rubber Band Multi-Selection (Priority: P2)

**Goal**: Drag on empty canvas area in Select mode draws a visible rectangle; fields intersecting the rectangle are selected on release.

**Independent Test**: Load PDF with several fields → switch to Select mode → drag from empty area across some fields → semi-transparent rectangle visible during drag → on release, only overlapped fields are selected.

- [x] T012 [US3] Create `client/src/hooks/useRubberBand.ts`: define `interface Rect { left: number; top: number; right: number; bottom: number }`; export `function intersectsRect(a: Rect, b: Rect): boolean` (two-axis overlap test: `a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top`); implement `useRubberBand` hook that manages `RubberBandState` (`isDrawing`, `startX`, `startY`, `endX`, `endY`); export `onOverlayPointerDown(e, overlayRect)` — starts drawing only when `e.target` has no `[data-field-id]` ancestor; attaches `document` `pointermove` / `pointerup` listeners; `pointerup` calls `onSelectionComplete(ids[])` callback with intersecting field IDs; returns `{ isDrawing, rubberBandStyle, onOverlayPointerDown }` where `rubberBandStyle` is the CSS `{left, top, width, height}` for the overlay div

- [x] T013 [P] [US3] Write `client/tests/unit/rubberBand.test.ts` (Constitution §VII — pure function): test `intersectsRect` for: full overlap, partial overlap, adjacent (touching edge = no overlap), no overlap, reversed drag direction (endX < startX), single-pixel rect, field completely inside rubber band, rubber band completely inside field

- [x] T014 [US3] Integrate rubber band in `client/src/components/PdfViewer/PdfViewer.tsx`: call `useRubberBand({ fields, pageDimensions, renderScale, onSelectionComplete: store.setSelection })` (pass `onSetSelection` as a new prop from App.tsx); add `onPointerDown={rubberBand.onOverlayPointerDown}` to the `.field-overlay` div; render `{rubberBand.isDrawing && <div className="rubber-band-rect" style={rubberBand.rubberBandStyle} />}` inside the overlay; add `onSetSelection: (ids: string[]) => void` to `PdfViewerProps`; update `client/src/App.tsx` to pass `onSetSelection={store.setSelection}`

**Checkpoint**: Rubber band draws visually and selects correct fields on release. `intersectsRect` is unit-tested. US3 independently verified.

---

## Phase 7: User Story 4 — Multi-Field Group Move (Priority: P2)

**Goal**: Dragging any selected field when multiple fields are selected moves all selected fields by the same delta. Resize handles hidden for multi-selection.

**Independent Test**: Select 3 fields → drag one → all 3 move by the same offset. Select 1 field → resize handles visible. Select 2 fields → resize handles hidden.

- [x] T015 [US4] Add `onFieldsUpdate: (ids: string[], partial: Partial<Omit<FormField,'id'>>) => void` prop to `PdfViewerProps` in `client/src/components/PdfViewer/PdfViewer.tsx`; update `client/src/App.tsx` to pass `onFieldsUpdate={store.updateFields}`

- [x] T016 [US4] Update `handleDragEnd` in `client/src/components/PdfViewer/PdfViewer.tsx` to receive `selectionIds` (already a prop from T010): after computing `delta` — if `selectionIds.has(fieldId) && selectionIds.size > 1`: for each ID in `selectionIds`, compute that field's current canvas position, apply same `delta`, convert back to PDF coords, collect `{id, x, y}` updates, then call `onFieldsUpdate` for each field (or batch via one `updateFields` call); if the dragged field is NOT in `selectionIds`: call `store.selectSingle(fieldId)` then update only that field via `onFieldUpdate`

**Checkpoint**: Group move applies uniform delta to all selected fields. Single-field drag still works. Resize handles only on single selection (T009 already handles this). US4 independently verified.

---

## Phase 8: User Story 5 — Multi-Field Properties Panel (Priority: P2)

**Goal**: Panel shows only fontFamily and fontSize when multiple fields are selected. Mixed values show "—". Changing either applies to all selected fields.

**Independent Test**: Select 2 fields with same font → panel shows that font. Select 2 fields with different font sizes → fontSize shows "—". Change font family in bulk → both fields update.

- [x] T017 [US5] Add `selectionIds: ReadonlySet<string>` and `onUpdateFields: (ids: string[], partial: Partial<Omit<FormField,'id'>>) => void` props to `PropertiesPanel` in `client/src/components/PropertiesPanel/PropertiesPanel.tsx`; update `client/src/App.tsx` to pass `selectionIds={store.selectionIds}` and `onUpdateFields={store.updateFields}` to `<PropertiesPanel>`

- [x] T018 [US5] Implement multi-selection branch in `client/src/components/PropertiesPanel/PropertiesPanel.tsx`: when `selectionIds.size > 1` — compute the selected fields array; determine if all share the same `fontFamily` (show value) or differ (show `"—"` as disabled option); determine if all share the same `fontSize` (show value) or differ (render input with `value=""` and `placeholder="—"`); on `fontFamily` change: call `onUpdateFields([...selectionIds], { fontFamily: newValue })`; on `fontSize` change: call `onUpdateFields([...selectionIds], { fontSize: Number(newValue) })`; hide name, position, size, and value fields in multi-selection mode

**Checkpoint**: Multi-selection panel shows correct values and applies bulk edits. US5 independently verified.

---

## Phase 9: User Story 7 — Move Mode (Priority: P2)

**Goal**: In Move mode, dragging any field moves it without requiring prior selection. @dnd-kit disabled in Pan mode.

**Independent Test**: Switch to Move mode → drag a field that is NOT selected → field moves, selection unchanged. Switch to Pan mode → drag a field → field does not move.

- [x] T019 [US7] Pass `mode: InteractionMode` to `DraggableField` via `PdfViewerProps` / each `<DraggableField mode={mode} ...>`; in `DraggableField.tsx`: change `useDraggable({ id: field.id })` to `useDraggable({ id: field.id, disabled: mode === 'pan' })`; update `DraggableFieldProps` to include `mode: InteractionMode`; update `handleDragEnd` in `PdfViewer.tsx`: when `mode === 'move'` and dragged field is not in `selectionIds`: move only that field without calling `selectSingle` (preserve current selection state)

**Checkpoint**: Move mode moves fields without selection; Pan mode disables @dnd-kit drag on all fields. US7 independently verified.

---

## Phase 10: User Story 8 — Pan Mode (Priority: P3)

**Goal**: In Pan mode, dragging anywhere on the canvas scrolls the PDF viewport. Cursor shows grab/grabbing.

**Independent Test**: Switch to Pan mode → cursor changes to grab → drag on canvas → PDF scrolls → no fields are moved or selected.

- [x] T020 [US8] Add Pan mode pointer handler in `client/src/components/PdfViewer/PdfViewer.tsx`: on the `.pdf-canvas-container` div, add `onPointerDown` that checks `mode === 'pan'` — if so: `e.currentTarget.setPointerCapture(e.pointerId)`, record `startScrollLeft = container.scrollLeft + e.clientX` and `startScrollTop = container.scrollTop + e.clientY`; add `onPointerMove` that sets `container.scrollLeft = startScrollLeft - e.clientX` and `container.scrollTop = startScrollTop - e.clientY`; add `onPointerUp` to release capture; apply CSS class `.panning` to `.pdf-canvas-container` when `mode === 'pan'` so `cursor: grab` applies (`.panning:active { cursor: grabbing }`); the scroll target is the `.viewer-area` div (passed via `ref` or `closest('.viewer-area')`)

**Checkpoint**: Pan mode scrolls the viewport without touching fields. US8 independently verified.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Verify integration, types, and lint compliance across all stories.

- [x] T021 Run `npm test` from repo root — verify `rubberBand.test.ts` and `ToolbarModes.test.tsx` pass; fix any test failures

- [x] T022 Run `npm run lint` from repo root — fix any TypeScript strict-mode errors introduced by the `useFieldStore` interface change (especially in consumers that still reference the removed `selectField` method)

- [x] T023 Update `CLAUDE.md` "Recent Changes" section: add `006-canvas-toolbar-modes: ToolbarModes (S/I/M/H modes); multi-selection (Shift+click, rubber band, Ctrl+A); group move; multi-select PropertiesPanel`

**Checkpoint**: All tests pass, lint clean, CLAUDE.md updated.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user story phases
- **Phase 3–5 (US1, US6, US2 — all P1)**: Depend on Phase 2; US6 and US2 can run in parallel after US1 (toolbar/mode) is wired in T006, but US6 and US2 are independent of each other
- **Phase 6 (US3 — rubber band)**: Depends on Phase 5 (US2 must establish selectionIds as prop in PdfViewer before rubber band can call setSelection)
- **Phase 7 (US4 — group move)**: Depends on Phase 5 (needs selectionIds prop in PdfViewer) and Phase 6 (rubber band wires selectionIds)
- **Phase 8 (US5 — multi-select panel)**: Depends on Phase 5 (selectionIds must flow to PropertiesPanel from App)
- **Phase 9 (US7 — move mode)**: Depends on Phase 3 (mode prop must be threaded through)
- **Phase 10 (US8 — pan mode)**: Depends on Phase 9 (mode prop already in DraggableField and PdfViewer)
- **Phase 11 (Polish)**: Depends on all story phases complete

### User Story Dependencies

```
Phase 2 (Foundational)
    ↓
Phase 3 US1 (toolbar + mode wired)
    ↓              ↓
Phase 4 US6    Phase 5 US2
(insert mode)  (select mode)
                    ↓         ↓
              Phase 6 US3   Phase 8 US5
              (rubber band) (multi panel)
                    ↓
              Phase 7 US4
              (group move)
                    ↓
              Phase 9 US7
              (move mode)
                    ↓
              Phase 10 US8
              (pan mode)
```

### Parallel Opportunities Within Phases

- **T003** (useInteractionMode) can be written in parallel with T002 (useFieldStore) — different files
- **T013** (rubberBand.test.ts) can be written in parallel with T014 (PdfViewer rubber band integration) after T012
- **T015** (onFieldsUpdate prop) can be added in parallel with T016 (handleDragEnd group move logic) — different concerns in the same file (split if desired)
- **T017** (PropertiesPanel props) can run in parallel with T018 (multi-select branch) after T010

---

## Parallel Example: Phase 2 Foundational

```bash
# T002 and T003 can be done in parallel (different files):
Task: "Extend useFieldStore.ts with selectionIds and new selection API"
Task: "Create useInteractionMode.ts hook"

# T004 follows after both complete (uses the new APIs)
```

## Parallel Example: Phase 6 — Rubber Band

```bash
# T012 and T013 can overlap (T013 tests what T012 defines):
Task: "Create useRubberBand.ts with intersectsRect()"
Task: "Write rubberBand.test.ts for intersectsRect() edge cases"

# T014 follows after T012 is complete
```

---

## Implementation Strategy

### MVP (P1 Stories Only — Phases 1–5)

1. Complete Phase 1 (CSS)
2. Complete Phase 2 (Foundational) — **must pass `tsc --noEmit` before proceeding**
3. Complete Phase 3 (US1 — Toolbar)
4. Complete Phase 4 (US6 — Insert mode)
5. Complete Phase 5 (US2 — Select mode single-field)
6. **STOP AND VALIDATE**: All P1 acceptance scenarios from spec.md pass manually
7. The app now has a working toolbar with explicit modes and single-field selection

### Incremental Delivery

1. MVP (Phases 1–5) → Working toolbar + single-field select
2. Add Phase 6 (US3) → Rubber band multi-selection
3. Add Phase 7 (US4) → Group move
4. Add Phase 8 (US5) → Bulk font/size editing
5. Add Phase 9 (US7) → Explicit move mode
6. Add Phase 10 (US8) → Pan mode
7. Phase 11 (Polish) → Tests green, lint clean

---

## Summary

| Phase | Story | Tasks | Parallelizable |
|-------|-------|-------|----------------|
| 1 — Setup | — | T001 | — |
| 2 — Foundational | — | T002–T004 | T002, T003 in parallel |
| 3 — US1 Toolbar (P1) 🎯 | US1 | T005–T007 | T007 after T005 |
| 4 — US6 Insert (P1) | US6 | T008 | — |
| 5 — US2 Select (P1) | US2 | T009–T011 | T009, T010, T011 in parallel |
| 6 — US3 Rubber Band (P2) | US3 | T012–T014 | T012+T013 in parallel |
| 7 — US4 Group Move (P2) | US4 | T015–T016 | T015+T016 in parallel |
| 8 — US5 Multi Panel (P2) | US5 | T017–T018 | T017+T018 in parallel |
| 9 — US7 Move Mode (P2) | US7 | T019 | — |
| 10 — US8 Pan Mode (P3) | US8 | T020 | — |
| 11 — Polish | — | T021–T023 | T021+T022 in parallel |
| **Total** | | **23 tasks** | |

**Suggested MVP scope**: Phases 1–5 (T001–T011) — delivers the P1 stories: working mode toolbar, Insert mode for field creation, Select mode for single-field editing with Shift+click and Ctrl+A.
