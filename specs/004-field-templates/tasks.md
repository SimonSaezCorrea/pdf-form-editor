# Tasks: Configuration Templates

**Input**: Design documents from `/specs/004-field-templates/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ui-interactions.md ✅, quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.
**Tests**: Included — plan.md lists `templateSchema.test.ts` and `TemplatePanel.test.tsx` as required artifacts (Principle VII).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create directory structure for the new component. No new npm dependencies (constraint from plan.md).

- [X] T001 Create directory `client/src/components/TemplatePanel/` (empty — subsequent tasks populate it)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Pure utilities and store extension that ALL three user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Create `client/src/utils/templateSchema.ts` — define `TemplateFile` interface (`schemaVersion: 1`, `name`, `createdAt`, `fields: FormField[]`), implement `isValidTemplateFile(data: unknown): data is TemplateFile` type guard (validate all FormField property constraints per data-model.md), implement `parseTemplateFile(json: string): TemplateFile` (throws Error with Spanish messages on JSON syntax error, missing fields, invalid field at index N), implement `serializeTemplateFile(name: string, fields: FormField[]): string` (pretty-prints with 2-space indent, sets `schemaVersion: 1`, `createdAt: new Date().toISOString()`)
- [X] T003 [P] Create `client/tests/unit/templateSchema.test.ts` — Vitest unit tests for `parseTemplateFile` (valid input, JSON syntax error, missing `fields`, invalid field at index 0), `isValidTemplateFile` (valid + invalid shapes), `serializeTemplateFile` (round-trip: serialize then parse produces equivalent fields)
- [X] T004 Modify `client/src/hooks/useFieldStore.ts` — add `loadTemplateFields(fields: FormField[], mode: 'replace' | 'append'): void` to the `FieldStore` interface and implementation; replace mode: regenerate IDs with `field-${Date.now()}-${++fieldCounter}`, call `setFields(regenerated)` and `setSelectedFieldId(null)`; append mode: regenerate IDs, resolve name conflicts via existing `duplicatedName` from `client/src/utils/fieldName.ts` (iterate with `existingNames` Set updated as you go), call `setFields(prev => [...prev, ...resolved])`

**Checkpoint**: `templateSchema.ts` exports all three functions; `useFieldStore` exposes `loadTemplateFields`; `templateSchema.test.ts` tests pass.

---

## Phase 3: User Story 1 — Save & Load Templates Locally (Priority: P1) 🎯 MVP

**Goal**: Users can save the current canvas field layout as a named template that persists across page reloads, and load/rename/delete templates from a sidebar panel.

**Independent Test**: Open app → place 3 fields → type "Test" in save input → click Guardar → verify list shows "Test" → reload page → re-open Template Panel → "Test" listed → click Cargar → 3 fields appear on canvas with original properties.

- [X] T005 [US1] Create `client/src/hooks/useTemplateStore.ts` — define `Template` interface (`id: string`, `name: string`, `createdAt: string`, `fields: FormField[]`); define `TemplateStore` interface; implement hook with state seeded from `localStorage.getItem('pdf-form-editor:templates')` on mount (try/catch → empty array fallback); `useEffect` writes back on every `templates` change (try/catch `QuotaExceededError` → rollback state to pre-mutation, set `storageError`); implement `saveTemplate(name, fields): Template` (new id `template-${Date.now()}-${++counter}`, `createdAt = new Date().toISOString()`, append to array); `overwriteTemplate(id, fields): void` (replace `fields` and reset `createdAt`); `renameTemplate(id, newName): void`; `deleteTemplate(id): void`; export `storageError: string | null`
- [X] T006 [US1] Create `client/src/components/TemplatePanel/TemplatePanel.tsx` — props: `{ templates, saveTemplate, overwriteTemplate, renameTemplate, deleteTemplate, storageError, fields, loadTemplateFields }`; save section: controlled text input (name ≤100 chars, disabled Save button when empty or >100 chars), inline overwrite confirmation ("Una plantilla con este nombre ya existe. ¿Sobreescribir?" with Sí/Cancelar buttons) shown when name matches an existing template; template list: each row shows name + Cargar / Renombrar / Eliminar buttons; Renombrar switches row to inline edit input (pre-filled, Enter to confirm, Escape to cancel, disabled when empty); Eliminar shows inline "¿Eliminar esta plantilla?" with Sí/Cancelar; Cargar calls `loadTemplateFields(template.fields, 'replace')`; `storageError` shown as error banner when non-null
- [X] T007 [US1] Modify `client/src/App.tsx` — instantiate `useTemplateStore()` hook; pass `templates`, `saveTemplate`, `overwriteTemplate`, `renameTemplate`, `deleteTemplate`, `storageError` and `store.fields` + `store.loadTemplateFields` as props to `<TemplatePanel>`; render `<TemplatePanel>` in the sidebar below PropertiesPanel, gated by `!!pdfBytes` (same condition as existing sidebar panels)
- [X] T008 [US1] Modify `client/src/index.css` — add `/* ── TemplatePanel ── */` section with: `.template-panel` container styles (border-top separator, padding), `.template-panel h3` heading, `.template-save-row` flex layout for input + button, `.template-list` list reset, `.template-list-item` row layout with name + action buttons, `.template-inline-confirm` styles for overwrite/delete confirmation rows, `.template-error-banner` red error message style, `.template-rename-input` inline edit input

**Checkpoint**: Save → list shows template → reload → template persists → load → canvas fields restored. Rename and delete persist across reload.

---

## Phase 4: User Story 2 — Export Template (Priority: P2)

**Goal**: Users can download the current canvas as a `.json` file or copy it to the clipboard as formatted JSON.

**Independent Test**: Place 2 fields → click Descargar JSON → file `template.json` (or named file) downloads → open in editor → valid JSON with `schemaVersion: 1`, `name`, `createdAt`, `fields` array with 2 entries. Separately: click Copiar al portapapeles → paste in editor → same JSON indented with 2 spaces.

- [X] T009 [US2] Extend `client/src/components/TemplatePanel/TemplatePanel.tsx` — add export section with two buttons: "Descargar JSON" triggers `serializeTemplateFile(currentName || 'template', fields)` → inline `sanitizeFilename` (replace `/ \\ : * ? " < > |` with `_`, trim whitespace+dots, fallback to `"template"`) → Blob download via `URL.createObjectURL` + programmatic anchor click + `URL.revokeObjectURL` (filename: `sanitizedName + '.json'`); "Copiar al portapapeles" calls `navigator.clipboard.writeText(json)` → on success show "¡Copiado!" label for 2 seconds then revert → on failure show inline error "No se pudo copiar al portapapeles. Selecciona el texto manualmente."; `currentName` is the save-input value (or last saved/loaded template name as fallback)
- [X] T010 [US2] Modify `client/src/index.css` — add `.template-export-section` layout (flex column, gap), `.template-export-btn` button style, `.template-copied-feedback` transient success label style, `.template-clipboard-error` inline error style

**Checkpoint**: Download button produces a valid `.json` file. Copy button shows "¡Copiado!" and clipboard contains the JSON. Both work with empty fields array.

---

## Phase 5: User Story 3 — Import Template (Priority: P3)

**Goal**: Users can import field layouts from a `.json` file or pasted text; if canvas has existing fields, they choose replace or append; invalid JSON shows an error without touching the canvas.

**Independent Test**: Export a template (US2). In a new session, import that file → fields appear on canvas. Separately: paste malformed JSON → error message appears → canvas unchanged.

- [X] T011 [US3] Extend `client/src/components/TemplatePanel/TemplatePanel.tsx` — add import section with: `<input type="file" accept=".json">` triggering `FileReader.readAsText` → `parseTemplateFile(text)` (catch error → show error message, canvas unchanged); textarea + "Importar" button → `parseTemplateFile(textarea value)` (same error path); after successful parse, if `store.fields.length > 0` show inline replace/append choice ("Reemplazar todo" / "Agregar a existentes") — both call `loadTemplateFields` with appropriate mode and then reset import UI; if canvas is empty load directly with `'replace'`; import error shown inline below the import section; all error state cleared when user edits textarea or selects a new file
- [X] T012 [US3] Modify `client/src/index.css` — add `.template-import-section` layout, `.template-import-file-btn` file input label style (visually styled button), `.template-import-textarea` (resize: vertical, monospace font, height ~6rem), `.template-import-btn`, `.template-replace-append-row` flex layout for the two choice buttons, `.template-import-error` red error message style

**Checkpoint**: File import restores fields exactly. Text import restores fields. Append adds imported fields without name collisions. Invalid JSON shows error, canvas unchanged.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Tests covering the full component, manual validation, and CSS finalization.

- [X] T013 [P] Create `client/tests/unit/TemplatePanel.test.tsx` — @testing-library/react tests for: (1) save button disabled when input empty; (2) save button disabled when name >100 chars; (3) overwrite confirmation shown when name matches existing template; (4) Cancelar in overwrite confirmation keeps original template; (5) Sí in overwrite confirmation updates template in list; (6) Cargar calls loadTemplateFields with template fields and 'replace'; (7) Renombrar switches to inline edit, Enter confirms, Escape cancels; (8) Eliminar shows confirmation, Sí removes item; (9) storageError banner renders when storageError is non-null; (10) import error message shown for invalid JSON text input
- [X] T014 Run `npm test -w client` from repo root — verify all Vitest tests pass (existing 20 + new templateSchema tests + new TemplatePanel tests)
- [ ] T015 Manual end-to-end validation per `specs/004-field-templates/quickstart.md` — run all 10 scenarios (save/persist, overwrite confirmation, rename/delete, export JSON file, copy clipboard, import file replace, import with append + name conflict, import invalid JSON, import malformed JSON, multi-page template)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
  - T002 and T003 can run in parallel (T003 uses interface from data-model.md, tests fail until T002 done)
  - T004 depends on T002 (uses `FormField` types from same imports)
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion (T002 + T004)
  - T005 and T006 can start in parallel once Phase 2 is done
  - T007 depends on T005 + T006
  - T008 can run alongside T006 (different files)
- **User Story 2 (Phase 4)**: Depends on Phase 3 (extends TemplatePanel from T006)
- **User Story 3 (Phase 5)**: Depends on Phase 3 (extends TemplatePanel); uses `parseTemplateFile` from T002
- **Polish (Phase 6)**: Depends on all user story phases complete

### User Story Dependencies

- **US1 (P1)**: Needs `loadTemplateFields` (T004) and `templateSchema.ts` (T002 — for `Template` type); no dependency on US2 or US3
- **US2 (P2)**: Needs `serializeTemplateFile` (T002); shares TemplatePanel component with US1 (T006)
- **US3 (P3)**: Needs `parseTemplateFile` (T002) and `loadTemplateFields` (T004); shares TemplatePanel with US1/US2

### Parallel Opportunities

- T002 ‖ T003 (templateSchema implementation + tests — different concerns)
- T005 ‖ T008 after Phase 2 (hook + CSS — different files)
- T009 ‖ T010 within US2 (logic + CSS — different files)
- T011 ‖ T012 within US3 (logic + CSS — different files)
- T013 ‖ T014 in Phase 6 (tests + test run can pipeline)

---

## Parallel Example: User Story 1

```bash
# After Phase 2 completes, these can start together:
Task T005: "Create client/src/hooks/useTemplateStore.ts"
Task T008: "Modify client/src/index.css — TemplatePanel base styles"

# Then T006 uses T005's hook interface, T007 uses T005 + T006
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002, T003, T004)
3. Complete Phase 3: User Story 1 (T005–T008)
4. **STOP and VALIDATE**: Save → reload → load template works end-to-end
5. Merge or demo MVP

### Incremental Delivery

1. Phase 1 + 2 → Foundation (templateSchema + loadTemplateFields)
2. Phase 3 → US1 (save/load/rename/delete localStorage)
3. Phase 4 → US2 (export JSON file + clipboard)
4. Phase 5 → US3 (import file + text + replace/append)
5. Phase 6 → Tests + manual validation

---

## Notes

- All 15 tasks are client-only — zero server changes
- `sanitizeFilename` is inlined in T009 (one use site — below YAGNI threshold for a utility)
- Spanish error messages in `parseTemplateFile`: documented in plan.md §Key Implementation Notes
- `storageError` rollback: critical for localStorage quota handling — do not update in-memory state on failed write
- Replace/append choice is inline in sidebar (no modal) — avoids BF-003-02 class of `position:fixed` bubbling bugs
- Field IDs are regenerated on import (not on save/load from localStorage) — only external imports need new IDs
