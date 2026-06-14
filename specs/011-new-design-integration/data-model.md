# Data Model: New Design System Integration + Feature Enhancements

**Branch**: `011-new-design-integration` | **Date**: 2026-05-27

---

## Phase A: Token Schema (post-migration `tokens.css`) — COMPLETE

*(Token schema unchanged from original — see previous version. Summarized below.)*

Dark-first strategy: `:root` = dark defaults, `[data-theme="light"]` = light overrides, `[data-theme="dark"]` = explicit manual dark (mirrors `:root`).

### Key Semantic Tokens

| Token | Dark | Light |
|-------|------|-------|
| `--color-surface` | `#091214` | `#F4F7F8` |
| `--color-panel-bg` | `#0d2028` | `#C4DFE6` |
| `--color-input-bg` | `#132c38` | `#ffffff` |
| `--color-viewer-bg` | `#0f1e25` | `#dce8eb` |
| `--color-navbar-bg` | `#051519` | `#07575B` |
| `--color-text` | `#E8EDEF` | `#151E20` |
| `--color-text-muted` | `#7ab5bd` | `#003B46` |
| `--color-primary` | `#66A5AD` | `#07575B` |
| `--color-accent` | `#F4A261` | `#E76F51` |
| `--border-color` | `#1a3a45` | `#8ec4cc` |
| `--color-danger` | `#dc2626` | `#dc2626` |
| `--color-danger-bg` | `#3b0f0f` | `#fee2e2` |

### Spacing / Typography / Radius / Shadow — unchanged

See `src/styles/tokens.css` for the complete token list.

---

## Phase B: Runtime Data Model Extensions

### 1. `FieldTypeId` (new type — `src/types/shared.ts`)

```typescript
export type FieldTypeId = 'text' | 'number' | 'date' | 'checkbox' | 'signature';
```

### 2. `FormField` Extensions (additive, backward-compatible)

New optional fields added to the existing `FormField` interface in `src/types/shared.ts`:

```typescript
export interface FormField {
  // ── existing fields (unchanged) ──
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  font: FontFamily;
  fontSize: number;
  value?: string;
  displayFont?: string;

  // ── Phase B additions (all optional for backward compatibility) ──
  fieldType?: FieldTypeId;  // defaults to 'text' when absent
  locked?: boolean;         // defaults to false when absent
  group?: string;           // optional grouping label (e.g. "Arrendador")
}
```

**Backward compatibility**: `isValidField` in `templateSchema.ts` and the server route (`generate-pdf`) MUST accept `fieldType === undefined` and `locked === undefined`. Old templates load without errors.

**Export behavior**: `pdf-lib` does not have typed text fields — all `FormField` instances are exported as `PDFTextField` regardless of `fieldType`. The type is a UI-only concept for now.

### 3. `FIELD_TYPE_CONFIG` (new constant — `src/features/fields/config/fieldTypes.ts`)

```typescript
export interface FieldTypeConfig {
  id: FieldTypeId;
  label: string;   // "Texto", "Número", etc.
  short: string;   // "T", "N", "D", "C", "F"
  color: string;   // hex — for canvas overlay border/bg
}

export const FIELD_TYPE_CONFIG: FieldTypeConfig[] = [
  { id: 'text',      label: 'Texto',    short: 'T', color: '#66A5AD' },
  { id: 'number',    label: 'Número',   short: 'N', color: '#F4A261' },
  { id: 'date',      label: 'Fecha',    short: 'D', color: '#a78bfa' },
  { id: 'checkbox',  label: 'Checkbox', short: 'C', color: '#22c55e' },
  { id: 'signature', label: 'Firma',    short: 'F', color: '#ec4899' },
];

export const getFieldTypeConfig = (id?: FieldTypeId): FieldTypeConfig =>
  FIELD_TYPE_CONFIG.find(t => t.id === id) ?? FIELD_TYPE_CONFIG[0];
```

### 4. `useFieldStore` Extensions

New state and actions added to the existing Zustand store:

```typescript
// New state
undoStack: FormField[][];   // snapshots; max 50
redoStack: FormField[][];   // snapshots; max 50
isDirty: boolean;           // true after any mutation; false after export

// New actions
undo(): void;
redo(): void;
bringToFront(id: string): void;
sendToBack(id: string): void;
toggleLock(id: string): void;
setDirty(v: boolean): void;

// Modified actions (all push a snapshot before mutating)
addField(field: FormField): void;      // was add
deleteField(id: string): void;         // was remove
updateField(id, partial): void;        // unchanged name, now records history
updateFields(ids, partial): void;      // unchanged name, now records history
duplicateField(id, offsetX, offsetY): void;  // unchanged, now records history
```

**Snapshot recording rule**: Every state-mutating action must call `recordHistory(get().fields)` before calling `set()`. `recordHistory` pushes to `undoStack`, clears `redoStack`, and slices to 50.

### 5. `AcroFormField` Extensions (filler types — `src/features/filler/types.ts`)

New optional fields added (filler-only, does NOT touch `shared.ts`):

```typescript
export interface AcroFormField {
  // ── existing fields (unchanged) ──
  name: string;
  type: 'text';
  page: number;
  rect: [number, number, number, number];  // [x1, y1, x2, y2] PDF coords
  fontSize: number;

  // ── Phase B additions ──
  fieldType?: FieldTypeId;  // extracted from PDF field type; defaults to 'text'
  required?: boolean;       // from annotation.fieldFlags bit 2
  group?: string;           // derived from fieldName prefix (split on '_', take [0])
  label?: string;           // human label if available; fallback to fieldName
}
```

### 6. `useFillerStore` Extensions

`useFillerStore` stays as `useState` hooks inside `FillerMode` (not Zustand). New state added:

```typescript
// New useState inside FillerMode
const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
const [lastSaved, setLastSaved] = useState<number | null>(null);
const [finalPreview, setFinalPreview] = useState(false);
const [resetConfirm, setResetConfirm] = useState(false);
const [errors, setErrors] = useState<Set<string>>(new Set());  // field ids with validation error
const [jumpedId, setJumpedId] = useState<string | null>(null); // field id for jump animation
```

### 7. Autosave Shape (localStorage key `pdf-filler-draft-v1`)

```typescript
interface FillerDraft {
  values: Record<string, string>;  // fieldName → value
  ts: number;                      // Date.now() at save time
}
```

Restored on mount via `JSON.parse(localStorage.getItem('pdf-filler-draft-v1') || 'null')`. If `saved.values` exists, use it as initial values.

---

## Invariants

1. `FormField.fieldType` defaults to `'text'` everywhere it is read — never null-checked unsafely.
2. `FormField.locked` defaults to `false` — never null-checked unsafely.
3. `undoStack.length` never exceeds 50 (sliced on push).
4. `isDirty` is reset to `false` only in `handleExport` after a successful download.
5. `AcroFormField.group` is always a non-empty string (fallback to `'General'` if fieldName has no `_`).
6. Filler autosave catches all localStorage errors silently — never throws to the user.
