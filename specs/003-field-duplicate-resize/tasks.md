# Tasks: Field Duplication and Visual Resize Handles

**Input**: Design documents from `/specs/003-field-duplicate-resize/`
**Prerequisites**: plan.md ✓ spec.md ✓ research.md ✓ data-model.md ✓ contracts/ ✓ quickstart.md ✓

**Tests**: Included for `duplicatedName` (pure function, naming errors break AcroForm uniqueness) and `ResizeHandles` (interaction contract). Not included for `useFieldResize` (mouse-event integration too complex to unit-test meaningfully).

**Organization**: Tasks grouped by user story (US1: duplication P1, US2: resize handles P2) to enable independent implementation and testing. Zero server changes.

**Key insight from codebase analysis**: `FormField` schema is unchanged. `useFieldStore` already provides `updateField`. `DraggableField` already receives `renderScale` and `pdfPageHeight`. `PdfViewer` already has `onFieldUpdate` prop. The primary new work is: `fieldName.ts` utility + `duplicateField` store method + context menu in `DraggableField` (US1); `useFieldResize` hook + `ResizeHandles` component (US2).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete sibling tasks)
- **[Story]**: Which user story this task belongs to (US1, US2)

---

## Phase 2: Foundational (Blocking Prerequisite)

**Purpose**: Create `fieldName.ts` utility with the naming algorithm and minimum-size constants. Both US1 (`duplicateField`) and US2 (`useFieldResize`) depend on this file.

**⚠️ CRITICAL**: No user story work can begin until T001 is complete.

- [x] T001 Create `client/src/utils/fieldName.ts`: export `function duplicatedName(sourceName: string, existingNames: Set<string>): string` — strip any trailing `_\d+` suffix from `sourceName` to get `base`; if `sourceName.trim()` is empty use `base = 'campo'`; find lowest integer `n ≥ 2` such that `${base}_${n}` is not in `existingNames`; return `${base}_${n}`; also export `export const MIN_FIELD_WIDTH_PX = 20` and `export const MIN_FIELD_HEIGHT_PX = 10`
- [x] T002 [P] Write Vitest unit tests for `duplicatedName` in `client/tests/unit/fieldName.test.ts`: (a) `duplicatedName('fullname', new Set())` → `'fullname_2'`; (b) `duplicatedName('fullname', new Set(['fullname_2']))` → `'fullname_3'`; (c) `duplicatedName('fullname_2', new Set(['fullname_2']))` → `'fullname_3'` (strips `_2`, base is `'fullname'`, `'fullname_2'` is taken); (d) `duplicatedName('', new Set())` → `'campo_2'`; (e) `duplicatedName('  ', new Set())` → `'campo_2'`; (f) `duplicatedName('campo', new Set(['campo_2', 'campo_3']))` → `'campo_4'`

**Checkpoint**: `duplicatedName` is correct and all unit tests pass. US1 and US2 can now start.

---

## Phase 3: User Story 1 — Duplicate a Field (Priority: P1) 🎯 MVP

**Goal**: User selects a field and presses Ctrl+D (or right-clicks → "Duplicar campo") to create an identical copy, auto-named with a `_N` suffix, offset +10 canvas px, and auto-selected.

**Independent Test**: Load any PDF → place a field named `field_1` → press Ctrl+D → verify `field_1_2` appears offset, is selected, has the same width/height/font → press Ctrl+D again → `field_1_3` appears. Right-click any field → context menu appears → click "Duplicar campo" → same result. Works fully without resize handles.

### Implementation

- [x] T003 [US1] Add `duplicateField(id: string, offsetX: number, offsetY: number): FormField | null` to `client/src/hooks/useFieldStore.ts`: add to `FieldStore` interface; inside the hook, implement: find source field by id (return null if not found); increment `fieldCounter`; compute `newName = duplicatedName(source.name, new Set(fields.map(f => f.name)))`; create `newField: FormField = { id: 'field-${Date.now()}-${fieldCounter}', name: newName, page: source.page, x: Math.max(0, source.x + offsetX), y: Math.max(0, source.y + offsetY), width: source.width, height: source.height, fontSize: source.fontSize, fontFamily: source.fontFamily }`; call `setFields(prev => [...prev, newField])`; call `setSelectedFieldId(newField.id)`; return `newField`; import `duplicatedName` from `'../utils/fieldName'`
- [x] T004 [P] [US1] Update `client/src/components/FieldOverlay/DraggableField.tsx`: (1) add `onDuplicate?: () => void` to `DraggableFieldProps`; (2) add local state `const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number }>({ visible: false, x: 0, y: 0 })`; (3) add `const menuRef = useRef<HTMLDivElement>(null)`; (4) add `handleContextMenu` that calls `e.preventDefault()`, `onSelect(field.id)`, `setContextMenu({ visible: true, x: e.clientX, y: e.clientY })`; (5) add `useEffect` that when `contextMenu.visible` is true, attaches `document` `mousedown` listener (dismiss if click is outside `menuRef.current`) and `keydown` listener (dismiss on `Escape`); (6) attach `onContextMenu={handleContextMenu}` to the outer `<div>`; (7) render below the outer div (as a sibling inside the return fragment): `{contextMenu.visible && <div ref={menuRef} className="context-menu" style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y }}><button className="context-menu-item" onClick={() => { onDuplicate?.(); setContextMenu(v => ({ ...v, visible: false })); }}>Duplicar campo</button></div>}`; (8) add `.context-menu` and `.context-menu-item` CSS to `client/src/index.css` (position:fixed already on element; style: white background, 1px border #e5e7eb, border-radius 4px, box-shadow, z-index 1000; `.context-menu-item`: full-width button, padding 8px 14px, font-size 13px, no border, cursor pointer, hover background #f3f4f6)
- [x] T005 [P] [US1] Update `client/src/components/PdfViewer/PdfViewer.tsx`: add `onFieldDuplicate: (id: string) => void` to `PdfViewerProps`; destructure it; pass `onDuplicate={() => onFieldDuplicate(field.id)}` to each `<DraggableField>` element in the fields `.map()`
- [x] T006 [US1] Update `client/src/App.tsx`: (1) add `const handleDuplicate = useCallback((id: string) => { store.duplicateField(id, 10 / pdfRenderer.renderScale, -(10 / pdfRenderer.renderScale)); }, [store.duplicateField, pdfRenderer.renderScale])`; (2) in the existing `keydown` `useEffect`, add an `else if (e.key === 'd' && (e.ctrlKey || e.metaKey) && store.selectedFieldId)` branch that calls `e.preventDefault()` and `handleDuplicate(store.selectedFieldId)`; add `store.selectedFieldId` and `handleDuplicate` to the `useEffect` dependency array; (3) pass `onFieldDuplicate={handleDuplicate}` to `<PdfViewer>`

**Checkpoint**: US1 fully functional — Ctrl+D duplicates selected field with correct name suffix and offset; right-click shows context menu; single-page and multi-page PDFs both work.

---

## Phase 4: User Story 2 — Resize Fields via Drag Handles (Priority: P2)

**Goal**: 8 resize handles appear on the selected field; dragging them resizes the field in real time; the properties panel updates live; minimum size and proportional Shift constraints are enforced.

**Independent Test**: Place a field → select it → 8 small handles appear at corners and edge midpoints → drag the E (right) handle right → field widens; drag the SE corner → both dimensions grow; drag past minimum → stops at 20×10 canvas px; hold Shift + drag SE corner → aspect ratio preserved. All without duplication feature needing to work.

### Implementation

- [x] T007 [P] [US2] Create `client/src/hooks/useFieldResize.ts`: export `type HandleDirection = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'`; export `function useFieldResize(renderScale: number, onUpdate: (id: string, partial: Partial<Omit<FormField, 'id'>>) => void)` returning `{ onHandleMouseDown: (e: React.MouseEvent, field: FormField, handle: HandleDirection) => void }`; store drag state in `dragRef = useRef<null | { fieldId: string; handle: HandleDirection; startMouseX: number; startMouseY: number; startX: number; startY: number; startW: number; startH: number; aspectRatio: number }>(null)`; implement `onHandleMouseDown`: `e.stopPropagation(); e.preventDefault(); dragRef.current = { fieldId: field.id, handle, startMouseX: e.clientX, startMouseY: e.clientY, startX: field.x, startY: field.y, startW: field.width, startH: field.height, aspectRatio: field.width / field.height }`; add `document` `mousemove` and `mouseup` listeners; `mousemove` handler: compute `dx = (currentX - startMouseX) / renderScale` and `dy = (currentY - startMouseY) / renderScale` (in PDF points); apply per-direction mutations using research.md §4 table (N: h -= dy; S: y -= dy, h += dy; E: w += dx; W: x += dx, w -= dx; NE: w += dx, h -= dy; NW: x += dx, w -= dx, h -= dy; SE: w += dx, y -= dy, h += dy; SW: x += dx, w -= dx, y -= dy, h += dy); if Shift held AND handle is a corner: apply proportional constraint (dominant axis determines the other: if `Math.abs(dx) >= Math.abs(dy)` then `dy = dx / aspectRatio` else `dx = dy * aspectRatio`, then re-apply the direction math with constrained values); clamp: `const minW = MIN_FIELD_WIDTH_PX / renderScale; const minH = MIN_FIELD_HEIGHT_PX / renderScale`; if `w < minW` then for handles that move origin (W/NW/SW): `x = startX + startW - minW`; `w = minW`; if `h < minH` then for handles that move origin (N/NW/NE): `h = minH`; for S/SW/SE: `y = startY + startH - minH, h = minH`; call `onUpdate(dragRef.current.fieldId, { x, y, width: w, height: h })`; `mouseup` handler: remove both document listeners; `dragRef.current = null`; import `FormField` from `'pdf-form-editor-shared'`; import `MIN_FIELD_WIDTH_PX, MIN_FIELD_HEIGHT_PX` from `'../utils/fieldName'`
- [x] T008 [P] [US2] Create `client/src/components/FieldOverlay/ResizeHandles.tsx`: import `HandleDirection` and `useFieldResize` return type from `'../../hooks/useFieldResize'`; import `FormField`; accept props `{ field: FormField; renderScale: number; onHandleMouseDown: (e: React.MouseEvent, field: FormField, handle: HandleDirection) => void }`; define `HANDLES: { direction: HandleDirection; className: string }[]` for all 8 directions; render a React fragment of 8 `<div>` elements with `className={`resize-handle resize-handle-${d}`}` and `onMouseDown={e => { e.stopPropagation(); onHandleMouseDown(e, field, d); }}`; add CSS in `client/src/index.css` under `/* ── Resize Handles ── */`: `.resize-handle` (position:absolute; width:8px; height:8px; background:#4f46e5; border:1px solid #fff; border-radius:2px; z-index:20; pointer-events:all); position classes: `.resize-handle-n` (top:-4px; left:calc(50% - 4px); cursor:n-resize); `.resize-handle-ne` (top:-4px; right:-4px; cursor:ne-resize); `.resize-handle-e` (top:calc(50% - 4px); right:-4px; cursor:e-resize); `.resize-handle-se` (bottom:-4px; right:-4px; cursor:se-resize); `.resize-handle-s` (bottom:-4px; left:calc(50% - 4px); cursor:s-resize); `.resize-handle-sw` (bottom:-4px; left:-4px; cursor:sw-resize); `.resize-handle-w` (top:calc(50% - 4px); left:-4px; cursor:w-resize); `.resize-handle-nw` (top:-4px; left:-4px; cursor:nw-resize)
- [x] T009 [US2] Update `client/src/components/FieldOverlay/DraggableField.tsx`: (1) add `onUpdate: (id: string, partial: Partial<Omit<FormField, 'id'>>) => void` to `DraggableFieldProps`; (2) import `useFieldResize`, `HandleDirection`, and `ResizeHandles`; (3) call `const { onHandleMouseDown } = useFieldResize(renderScale, onUpdate)` inside the component body; (4) render `{isSelected && <ResizeHandles field={field} renderScale={renderScale} onHandleMouseDown={onHandleMouseDown} />}` inside the outer `<div>` (after the delete button); note: this modifies the same file as T004 — ensure both sets of changes (context menu from T004 and resize from T009) are present
- [x] T010 [US2] Update `client/src/components/PdfViewer/PdfViewer.tsx`: pass `onUpdate={onFieldUpdate}` to each `<DraggableField>` element in the fields `.map()` (`onFieldUpdate` is already available as a PdfViewer prop — no interface change needed)
- [x] T011 [P] [US2] Write Vitest unit tests for `ResizeHandles` in `client/tests/unit/ResizeHandles.test.tsx`: mock `useFieldResize` to return `{ onHandleMouseDown: vi.fn() }`; create a minimal `FormField` stub; render `<ResizeHandles field={...} renderScale={1.5} onHandleMouseDown={mockFn} />`; (a) verify exactly 8 child divs are rendered; (b) verify each has the `resize-handle` base class; (c) verify the `resize-handle-se` div has class `resize-handle-se`; (d) fire `mouseDown` on the `resize-handle-se` div → verify `mockFn` called with `(event, field, 'se')`

**Checkpoint**: US2 functional — 8 handles appear on selected fields; drag resizes in real time; properties panel reflects changes; minimum size enforced; Shift+corner is proportional.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: CSS refinement and final manual validation.

- [x] T012 [P] Review and tighten CSS for `.resize-handle`, `.context-menu`, and `.context-menu-item` in `client/src/index.css`: verify handle offset exactly centers over field border (handle is 8px; field border is 1.5px → center offset = `-4px` is correct); verify context menu has sufficient z-index to appear above thumbnail strip and sidebar; verify `.context-menu-item:hover` has clear visual feedback; verify handles are not clipped by `overflow: hidden` on any ancestor (`.draggable-field` has no overflow:hidden, `.field-overlay` has no overflow:hidden — confirmed from existing CSS)
- [ ] T013 Run full end-to-end validation per `specs/003-field-duplicate-resize/quickstart.md`: `npm run dev` → Scenario 1 (Ctrl+D basic) → Scenario 2 (unnamed field) → Scenario 3 (right-click menu) → Scenario 4 (edge resize) → Scenario 5 (corner resize free) → Scenario 6 (Shift proportional) → Scenario 7 (multi-page) → Scenario 8 (export with duplicated + resized fields)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 2 (Foundational — T001–T002)**: No dependencies — start immediately. T001 blocks all user story work.
- **Phase 3 (US1 — T003–T006)**: Requires T001. T004 and T005 are parallel. T006 requires T003 + T004 + T005.
- **Phase 4 (US2 — T007–T011)**: Requires T001 (for MIN constants). T007, T008, T011 are parallel. T009 requires T007 + T008. T010 requires T009.
- **Phase 5 (Polish — T012–T013)**: Requires US1 and US2 complete.

### User Story Dependencies

- **US1 (P1)**: Requires T001 — no dependency on US2
- **US2 (P2)**: Requires T001 — no dependency on US1; T009 modifies the same file (`DraggableField.tsx`) as T004 (US1) — implement T009 after T004 to consolidate all changes

### Within Each Phase

- T002 (tests for fieldName.ts) parallelizable with T001
- T004 (DraggableField context menu) parallelizable with T005 (PdfViewer prop)
- T007 (useFieldResize hook) parallelizable with T008 (ResizeHandles component) and T011 (tests)
- T009 modifies `DraggableField.tsx` which T004 (US1) also modified — implement T009 after T004

---

## Parallel Examples

### Phase 3 (US1 Duplication)

```bash
# Start T003 immediately after T001:
Task T003: "Add duplicateField to client/src/hooks/useFieldStore.ts"

# T004 and T005 in parallel (different files):
Task T004: "Add context menu to client/src/components/FieldOverlay/DraggableField.tsx"
Task T005: "Add onFieldDuplicate prop to client/src/components/PdfViewer/PdfViewer.tsx"

# Then T006 (depends on T003 + T004 + T005):
Task T006: "Wire Ctrl+D shortcut and handleDuplicate in client/src/App.tsx"
```

### Phase 4 (US2 Resize Handles)

```bash
# T007, T008, T011 all in parallel (independent files):
Task T007: "Create client/src/hooks/useFieldResize.ts"
Task T008: "Create client/src/components/FieldOverlay/ResizeHandles.tsx"
Task T011: "Write tests in client/tests/unit/ResizeHandles.test.tsx"

# Then T009 (depends on T007 + T008):
Task T009: "Update DraggableField.tsx to add onUpdate prop and render ResizeHandles"

# Then T010 (depends on T009):
Task T010: "Pass onUpdate={onFieldUpdate} to DraggableField in PdfViewer.tsx"
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete T001 (Foundational utility)
2. Complete T003–T006 (US1 — Duplication)
3. **STOP and VALIDATE**: Ctrl+D duplicates correctly, context menu appears and works, name suffixing is correct, multi-page compatible
4. Deliverable: Users can duplicate any field instantly; form creation is significantly faster

### Incremental Delivery

1. T001 → `fieldName.ts` ready (utility for both stories)
2. T002 → naming tests passing (correctness guaranteed)
3. T003–T006 (US1) → Duplication working → **Demo: Ctrl+D + context menu**
4. T007–T010 (US2) → Resize handles working → **Demo: visual resize on any field**
5. T012–T013 (Polish) → Production-ready

### Single Developer Order

T001 → T002 (parallel with T001) → T003 → T004 → T005 (parallel with T004) → T006 → T007 → T008 (parallel with T007) → T011 (parallel with T007+T008) → T009 → T010 → T012 → T013

---

## Notes

- `[P]` tasks operate on different files with no cross-task dependencies within the same phase
- T004 and T009 both modify `DraggableField.tsx` — implement T004 first, then T009 adds to the same file
- T005 and T010 both modify `PdfViewer.tsx` — implement T005 first (adds `onFieldDuplicate`), then T010 adds `onUpdate` pass-through; these can be combined into one edit
- `duplicateField` in the store needs `fieldCounter` to be incremented — use the same module-level `fieldCounter` variable already declared at the top of `useFieldStore.ts`
- In `useFieldResize`, drag state MUST be a `useRef` (not `useState`) to avoid re-renders on every mousemove — performance critical at 60fps
- The context menu `useEffect` in `DraggableField` must remove its document listeners on cleanup to prevent memory leaks
- No server changes; all 16 Jest (server) tests should continue passing unchanged
