# Feature Specification: New Design System Integration + Feature Enhancements

**Feature Branch**: `011-new-design-integration`  
**Created**: 2026-05-27  
**Updated**: 2026-05-27 (CSS phase complete; added US5–US8 functional enhancements)  
**Status**: CSS Phase Complete → Feature Phase In Progress

---

## Overview

Feature 011 has two phases:

**Phase A — CSS Migration (COMPLETE)**: Migrated production UI to the new design system (dark-first teal palette, Geist variable font, comprehensive token ramp, restyled primitives, Kbd primitive, ThemeToggle prop-driven, showEditorToolbar wiring). All tasks T001–T036 complete. Zero functional changes.

**Phase B — Feature Enhancements (IN PROGRESS)**: Implement the functional features shown in the prototypes at `new-design/prototype/` — editor enhancements (field types, undo/redo, alignment tools, status bar), landing screen hero, and filler mode improvements (sections, validation, autosave, click-to-focus).

---

## Phase A Status (CSS Migration)

All CSS tasks complete. Reference: tasks.md T001–T036. Outstanding: T008/T037 (browser smoke test — manual).

---

## Phase B — Feature Enhancements

### User Story 5 — Editor: Field Types & Toolbar (Priority: P1)

A user can choose a field type (Texto, Número, Fecha, Checkbox, Firma) before inserting, see type-colored overlays on the canvas, and use Undo/Redo to correct mistakes. An unsaved-changes indicator appears in the navbar when the template has pending changes.

**Why P1**: Field types are the foundation of US6 (canvas features) and the PropertiesPanel changes. Undo/Redo is the most-requested UX improvement and shares the history stack infrastructure.

**Independent Test**: Select "Número" chip → draw on canvas → field appears orange-bordered. Press Ctrl+Z → field disappears. Press Ctrl+Shift+Z → field reappears. "Sin guardar" badge appears after any change.

**Acceptance Scenarios**:

1. **Given** toolbar in insert mode, **When** user clicks a type chip (T/N/D/C/F), **Then** the cursor changes to crosshair and dragging on the canvas creates a field of that type.
2. **Given** fields of different types on canvas, **When** rendered, **Then** each type has a distinct border color: Texto=`#66A5AD`, Número=`#F4A261`, Fecha=`#a78bfa`, Checkbox=`#22c55e`, Firma=`#ec4899`.
3. **Given** user creates/moves/deletes a field, **When** action completes, **Then** "Sin guardar" badge appears in navbar (accent pill style). Exporting PDF clears the badge.
4. **Given** Undo stack has entries, **When** user presses Ctrl+Z (or clicks Deshacer button), **Then** last field mutation is reversed (delete, move, create, resize, property change).
5. **Given** Redo stack has entries, **When** user presses Ctrl+Shift+Z, **Then** reversed action is re-applied.
6. **Given** user double-clicks a field on canvas, **When** rename input appears, **Then** typing and pressing Enter renames the field; Escape cancels without change.

---

### User Story 6 — Editor: Advanced Canvas Features (Priority: P2)

A user working with multiple fields can align them using the alignment bar, see magnetic snap guides during drag, use an enhanced context menu, lock fields against accidental moves, and see collapsible property sections. The field list shows type badges and group names.

**Why P2**: Dependent on US5 (field types). High UX value for power users dealing with complex PDFs.

**Independent Test**: Select 2+ fields → alignment bar appears → click "Alinear a la izquierda" → fields align. Drag a field near another → magenta guide line appears at the alignment edge.

**Acceptance Scenarios**:

1. **Given** 2 or more fields selected, **When** alignment bar renders, **Then** buttons for left/center-H/right/top/center-V/bottom align and H/V distribute appear below the second navbar row.
2. **Given** user drags a field within 4px of another field's edge/center, **When** dragging, **Then** a 1px magenta guide line (`#ec4899`) appears at the snap axis. Guides disappear on mouse-up.
3. **Given** user right-clicks a field, **When** context menu opens, **Then** items include: Duplicar (⌘D), Copiar propiedades, separator, Traer al frente, Enviar al fondo, separator, Bloquear/Desbloquear, separator, Eliminar (Del, red).
4. **Given** user clicks Bloquear on a field, **When** field is locked, **Then** drag is disabled; resize handles disappear; lock icon shows in field list item. Unlocking reverses all.
5. **Given** field is selected in PropertiesPanel, **When** panel renders, **Then** properties are grouped in collapsible sections: General, Posición y tamaño, Tipografía, Comportamiento. Sections expand/collapse on header click.
6. **Given** fields list renders, **When** fields have types and groups, **Then** each item shows a type-badge chip (T/N/D/C/F with type color) and the group name below the field name in muted style.
7. **Given** insert mode is active with a type selected, **When** rendered, **Then** a hint banner appears below the toolbar row: "Modo Insertar · {type} · arrastra sobre el PDF [Esc para cancelar]".
8. **Given** canvas has no fields, **When** rendered, **Then** an empty-state card appears: title + description + keyboard shortcut hint.

---

### User Story 7 — Landing / Menu Screen (Priority: P3)

A user opening the app sees a branded landing screen with a hero headline, a prominent dropzone with a CTA button, and a quick-info row. The copy adapts to the selected mode (Editor / Rellenar PDF).

**Why P3**: Independent of US5/US6. Affects PdfUploader and PdfUploadScreen. Biggest visual difference from the current app.

**Independent Test**: Load app with no PDF → hero headline "Coloca campos de formulario sobre cualquier PDF." visible. Switch to Rellenar PDF mode → headline changes. Drag a file onto the dropzone → "Analizando campos…" spinner appears.

**Acceptance Scenarios**:

1. **Given** app loads with no PDF, **When** editor mode active, **Then** upload screen shows: eyebrow "Editor de plantilla", headline "Coloca campos de formulario sobre cualquier PDF.", subhead "Importa un PDF, dibuja los campos donde los necesites y exporta el archivo listo para firmar.", CTA "Seleccionar PDF", hint "o arrastra un archivo aquí", quick-row "PDF · hasta 50 MB · se procesa localmente".
2. **Given** app loads with no PDF, **When** filler mode active, **Then** copy changes to filler context: eyebrow "Rellenar PDF", headline "Rellena cualquier formulario PDF, sin imprimirlo.", subhead + CTA adapted to filler.
3. **Given** user drags a file over the dropzone, **When** dragging, **Then** dropzone enters active/hover state (brighter border, teal tint background).
4. **Given** user clicks "Seleccionar PDF", **When** file is processing, **Then** spinner animation appears with text "Analizando campos del PDF…".
5. **Given** landing screen renders, **When** background applied, **Then** a subtle radial vignette (dark teal, `rgba(0,0,0,0.2)` center fade) renders behind the dropzone.
6. **Given** landing screen renders, **When** footer renders, **Then** a small footer bar shows keyboard shortcuts: ⌘O abrir · ? atajos · T cambiar tema.

---

### User Story 8 — Filler: Enhanced Form Experience (Priority: P2)

A user filling a PDF form sees fields grouped in collapsible sections with progress bars, can navigate with Enter/Tab, has their draft autosaved to localStorage, can toggle a final-preview mode, can click directly on PDF fields to focus the corresponding input, and receives inline validation when submitting.

**Why P2**: The current filler is functional but the UX is significantly worse than the prototype. Users filling long contracts need the section structure, progress, and jump-to-next-empty navigation.

**Independent Test**: Fill 3/3 fields in the "Arrendador" section → section auto-collapses and shows ✓. Press "↓ Siguiente vacío" → first empty field in next section is focused and its input scrolls into view. Reload page → filled values are restored from localStorage.

**Acceptance Scenarios**:

1. **Given** filler form panel renders, **When** fields have group names, **Then** fields are displayed in collapsible sections with a section header showing name + done/total count + mini progress bar.
2. **Given** all fields in a section are filled, **When** the last field gets a value, **Then** the section auto-collapses and shows a ✓ checkmark. If a field is later emptied, the section auto-expands.
3. **Given** form has required fields (marked with `*`), **When** user clicks "Generar PDF" with missing required fields, **Then** a banner appears: "Faltan N campo(s) obligatorio(s). Te llevamos al primero." + each missing field gets error styling (red border). App scrolls to the first missing field.
4. **Given** user presses Enter in a filled field (or clicks "↓ Siguiente vacío"), **When** action fires, **Then** next empty field is focused, its section is auto-expanded if collapsed, and the form scrolls the input into view.
5. **Given** user types or changes a field value, **When** 400ms debounce passes, **Then** draft is saved to `localStorage['pdf-filler-draft-v1']`. A "Guardado · hace N s" pill with a live dot shows in the form header.
6. **Given** user clicks "Vista final" toggle, **When** active, **Then** the PDF overlay hides field outlines and highlights, showing only the text values as they will appear in the generated PDF.
7. **Given** user clicks on a field area in the PDF preview, **When** click fires, **Then** the corresponding form input is focused, its section expands if collapsed, and the form panel scrolls to the input.
8. **Given** PDF preview scroll position changes due to focused field, **When** focus changes, **Then** the PDF preview auto-scrolls so the focused field is visible (with 100px top padding).
9. **Given** form header renders, **When** rendered, **Then** shows total fields detected, completed/total count, required missing count (red if > 0), and "Sin guardar"/"Guardado · hace N s" pill.
10. **Given** user clicks reset/limpiar icon, **When** clicked, **Then** a confirmation banner appears: "¿Limpiar todos los valores? Se borrarán los N campos completados y el borrador guardado." with Cancelar / Sí, limpiar buttons.
11. **Given** filler field has type `number`, **When** a value is displayed on the PDF overlay, **Then** it is formatted with `toLocaleString('es-CL')` (e.g., `850000` → `850.000`) and the unit suffix if present.
12. **Given** filler field has type `date`, **When** displayed on PDF overlay, **Then** the ISO date `YYYY-MM-DD` is reformatted to `DD/MM/YYYY`.

---

### Edge Cases

**Field Types**
- `FormField` type field extension: existing fields without a `type` property default to `'text'` — backward compatible with all saved templates.
- Type chips in the toolbar only appear in insert mode; in select/move/pan they are hidden.
- Undo stack is capped at 50 entries to prevent unbounded memory growth.

**Alignment Bar**
- Distribute (H/V) requires at least 3 fields; clicking with 2 shows a toast "Selecciona al menos 3 campos para distribuir".
- Alignment actions use the bounding box of the selected group — not a reference field.

**Snap Guides**
- Guides only appear when dragging a single field; group moves do not show guides (complexity vs. value).
- Snap threshold: 4px in canvas pixel space.

**Filler Autosave**
- Autosave uses the same `localStorage` key `pdf-filler-draft-v1` regardless of the loaded PDF — draft is per-browser, not per-document.
- If localStorage is full or unavailable, autosave fails silently (try/catch).

**Filler Click-to-Focus**
- Click targets on the PDF are invisible `<button>` elements positioned over each field rectangle using PDF user-space coordinates transformed by `renderScale` (same coordinate system as the live-preview overlay canvas).

---

## Requirements

### Functional Requirements — Phase B

**Field Types**

- **FR-101**: `FormField` MUST add optional `fieldType?: 'text' | 'number' | 'date' | 'checkbox' | 'signature'` (defaults to `'text'` when absent). `isValidField` accepts `fieldType === undefined`.
- **FR-102**: Each field type MUST have a canonical color: `text=#66A5AD`, `number=#F4A261`, `date=#a78bfa`, `checkbox=#22c55e`, `signature=#ec4899`. Colors stored in a `FIELD_TYPE_CONFIG` constant in `src/features/fields/config/fieldTypes.ts`.
- **FR-103**: Canvas overlay MUST use `fieldType` color for unselected field borders and background tint (`color + '14'` alpha hex). Selected field uses `--color-primary` border (overrides type color).
- **FR-104**: Toolbar MUST render type chips (T/N/D/C/F) only when in insert mode. Each chip activates its type and enters insert mode. Keyboard shortcuts T/N/D/C/F trigger corresponding type.
- **FR-105**: Type badge in `FieldList` — one character chip (T/N/D/C/F) colored per type. Group name shown below field name in `--color-text-muted`.

**Undo/Redo**

- **FR-106**: History stack implemented in `useFieldStore` — `undoStack: FormField[][]` and `redoStack: FormField[][]` (snapshots of the full fields array). Max depth: 50.
- **FR-107**: All field mutations (`addField`, `deleteField`, `updateField`, `updateFields`, `duplicateField`, `moveField`) MUST push a snapshot before mutating.
- **FR-108**: `undo()` pops from `undoStack`, pushes current to `redoStack`, restores. `redo()` is the inverse.
- **FR-109**: Keyboard handler in `App.tsx`: `Ctrl+Z` / `Cmd+Z` → undo; `Ctrl+Shift+Z` / `Cmd+Shift+Z` → redo. Ignored when focus is in an input/textarea.
- **FR-110**: Navbar shows `<IconButton>` for Deshacer + Rehacer when a PDF is loaded in editor mode. Disabled when stack is empty.

**Unsaved Indicator**

- **FR-111**: `isDirty: boolean` in `useFieldStore`. Set to `true` on any mutation. Set to `false` after successful PDF export (`handleExport`).
- **FR-112**: When `isDirty && appMode === 'editor' && !!pdfBytes`, render an accent-colored pill "sin guardar" in the navbar (between filename and actions).

**Alignment Bar**

- **FR-113**: When `selectionIds.size >= 2`, render `AlignBar` component below the toolbar row (or as a floating strip above the canvas). Ports directly from the prototype.
- **FR-114**: Align actions: left, center-H, right, top, center-V, bottom. Distribute: H (≥3), V (≥3). All via `updateFields(ids, partial)` bulk update.
- **FR-115**: Alignment logic uses the bounding box (min-left, max-right, min-top, max-bottom) of the selected set.

**Snap Guides**

- **FR-116**: During field drag, compute candidate snap axes from all non-dragged fields (left edge, center-X, right edge; top edge, center-Y, bottom edge).
- **FR-117**: If dragged field edge/center is within 4px of a candidate axis, snap to that axis and render a full-height or full-width 1px magenta guide line on the canvas overlay.
- **FR-118**: Guide lines are rendered in the `FieldOverlay` canvas layer. Cleared on `pointerup`.

**Context Menu Enhancement**

- **FR-119**: Add to context menu: Traer al frente (`bringToFront`), Enviar al fondo (`sendToBack`), separator, Bloquear/Desbloquear campo.
- **FR-120**: `bringToFront(id)`: moves field to end of `fields` array (highest render order). `sendToBack(id)`: moves to index 0.
- **FR-121**: `locked?: boolean` field in `FormField` (optional, defaults false). When locked: `@dnd-kit` `disabled=true`, resize handles hidden, delete key ignored for this field.

**Collapsible PropertiesPanel**

- **FR-122**: PropertiesPanel sections (General, Posición y tamaño, Tipografía, Comportamiento) are collapsible via a chevron toggle. State is local to PropertiesPanel (no store).
- **FR-123**: Comportamiento section is collapsed by default (power-user options: required, showBorder, autoFitFont, multiline).

**Insert Mode Banner**

- **FR-124**: When `interactionMode === 'insert'` and an insert type is active, render a banner div below the toolbar row: "Modo Insertar · {typeName} · arrastra sobre el PDF [Esc]".
- **FR-125**: Banner slides in from top (CSS animation `insertBannerIn` already in `FillerLayout.module.css` — port to `FieldOverlay.module.css` or `App.module.css`).

**Canvas Empty State**

- **FR-126**: When `fields.length === 0` and a PDF is loaded in editor mode, render a centered card over the canvas: "Aún no hay campos" + instruction text + keyboard hint `I` + `S`.

**Landing Screen Hero**

- **FR-127**: `PdfUploader` component MUST add a hero section above the dropzone: eyebrow, headline, subhead — with content driven by `appMode` prop.
- **FR-128**: Dropzone MUST add a primary CTA `<Button variant="primary">Seleccionar PDF</Button>` and a hint line "o arrastra un archivo aquí" and a quick-row `PDF · hasta 50 MB · se procesa localmente`.
- **FR-129**: Landing screen background MUST apply a subtle radial vignette via CSS `::before` or `background` property on the `.menu-stage` container.
- **FR-130**: Landing footer with keyboard shortcuts renders as a small muted row: `⌘O abrir · ? atajos · T cambiar tema`.
- **FR-131**: `PdfUploadScreen` (filler entry) receives equivalent hero treatment with filler-specific copy.

**Filler Enhancements**

- **FR-132**: `AcroFormField` (and the extracted fields from `useFieldDetection`) MUST expose `group?: string` for section grouping. Groups derived from `fieldName` prefix (e.g., `arrendador_nombre` → group `arrendador`) or explicit `group` annotation if present in the PDF's extended DA.
- **FR-133**: `useFillerStore` MUST add: `collapsed: Set<string>` (collapsed group names), `toggleCollapse(group)`, `lastSaved: number | null`, `finalPreview: boolean`, `toggleFinalPreview()`, `isDirty: boolean`, `resetValues()`.
- **FR-134**: Auto-collapse: when all fields in a group become filled, the group is auto-collapsed. When any field in a group is emptied, the group is auto-expanded.
- **FR-135**: Progress bars per section: `done/total` ratio rendered as a thin bar below each section header.
- **FR-136**: `required?: boolean` on detected AcroForm fields — PDF AcroForm required flag extracted from `annotation.fieldFlags` (bit 2 = required). Shown as `*` in label; missing on submit shows error styling.
- **FR-137**: "Saltar al siguiente vacío": `jumpToNextEmpty(fromId)` finds the next unfilled field (wrapping), expands its section, sets `focusedId`, and focuses the input ref. `Enter` key in a filled input triggers this. Footer button also triggers it.
- **FR-138**: Autosave: 400ms debounce on `values` changes → `localStorage.setItem('pdf-filler-draft-v1', JSON.stringify({ values, ts: Date.now() }))`. Restore on mount. `lastSaved` timestamp updated; a relTime pill "Guardado · hace N s" shows in form header.
- **FR-139**: "Vista final" toggle: `finalPreview` state. When true, click targets on PDF are hidden and field outlines/highlights are removed; only text values show.
- **FR-140**: Click-to-focus: invisible `<button>` elements over each field's rect on the PDF panel. Click → `setFocusedId(id)`, expand section if collapsed, focus input ref.
- **FR-141**: PDF auto-scroll: when `focusedId` changes, scroll the PDF panel so the focused field's top is at `fieldVisualTop * zoom - 100px`.
- **FR-142**: Number formatting: `Number(v).toLocaleString('es-CL')` + unit suffix. Date formatting: `YYYY-MM-DD` → `DD/MM/YYYY`.
- **FR-143**: Reset confirmation: clicking reset shows an inline confirmation banner with Cancelar / Sí, limpiar buttons. Confirming clears `values`, `errors`, `collapsed`, localStorage key.
- **FR-144**: Validation banner on submit: if required fields missing, show banner (kind=warning) with field count + scroll to first missing. On success, show banner (kind=success) with filename.

**What MUST NOT change (Phase B addendum)**

- **FR-150**: All Phase A CSS changes (tokens, CSS Modules) remain in place. No token renames or reversions.
- **FR-151**: `fillService.ts` fill/flatten order remains unchanged (CLAUDE.md Principle XXXI).
- **FR-152**: `pdf-lib` field deduplication (`form.removeField()` before `createTextField`) remains in `pdfService.ts`.
- **FR-153**: `annotationMode: 2` in `usePdfRenderer` stays unchanged (CLAUDE.md BF-005-01).
- **FR-154**: `buffer.slice(0)` in filler for ArrayBuffer copy stays unchanged (CLAUDE.md memory).

---

## Success Criteria — Phase B

- **SC-101**: All five field types can be created on canvas, have correct type-colored borders, and are saved/exported correctly by `pdfService` (all export as text fields — type is a UI-only concept for now unless pdf-lib supports typed fields).
- **SC-102**: Undo reverses the last 50 field mutations. Redo replays them. Ctrl+Z / Ctrl+Shift+Z work. Navbar buttons reflect stack state.
- **SC-103**: Alignment bar aligns 2+ fields correctly. Distribute requires 3+. Snap guides appear at ±4px.
- **SC-104**: Landing screen shows hero + CTA button + quick-row. Copy changes when mode toggles.
- **SC-105**: Filler: drafts survive page reload. Required field validation shows banner + red borders. Section auto-collapse fires when section completes. "Guardado · hace N s" shows within 500ms of a change.
- **SC-106**: All existing Vitest unit tests pass without modification.
- **SC-107**: `npm run typecheck` and `npm run build` pass with zero errors.
