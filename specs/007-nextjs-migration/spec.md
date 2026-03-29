# Feature Specification: Next.js Architecture Migration

**Feature Branch**: `007-nextjs-migration`
**Created**: 2026-03-27
**Status**: Draft
**Input**: User description: "Refactoring de arquitectura: migración a Next.js fullstack,
organización por features, design tokens globales y componentes base reutilizables."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Deploy to Vercel Without Configuration (Priority: P1)

A developer takes the current project and deploys it to Vercel. With the migration
complete, a single `vercel deploy` from the project root produces a working production
URL — no additional configuration files, no separate backend deployment, no environment
variables beyond what was already required.

**Why this priority**: The primary business driver for this migration is Vercel
compatibility. Without this working, none of the other improvements matter operationally.

**Independent Test**: Clone the migrated repo, run `npm run build` locally, then push to
Vercel. Verify the deployed app serves the PDF editor at the root URL and that
`/api/generate-pdf` accepts POST requests and returns a valid modified PDF.

**Acceptance Scenarios**:

1. **Given** the migrated project at its root, **When** `npm run build` is run,
   **Then** the build completes without errors and produces a deployable artifact.
2. **Given** the deployed app on Vercel, **When** a user uploads a PDF and places
   fields and clicks "Exportar", **Then** the downloaded file is a valid PDF with
   AcroForm fields at the expected positions.
3. **Given** the deployed app, **When** the `/api/generate-pdf` endpoint receives
   a POST with a PDF file and a JSON array of fields, **Then** it responds with
   a valid PDF blob within 10 seconds.
4. **Given** the previous Express-based API contract, **When** the client sends the
   same request payload it sent before, **Then** the API Route responds identically —
   no client-side changes are needed.

---

### User Story 2 - All Existing Features Work Identically (Priority: P1)

A returning user opens the migrated application and uses every feature they used
before: uploading a PDF, navigating pages, placing and resizing fields, setting
fonts and default values, duplicating fields, using templates, switching toolbar
modes, selecting multiple fields, and exporting the final PDF. Nothing is broken,
no behavior changes.

**Why this priority**: This is a refactoring — zero functional regression is
non-negotiable. Tied for P1 with deployment because neither is useful without
the other.

**Independent Test**: Execute the full manual test checklist against the migrated
app running locally (`npm run dev`). Every action that worked before must work after.

**Acceptance Scenarios**:

1. **Given** a multi-page PDF, **When** a user navigates pages and places fields on
   different pages, **Then** the exported PDF contains fields on the correct pages.
2. **Given** a saved template, **When** a user loads it on a new PDF, **Then** the
   fields appear at the positions and with the properties stored in the template.
3. **Given** select mode active, **When** a user rubber-band selects multiple fields
   and moves them, **Then** all selected fields move together.
4. **Given** a field with a default value, **When** the PDF is exported, **Then**
   the AcroForm field in the PDF contains the default value as pre-filled text.

---

### User Story 3 - Consistent Visual Design via Design Tokens (Priority: P2)

A developer modifies the primary brand color in a single file (`tokens.css`). Every
button, toolbar item, panel header, and interactive element that used that color
updates automatically across the entire application — no other files need changing.

**Why this priority**: Design tokens deliver long-term maintainability. They are
independent of the functional migration and can be delivered in the same release
without blocking P1 stories.

**Independent Test**: Change `--color-primary` in `tokens.css`. Verify visually that
all primary-colored elements (primary buttons, active toolbar icons, selected field
borders) reflect the new color without any component CSS file being touched.

**Acceptance Scenarios**:

1. **Given** the app is running, **When** a developer searches for hardcoded color
   values (hex codes, `rgb()`, named colors) in any file outside `tokens.css`,
   **Then** no matches are found.
2. **Given** `tokens.css` is updated with a new spacing scale value, **When** the
   app is rebuilt, **Then** all components using that spacing variable reflect the
   change.

---

### User Story 4 - Base UI Components Are Unified (Priority: P2)

A developer adding a new feature needs a button. They import `Button` from
`src/components/ui/` and get a fully styled, accessible component with primary,
secondary, ghost, and danger variants. They do not create a new button — there
is only one Button in the entire codebase.

**Why this priority**: Eliminates the "five slightly different buttons" problem and
enforces the principle that base UI elements are not reimplemented per feature.

**Independent Test**: Search the codebase for button-like elements outside
`src/components/ui/`. There must be none. Use each variant of Button, Modal, Input,
Select, Tooltip, and IconButton in at least one feature and confirm they render
correctly.

**Acceptance Scenarios**:

1. **Given** the migrated codebase, **When** searching for `<button` (lowercase HTML
   element) outside `src/components/ui/`, **Then** no results are found.
2. **Given** the Modal component, **When** a user presses Escape or clicks the
   overlay, **Then** the modal closes.
3. **Given** an Input with an `error` prop, **When** rendered, **Then** the error
   message is displayed below the input field.

---

### User Story 5 - Feature-Based Code Organization (Priority: P3)

A developer working on the canvas rendering feature opens `src/features/canvas/` and
finds all components, hooks, and local state for that concern. They make their change
without touching files in `src/features/fields/` or any other feature folder. The
change compiles and the app works correctly.

**Why this priority**: Code organization improves long-term developer experience but
does not affect end-user functionality. It is the final deliverable of the migration.

**Independent Test**: For each feature folder (`canvas`, `toolbar`, `fields`,
`templates`, `pdf`), verify it contains its own `components/`, `hooks/`, and
`index.ts`. Verify that no feature directly imports from another feature's internal
files.

**Acceptance Scenarios**:

1. **Given** the migrated source tree, **When** inspecting `src/features/`, **Then**
   exactly the following folders exist: `canvas/`, `toolbar/`, `fields/`,
   `templates/`, `pdf/`.
2. **Given** any file inside `src/features/canvas/`, **When** inspecting its imports,
   **Then** no import path resolves to a file inside another feature folder.
3. **Given** each feature folder, **When** checking for `index.ts`, **Then** every
   feature exposes its public API through a barrel file.

---

### Edge Cases

- What happens when a user uploads a PDF during a slow network and the API Route
  times out? The UI must show an error message; the app must remain usable.
- What happens when the PDF file uploaded exceeds the platform's maximum request size?
  The user must receive a clear error explaining the file size limit.
- What happens if `tokens.css` is missing or fails to load? Components must remain
  functional (layout and behavior preserved) even if unstyled.
- What happens during the migration if a component does not yet have a `.module.css`
  file? The build must fail visibly rather than silently applying no styles.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The project MUST build and deploy as a single Next.js application on
  Vercel without additional configuration files or separate deployment steps.
- **FR-002**: The endpoint `POST /api/generate-pdf` MUST accept the identical request
  contract as the previous Express endpoint (multipart/form-data with a PDF file and
  a JSON array of `FormField` objects) and return a PDF blob.
- **FR-003**: All features present in the pre-migration application (page navigation,
  field placement, resize, duplicate, templates, toolbar modes, multi-select, default
  values, PDF export) MUST function identically after migration.
- **FR-004**: No color, font family, font size, shadow, border radius, or z-index value
  MAY be hardcoded in any component file; all MUST reference a CSS custom property
  defined in `src/styles/tokens.css`.
- **FR-005**: The components `Button`, `Modal`, `Input`, `Select`, `Tooltip`, and
  `IconButton` MUST exist exclusively in `src/components/ui/`. No feature folder may
  reimplement these primitives.
- **FR-006**: Each component MUST have a co-located `.module.css` file in the same
  folder as the component file.
- **FR-007**: Application source code MUST be organized under `src/features/` with
  one folder per domain: `canvas/`, `toolbar/`, `fields/`, `templates/`, `pdf/`.
- **FR-008**: Each feature folder MUST expose its public API through an `index.ts`
  barrel file.
- **FR-009**: Features MUST NOT import directly from another feature's internal files;
  cross-feature communication MUST go through the global store or shared hooks.
- **FR-010**: No component file MAY exceed 150 lines.
- **FR-011**: The `/server` folder and any Express process MUST NOT exist in the
  final project.
- **FR-012**: Business logic MUST reside in custom hooks (`use*.ts`), not in
  component render functions.

### Key Entities

- **FormField**: The existing shared data type representing a PDF form field (position,
  size, font, label, default value, page). It crosses the client/API boundary unchanged.
- **Design Token**: A CSS custom property defined in `tokens.css` representing a named
  visual constant (color, spacing, shadow, etc.) used by all components.
- **Feature Module**: A self-contained folder under `src/features/` with its own
  components, hooks, local state, and barrel export.
- **Base UI Component**: A reusable primitive in `src/components/ui/` with defined
  props, variants, and a co-located CSS module.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The application deploys to Vercel from a single project root with one
  command and no additional configuration — verifiable by a successful Vercel deployment
  log with zero manual steps.
- **SC-002**: Zero functional regressions — every action in the pre-migration manual
  test checklist passes on the migrated application.
- **SC-003**: Zero hardcoded visual values — a codebase search for color hex codes,
  `rgb()`, and common font names outside `tokens.css` returns no results.
- **SC-004**: Zero duplicated base components — a codebase search for `<button`,
  `<input`, and `<select` outside `src/components/ui/` returns no results.
- **SC-005**: Every feature folder contains an `index.ts` and no cross-feature direct
  imports exist — verifiable via static import analysis.
- **SC-006**: `npm run build` passes without errors or warnings related to the
  migration on the final commit.
- **SC-007**: No component file in the migrated codebase exceeds 150 lines —
  verifiable by automated line-count check.

## Post-Implementation UX Decisions *(added 2026-03-28)*

These decisions were made during implementation review and are binding for this feature and all future features.

### UX-001 — App Shell Layout (two-panel)

**Decision**: The editor layout is a horizontal flex row with three regions:
1. **Left sidebar** (220 px, `styles.sidebar`) — contains `FieldList` only.
2. **Center** (`styles['viewer-area']`, `flex: 1`) — PDF canvas + `PageNavigator`. `ThumbnailStrip` renders between the left sidebar and the center when `totalPages > 1`.
3. **Right sidebar** (240 px, `styles['properties-panel']`) — contains `PropertiesPanel` only.

**Rationale**: Separating field list from properties panel reduces visual crowding and matches conventional form-editor UX (e.g., Figma, Adobe Acrobat).

**Constraint**: Merging left and right sidebars into one panel is PROHIBITED. This layout is enforced in [App.module.css](../../src/App.module.css) and documented in constitution §XVIII.

### UX-002 — Mode-Aware Cursor Feedback

**Decision**: The field overlay div carries a `data-mode` attribute reflecting the current `InteractionMode`. Cursor styles are driven entirely by CSS attribute selectors — no JavaScript conditionals:

```css
.field-overlay[data-mode='select'] { cursor: default; }
.field-overlay[data-mode='insert'] { cursor: crosshair; }
.field-overlay[data-mode='move']   { cursor: grab; }
.field-overlay[data-mode='pan']    { cursor: grab; }
```

**Rationale**: Keeps styling in CSS, avoids computed inline `style` props, and makes cursor behavior auditable without reading component logic.

**Constraint**: The `.field-overlay` base class MUST NOT set a mode-specific cursor; all cursor overrides go through `[data-mode]` selectors. Documented in constitution §XIX.

### UX-003 — ThumbnailStrip Visual Treatment

**Decision**: The thumbnail strip renders as a dark sidebar (88 px wide, `var(--color-dark-900)` background) positioned between the left sidebar and the canvas. Thumbnails use:
- `<img>` with `width: 70px; height: auto; object-fit: contain;`
- A 2 px transparent border that turns `var(--color-primary)` on the active page
- A placeholder div (`70 × 90 px`, neutral-700) while the thumbnail image loads

**Rationale**: Fixed `img` sizing prevents PDF pages from rendering at natural resolution and overflowing the strip panel.

### UX-005 — Canvas Zoom Controls

**Decision**: Zoom is a discrete-step multiplier (`[0.5, 0.75, 1, 1.25, 1.5, 2]`) stored as
`zoom` state in `App.tsx`. Effective render scale = `1.5 * zoom`. Controls (−, %, +) render
in `.header-toolbar-center` alongside `ToolbarModes`. Buttons are disabled at the min/max step.

**Constraint**: Zoom state lives only in App.tsx (view concern). Field coordinates in PDF
points are zoom-independent. Documented in constitution §XX.

### UX-006 — ThumbnailStrip Redesign

**Decision**: Strip is the leftmost flex child of `.editor-layout` (before `FieldList`).
Background is `var(--color-white)`, width 110 px, thumbnail images 90 px. A "Ver páginas /
Ocultar páginas" toggle button appears in the header when `totalPages > 1`. The strip is
hidden by default when the user clicks it; state is `thumbnailsVisible` in `App.tsx`.

**Constraint**: Dark background on ThumbnailStrip is PROHIBITED. Strip must remain leftmost.
Documented in constitution §XXI.

### UX-007 — Field Delete Button on Unselected Hover Only

**Decision**: The ✕ delete button on `DraggableField` is visible only on hover when the field
is not selected (`draggable-field:not(.selected):hover`). When selected, deletion is done via
the PropertiesPanel or Delete/Backspace keyboard shortcut.

**Constraint**: `.selected .field-delete-btn { display: flex }` is PROHIBITED. Documented in
constitution §XXII.

### UX-004 — No Next.js Dev Indicator

**Decision**: `next.config.ts` sets `devIndicators: false` to suppress the floating "N" badge in development mode.

**Rationale**: The badge overlaps the FAB button and confuses non-developer users testing the app locally.

## Bug Fixes Applied

- **BF-007-01 — Cross-page paste**: Copied fields retained their source `page` value when
  pasted. Fix: both paste paths in `App.tsx` now set `page: pdfRenderer.currentPage` on the
  pasted field objects.

## Assumptions

- The existing `FormField` type in `shared/types.ts` is migrated to `src/types/shared.ts`
  with no changes to its shape — the API contract is preserved exactly.
- The migration does not introduce any new user-facing features; scope is limited to
  structural reorganization and infrastructure change.
- The Vercel deployment uses the default Next.js build output; no custom Vercel
  configuration (`vercel.json`) is required.
- File upload in the API Route uses Next.js built-in request body parsing or the
  Web API `FormData`; `multer` (Express middleware) is removed.
- The existing `pdfjs-dist` canvas rendering code moves into client components with
  no changes to rendering logic.
- All existing localStorage-based template persistence remains unchanged (no migration
  of saved data required).
- The migration is a single feature branch delivered as one pull request; there is no
  phased rollout or feature flag.
- CSS Modules are used for all component styles; global CSS is limited to `tokens.css`
  and `reset.css` in `src/styles/`.
