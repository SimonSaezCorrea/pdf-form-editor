# Research: Configuration Templates

**Branch**: `004-field-templates` | **Date**: 2026-03-27

---

## 1. localStorage Key and In-Memory Schema

**Decision**: Use a single key `pdf-form-editor:templates` in `localStorage`, storing a
`JSON.stringify(Template[])` array. Each `Template` object in memory has the shape:
```
{ id: string, name: string, createdAt: string, fields: FormField[] }
```

**Rationale**:
- A single key loads the entire template library in one `getItem` call — simpler than one
  key per template plus an index key.
- A stable `id` (same format as field IDs: `template-${Date.now()}-${counter}`) makes rename
  and delete O(1) look-up without relying on mutable names as keys.
- The `id` is a browser-local identifier; it is NOT included in exported files.

**Alternatives considered**:
- One key per template + an index key: more atomic writes, but more complex bookkeeping.
  Not needed at this scale.
- Using the template name as the map key: prevents efficient rename (would require key
  migration); rejected.

---

## 2. Export / Import File Format (TemplateFile)

**Decision**: The serialized format for file download and clipboard is:
```json
{
  "schemaVersion": 1,
  "name": "Contrato estándar",
  "createdAt": "2026-03-27T12:00:00.000Z",
  "fields": [ /* FormField objects */ ]
}
```

The `id` of the `Template` record is NOT exported. Field `id` values ARE exported but
are regenerated on import (see §5).

**Rationale**:
- `schemaVersion: 1` costs nothing and enables future migration logic without silent
  failures when the schema changes.
- Omitting the `id` prevents stale IDs from colliding with the importing browser's store.
- Including field `id` values in the export preserves the data round-trip for validation
  purposes; they are discarded and regenerated on import anyway.

**Alternatives considered**:
- No `schemaVersion`: simpler now but creates a painful migration problem later if the
  schema evolves. Rejected.

---

## 3. File Download — No New Dependency

**Decision**: Trigger file download via a `Blob` + `URL.createObjectURL()` +
programmatic `<a>` click + `URL.revokeObjectURL()`.

```typescript
const blob = new Blob([json], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = sanitizeFilename(name) + '.json';
a.click();
URL.revokeObjectURL(url);
```

**Rationale**: This is the standard browser pattern for client-side file downloads.
No new npm dependency required. Works in all modern browsers without server round-trips.

**Filename sanitization**: Replace characters forbidden in filenames
(`/ \ : * ? " < > |`) with `_`, then trim leading/trailing whitespace and dots.
If the sanitized result is empty, fall back to `"template"`. This is a one-liner used
in a single place — below the YAGNI threshold for a utility function; inline is correct.

---

## 4. Clipboard API

**Decision**: Use `navigator.clipboard.writeText(jsonString)` (async, Promises-based).
On failure, display an inline error message. No fallback to the deprecated
`document.execCommand('copy')`.

**Rationale**:
- The app runs on `localhost` (development) or a trusted internal network — both qualify
  as secure contexts where the Clipboard API is available.
- `execCommand` is deprecated and removed in some browsers.
- If the API fails (e.g., the user denies clipboard permissions), the inline error message
  guides recovery ("Click the JSON text to copy it manually").

---

## 5. Import: Field ID Regeneration

**Decision**: On import, every field's `id` is regenerated using the same
`field-${Date.now()}-${counter}` scheme as `useFieldStore.addField`. Field `name`,
`page`, `x`, `y`, `width`, `height`, `fontSize`, and `fontFamily` are preserved verbatim.

**Rationale**:
- React uses `field.id` as the `key` prop in renders. Stale IDs from another browser
  session could collide with existing canvas IDs in append mode, causing rendering bugs.
- The `id` is documented in `shared/types.ts` as "Client-side UUID — used for React
  keying; ignored by the server." Regenerating it on import is consistent with this intent.

---

## 6. `useFieldStore` Extension: `loadTemplateFields`

**Decision**: Add `loadTemplateFields(fields: FormField[], mode: 'replace' | 'append'): void`
to `useFieldStore`.

- `'replace'`: regenerate IDs → `setFields(regenerated); setSelectedFieldId(null)`.
- `'append'`: regenerate IDs → resolve name conflicts via `duplicatedName` from
  `fieldName.ts` → `setFields(prev => [...prev, ...resolved])`.

**Rationale**:
- Keeps all field state mutations in `useFieldStore` (consistent with prior design).
- Reuses existing `duplicatedName` utility for conflict resolution in append mode,
  ensuring no field name uniqueness violation in the resulting AcroForm.
- `setSelectedFieldId(null)` on replace prevents a stale selected ID pointing to a
  field that no longer exists.

---

## 7. `useTemplateStore` — Separate Hook

**Decision**: Create `useTemplateStore` in `client/src/hooks/useTemplateStore.ts`.
This hook manages localStorage CRUD independently of `useFieldStore`.
`App.tsx` instantiates both hooks and passes them to components as props.

**Rationale**:
- Template library management (persist, list, rename, delete) is a different concern
  than canvas field editing. Merging them into `useFieldStore` would violate single
  responsibility and couple template I/O to per-session state.
- `useTemplateStore` initialises its `templates` state from `localStorage` synchronously
  on first render (empty array fallback), then writes back to `localStorage` on every
  mutation via `useEffect`.

---

## 8. Template Panel UI — Single Component

**Decision**: Add one new component `TemplatePanel` in
`client/src/components/TemplatePanel/TemplatePanel.tsx`. It includes:
- A "save" section (text input for name + Save button).
- A template list (each row: name, Load / Rename / Delete buttons).
- An export section (Download JSON + Copy to Clipboard buttons).
- An import section (file picker `input[type=file]` + textarea, Import button,
  Replace / Append choice when canvas has existing fields).

**Rationale**:
- All template UX is co-located in one panel. No sub-panels or modals needed at this
  scope.
- The sidebar layout already has `FieldList` + `PropertiesPanel`; `TemplatePanel` is
  a natural third panel below them, gated by `!!pdfBytes` (only shown when a PDF is
  loaded).
- A modal for import would require portal or `position:fixed` management (BF-003-02
  class risk). Inline expansion in the sidebar panel avoids that entirely.

---

## 9. localStorage Quota Error Handling

**Decision**: Wrap every `localStorage.setItem` call in a try/catch. On
`QuotaExceededError`, display an error banner and do NOT update the in-memory
`templates` state. The previous templates remain visible and usable.

**Rationale**:
- `localStorage.setItem` is a system boundary (external storage that can reject writes).
  Per Constitution §VI, validation at system boundaries is appropriate and required.
- Not updating in-memory state on failure keeps the UI consistent with what is actually
  persisted — prevents a "ghost" template that exists in memory but not in storage.

---

## 10. No Server Changes

**Decision**: Zero server changes for this feature.

**Rationale**: Templates are `FormField[]` snapshots stored and transferred in the client.
The existing `POST /api/generate-pdf` endpoint already accepts any valid `FormField[]`
regardless of origin. No new routes, request formats, or response shapes are introduced.
