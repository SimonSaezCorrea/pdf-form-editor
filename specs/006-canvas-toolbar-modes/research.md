# Research: Canvas Toolbar — Interaction Modes

**Feature**: 006-canvas-toolbar-modes
**Date**: 2026-03-27

---

## §1 — Mode State Architecture

**Decision**: Mode state lives in a new `useInteractionMode` hook, NOT in `useFieldStore`.

**Rationale**: Mode is UI-only state (which mouse gesture to apply) — it has no relationship to field data and is never exported or persisted. Putting it in `useFieldStore` would couple unrelated concerns and force all field-store consumers to know about mode. App.tsx creates `useInteractionMode()` and passes `mode` down to `PdfViewer` and `ToolbarModes` as a prop.

**Alternatives considered**:
- React Context for mode: rejected — YAGNI, only 2 consumers (PdfViewer, ToolbarModes), prop drilling is simpler.
- Mode in `useFieldStore`: rejected — pollutes field-data hook with UI state.
- Zustand/Redux global store: rejected — Constitution §III forbids persistence; project already uses local hooks.

---

## §2 — Multi-Selection State Model

**Decision**: Extend `useFieldStore` to replace `selectedFieldId: string | null` with `selectionIds: ReadonlySet<string>`, plus a derived `selectedFieldId: string | null` getter (for backward compat).

**Rationale**: Multi-selection is inseparable from field operations (group move, bulk update, delete). Keeping it in the field store avoids prop-drilling a separate selection state alongside `fields`. The `selectionIds: ReadonlySet<string>` models the invariant that each field ID appears at most once. The derived `selectedFieldId` (= the single ID when `size === 1`, else `null`) lets existing consumers (PropertiesPanel, FieldList) continue working with minimal changes.

**New store operations added**:
- `selectSingle(id: string)` — clears selection and sets `{id}`; replaces `selectField(id)`
- `toggleSelect(id: string)` — adds if absent, removes if present
- `selectAll(page: number)` — adds all field IDs on the given page
- `clearSelection()` — empties the set; replaces `selectField(null)`
- `setSelection(ids: string[])` — replaces current set (used by rubber band)
- `updateFields(ids: string[], partial: Partial<Omit<FormField,'id'>>)` — bulk field update (for multi-select panel)

**Alternatives considered**:
- Separate `useSelectionStore` hook: rejected — YAGNI, only 1 set of call sites; splitting forces passing 2 store objects everywhere.
- Keep `selectedFieldId` + add `additionalSelectedIds: string[]`: rejected — two sources of truth, harder to keep in sync.

---

## §3 — Rubber Band Implementation

**Decision**: Native pointer events (NOT @dnd-kit) on the `.field-overlay` div for rubber band drag.

**Rationale**: @dnd-kit is a drag-and-drop library for moving elements — it is not suited for drawing a selection rectangle. Native pointer events give direct access to raw coordinates without @dnd-kit's activation constraints and delta transformations. The rubber band `onPointerDown` fires on the overlay (before @dnd-kit handles it on fields) because each DraggableField stops propagation via `{...listeners}` from @dnd-kit's `useDraggable`. Therefore a `onPointerDown` hit on an empty area of the overlay will NOT be consumed by any DraggableField.

**Implementation pattern**:
```
overlay onPointerDown:
  if hit test finds no [data-field-id] ancestor:
    start rubber band (setIsDrawing, setStartPoint)
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)

onMove: update endPoint → triggers re-render of rubber band div
onUp: compute intersecting fields → store.setSelection(ids); clean up listeners
```

The rubber band div is `position: absolute; pointer-events: none` inside the overlay, so it does not intercept clicks on fields.

**Pure function `intersectsRect(a: Rect, b: Rect): boolean`**:
Two rectangles intersect iff `a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top`. This function lives in `useRubberBand.ts` and is exported for unit testing.

**Alternatives considered**:
- Canvas layer for rubber band drawing: rejected — the canvas is shared with the PDF render; a second canvas overlay adds complexity with no benefit over an absolutely-positioned div.
- @dnd-kit custom sensor for rubber band: rejected — sensors are designed for drag-to-move, not drag-to-select; significant adapter work with no benefit.

**Constitution §VII compliance**: The rubber band `onPointerDown` on the overlay div is the event initiator — it does NOT need to stop propagation (it only fires when no field is hit). When a field IS hit, the field's `{...listeners}` from `useDraggable` includes `onPointerDown` propagation stopping. No BF-003-01 conflict.

---

## §4 — Group Move via @dnd-kit

**Decision**: Extend `PdfViewer.handleDragEnd` to apply the same delta to all `selectionIds` fields when `selectionIds.size > 1` and the dragged field is in the selection.

**Rationale**: @dnd-kit's `DragEndEvent` provides a `delta` in canvas pixels. The existing `handleDragEnd` already converts delta to PDF coordinates. For group move, the same delta (in PDF points) is applied to all selected field IDs via the new `updateFields(ids, {x: newX, y: newY})` bulk API. Each field's new position is computed independently from its own current canvas position.

**Edge case — drag a non-selected field when multi-selection is active**:
In Select mode, dragging a non-selected field should: (a) clear the selection, (b) select that field, (c) move only it. This is the intuitive behavior (mirrors most design tools). Implemented by checking `if (!selectionIds.has(fieldId)) { store.selectSingle(fieldId); /* move only this field */ }`.

**Alternatives considered**:
- Custom drag manager outside @dnd-kit for group move: rejected — would duplicate drag tracking already handled by @dnd-kit; constitution §VI (YAGNI) prohibits unnecessary new systems.

---

## §5 — @dnd-kit Disabled Per Mode

**Decision**:

| Mode | @dnd-kit `disabled` prop |
|------|--------------------------|
| `select` | `false` (all fields draggable; group move logic in handleDragEnd) |
| `insert` | `false` (user may drag after placing a field) |
| `move` | `false` (same as select; no selection required) |
| `pan` | `true` (pointer drag is reserved for viewport scroll) |

**Rationale**: The `useDraggable` hook accepts a `disabled` boolean. Setting `disabled: mode === 'pan'` suppresses @dnd-kit's PointerSensor for that field in Pan mode, allowing the overlay's own pointer handler to fire for viewport scrolling.

---

## §6 — Pan Mode Implementation

**Decision**: Pan by modifying `scrollTop` / `scrollLeft` of the `.viewer-area` container (the nearest scrollable ancestor of the pdf-canvas-container).

**Rationale**: The PDF canvas is rendered at a fixed size. For multi-page PDFs wider or taller than the viewport, the `.viewer-area` div already overflows and is scrollable. Tracking `pointermove` delta and applying it to the scroll position gives smooth panning with no custom transform needed. `setPointerCapture` on the pointerdown target ensures events continue flowing even if the pointer leaves the element.

**Implementation**:
```
pdf-canvas-container onPointerDown (when mode === 'pan'):
  e.currentTarget.setPointerCapture(e.pointerId)
  record startX = e.clientX + container.scrollLeft
  record startY = e.clientY + container.scrollTop
  onPointermove: container.scrollLeft = startX - e.clientX
               container.scrollTop  = startY - e.clientY
```

**Alternatives considered**:
- CSS `transform: translate()` for panning: rejected — requires tracking an offset state and CSS transform conflicts with the absolute positioning of field overlays.
- Browser scroll bars (existing): available but not a keyboard/gesture-driven pan experience.

---

## §7 — PropertiesPanel Multi-Selection Mode

**Decision**: When `selectionIds.size > 1`, PropertiesPanel renders only `fontFamily` and `fontSize` controls. Each control shows either the shared value (all fields same) or `"—"` (mixed). Changing a control calls `store.updateFields(selectedIds, { fontFamily })` or `store.updateFields(selectedIds, { fontSize })`.

**Rationale**: Name, position (x, y), width, height, and value are per-field and cannot be meaningfully bulk-edited in a form. Font family and size are the only properties that map cleanly to bulk edits, as confirmed by the spec.

**"—" placeholder implementation**: For an `<input type="number">` (fontSize), a mixed value renders as `placeholder="—"` with `value=""`. For a `<select>` (fontFamily), a mixed value shows a disabled `<option value="">—</option>` as the selected option.

**Alternatives considered**:
- Show all properties in multi-select mode: rejected — position/size/name are meaningless to show in bulk.
- Separate `MultiSelectPanel` component: rejected — YAGNI, fewer than 3 call sites; PropertiesPanel with a branch on `selectionIds.size` is sufficient.

---

## §8 — YAGNI Compliance Summary (Constitution §VI)

| New abstraction | Call sites | Justification |
|-----------------|------------|---------------|
| `useInteractionMode` | 1 (App.tsx) | Encapsulates mode state + 4 keyboard listeners; inlining in App.tsx would add ~50 LoC and interleave with field logic |
| `useRubberBand` | 1 (PdfViewer.tsx) | Contains rubber band geometry, pointermove/up listeners, and intersection math. Inlining would add ~80 LoC to PdfViewer |
| `ToolbarModes` component | 1 (App.tsx) | Standard component extraction; toolbar is independently testable |
| `intersectsRect()` utility | 1 (useRubberBand) + test file | Pure function, exported for unit testing; fits the pattern of `coordinates.ts` |

Constitution §VI allows single-call-site abstractions when they encapsulate a coherent, independently-testable unit of logic. All four qualify.
