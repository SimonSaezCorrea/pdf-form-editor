# Implementation Plan: Field Duplication and Visual Resize Handles

**Branch**: `003-field-duplicate-resize` | **Date**: 2026-03-26 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-field-duplicate-resize/spec.md`

## Summary

Two independent productivity features for the PDF Form Editor canvas:

1. **Field Duplication (US1, P1)**: Ctrl+D shortcut and right-click context menu duplicate the selected field with all visual properties, auto-assign a unique `_N` suffixed name, offset the copy by +10 canvas px (≈6.7 PDF pt), and auto-select it.

2. **Visual Resize Handles (US2, P2)**: When a field is selected, 8 resize handles appear (4 corners + 4 edge midpoints). Native mouse events drive the drag; the coordinate math maps canvas deltas to PDF-point mutations via the existing `renderScale`. Real-time property panel updates, minimum 20×10 px canvas enforced, Shift+corner preserves aspect ratio.

**Zero server changes** — both features are client-side canvas operations on existing `FormField` objects.

---

## Technical Context

**Language/Version**: TypeScript 5.x, React 18
**Primary Dependencies**: @dnd-kit/core (existing, for field move), pdfjs-dist (existing, for render), Vitest (client tests)
**Storage**: React state (`useFieldStore`) — no persistence layer
**Testing**: Vitest (client unit tests)
**Target Platform**: Desktop browser (Chrome 120+, Firefox 120+, Safari 17+)
**Project Type**: Web application (client + server monorepo)
**Performance Goals**: Resize handle drag updates at 60 fps — achieved via direct `onFieldUpdate` calls in `mousemove` (React re-renders field position each frame)
**Constraints**: No new npm dependencies; all resize math uses existing `coordinates.ts` utilities; no touch/mobile support
**Scale/Scope**: Single-user desktop editor; field count per document typically 1–50

---

## Constitution Check

Constitution file contains only unfilled template placeholders — no project-specific gates defined. No violations to evaluate.

---

## Project Structure

### Documentation (this feature)

```text
specs/003-field-duplicate-resize/
├── plan.md              ← this file
├── research.md          ✓ (Phase 0)
├── data-model.md        ✓ (Phase 1)
├── quickstart.md        ✓ (Phase 1)
├── contracts/
│   └── ui-interactions.md  ✓ (Phase 1)
├── checklists/
│   └── requirements.md  ✓ (spec validation)
└── tasks.md             (Phase 2 — /speckit.tasks)
```

### Source Code Changes

```text
client/
  src/
    utils/
      fieldName.ts          # NEW: duplicatedName() pure utility
      coordinates.ts        # UNCHANGED
    hooks/
      useFieldStore.ts      # MODIFIED: add duplicateField()
      useFieldResize.ts     # NEW: mouse event logic for resize drag
    components/
      FieldOverlay/
        DraggableField.tsx  # MODIFIED: add ResizeHandles + context menu
        ResizeHandles.tsx   # NEW: 8 handle divs with directional cursors
    App.tsx                 # MODIFIED: Ctrl+D keyboard shortcut
    index.css               # MODIFIED: .resize-handle, .context-menu styles
  tests/
    unit/
      fieldName.test.ts     # NEW: naming algorithm unit tests
      ResizeHandles.test.tsx # NEW: handle rendering and interaction tests

shared/                    # UNCHANGED
server/                    # UNCHANGED
```

**Structure Decision**: Web application (client only for this feature). All changes are in `client/`. No monorepo structure changes required.

---

## Key Design Decisions

### 1. `duplicateField` in `useFieldStore`

New method signature:
```typescript
duplicateField(id: string, offsetX: number, offsetY: number): FormField | null
```
- `offsetX`, `offsetY` in PDF points (caller converts from canvas pixels).
- Calls `duplicatedName(source.name, new Set(fields.map(f => f.name)))` for naming.
- Clamps `x` and `y` to `Math.max(0, ...)`.
- Returns the new `FormField` (or `null` if `id` not found).

### 2. `duplicatedName` utility (`client/src/utils/fieldName.ts`)

Pure function — no React dependencies. Strips trailing `_\d+` from source name to get base; uses `"campo"` as base for blank names; finds lowest available integer ≥ 2.

### 3. `useFieldResize` hook (`client/src/hooks/useFieldResize.ts`)

```typescript
function useFieldResize(
  renderScale: number,
  pageDimensions: PageDimensions | null,
  onUpdate: (id: string, partial: Partial<Omit<FormField, 'id'>>) => void,
): {
  onHandleMouseDown: (
    e: React.MouseEvent,
    field: FormField,
    handle: HandleDirection,
  ) => void;
}
```
- Stores `ResizeDragState` in a `useRef` (not `useState`) to avoid re-renders during drag setup.
- Attaches `document` event listeners in the `mousedown` handler; removes them on `mouseup`.
- Calls `onUpdate` on every `mousemove` for real-time panel feedback.

### 4. `ResizeHandles` component (`client/src/components/FieldOverlay/ResizeHandles.tsx`)

Renders only when `isSelected`. 8 `<div>` elements with absolute positioning relative to the field container. Each div gets `onMouseDown` from `useFieldResize`. Cursor CSS per direction.

### 5. Context menu in `DraggableField`

Local state: `{ visible: boolean, x: number, y: number }`. Set on `onContextMenu`. `useEffect` attaches a `mousedown` listener to `document` to dismiss when clicking outside. Dismiss also on `Escape`.

### 6. Ctrl+D in `App.tsx`

Added to the existing `keydown` `useEffect` (which already handles ArrowLeft/ArrowRight). Guard: same `HTMLInputElement`/`HTMLTextAreaElement` check. Computes offset: `offsetX = 10 / renderScale`, `offsetY = -(10 / renderScale)` (negative Y in PDF coords moves field down on canvas).

---

## Minimum Size Constants

Defined once in `client/src/utils/fieldName.ts` (or a shared constants file):

```typescript
export const MIN_FIELD_WIDTH_PX = 20;   // canvas pixels
export const MIN_FIELD_HEIGHT_PX = 10;  // canvas pixels
```

`useFieldResize` converts to PDF points at clamp time: `minPdfW = MIN_FIELD_WIDTH_PX / renderScale`.

---

## Complexity Tracking

No constitution violations. No unusual complexity introduced.
