# Data Model: Canvas Toolbar — Interaction Modes

**Feature**: 006-canvas-toolbar-modes
**Date**: 2026-03-27

---

## Entities

### InteractionMode (client-only)

A string literal union type representing the active editor mode. Exactly one value is active at all times.

```typescript
// client/src/hooks/useInteractionMode.ts
type InteractionMode = 'select' | 'insert' | 'move' | 'pan';
```

**Default**: `'select'`
**Transitions**: Any mode → any mode (no invalid transitions). Escape always transitions to `'select'`.

| Mode | Keyboard | Canvas click (empty area) | Canvas drag (empty area) | Canvas drag (on field) |
|------|----------|--------------------------|--------------------------|------------------------|
| `select` | S | Deselect all | Rubber band selection | Group move (if field is selected) |
| `insert` | I | Create new field | — | — |
| `move` | M | — | — | Move field (no selection required) |
| `pan` | H | — | Scroll viewport | Scroll viewport |

---

### SelectionSet (client-only, lives in useFieldStore)

Replaces the previous `selectedFieldId: string | null` single-selection model.

```typescript
// Replaces: selectedFieldId: string | null
// Becomes:
selectionIds: ReadonlySet<string>

// Derived getter (single-selection compat):
selectedFieldId: string | null  // = [...selectionIds][0] when size === 1, else null
```

**Invariants**:
- All IDs in `selectionIds` MUST correspond to IDs present in `fields` (stale IDs are removed when a field is deleted).
- Selection is scoped to the current page — `selectionIds` only contains IDs of fields on `currentPage`. When the user navigates to a different page, selection is not automatically cleared (per FR-017 — per-page selection is preserved); the visible fields simply change.

**Operations**:

| Method | Signature | Description |
|--------|-----------|-------------|
| `selectSingle` | `(id: string) => void` | Sets selection to `{id}` only; replaces previous `selectField(id)` |
| `clearSelection` | `() => void` | Empties the selection set; replaces `selectField(null)` |
| `toggleSelect` | `(id: string) => void` | Adds id if absent, removes if present (Shift+click behavior) |
| `selectAll` | `(page: number) => void` | Adds all field IDs whose `field.page === page` |
| `setSelection` | `(ids: string[]) => void` | Replaces current set entirely (rubber band final result) |

---

### RubberBand (transient, lives in useRubberBand)

Exists only during an active drag-to-select gesture in `select` mode. Discarded on `pointerup`.

```typescript
// client/src/hooks/useRubberBand.ts
interface RubberBandState {
  isDrawing: boolean;
  startX: number;   // canvas-relative px
  startY: number;   // canvas-relative px
  endX: number;     // canvas-relative px
  endY: number;     // canvas-relative px
}
```

**Derived display rect** (normalized — handles drag in any direction):
```typescript
interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function toNormalizedRect(rb: RubberBandState): Rect {
  return {
    left:   Math.min(rb.startX, rb.endX),
    top:    Math.min(rb.startY, rb.endY),
    right:  Math.max(rb.startX, rb.endX),
    bottom: Math.max(rb.startY, rb.endY),
  };
}
```

**Intersection test** (exported pure function, unit-tested):
```typescript
// Two rectangles intersect iff they overlap on both axes
export function intersectsRect(a: Rect, b: Rect): boolean {
  return a.left < b.right && a.right > b.left &&
         a.top  < b.bottom && a.bottom > b.top;
}
```

Field bounding boxes are converted from PDF coordinates to canvas coordinates using the existing `pdfToCanvas()` utility before intersection testing.

---

## State Flow

```
User presses S/I/M/H/Escape
  → useInteractionMode.setMode(newMode)
  → App.tsx reads mode, passes to PdfViewer + ToolbarModes

User clicks empty canvas (Select mode)
  → PdfViewer.handleOverlayClick → store.clearSelection()

User clicks field (Select mode)
  → DraggableField.handleClick (e.stopPropagation) → store.selectSingle(id)
  (OR with Shift held) → store.toggleSelect(id)

User drags empty canvas (Select mode)
  → useRubberBand.onPointerDown → setIsDrawing(true)
  → pointermove → updates endX/endY → rubber band div re-renders
  → pointerup → compute intersection → store.setSelection(intersectingIds)

User drags field when selectionIds.size > 1 (Select or Move mode)
  → @dnd-kit DragEndEvent → PdfViewer.handleDragEnd
  → if selectionIds.has(dragged.id): compute delta per field → store.updateFields(selectedIds, positions)
  → if !selectionIds.has(dragged.id): store.selectSingle(id); update only that field

User presses Ctrl+A
  → App.tsx keydown handler → store.selectAll(currentPage)

Multi-select PropertiesPanel font change
  → PropertiesPanel → store.updateFields([...selectionIds], { fontFamily })
```

---

## Modified Store Interface

```typescript
// useFieldStore.ts — interface changes for 006
export interface FieldStore {
  fields: FormField[];

  // REPLACED: selectedFieldId: string | null
  selectionIds: ReadonlySet<string>;
  selectedFieldId: string | null;  // derived compat getter: size===1 ? id : null

  // EXISTING (unchanged)
  addField: (...) => FormField;
  updateField: (id: string, partial: Partial<Omit<FormField, 'id'>>) => void;
  deleteField: (id: string) => void;
  resetFields: () => void;
  duplicateField: (id: string, offsetX: number, offsetY: number) => FormField | null;
  loadTemplateFields: (fields: FormField[], mode: 'replace' | 'append') => void;

  // REPLACED selection API
  selectSingle: (id: string) => void;     // was: selectField(id)
  clearSelection: () => void;              // was: selectField(null)
  toggleSelect: (id: string) => void;      // NEW
  selectAll: (page: number) => void;       // NEW
  setSelection: (ids: string[]) => void;   // NEW (rubber band final step)

  // NEW
  updateFields: (ids: string[], partial: Partial<Omit<FormField, 'id'>>) => void;
}
```

> **Note**: `selectField(id: string | null)` is removed and replaced with `selectSingle` + `clearSelection`. All call sites in App.tsx, PdfViewer.tsx, and DraggableField.tsx must be updated.

---

## No New HTTP Contracts

This feature is entirely client-side. No new API endpoints, request schemas, or response schemas are introduced. The `POST /api/generate-pdf` contract is unchanged.
