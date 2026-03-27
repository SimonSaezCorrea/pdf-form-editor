# Data Model: Field Duplication and Visual Resize Handles

**Branch**: `003-field-duplicate-resize` | **Date**: 2026-03-26

---

## Existing Entity: FormField (extended)

`FormField` is defined in `shared/types.ts` and is used unchanged by this feature. No new fields are added to the schema. All resize and duplication operations produce or update standard `FormField` objects.

```typescript
interface FormField {
  id: string;          // Client UUID; ignored by server
  name: string;        // AcroForm field name; globally unique across all pages
  page: number;        // 1-indexed page number
  x: number;           // PDF points from bottom-left (horizontal)
  y: number;           // PDF points from bottom-left (vertical)
  width: number;       // PDF points
  height: number;      // PDF points
  fontSize: number;    // Points (6–72)
  fontFamily: FontFamily; // 'Helvetica' | 'TimesRoman' | 'Courier'
}
```

**Constraints carried over from previous features**:
- `name` must be unique across ALL pages (AcroForm constraint).
- `width` ≥ ~13.3 pt (= 20 canvas px ÷ renderScale 1.5) during resize operations.
- `height` ≥ ~6.7 pt (= 10 canvas px ÷ renderScale 1.5) during resize operations.
- Existing PropertiesPanel inputs enforce `min={20}` pt for width and `min={10}` pt for height — these remain as-is.

---

## New Derived/Transient Entities

### DuplicateOperation (transient — not persisted)

Represents the intent to copy a field. Computed and applied within a single `duplicateField(id, offsetX, offsetY)` call; never stored independently.

| Field         | Type   | Description |
|---------------|--------|-------------|
| sourceField   | FormField | The original field being copied |
| newName       | string | Result of `duplicatedName(source.name, existingNames)` |
| newX          | number | `source.x + offsetX` (clamped to ≥ 0) |
| newY          | number | `source.y + offsetY` (clamped to ≥ 0) |
| newId         | string | Fresh UUID (same generation pattern as `addField`) |

The result is a new `FormField` added to the store with the duplicate's `id` becoming the new `selectedFieldId`.

---

### ResizeHandle (UI-only — not persisted)

A visual interaction point on a selected field. Derived from the field's current canvas position; never stored in the field state.

| Field     | Type                                           | Description |
|-----------|------------------------------------------------|-------------|
| direction | `'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'` | Which edge/corner |
| cursorCSS | string | CSS cursor value (e.g., `'nw-resize'`, `'n-resize'`) |

There are always exactly 8 handles when a field is selected, or 0 when no field is selected.

---

### ResizeDragState (transient — component/hook local state)

Held in the `useFieldResize` hook during an active drag. Cleared on `mouseup`.

| Field         | Type   | Description |
|---------------|--------|-------------|
| fieldId       | string | ID of the field being resized |
| handle        | ResizeHandle.direction | Which handle is being dragged |
| startMouseX   | number | Mouse X at drag start (canvas pixels) |
| startMouseY   | number | Mouse Y at drag start (canvas pixels) |
| startPdfX     | number | Field `x` at drag start (PDF points) |
| startPdfY     | number | Field `y` at drag start (PDF points) |
| startPdfWidth | number | Field `width` at drag start (PDF points) |
| startPdfHeight| number | Field `height` at drag start (PDF points) |
| aspectRatio   | number | `startPdfWidth / startPdfHeight` (for Shift proportional constraint) |

---

## FieldStore Interface (additions)

The `useFieldStore` hook gains one new method:

```typescript
duplicateField(id: string, offsetX: number, offsetY: number): FormField | null;
// Returns the new FormField, or null if the source id is not found.
// offsetX and offsetY are in PDF points.
// The duplicate is added to the store and auto-selected.
```

---

## Name Utility: `duplicatedName`

A pure function, lives in `client/src/utils/fieldName.ts`:

```typescript
function duplicatedName(sourceName: string, existingNames: Set<string>): string
```

| Input        | Type          | Description |
|--------------|---------------|-------------|
| sourceName   | string        | The name of the field being duplicated |
| existingNames| Set\<string\> | All current field names in the store |

**Returns**: a unique name by appending `_N` (N ≥ 2) to the base name (stripping any existing `_N` suffix from `sourceName` first; using `"campo"` as base for empty/whitespace names).
