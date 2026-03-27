# Data Model: Configuration Templates

**Branch**: `004-field-templates` | **Date**: 2026-03-27

---

## Existing Entity (unchanged)

### FormField (`shared/types.ts`)

No changes to `FormField`. All template operations read and write this existing type.

```typescript
interface FormField {
  id: string;          // Client-side UUID; ignored by server; regenerated on import
  name: string;        // AcroForm field name — globally unique within a document
  page: number;        // 1-indexed page number
  x: number;           // PDF points from page bottom-left (horizontal)
  y: number;           // PDF points from page bottom-left (vertical)
  width: number;       // PDF points
  height: number;      // PDF points
  fontSize: number;    // Points (6–72)
  fontFamily: FontFamily;  // 'Helvetica' | 'TimesRoman' | 'Courier'
}
```

---

## New Client-Only Entities

### Template (in-memory and localStorage)

Location: `client/src/hooks/useTemplateStore.ts`

```typescript
interface Template {
  /** Browser-local identifier. Format: "template-{timestamp}-{counter}". NOT exported. */
  id: string;
  /** User-assigned display name. Mutable via rename. */
  name: string;
  /** ISO 8601 creation timestamp. Set once at save time; unchanged by rename. */
  createdAt: string;
  /** Snapshot of FormField[] at save time. */
  fields: FormField[];
}
```

**Validation rules:**
- `id`: non-empty string.
- `name`: non-empty string, max 100 characters.
- `createdAt`: non-empty string.
- `fields`: array (may be empty).

**localStorage key**: `"pdf-form-editor:templates"`
**Storage format**: `JSON.stringify(Template[])`

**State transitions:**
```
(nothing) ──save──→ Template (persisted)
Template  ──rename──→ Template (name changed, data unchanged)
Template  ──overwrite──→ Template (all fields replaced, createdAt reset)
Template  ──delete──→ (removed)
```

---

### TemplateFile (export / import wire format)

Location: `client/src/utils/templateSchema.ts`

```typescript
interface TemplateFile {
  /** Fixed value 1. Enables future migration logic. */
  schemaVersion: 1;
  /** Template display name. */
  name: string;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** All field definitions. May be empty array. */
  fields: FormField[];
}
```

**Differences from `Template`:**
- No `id` field (browser-local; meaningless in a file).
- `schemaVersion: 1` literal for forward-compatibility.
- Field `id` values are exported as-is but are **regenerated on import**.

**Validation rules (enforced by `isValidTemplateFile`):**
- `schemaVersion` MUST equal `1` (or be absent; absence treated as `1` for
  round-trip tolerance when exporting from this app).
- `name` MUST be a non-empty string.
- `createdAt` MUST be a non-empty string.
- `fields` MUST be an array.
- Each element of `fields` MUST satisfy all `FormField` property constraints:
  - `id`: string
  - `name`: non-empty string, ≤ 128 characters
  - `page`: positive integer ≥ 1
  - `x`, `y`: numbers ≥ 0
  - `width`, `height`: numbers > 0
  - `fontSize`: integer in range [6, 72]
  - `fontFamily`: one of `'Helvetica' | 'TimesRoman' | 'Courier'`

---

## `useFieldStore` Extension

**New method added to `FieldStore` interface:**

```typescript
/**
 * Load a template's fields onto the canvas.
 * - 'replace': clears canvas, loads template fields (IDs regenerated).
 * - 'append':  adds template fields alongside existing ones (IDs regenerated,
 *              name conflicts resolved via duplicatedName).
 */
loadTemplateFields(fields: FormField[], mode: 'replace' | 'append'): void;
```

**`useTemplateStore` hook interface:**

```typescript
interface TemplateStore {
  templates: Template[];
  /** Save current fields as a new template. Returns the new Template. */
  saveTemplate(name: string, fields: FormField[]): Template;
  /** Overwrite an existing template's fields and reset createdAt. */
  overwriteTemplate(id: string, fields: FormField[]): void;
  /** Rename a template. Fields unchanged. */
  renameTemplate(id: string, newName: string): void;
  /** Delete a template by id. */
  deleteTemplate(id: string): void;
  /** Error from last localStorage write attempt. Null if no error. */
  storageError: string | null;
}
```

---

## `templateSchema.ts` Pure Functions

```typescript
/** Type guard: returns true iff data matches the TemplateFile schema. */
function isValidTemplateFile(data: unknown): data is TemplateFile

/**
 * Parse and validate a JSON string as a TemplateFile.
 * Throws Error with a descriptive message on any failure.
 */
function parseTemplateFile(json: string): TemplateFile

/**
 * Serialize a name + fields array to a pretty-printed TemplateFile JSON string.
 * Uses schemaVersion: 1 and sets createdAt to now.
 */
function serializeTemplateFile(name: string, fields: FormField[]): string
```
