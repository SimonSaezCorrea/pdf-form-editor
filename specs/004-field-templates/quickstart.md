# Quickstart: Configuration Templates

**Branch**: `004-field-templates` | **Date**: 2026-03-27

Use these scenarios to validate the feature manually (`npm run dev`).

---

## Scenario 1 — Save and Persist (US1 core)

1. Open the app, upload any PDF.
2. Click the canvas twice to place 2 fields.
3. In the Template Panel, type `"Mi plantilla"` in the save input and click **Guardar**.
4. Verify: `"Mi plantilla"` appears in the template list immediately.
5. **Reload the page** (F5). Re-upload the same PDF.
6. Open the Template Panel → `"Mi plantilla"` is still listed.
7. Click **Cargar** → both fields appear on the canvas with their original positions, sizes, and names.

**Expected**: Fields restored exactly. No reconfiguration needed.

---

## Scenario 2 — Overwrite Confirmation (US1 edge case)

1. With `"Mi plantilla"` saved (Scenario 1), add a third field to the canvas.
2. In the save input, type `"Mi plantilla"` again and click **Guardar**.
3. Verify: an inline confirmation appears — "Una plantilla con este nombre ya existe. ¿Sobreescribir?"
4. Click **Sí** → the template now contains 3 fields.
5. Reload → load the template → 3 fields appear.
6. Repeat step 2–3 but click **Cancelar** → template still has 3 fields (unchanged).

---

## Scenario 3 — Rename and Delete (US1)

1. In the template list, click **Renombrar** on `"Mi plantilla"`.
2. Edit to `"Contrato v2"`, press Enter.
3. Verify: list item shows `"Contrato v2"`. Reload → still `"Contrato v2"`.
4. Click **Eliminar** → confirm → item removed immediately.
5. Reload → template is gone.

---

## Scenario 4 — Export as JSON File (US2)

1. Place 2 fields. In the Template Panel, type `"Export test"` and save.
2. Click **Descargar JSON**.
3. Verify: a file `Export test.json` downloads.
4. Open the file in a text editor → valid JSON with `schemaVersion: 1`, `name`,
   `createdAt`, and a `fields` array with 2 entries, each with all field properties.

---

## Scenario 5 — Copy to Clipboard (US2)

1. With fields on the canvas, click **Copiar al portapapeles**.
2. Verify: button shows `"¡Copiado!"` briefly, then reverts.
3. Paste into a text editor → same JSON structure as Scenario 4, indented with 2 spaces.

---

## Scenario 6 — Import from File, Replace (US3)

1. Start with a clean canvas (reload or remove all fields).
2. Click **Importar desde archivo**, select the `Export test.json` from Scenario 4.
3. Since the canvas is empty, load proceeds directly (no replace/append prompt).
4. Verify: 2 fields appear at the exact positions stored in the file.

---

## Scenario 7 — Import with Append and Name Conflict (US3)

1. Place 1 field named `"field_1"` on the canvas.
2. Import `Export test.json` which also contains a field named `"field_1"`.
3. Verify: replace/append prompt appears.
4. Click **Agregar a existentes** → 3 fields total on canvas.
5. Verify: the imported `"field_1"` was auto-renamed to `"field_1_2"` (no duplicate names).

---

## Scenario 8 — Import from Text, Invalid JSON (US3)

1. In the import textarea, paste: `{ "schemaVersion": 1, "name": "bad" }` (no `fields`).
2. Click **Importar**.
3. Verify: an error message appears — something like "Invalid template: 'fields' must be an array".
4. Verify: the canvas is unchanged.

---

## Scenario 9 — Import Completely Malformed JSON (US3)

1. In the import textarea, paste: `not json at all`.
2. Click **Importar**.
3. Verify: an error message appears — "JSON parse error: ..."
4. Canvas is unchanged.

---

## Scenario 10 — Multi-Page Template (multi-page PDF required)

1. Upload a multi-page PDF (≥ 2 pages).
2. On page 1, place a field `"header"`. Navigate to page 2, place `"footer"`.
3. Save as `"Two-page template"`. Reload. Load the template.
4. Verify: on page 1, `"header"` appears; navigate to page 2, `"footer"` appears.
5. Export the template. Import it on a single-page PDF.
6. Verify: `"header"` appears on page 1; `"footer"` is stored but not visible
   (the single-page PDF has no page 2).
