# Feature Specification: Multi-Page PDF Navigation and Field Editing

**Feature Branch**: `002-multipage-pdf-navigation`
**Created**: 2026-03-26
**Status**: Draft
**Input**: User description: "Nueva feature: navegación y edición de campos en PDFs de n páginas."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navigate Between Pages (Priority: P1)

A user imports a multi-page PDF and needs to navigate through its pages to place form fields on the correct ones. The editor shows only one page at a time, and the user uses Previous/Next buttons and a "Page X of N" indicator to move between pages.

**Why this priority**: Core enabler — without page navigation, the entire feature is blocked. Every other story depends on this.

**Independent Test**: Can be fully tested by importing a multi-page PDF, clicking Previous/Next, and verifying the correct page content renders on each step, delivering navigation value independently of field editing.

**Acceptance Scenarios**:

1. **Given** a multi-page PDF is loaded, **When** the user clicks "Next", **Then** the editor displays the next page and the indicator updates to "Página 2 de N".
2. **Given** the user is on the last page, **When** they click "Next", **Then** the button is disabled and the page does not change.
3. **Given** the user is on the first page, **When** they click "Previous", **Then** the button is disabled and the page does not change.
4. **Given** a single-page PDF is loaded, **When** the editor opens, **Then** the navigation controls are hidden or disabled.

---

### User Story 2 - Add and Edit Fields Per Page (Priority: P2)

A user navigates to a specific page and places, moves, and renames form fields on that page. Fields added on page 2 appear only on page 2 and are not visible or affected when the user is on page 5.

**Why this priority**: Core value of the editor — users must be able to author fields per page independently.

**Independent Test**: Can be tested by adding a field on page 1, navigating to page 2, adding a field there, then navigating back to page 1 — verifying only page-1 fields are shown.

**Acceptance Scenarios**:

1. **Given** the user is on page 3, **When** they add a form field, **Then** the field appears on page 3 only and does not appear on any other page.
2. **Given** a field exists on page 1, **When** the user navigates to page 2 and back to page 1, **Then** the field is still present and unchanged.
3. **Given** the user moves a field on page 7, **When** they navigate away and return to page 7, **Then** the field retains its updated position.
4. **Given** fields exist on multiple pages, **When** the user edits a field name on page 2, **Then** fields on all other pages remain unchanged.

---

### User Story 3 - Jump to Page via Thumbnail Strip (Priority: P3)

A user with a long PDF (e.g., 12 pages) uses a thumbnail strip to jump directly to any page without clicking Next repeatedly.

**Why this priority**: Quality-of-life improvement for long documents; navigation via buttons is already sufficient for the MVP.

**Independent Test**: Can be tested independently by verifying that clicking a thumbnail changes the active page immediately, delivering faster navigation value without depending on field editing.

**Acceptance Scenarios**:

1. **Given** the thumbnail strip is visible, **When** the user clicks the thumbnail for page 7, **Then** the editor immediately shows page 7 and the indicator updates.
2. **Given** a page has fields added, **When** the user views its thumbnail, **Then** the thumbnail still renders correctly (fields are not required to be visible in thumbnails).

---

### User Story 4 - Export All Fields Across All Pages (Priority: P1)

A user who has placed fields on multiple pages exports the PDF and receives a single file containing all fields embedded in their correct pages.

**Why this priority**: Tied with P1 navigation — an export that discards fields from non-first pages makes the entire multi-page editing feature worthless.

**Independent Test**: Can be tested end-to-end by adding fields to pages 1, 7, and 12 of a 12-page PDF, exporting, and opening the result in any standard PDF reader to verify all 6 fields appear on the correct pages.

**Acceptance Scenarios**:

1. **Given** the user adds fields on pages 1, 7, and 12, **When** they export, **Then** the exported PDF contains exactly those fields on those pages and no other pages.
2. **Given** a page has no fields, **When** the PDF is exported, **Then** that page is preserved intact with its original content and no extra fields.
3. **Given** two fields with the same name exist on different pages, **When** the PDF is exported, **Then** both fields are embedded and distinguishable in the resulting PDF.

---

### Edge Cases

- What happens when a PDF with 0 pages is imported (corrupt/invalid file)?
- How does the system handle very large PDFs (100+ pages) — does thumbnail generation remain responsive?
- What happens if the user navigates away from a page with an unsaved field name edit in progress?
- How does the coordinate system behave when different pages have different dimensions (e.g., mixed portrait/landscape)?
- What happens if the user deletes all fields on a page and then navigates away — is that page's field list correctly empty on return?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The editor MUST display one PDF page at a time in the main canvas area.
- **FR-002**: The editor MUST show a "Página X de N" indicator reflecting the current page and total page count.
- **FR-003**: The editor MUST provide a "Previous" button that navigates to the preceding page and is disabled on page 1.
- **FR-004**: The editor MUST provide a "Next" button that navigates to the following page and is disabled on the last page.
- **FR-005**: The editor MUST maintain an independent set of form fields for each page; fields added to page X are associated only with page X.
- **FR-006**: When the user navigates between pages, the editor MUST display only the fields belonging to the currently visible page.
- **FR-007**: Field operations (add, move, rename, delete) MUST apply only to the currently active page and MUST NOT affect fields on other pages.
- **FR-008**: The editor MUST render the correct page content (visual fidelity) when the user navigates to any page.
- **FR-009**: On export, the system MUST embed all fields from all pages into the PDF, placing each field on its corresponding page at the correct position.
- **FR-010**: Pages with no fields MUST be exported with their original content unaltered.
- **FR-011**: The thumbnail strip SHOULD display small previews of all pages and allow the user to jump directly to any page by clicking its thumbnail.
- **FR-012**: Navigation controls MUST be hidden or disabled when the loaded PDF has only one page.

### Key Entities

- **PDF Document**: The imported file; has a fixed number of pages (N ≥ 1); each page may have different dimensions.
- **Page**: A single page within the document; identified by its 1-based index; has width and height in PDF coordinate units.
- **Page Field Set**: The collection of form fields associated with a specific page; isolated from all other pages' field sets.
- **Form Field**: A named text input area placed on a specific page; has a position and size relative to that page's coordinate space.
- **Current Page Index**: The editor's active page (1-based); determines which page content and which field set are displayed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can navigate from the first to the last page of a 12-page PDF in under 15 seconds using Previous/Next buttons.
- **SC-002**: Fields added to a given page persist correctly when the user navigates away and returns, with zero data loss across navigation events.
- **SC-003**: Exporting a PDF with fields on 3 different pages (out of 12) produces a file where all 3 field sets appear exclusively on their designated pages, verifiable in any standard PDF reader.
- **SC-004**: Page rendering on navigation completes in under 2 seconds for typical document sizes (under 20 MB).
- **SC-005**: 100% of fields placed across all pages are present in the exported PDF with correct page assignment — zero fields lost or misplaced.
- **SC-006**: A user can jump directly to any page via thumbnail in a single click, without requiring sequential navigation.

## Assumptions

- The editor operates on one PDF document at a time; multi-document workflows are out of scope.
- Thumbnail generation uses lower-resolution renders for performance; pixel-perfect fidelity in thumbnails is not required.
- The coordinate system is handled per-page: each page's origin and dimensions are treated independently, supporting mixed page sizes.
- Field name uniqueness is not enforced globally across pages; the same name may appear on multiple pages without conflict.
- The existing single-page field model is extended to be page-aware; no change to field types or properties is required beyond associating each field with a page index.
- Performance targets apply to PDFs up to 50 pages and 20 MB in size; behavior on larger documents is best-effort.
- The user's browser supports modern web APIs; no legacy browser support is added.
