# UI Interaction Contracts: Field Duplication and Visual Resize Handles

**Branch**: `003-field-duplicate-resize` | **Date**: 2026-03-26
**Version**: 1.0 (no server API changes)

---

## Contract 1: Field Duplication

### Trigger: Ctrl+D Keyboard Shortcut

**Pre-condition**: A field is currently selected (`store.selectedFieldId !== null`) and a PDF is loaded.
**Action**: User presses `Ctrl+D` while focus is not in a text input or textarea.
**Post-condition**:
- A new `FormField` is added to the store with:
  - `name` = `duplicatedName(source.name, existingNames)` (see research.md §1)
  - `page` = `source.page`
  - `x` = `Math.max(0, source.x + 10/renderScale)`
  - `y` = `Math.max(0, source.y - 10/renderScale)`
  - `width`, `height`, `fontSize`, `fontFamily` = copied from source
  - `id` = new unique id
- The new field becomes the selected field.
- The original field is deselected.
- If no field is selected, Ctrl+D is a no-op (no error).
- The keyboard handler must NOT fire if `document.activeElement` is an `HTMLInputElement` or `HTMLTextAreaElement` (same guard pattern as existing ArrowKey navigation in `App.tsx`).

---

### Trigger: Right-Click Context Menu

**Pre-condition**: A PDF is loaded.
**Action**: User right-clicks on any rendered field in the canvas overlay.
**Post-condition (menu shown)**:
- Browser default context menu is suppressed (`e.preventDefault()`).
- If the clicked field was not selected, it becomes selected simultaneously.
- A context menu appears at `position: fixed` at `(e.clientX, e.clientY)` with exactly one item: "Duplicar campo".
- At most one context menu is visible at any time.

**Post-condition (menu item clicked)**:
- Same result as Ctrl+D (new duplicate created, auto-selected).
- Context menu is dismissed.

**Post-condition (menu dismissed without action)**:
- `mousedown` outside the menu → menu dismissed, no field state change.
- `Escape` key → menu dismissed, no field state change.
- Page navigation (ArrowLeft/ArrowRight) → menu dismissed.

---

## Contract 2: Resize Handles

### Visibility Rule

- Exactly 8 handles (`nw`, `n`, `ne`, `e`, `se`, `s`, `sw`, `w`) are rendered as absolutely-positioned elements inside the selected field's DOM node.
- Handles are absent (not rendered) when no field is selected, or when rendering a non-selected field.
- The handle elements must have `pointer-events: all` (since the parent field overlay may set `pointer-events: none` in some configurations).

---

### Drag Lifecycle

**mousedown on a handle**:
- `e.stopPropagation()` — prevents `@dnd-kit`'s PointerSensor from activating a move drag.
- `e.preventDefault()` — prevents text selection during drag.
- Records `ResizeDragState` (see data-model.md).
- Attaches `mousemove` and `mouseup` listeners to `document`.

**mousemove (during drag)**:
- Computes `deltaX = currentMouseX − startMouseX` and `deltaY = currentMouseY − startMouseY` in canvas pixels.
- If Shift is held AND handle is a corner: applies proportional constraint (see research.md §4).
- Applies the direction-specific delta mapping (see research.md §4 table).
- Clamps: `pdfWidth ≥ 20/renderScale`, `pdfHeight ≥ 10/renderScale`; adjusts origin accordingly.
- Calls `onFieldUpdate(fieldId, { x, y, width, height })` with the new PDF-point values.
- Properties panel reflects changes because it reads from the same `fields` array.

**mouseup (commit)**:
- Removes `mousemove` and `mouseup` listeners from `document`.
- Clears `ResizeDragState`.
- The final `onFieldUpdate` from the last `mousemove` (or the mousedown position if no movement) persists in the store.
- Field remains selected; handles remain visible.

---

### Cursor CSS

Each handle uses a directional resize cursor matching its position:

| Handle | CSS cursor |
|--------|------------|
| nw     | `nw-resize` |
| n      | `n-resize` |
| ne     | `ne-resize` |
| e      | `e-resize` |
| se     | `se-resize` |
| s      | `s-resize` |
| sw     | `sw-resize` |
| w      | `w-resize` |

During an active drag (while mouse button is held), the `document.body` cursor is set to match the dragged handle's cursor, preventing cursor flicker when the mouse moves off the handle.

---

## Contract 3: Compatibility with Multi-Page Navigation

Both duplication and resize MUST work identically on any page:

- **Duplicate**: `source.page` is always copied to the new field. No page-switching occurs on duplicate.
- **Resize**: `pageDimensions` (used for coordinate conversion) always corresponds to the currently visible page. Since resize handles only appear on the currently selected field (which is always on the current page — per-page field filtering is already enforced in `App.tsx`), `pageDimensions` is always valid.

---

## Contract 4: Server API (no change)

The `POST /api/generate-pdf` endpoint contract is unchanged from version 1.1 (`specs/002-multipage-pdf-navigation/contracts/generate-pdf.md`). Duplicated fields and resized fields are exported as standard `FormField` objects indistinguishable from any other field. The server routes each by its `page` value as before.
