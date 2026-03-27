# Feature Spec: Field Default Value

**Branch**: `005-field-default-value` | **Date**: 2026-03-26 | **Status**: Implemented

---

## Summary

Allow users to set a default text value for each AcroForm field. The value is
pre-filled in the exported PDF so the recipient sees it as the initial content of
the field. The value is editable by the recipient in any PDF reader that supports
AcroForm (Acrobat, Preview, etc.).

---

## User Stories

### US1 — Set a default value (P1)
**As a** form editor user,
**I want to** type a default value for a placed field,
**so that** the exported PDF already has text in that field.

**Acceptance criteria:**
- PropertiesPanel shows a "Valor predeterminado" text input when a field is selected.
- Typing in the input updates the field immediately (live preview on canvas).
- The canvas overlay shows the value text instead of the field name when a value is set.
- The exported PDF has the value pre-filled in the AcroForm text field.
- Leaving the input empty means no pre-fill (field is blank in the exported PDF).

### US2 — Visual distinction on canvas (P1)
**As a** form editor user,
**I want to** see the field value directly on the canvas overlay,
**so that** I can verify what will appear in the exported PDF without exporting.

**Acceptance criteria:**
- When `value` is non-empty: the overlay shows the value text in dark color (`#1f2937`).
- When `value` is empty: the overlay shows the field name in the existing indigo color
  (unchanged fallback behavior).

---

## Scope

**In scope:**
- `value?: string` added to `FormField` in `shared/types.ts`.
- PropertiesPanel input for the value.
- Canvas overlay displays value when set.
- Server uses `textField.setText(value)` before `updateAppearances`.
- Templates (export/import) preserve the value field.
- When a PDF with existing AcroForm text fields is uploaded, those fields are
  automatically extracted via pdfjs `page.getAnnotations()` and loaded into the
  canvas as editable overlays (drag, resize, properties panel). Implemented in
  `client/src/utils/extractFields.ts` + `App.tsx` useEffect on `pdfDoc`.

**Out of scope:**
- Inline editing on the canvas (double-click to type directly into the field overlay).
- Multi-line / textarea fields.
- Rich text or markdown in values.

---

## Technical Notes

- `value` is optional (`value?: string`) for backward compatibility with existing
  templates and server requests that pre-date this feature.
- Server validation (`isValidField` in `generatePdf.ts`) accepts
  `field.value === undefined || typeof field.value === 'string'`.
- `textField.setText()` is called **before** `textField.updateAppearances()` —
  reversing this order causes the appearance to be rendered without the text.
- `templateSchema.ts` `isValidField` likewise accepts `value?: string`.
- No new npm dependencies introduced.

---

## Success Criteria

- A field with `value = "Juan García"` exports a PDF where that field contains
  "Juan García" as editable pre-filled text.
- A field with no value (`undefined` or `''`) exports a blank AcroForm field
  (unchanged from pre-feature behavior).
- All 52 existing Vitest + Jest tests continue to pass after the change.
