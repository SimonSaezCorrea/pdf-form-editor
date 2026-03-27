# Research: Field Duplication and Visual Resize Handles

**Branch**: `003-field-duplicate-resize` | **Date**: 2026-03-26

---

## 1. Auto-Suffix Naming Algorithm

**Decision**: Strip any trailing `_N` suffix from the source field's name to get the "base name", then find the lowest integer ≥ 2 such that `${base}_${N}` does not already exist in the fields array.

**Rationale**:
- Duplicating "fullname" → "fullname_2". If "fullname_2" already exists, next duplicate is "fullname_3". ✓
- Duplicating "fullname_2" should produce "fullname_3" (not "fullname_2_2"), consistent with design tools like Figma.
- Stripping the suffix before computing the new one means the base always stays clean regardless of how many copies are made.
- Empty / whitespace names use `"campo"` as the base (per spec AC-3).

**Algorithm** (pure function, easily unit-tested):
```typescript
function duplicatedName(sourceName: string, existingNames: Set<string>): string {
  const base = sourceName.trim() === '' ? 'campo' : sourceName.replace(/_\d+$/, '');
  let n = 2;
  while (existingNames.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}
```

**Alternatives considered**:
- Always append suffix without stripping: "fullname_2_2", "fullname_2_3" — visually noisy, non-idiomatic.
- Use UUID suffix: unique but not human-readable.

---

## 2. Duplicate Offset in PDF-Point Space

**Decision**: The +10 canvas-pixel offset (spec) is converted to PDF points at call time using the current `renderScale`. At `renderScale = 1.5`: offset = 10/1.5 ≈ 6.67 PDF points. The Y direction requires sign inversion (canvas Y increases downward; PDF Y increases upward), so "move down on screen" = pdfY -= 10/renderScale.

**Rationale**:
- Fields are stored in PDF point coordinates (`FormField.x/y`), so all offsets must be converted before storage.
- Converting in `App.tsx` at the call site (not inside `useFieldStore`) keeps the store independent of render context.
- If the offset would push the field outside the PDF boundary, the duplicate is placed at the offset position and the user can reposition — consistent with how `addField` handles out-of-bounds placement (clamps to `max(0, ...)`). The duplicate follows the same `Math.max(0, x)` / `Math.max(0, y)` clamping already present in the store.

---

## 3. Resize Handle Interaction — Native Mouse Events vs @dnd-kit

**Decision**: Use native `mousedown` / `mousemove` / `mouseup` events on the `document` for resize handle dragging, NOT `@dnd-kit`. Each handle div MUST call `e.stopPropagation()` on **both** `onPointerDown` and `onMouseDown`.

**Rationale**:
- `@dnd-kit` is already used for field repositioning. If resize handles also use it, the library cannot distinguish between a "move" drag (on the field body) and a "resize" drag (on a handle) — both start on the same DOM subtree.
- `@dnd-kit`'s `PointerSensor` listens for native `pointerdown` events (not `mousedown`). Stopping propagation only on React's synthetic `onMouseDown` leaves the native `pointerdown` free to bubble up to the `{...listeners}` spread on the parent div, triggering a simultaneous move drag. Stopping `onPointerDown` is therefore **required in addition to** stopping `onMouseDown`.
- `mousemove` on `document` (not on the handle element) ensures smooth tracking even when the cursor leaves the handle element during fast movement — a standard pattern for drag interactions.
- The `mouseleave` case (cursor leaves browser window) is handled by listening for `mouseup` on `document`; when `mouseup` fires (even outside the window due to browser event bubbling), the drag commits.

**Bug BF-003-01 (fixed 2026-03-27)**: After initial implementation, resize handles also triggered a move drag concurrently.
- **Root cause**: `e.stopPropagation()` in `onMouseDown` stops React's synthetic mouse event but does NOT stop the native `pointerdown` event. @dnd-kit's `PointerSensor` attaches an `onPointerDown` listener to the draggable element via `{...listeners}`. The native `pointerdown` from a handle div bubbled up to that listener and activated the drag sensor simultaneously with the resize.
- **Fix**: Added `onPointerDown={(e) => e.stopPropagation()}` to every handle `<div>` in `ResizeHandles.tsx`. This prevents the pointer event from reaching @dnd-kit without affecting the mouse-event-based resize tracking.
- **Files changed**: `client/src/components/FieldOverlay/ResizeHandles.tsx`

**Alternatives considered**:
- `@dnd-kit` with separate droppable zones: overly complex, requires restructuring the existing drag setup.
- `pointer-events` + `setPointerCapture`: valid, but native mouse events are simpler and sufficient for desktop-only scope.

---

## 4. Resize Mathematics — PDF Coordinate Derivation

**Decision**: Compute all resize deltas in canvas-pixel space, then convert to PDF points using `renderScale`. The eight handle directions map to the following state mutations (in PDF points, where `Δx = deltaX/renderScale`, `Δy = deltaY/renderScale`):

| Handle | pdfX | pdfWidth | pdfY | pdfHeight |
|--------|------|----------|------|-----------|
| N  (top edge up/down)       | —        | —         | —           | `−= Δy` |
| S  (bottom edge up/down)    | —        | —         | `−= Δy`     | `+= Δy` |
| E  (right edge left/right)  | —        | `+= Δx`   | —           | — |
| W  (left edge left/right)   | `+= Δx`  | `−= Δx`   | —           | — |
| NE                          | —        | `+= Δx`   | —           | `−= Δy` |
| NW                          | `+= Δx`  | `−= Δx`   | —           | `−= Δy` |
| SE                          | —        | `+= Δx`   | `−= Δy`     | `+= Δy` |
| SW                          | `+= Δx`  | `−= Δx`   | `−= Δy`     | `+= Δy` |

**Y-axis derivation**: `canvasTop = (pdfPageHeight − pdfY − pdfHeight) × renderScale`.
- Moving the **bottom** edge (S/SW/SE): pdfY is the bottom edge in PDF coords. Moving canvas-bottom down (+Δy canvas) → `pdfY −= Δy/scale` (PDF Y decreases as it moves toward page bottom) and `pdfHeight += Δy/scale` (field gets taller).
- Moving the **top** edge (N/NW/NE): moving canvas-top down (+Δy canvas, i.e., shrinking from top) → `pdfHeight −= Δy/scale` (field gets shorter); pdfY unchanged (bottom edge stays).

**Minimum clamp**: Before applying deltas, clamp so `pdfWidth ≥ 20/renderScale` (≈13.3 pt at scale 1.5) and `pdfHeight ≥ 10/renderScale` (≈6.7 pt). When a minimum clamp kicks in on handles that also move the origin (W, NW, SW for width; S, SW, SE for Y), the origin is clamped too so the opposite edge stays fixed.

**Proportional resize (Shift + corner)**: Record `aspectRatio = pdfWidth / pdfHeight` at `mousedown`. On each `mousemove`, use the dominant axis delta to set the constrained delta for the other axis: `Δx_constrained = Δy * aspectRatio` (or vice versa, choosing the axis with larger absolute delta).

---

## 5. Context Menu Strategy

**Decision**: Render a `position: fixed` context menu `<div>` at the cursor position, managed as local state in `DraggableField`. Dismiss on `mousedown` outside, on `Escape`, or on any field action.

**Rationale**:
- `position: fixed` escapes any `overflow: hidden` ancestor (the canvas overlay container) without requiring a React portal.
- Local state in `DraggableField` is the simplest approach — only one field has a context menu at a time.
- The menu is minimal in scope (single item: "Duplicar campo"), so a full portal system is not warranted.

**Right-click + select behavior**: If the user right-clicks an unselected field, the field must be selected AND the menu shown simultaneously. This is achieved by calling `onSelect(field.id)` alongside setting menu state in `onContextMenu`.

**Bug BF-003-02 (fixed 2026-03-27)**: Clicking "Duplicar campo" in the context menu added a spurious extra field in addition to the duplicate.
- **Root cause**: `position: fixed` only moves the context menu visually — the DOM node is still a child of `field-overlay` (rendered inside `DraggableField`'s React Fragment). Clicking the button triggered a click event that bubbled up to `field-overlay`'s `onClick={handleOverlayClick}`. The guard `closest('[data-field-id]')` did not match the context menu button (no such attribute), so `handleOverlayClick` treated it as a canvas click and created a new field.
- **Fix**: Added `e.stopPropagation()` to `handleDuplicateClick` in `DraggableField.tsx`.
- **Files changed**: `client/src/components/FieldOverlay/DraggableField.tsx`

**Alternatives considered**:
- React Portal to `document.body`: Cleaner Z-index semantics but adds code complexity for a single-item menu.
- Global context menu manager in `App.tsx`: Consistent but requires prop threading.

---

## 6. `duplicateField` Location in Architecture

**Decision**: Add `duplicateField(id: string, offsetX: number, offsetY: number): FormField | null` to `useFieldStore`. The caller passes the offset in PDF points. Name computation uses the new `duplicatedName` utility from `client/src/utils/fieldName.ts`.

**Rationale**:
- The store owns the fields array and is the single source of truth for all field mutations. Placing duplication logic here is consistent with `addField`, `updateField`, `deleteField`.
- Pure name utility in `fieldName.ts` keeps the store clean and enables isolated unit tests for the naming algorithm.
- The caller (`App.tsx`) computes the PDF-point offset from canvas pixels using the current `renderScale`. This keeps the store free of render-context dependencies.

---

## 7. No Server Changes Required

**Decision**: Zero server changes for this feature.

**Rationale**: Both duplication and resize are client-side canvas operations that modify `FormField` objects in `useFieldStore`. The server already handles any `FormField` shape with valid `x`, `y`, `width`, `height` values on export. No new API endpoints, request formats, or response shapes are introduced.
