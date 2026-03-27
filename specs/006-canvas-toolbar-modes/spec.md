# Feature Specification: Canvas Toolbar — Interaction Modes

**Feature Branch**: `006-canvas-toolbar-modes`
**Created**: 2026-03-27
**Status**: Draft
**Input**: User description: "Nueva feature: toolbar de herramientas en la barra superior con modos de interacción para el canvas."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Mode Toolbar & Keyboard Shortcuts (Priority: P1)

The editor displays a toolbar at the top of the canvas with four mutually-exclusive mode buttons: **Select (S)**, **Insert Input (I)**, **Move (M)**, and **Pan (H)**. The active mode is visually highlighted. Pressing S, I, M, or H on the keyboard switches modes. Pressing Escape always returns to Select mode.

**Why this priority**: Without a visible mode indicator, users cannot tell what will happen when they click or drag. This is the foundation all other interaction modes depend on.

**Independent Test**: Open the editor, verify the toolbar renders with four buttons, click each button and confirm it activates visually, press each keyboard shortcut and confirm the mode changes, press Escape and confirm Select activates.

**Acceptance Scenarios**:

1. **Given** the editor is open, **When** the user views the toolbar, **Then** four mode buttons (Select, Insert Input, Move, Pan) are visible and Select is active by default.
2. **Given** any mode is active, **When** the user clicks a different mode button, **Then** that mode becomes active and the previous one is deactivated.
3. **Given** any mode is active, **When** the user presses S / I / M / H, **Then** the corresponding mode activates immediately.
4. **Given** any mode is active, **When** the user presses Escape, **Then** the mode switches to Select.
5. **Given** a mode is active, **When** the user changes to another mode, **Then** only one mode is visually highlighted at a time.

---

### User Story 2 — Select Mode & Single-Field Selection (Priority: P1)

In Select mode, clicking a field selects it (shows the properties panel and resize handles). Clicking an empty area of the canvas deselects all fields. Shift+click toggles a field in/out of the current selection without clearing existing selections. Ctrl+A selects all fields on the current page.

**Why this priority**: Selection is the gateway to editing — renaming, resizing, repositioning. Making it explicit and predictable is critical.

**Independent Test**: Load a PDF with fields, switch to Select mode, click one field, verify it is selected; click empty canvas, verify deselection; Shift+click a second field, verify both are selected; press Ctrl+A, verify all page fields are selected.

**Acceptance Scenarios**:

1. **Given** Select mode is active, **When** the user clicks a field, **Then** that field becomes selected and the properties panel updates.
2. **Given** Select mode is active and a field is selected, **When** the user clicks an empty canvas area, **Then** all fields are deselected.
3. **Given** Select mode is active and field A is selected, **When** the user Shift+clicks field B, **Then** both A and B are selected and A remains selected.
4. **Given** Select mode is active and field A is selected, **When** the user Shift+clicks field A again, **Then** field A is removed from the selection.
5. **Given** Select mode is active, **When** the user presses Ctrl+A, **Then** all fields on the current page are selected.

---

### User Story 3 — Rubber Band Multi-Selection (Priority: P2)

In Select mode, dragging on an empty area of the canvas draws a visible rubber-band rectangle. When the user releases, all fields whose bounding box intersects with the drawn rectangle become selected. Dragging on a field initiates a group move instead of rubber band.

**Why this priority**: Multi-field selection via rubber band is the most efficient way to select a spatial group of fields without Shift+clicking each one.

**Independent Test**: Load a PDF with several fields, draw a rubber band rectangle that covers some but not all fields, verify only the covered fields are selected.

**Acceptance Scenarios**:

1. **Given** Select mode is active, **When** the user presses down on an empty canvas area and drags, **Then** a semi-transparent selection rectangle is drawn following the cursor.
2. **Given** a rubber band drag is in progress, **When** the user releases, **Then** all fields whose bounding box intersects the rectangle are selected; fields outside are not.
3. **Given** Select mode is active, **When** the user presses down on an existing field and drags, **Then** a group move is initiated (no rubber band drawn).

---

### User Story 4 — Multi-Field Group Move (Priority: P2)

When multiple fields are selected and the user drags any one of them in Select mode, all selected fields move the same relative distance simultaneously. Resize handles are only visible when exactly one field is selected.

**Why this priority**: Moving multiple fields together is a core productivity feature when repositioning form sections.

**Independent Test**: Select two fields, drag one, verify both move by the same offset; select a single field, verify resize handles appear; select two fields, verify resize handles do not appear.

**Acceptance Scenarios**:

1. **Given** multiple fields are selected, **When** the user drags any one of them, **Then** all selected fields move by the same delta (dx, dy).
2. **Given** exactly one field is selected, **When** the user views the canvas, **Then** the 8 resize handles are visible on that field.
3. **Given** two or more fields are selected, **When** the user views the canvas, **Then** no resize handles are shown on any field.

---

### User Story 5 — Multi-Field Properties Panel (Priority: P2)

When multiple fields are selected, the properties panel shows only font family and font size. For each property, if all selected fields share the same value it is shown; if values differ, "—" is shown as a placeholder. Changing a property in bulk mode applies it to all selected fields.

**Why this priority**: Bulk editing font properties is a natural follow-up to multi-selection and avoids repetitive manual edits.

**Independent Test**: Select two fields with different font sizes, verify the size input shows "—"; change the font family, verify all selected fields update to the new family.

**Acceptance Scenarios**:

1. **Given** multiple fields are selected and all have font size 12, **When** the user views the panel, **Then** the font size input shows "12".
2. **Given** multiple fields are selected with different font sizes, **When** the user views the panel, **Then** the font size input shows "—".
3. **Given** multiple fields are selected, **When** the user changes the font family, **Then** all selected fields update to that font family.
4. **Given** multiple fields are selected, **When** the user enters a font size value, **Then** all selected fields update to that font size.

---

### User Story 6 — Insert Mode (Priority: P1)

In Insert mode, clicking on the canvas creates a new field at that position with default properties (same behavior as the current implicit click-to-create). After creation the newly created field is selected and the mode remains Insert.

**Why this priority**: Making field creation explicit preserves the existing workflow while making intent unambiguous.

**Independent Test**: Switch to Insert mode, click an empty canvas area, verify a new field is created at that position.

**Acceptance Scenarios**:

1. **Given** Insert mode is active, **When** the user clicks an empty canvas area, **Then** a new field is created at that position with default size, font, and an auto-generated name.
2. **Given** Insert mode is active, **When** a field is created, **Then** the new field becomes selected and Insert mode remains active.
3. **Given** Select mode is active, **When** the user clicks an empty canvas area, **Then** no new field is created (click deselects).

---

### User Story 7 — Move Mode (Priority: P2)

In Move mode, dragging any field moves it without requiring prior selection. The field does not need to be selected to be moved.

**Why this priority**: Provides a faster way to reposition fields when the user only wants to drag without entering selection state.

**Independent Test**: Switch to Move mode, drag a field that is not selected, verify it moves without becoming selected.

**Acceptance Scenarios**:

1. **Given** Move mode is active, **When** the user drags a field, **Then** the field moves following the cursor delta.
2. **Given** Move mode is active, **When** the user drags a field, **Then** the field does not need to be selected first.

---

### User Story 8 — Pan Mode (Priority: P3)

In Pan mode, dragging anywhere on the canvas scrolls the PDF viewport without moving or selecting fields. The cursor changes to a grab/hand cursor.

**Why this priority**: Useful for large multi-page PDFs, but lower priority since the browser's scroll bars already provide navigation.

**Independent Test**: Switch to Pan mode, drag on the canvas, verify the viewport scrolls and no fields move or get selected.

**Acceptance Scenarios**:

1. **Given** Pan mode is active, **When** the user drags on the canvas, **Then** the scroll position of the PDF container changes and no fields are moved or selected.
2. **Given** Pan mode is active, **When** the cursor is over the canvas, **Then** the cursor displays as a hand/grab icon.

---

### Edge Cases

- What happens when the user switches modes while a rubber band drag is in progress? → The drag is cancelled and the mode switches immediately.
- What happens when Ctrl+A is pressed but the current page has no fields? → Nothing changes (no error).
- What happens when Move mode is active and the user drags a field from one area of the canvas to another very close to the edge? → Field respects the existing clamping/boundary rules.
- What happens when a single field is selected and the user presses S (switching to Select)? → The mode switches; the field remains selected.
- What happens when multi-selection spans pages? → Selection is per-page; switching to a different page shows only fields of that page; selection state per page is preserved independently.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The editor MUST display a toolbar with four mode buttons — Select, Insert Input, Move, Pan — visible at all times when a PDF is loaded.
- **FR-002**: Only one mode MUST be active at a time; the active mode button MUST be visually distinct from inactive buttons.
- **FR-003**: Pressing keyboard keys S, I, M, H MUST activate the corresponding mode (Select, Insert, Move, Pan) from any mode.
- **FR-004**: Pressing Escape MUST always switch the active mode to Select, regardless of the current mode.
- **FR-005**: In Select mode, clicking a field MUST select it and display its properties.
- **FR-006**: In Select mode, clicking an empty canvas area MUST deselect all fields.
- **FR-007**: In Select mode, Shift+clicking a field MUST toggle that field's membership in the current selection without clearing other selected fields.
- **FR-008**: In Select mode, pressing Ctrl+A MUST select all fields on the current page.
- **FR-009**: In Select mode, dragging on an empty canvas area MUST draw a visible rubber band rectangle and select all fields whose bounding boxes intersect it upon release.
- **FR-010**: When multiple fields are selected, dragging any selected field MUST move all selected fields by the same delta.
- **FR-011**: Resize handles MUST only be shown when exactly one field is selected.
- **FR-012**: When multiple fields are selected, the properties panel MUST display only font family and font size; values differing across fields MUST show "—" as placeholder.
- **FR-013**: Changing font family or font size in the multi-selection properties panel MUST apply the new value to all selected fields.
- **FR-014**: In Insert mode, clicking the canvas MUST create a new field at the click position with default properties; the mode MUST remain Insert after creation.
- **FR-015**: In Move mode, dragging a field MUST move it without requiring prior selection.
- **FR-016**: In Pan mode, dragging the canvas MUST scroll the PDF viewport without moving or selecting any fields.
- **FR-017**: Selection state is per-page — switching pages MUST preserve each page's selection independently.

### Key Entities

- **InteractionMode**: Enum of four values — `select`, `insert`, `move`, `pan`. Exactly one is active at any time.
- **SelectionSet**: The set of currently selected field IDs on the current page. Operations: add, remove, toggle, clear, set-all.
- **RubberBand**: Transient drag rectangle defined by start and current pointer positions in canvas coordinates. Used only during rubber band drag in Select mode.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can switch between all four interaction modes in under 1 second using keyboard shortcuts.
- **SC-002**: Rubber band selection correctly captures all and only fields whose bounding boxes intersect the drawn rectangle, with 100% accuracy across test cases.
- **SC-003**: Group move applies the same delta to all selected fields simultaneously with no visible lag for groups of up to 50 fields.
- **SC-004**: The active mode is visually identifiable within 1 second of inspection without prior instruction.
- **SC-005**: Bulk font/size changes via the multi-selection panel apply to all selected fields in a single action, reducing repetitive edits by the number of selected fields minus one.
- **SC-006**: The toolbar and all mode interactions remain fully functional across all pages of a multi-page PDF.

---

## Assumptions

- The toolbar is added to the existing top navigation bar (navbar area), not as a floating panel.
- The default mode on PDF load is **Select** — no behavioral change to existing interactions is needed until the user explicitly switches modes.
- In the current codebase, click-to-create is the only action on empty canvas click; this moves exclusively to Insert mode — Select mode click on empty canvas will deselect only.
- Multi-selection properties panel replaces (or extends) the existing single-field PropertiesPanel; name, position, and size fields are hidden in multi-selection mode since they are per-field.
- Pan mode uses the browser's native scrollable container scroll offset; no custom viewport transform is needed.
- Rubber band rectangle rendering uses an absolutely-positioned overlay div with pointer-events:none, not a canvas layer.
- The feature does not change server-side code — all changes are client-only.
- Compatibility with existing Ctrl+D (duplicate) shortcut is assumed; it applies to all currently selected fields or to the focused field if only one is selected.
