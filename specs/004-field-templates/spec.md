# Feature Specification: Configuration Templates

**Feature Branch**: `004-field-templates`
**Created**: 2026-03-27
**Status**: Draft
**Input**: User description: "Nueva feature: plantillas de configuración — guardar, cargar, importar y exportar la disposición de campos del canvas como plantilla reutilizable."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Save & Load Templates Locally (Priority: P1)

A user who regularly works with the same type of PDF (e.g., always the same contract)
configures the fields once, saves the layout as a named template (e.g., "Contrato estándar"),
and on future sessions loads that template to instantly restore all fields to the canvas
instead of reconfiguring from scratch. From a template panel they can also rename or
delete templates they no longer need.

**Why this priority**: This is the core value of the feature — eliminating repeated manual
configuration. Without save/load, export and import have nowhere to save to or load from.

**Independent Test**: Open the app, place 3 fields, save as "Test". Reload the page. Open
the template panel → "Test" appears → click Load → the 3 fields appear on the canvas exactly
as configured, without any other action needed.

**Acceptance Scenarios**:

1. **Given** the canvas has one or more configured fields, **When** the user saves with a new name, **Then** the template appears immediately in the template list and persists after a full page reload.
2. **Given** a saved template exists, **When** the user loads it, **Then** the canvas is replaced with the template's fields (all properties restored: position, size, name, font, font size, page).
3. **Given** a saved template exists, **When** the user renames it, **Then** the new name appears in the list and the template data is unchanged.
4. **Given** a saved template exists, **When** the user deletes it, **Then** it is removed from the list immediately and is gone after a page reload.
5. **Given** a template name already exists, **When** the user saves with the same name, **Then** the system asks for confirmation before overwriting.

---

### User Story 2 — Export Template (Priority: P2)

A user wants to share a field layout with a colleague or back it up outside the browser.
They export the current canvas as either a downloadable `.json` file (saved to disk) or
as formatted JSON text copied to the clipboard (to paste into a message or document).

**Why this priority**: Export provides portability and backup that localStorage alone cannot.
It can be demonstrated and used independently of Import (save a file, open it in a text editor).

**Independent Test**: Place 2 fields → click "Export as JSON" → a file named after the
template (or a default name) downloads → open the file → it contains valid JSON with
`name`, `createdAt`, and a `fields` array with both field objects in full detail.
Separately: click "Copy to clipboard" → paste in a text editor → same JSON appears, indented.

**Acceptance Scenarios**:

1. **Given** the canvas has fields, **When** the user exports as a JSON file, **Then** a `.json` file downloads with the template name as the filename and contains all field properties.
2. **Given** the canvas has fields, **When** the user copies to clipboard, **Then** the clipboard contains the same JSON, pretty-printed with indentation, and a success confirmation is shown.
3. **Given** the canvas has no fields, **When** the user exports, **Then** the exported JSON contains an empty `fields` array (not an error).

---

### User Story 3 — Import Template (Priority: P3)

A user receives a `.json` template file from a colleague (or recovers their own exported
backup) and loads it into the canvas. Alternatively, they paste a raw JSON string into
a text area. In both cases, if the canvas already has fields, the user chooses whether
to replace everything or append the imported fields to the existing ones. If the JSON is
malformed or does not match the expected schema, a descriptive error message appears and
the canvas is left unchanged.

**Why this priority**: Import completes the portability loop started by Export. It
can be tested independently by creating a JSON file manually or reusing an exported file.

**Independent Test**: Export a template to file (US2). Open a new session, import that
file → the fields appear on the canvas. Separately: paste malformed JSON into the textarea
→ an error message appears → the canvas is unchanged.

**Acceptance Scenarios**:

1. **Given** a valid `.json` template file, **When** the user selects it via the file picker, **Then** the fields from the file are loaded onto the canvas.
2. **Given** valid JSON pasted into the import text area, **When** the user confirms import, **Then** the fields are loaded onto the canvas.
3. **Given** the canvas already has fields and a valid import is triggered, **When** the user is prompted for replace vs. append, **Then** choosing "Replace" clears existing fields and loads the imported ones; choosing "Append" adds the imported fields alongside existing ones.
4. **Given** a JSON string with an invalid structure (missing required fields, wrong types), **When** import is attempted, **Then** a descriptive error message is displayed and the canvas remains unchanged.
5. **Given** a completely malformed JSON string (syntax error), **When** import is attempted, **Then** a parse error message is displayed and the canvas remains unchanged.

---

### Edge Cases

- **Empty canvas on save/export**: Saving or exporting with zero fields produces a template with an empty `fields` array — not an error.
- **Duplicate template names**: Saving a name that already exists prompts the user to confirm overwrite; cancelling leaves the original untouched.
- **localStorage capacity exceeded**: If saving would exceed browser storage limits, a clear error message is shown and the previous templates remain intact.
- **Template fields referencing pages beyond current PDF**: Imported fields with `page` values higher than the loaded PDF's page count are still loaded — the user may have opened a shorter PDF. The fields remain in the store and are visible when navigating to their page (or invisible if the PDF is shorter).
- **Import append with duplicate field names**: When appending, if imported field names clash with existing ones, the imported fields get auto-renamed using the existing `duplicatedName` suffix logic.
- **Clipboard API unavailable**: If the clipboard write fails (browser permission denied), an inline error message is shown.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to save the current canvas field layout as a named template.
- **FR-002**: Saved templates MUST persist in browser-local storage and survive page reloads.
- **FR-003**: Users MUST be able to view a list of all locally saved templates.
- **FR-004**: Users MUST be able to load a saved template, replacing the current canvas fields with the template's fields.
- **FR-005**: Users MUST be able to rename a saved template without altering its field data.
- **FR-006**: Users MUST be able to delete a saved template permanently.
- **FR-007**: When saving a template with a name that already exists, the system MUST ask for confirmation before overwriting.
- **FR-008**: Users MUST be able to export the current canvas as a downloadable `.json` file named after the template.
- **FR-009**: Users MUST be able to copy the current canvas configuration to the clipboard as formatted (indented) JSON text.
- **FR-010**: Users MUST be able to import field layouts from a `.json` file selected from their filesystem.
- **FR-011**: Users MUST be able to import field layouts by pasting a JSON string into a text input area.
- **FR-012**: When an import is triggered and the canvas already has fields, the system MUST present a choice: replace all existing fields or append the imported fields to the existing ones.
- **FR-013**: When imported JSON is structurally invalid or fails schema validation, the system MUST display a descriptive error message and leave the canvas unchanged.
- **FR-014**: All template operations (save, export, copy, import) MUST preserve all field properties: name, page number, position (x, y), dimensions (width, height), font family, and font size.

### Key Entities

- **Template**: A named, timestamped snapshot of a canvas field layout. Has: `name` (string), `createdAt` (ISO 8601 date string), `fields` (array of field objects with all properties).
- **TemplateStore**: The persisted collection of templates in browser-local storage, keyed by a stable identifier. Supports create, read, update (rename/overwrite), and delete operations.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Saving and reloading a template with 20+ fields takes under 5 seconds total (from click "Save" to fields restored on canvas after reload).
- **SC-002**: An exported JSON file, when re-imported, restores all field properties exactly — zero data loss on round-trip.
- **SC-003**: After saving a template, configuring a repeated-use PDF type takes under 10 seconds (load template → done), compared to several minutes without templates.
- **SC-004**: Importing a malformed or invalid JSON file displays an error in under 1 second and makes no changes to the canvas.
- **SC-005**: All template actions (save, load, export, import) are accessible without leaving the main editor view.

---

## Assumptions

- Templates are stored per browser profile and are not synced across devices or users.
- A flat list (no folders or tags) is sufficient for the expected number of templates.
- The maximum template count is bounded only by the browser's localStorage capacity (~5 MB); no artificial cap is imposed.
- When importing, fields are placed at their stored coordinates regardless of whether those coordinates fit within the current PDF's dimensions — the user is responsible for repositioning if needed.
- The export filename defaults to the template name (sanitized for filesystem) with a `.json` extension; when exporting directly from the current canvas without a saved template name, the default filename is `template.json`.
- "Append" mode on import reuses the existing `duplicatedName` suffix logic to resolve any name conflicts automatically, without user intervention per field.
- No undo/redo is required for template operations in this version.
- The template JSON schema is the app's own format; cross-tool compatibility (e.g., with Adobe Acrobat form configs) is out of scope.
