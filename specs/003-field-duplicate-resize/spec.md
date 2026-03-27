# Feature Specification: Field Duplication and Visual Resize Handles

**Feature Branch**: `003-field-duplicate-resize`
**Created**: 2026-03-26
**Status**: Draft
**Input**: User description: "Nueva feature: duplicación de campos y redimensionamiento por arrastre de bordes."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Duplicate a Field (Priority: P1)

A user has placed a field on the canvas and wants to create one or more copies with identical properties (size, font, font size). Instead of filling in every attribute from scratch, the user selects the field and triggers duplication via keyboard shortcut (Ctrl+D) or right-click context menu. The duplicate appears slightly offset from the original, auto-named with a numeric suffix, and is immediately selected so the user can drag it to the correct position.

**Why this priority**: Duplicating fields is the most frequently needed productivity shortcut. It is self-contained, delivers immediate value without depending on resize handles, and reduces form-building time significantly when multiple similar fields are required.

**Independent Test**: Open any PDF, place one field, press Ctrl+D → verify a second field appears offset with a suffixed name and matching size/font properties. Repeat to get a third field (suffix increments). Works fully without resize handles.

**Acceptance Scenarios**:

1. **Given** a field named "fullname" is selected, **When** the user presses Ctrl+D, **Then** a new field named "fullname_2" appears offset +10 canvas pixels right and down from the original, with identical width, height, font, and font size; the duplicate is selected and the original is deselected.
2. **Given** a field named "fullname_2" already exists, **When** the user selects "fullname" and presses Ctrl+D again, **Then** the new field is named "fullname_3" (suffix increments to the next unused integer).
3. **Given** a field with an empty or whitespace-only name is selected, **When** duplicated, **Then** the duplicate is named "campo_1" (or "campo_2" if "campo_1" already exists).
4. **Given** a selected field, **When** the user right-clicks the field, **Then** a context menu appears with a "Duplicar campo" option; clicking it produces the same result as Ctrl+D.
5. **Given** no field is selected, **When** the user presses Ctrl+D, **Then** nothing happens (no error, no duplicate).
6. **Given** a field on page 3 of a multi-page PDF is selected, **When** duplicated, **Then** the duplicate is placed on page 3 (same page as original).

---

### User Story 2 — Resize a Field by Dragging Handles (Priority: P2)

A user needs to adjust the width and/or height of a placed field directly on the canvas without typing numbers. When a field is selected, eight resize handles appear — one at each corner and one at the midpoint of each side. The user drags a handle to resize the field. Corner handles resize both dimensions at once; edge handles resize only the perpendicular dimension. Holding Shift while dragging a corner constrains the resize proportionally. The properties panel updates in real time during the drag. Releasing the handle commits the new size.

**Why this priority**: Visual resizing is a significant UX improvement over numeric inputs but is more complex to implement correctly (mouse event math, minimum size enforcement, real-time feedback). It does not block field duplication (US1) and can be delivered independently.

**Independent Test**: Place a field, select it, drag the right-edge handle to the right → field widens; drag the bottom-right corner down-right → both dimensions grow; drag until width is below 20 px → field stops at 20 px width. Properties panel reflects changes throughout. Works without duplication feature being present.

**Acceptance Scenarios**:

1. **Given** a field is selected, **When** the user views the canvas, **Then** exactly 8 resize handles are visible on that field (4 corners, 4 edge midpoints); no handles appear on unselected fields.
2. **Given** a selected field, **When** the user drags the right-edge handle to the right by 30 canvas pixels, **Then** the field width increases by the equivalent PDF-space amount and height is unchanged; the properties panel width input reflects the new value in real time.
3. **Given** a selected field, **When** the user drags the bottom-right corner handle, **Then** both width and height change freely (no proportional constraint); the properties panel updates both values in real time.
4. **Given** a selected field, **When** the user drags a corner handle while holding Shift, **Then** the aspect ratio of the original field is maintained throughout the drag.
5. **Given** a field that is 50 px wide, **When** the user drags the left-edge handle rightward past the 20 px minimum, **Then** the width stops at 20 px and does not decrease further.
6. **Given** a field that is 30 px tall, **When** the user drags the top-edge handle downward past the 10 px minimum, **Then** the height stops at 10 px and does not decrease further.
7. **Given** the user finishes dragging a handle and releases the mouse button, **Then** the new width and height are saved to the field state; the handles remain visible (field is still selected).
8. **Given** a field on page 5 of a multi-page PDF is selected, **When** resized via handles, **Then** the resize behaves identically to a single-page PDF.

---

### Edge Cases

- What happens when the user duplicates a field that is near the canvas edge so the +10 px offset would place the duplicate outside the visible PDF area? → The duplicate is placed at the offset position regardless; it may be partially off-canvas and the user can scroll or drag it into position.
- What happens if two fields end up with the same auto-generated name after duplication (e.g., "campo_1" was manually renamed)? → The suffix search continues incrementing until an unused name is found.
- What happens when a resize drag begins on a handle but the mouse moves outside the browser window? → The resize commits with the last valid position when the `mouseup` event fires (or on `mouseleave` from the document).
- What happens when the user tries to resize a field to below the minimum dimensions from both axes simultaneously (e.g., dragging the bottom-right corner toward the top-left)? → Both minimum constraints apply independently: width clamps at 20 px, height clamps at 10 px.
- What happens if the user right-clicks on a field that is not selected? → The context menu appears and the field becomes selected simultaneously (right-click selects + shows menu).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow users to duplicate any selected field via a keyboard shortcut (Ctrl+D), producing an identical copy offset by 10 canvas pixels on both axes.
- **FR-002**: The system MUST allow users to duplicate any selected field via a right-click context menu option.
- **FR-003**: The system MUST auto-assign a unique name to each duplicate by appending the next available integer suffix (e.g., `_2`, `_3`) to the original field's name; fields with an empty name receive the base name `campo` with numeric suffix.
- **FR-004**: The duplicated field MUST copy all visual properties of the original: width, height, font family, and font size.
- **FR-005**: The duplicated field MUST be placed on the same page as the original field.
- **FR-006**: After duplication, the duplicate MUST be automatically selected and the original deselected.
- **FR-007**: When a field is selected, the system MUST display 8 resize handles: one at each corner (NW, NE, SE, SW) and one at each edge midpoint (N, E, S, W).
- **FR-008**: Resize handles MUST only be visible on the currently selected field; no other field shows handles.
- **FR-009**: Dragging an edge handle (N, S, E, W) MUST resize only the dimension perpendicular to that edge; the opposite dimension is unchanged.
- **FR-010**: Dragging a corner handle (NW, NE, SE, SW) MUST resize both width and height freely by default; holding Shift during drag MUST constrain the resize to the original aspect ratio.
- **FR-011**: During a drag, the properties panel MUST update width and height values in real time.
- **FR-012**: The system MUST enforce a minimum field width of 20 px and a minimum height of 10 px during resize; dragging beyond these limits clamps to the minimum.
- **FR-013**: Releasing the resize handle MUST commit and persist the new dimensions to the field's stored state.
- **FR-014**: Both duplication and resize MUST work correctly on any page of a multi-page PDF.

### Key Entities

- **FormField** (existing): Represents a placed AcroForm field. Relevant attributes: `id`, `name`, `page`, `x`, `y`, `width`, `height`, `fontSize`, `fontFamily`. Duplication creates a new FormField with a new `id`, derived `name`, and offset `x`/`y`.
- **ResizeHandle**: A visual interaction point on a selected field. Defined by its position (one of 8 directions). Not persisted — derived from field state on render.
- **DuplicateOperation**: The act of copying a field and computing the auto-suffix name. No persistent entity; result is a new FormField added to the field list.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can duplicate a field and position the copy in under 10 seconds, compared to over 60 seconds when configuring a new field from scratch — a 6× improvement in repetitive field creation.
- **SC-002**: 100% of duplicated fields have all visual properties (size, font, font size) correctly copied with no manual correction needed.
- **SC-003**: Auto-generated suffix names are always unique within the current document at the time of duplication; zero name collisions occur.
- **SC-004**: A user can resize a field by dragging a handle, with the final size reflecting the drag distance accurately (within ±2 px of intended size in canvas space).
- **SC-005**: The properties panel reflects the live size during a drag within a single animation frame — no perceptible lag between dragging and the panel updating.
- **SC-006**: No field can be resized below 20 px wide or 10 px tall under any drag scenario.
- **SC-007**: Both features work without errors on PDFs with 1 to 25+ pages, covering the full range supported by the multi-page navigation feature.

## Assumptions

- The user is working in a desktop browser environment with a mouse or trackpad; touch/mobile resize interactions are out of scope.
- Field name uniqueness is enforced globally across all pages (as established by the AcroForm specification constraint documented in prior features).
- The offset for duplicate placement (+10 canvas pixels on x and y) is applied in canvas (screen) space, not PDF point space. If the offset would place the field outside the PDF boundary, the duplicate is placed at the offset position and the user is responsible for repositioning.
- Proportional resize (Shift+drag) uses the aspect ratio of the field at the moment the drag begins, not a fixed ratio.
- The right-click context menu shows only the "Duplicar campo" option in the initial scope; additional context menu items (e.g., cut, paste) are out of scope for this feature.
- Resize handles are rendered as part of the existing canvas overlay mechanism. The drag interaction uses native mouse events (`mousedown`, `mousemove`, `mouseup`) rather than the existing drag-and-drop library, since handle dragging is a distinct interaction from field repositioning.
- The properties panel numeric inputs for width/height will also update the field size (existing behavior) and remain consistent with visual resize — the two controls are synchronized.
