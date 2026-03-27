# UI Interaction Contracts: Configuration Templates

**Branch**: `004-field-templates` | **Date**: 2026-03-27

---

## Contract 1: Save Template

**Trigger**: User types a name in the save input and clicks "Guardar plantilla".

**Preconditions**: A PDF is loaded (panel is visible).

**Happy path (new name)**:
1. `useTemplateStore.saveTemplate(name, currentFields)` is called.
2. A new `Template` with a fresh `id` and `createdAt = new Date().toISOString()` is
   appended to `templates`.
3. `localStorage.setItem` is called with the updated array.
4. The new template appears immediately at the top (or bottom) of the template list.
5. The save input is cleared.

**Name already exists**:
1. Before calling `saveTemplate`, the component checks if `name` matches an existing template.
2. An inline confirmation is shown: "Una plantilla con este nombre ya existe. ¿Sobreescribir?"
   with "Sí" / "Cancelar" buttons.
3. "Sí" → `useTemplateStore.overwriteTemplate(existingId, currentFields)` is called →
   template list updates in-place.
4. "Cancelar" → nothing changes; save input retains the typed name.

**localStorage quota exceeded**:
1. `useTemplateStore` catches `QuotaExceededError` from `localStorage.setItem`.
2. `storageError` is set to a descriptive message.
3. The in-memory `templates` array is NOT updated (rolled back to pre-save state).
4. `TemplatePanel` shows the error message; template does NOT appear in the list.

**Validation**:
- Empty name → Save button is disabled; no action.
- Name > 100 characters → Save button is disabled.

---

## Contract 2: Load Template

**Trigger**: User clicks "Cargar" on a template list item.

**Preconditions**: At least one template exists.

**Behaviour**:
1. `useFieldStore.loadTemplateFields(template.fields, 'replace')` is called.
2. All existing canvas fields are replaced. Selected field is cleared.
3. Canvas immediately reflects the loaded fields on all pages.
4. No confirmation dialog (load is fast; undo is not required in this version).

---

## Contract 3: Rename Template

**Trigger**: User clicks "Renombrar" on a template list item, edits the inline input,
and presses Enter or clicks "OK".

**Behaviour**:
1. The list item switches to an inline edit input pre-filled with the current name.
2. User edits and confirms.
3. `useTemplateStore.renameTemplate(id, newName)` is called.
4. `localStorage` is updated. The list item reverts to display mode with the new name.
5. Pressing Escape cancels; reverts to display mode without changes.

**Validation**: Empty name → confirm button disabled.

---

## Contract 4: Delete Template

**Trigger**: User clicks "Eliminar" on a template list item.

**Behaviour**:
1. An inline confirmation: "¿Eliminar esta plantilla?" with "Sí" / "Cancelar".
2. "Sí" → `useTemplateStore.deleteTemplate(id)` is called → item removed from list
   immediately → `localStorage` updated.
3. "Cancelar" → nothing changes.

---

## Contract 5: Export as JSON File

**Trigger**: User clicks "Descargar JSON".

**Behaviour**:
1. `serializeTemplateFile(currentTemplateName, currentFields)` produces the JSON string.
2. A `Blob` is created with `type: 'application/json'`.
3. A programmatic anchor click triggers the download.
4. The filename is: `sanitizeFilename(currentTemplateName || 'template') + '.json'`.
5. No dialog; download starts immediately.

**Edge case (no fields)**: Export still proceeds with `fields: []` — not an error.

---

## Contract 6: Copy to Clipboard

**Trigger**: User clicks "Copiar al portapapeles".

**Happy path**:
1. `serializeTemplateFile(...)` produces the JSON string.
2. `navigator.clipboard.writeText(json)` is awaited.
3. On success: button shows a temporary "¡Copiado!" confirmation for ~2 seconds,
   then reverts to "Copiar al portapapeles".

**Clipboard failure**:
1. `navigator.clipboard.writeText` rejects.
2. Inline error: "No se pudo copiar al portapapeles. Selecciona el texto manualmente."

---

## Contract 7: Import from File

**Trigger**: User clicks "Importar desde archivo" and selects a `.json` file.

**Happy path**:
1. `FileReader.readAsText(file)` reads the file contents.
2. `parseTemplateFile(text)` validates; throws on error.
3. If canvas has existing fields → show replace/append choice (Contract 9).
4. If canvas is empty → load directly with `'replace'` mode.
5. Fields are loaded; import UI is reset.

**Error**:
1. `parseTemplateFile` throws → display the error message inline → canvas unchanged.
2. Non-JSON file selected → same error path.

---

## Contract 8: Import from Text

**Trigger**: User pastes JSON into the import textarea and clicks "Importar".

**Happy path**: Same as Contract 7 steps 2–5.

**Error**: Same as Contract 7 error handling.

---

## Contract 9: Replace vs. Append Choice

**Trigger**: A valid import is parsed and the canvas already has one or more fields.

**Behaviour**:
1. Show two buttons: "Reemplazar todo" and "Agregar a existentes".
2. "Reemplazar todo" → `useFieldStore.loadTemplateFields(importedFields, 'replace')`.
3. "Agregar a existentes" → `useFieldStore.loadTemplateFields(importedFields, 'append')`.
   - In append mode, name conflicts are resolved automatically via `duplicatedName`.
4. After either action, the choice UI is hidden and import UI is reset.

---

## Contract 10: Multi-Page Compatibility

Templates store `FormField.page` numbers. On import/load:
- Fields are distributed to their stored page numbers regardless of the current PDF's
  page count.
- `App.tsx` already filters `store.fields` by `f.page === pdfRenderer.currentPage` for
  display; fields on other pages are stored but not visible until the user navigates.
- No special handling needed; this falls out of the existing architecture.
