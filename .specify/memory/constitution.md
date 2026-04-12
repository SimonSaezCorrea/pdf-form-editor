<!--
SYNC IMPACT REPORT
==================
Version change: 2.2.0 → 2.3.0  [MINOR, 2026-04-12]

Rationale for MINOR bump:
  - Principle XXVIII added: PDF Font Embedding — new governance constraint.
  - Principle IV amended: removed "No custom font embedding" restriction; delegated
    custom font rules to new Principle XXVIII.
  - Principle XX amended: zoom changed from discrete step array to continuous range
    (25%–300%, ZOOM_STEP = 0.1).
  - Principle XXV amended: zoom step reference updated to match new Principle XX.

Added principles:
  - XXVIII. PDF Font Embedding

Modified principles:
  - IV   (AcroForm Standard Output) — removed hard ban on custom embedding; deferred to XXVIII
  - XX   (Canvas Zoom) — discrete steps replaced with continuous MIN/MAX/STEP constants
  - XXV  (Canvas Zoom via Ctrl+Scroll) — zoom step reference updated

Removed principles: none

Templates requiring updates:
  ✅ .specify/memory/constitution.md        — this file
  ✅ .specify/templates/plan-template.md    — Constitution Check is generic; no edits needed
  ✅ .specify/templates/spec-template.md    — no principle-specific references; no edits needed

Follow-up TODOs:
  - Principle XXVIII requires 20 TTF assets in public/fonts/ before T024 can be executed.
    See specs/009-precision-ux-fixes/tasks.md T023 for the manual download step.
  - CLAUDE.md "Key Notes (009)" should be updated after T024-T028 are completed.

---

Version change: 2.1.2 → 2.2.0  [MINOR, 2026-04-11]

Rationale for MINOR bump:
  - Four new principles added (XXIV–XXVII); no existing principle removed or redefined.

Added principles:
  - XXIV.  Coordinate Decimal Precision
  - XXV.   Canvas Zoom via Ctrl+Scroll
  - XXVI.  Scroll-Based Page Navigation
  - XXVII. Google Fonts as Typography Source

Modified principles: none
Removed principles: none

Templates requiring updates:
  ✅ .specify/memory/constitution.md        — this file
  ✅ .specify/templates/plan-template.md    — Constitution Check is generic; no edits needed
  ✅ .specify/templates/spec-template.md    — no principle-specific references; no edits needed
  ✅ .specify/templates/tasks-template.md   — no principle-specific references; no edits needed

Follow-up TODOs:
  - Principles XXV and XXVI require canvas zoom and scroll-navigation implementations.
    Features that touch usePdfRenderer or the scroll container MUST comply.
  - Principle XXVII requires a fonts configuration module; hardcoded font lists in
    existing components MUST be migrated when the Google Fonts feature is implemented.

---

Version change: 2.1.1 → 2.1.2  [PATCH, 2026-03-29]

Rationale: Dark mode palette revised — reduced saturation on panel/input layers and
differentiated navbar. Layer hierarchy table added to Principle XII.

---

Version change: 2.1.0 → 2.1.1  [PATCH, 2026-03-29]

Rationale: Principle XII expanded with the official Teal/Aqua colour palette table.
No structural principle changes.

Modified principles: XII (Design Tokens) — palette table added.
Added principles: none. Removed principles: none.

---

Version change: 2.0.2 → 2.1.0  [MINOR, 2026-03-28]

Rationale for MINOR bump:
  - Principle XXIII added: Mandatory Dark Mode — new governance constraint covering
    theme implementation strategy; no existing principle removed or redefined.

Added principles:
  - XXIII. Mandatory Dark Mode

Modified principles: none

Removed principles: none

Templates requiring updates:
  ✅ .specify/memory/constitution.md  — this file
  ⚠  .specify/templates/plan-template.md — no dark-mode task category yet; add
     "Theme/Accessibility" task type when next plan is generated.
  ⚠  src/styles/tokens.css — MUST be extended with dark-mode variants for every
     color token under @media (prefers-color-scheme: dark) and [data-theme="dark"].
     This is an implementation TODO, not a constitution TODO.

Follow-up TODOs:
  - tokens.css does not yet define dark-mode color variants. First feature that
    adds a themed component MUST also introduce the dark-mode token block.

---

Prior history preserved below for traceability.

Version change: 1.0.3 → 2.0.0  [MAJOR, 2026-03-27]

Rationale for MAJOR bump:
  - Principle I redefined: "client/ vs server/ monorepo" → "client components vs
    Next.js API Routes". Backward-incompatible structural change.
  - Principle II amended: npm workspace import path updated for single-project layout.
  - Principle VII amended: HTTP boundary test runner updated (Express + supertest →
    Next.js API route testing via Vitest + fetch).
  - Technology Stack section rewritten: Express/Vite/monorepo → Next.js/Vercel.
  - Project Structure section rewritten to match Next.js src/ layout.
  - 9 new principles added (IX–XVII).

Prior PATCH history preserved in this header for traceability.

1.0.1 changes:
  - Principle VII amended: event-blocking code in interactive components MUST stop
    both `onPointerDown` and `onMouseDown` (BF-003-01).

1.0.2 changes:
  - Principle VII amended: context menu action handlers MUST call e.stopPropagation()
    (BF-003-02 — position:fixed does not change DOM parentage).

1.0.3 changes:
  - Principle IV amended: `textField.setText(value)` MUST be called before
    `textField.updateAppearances(font)`.
  - Principle II clarified: `value?: string` on FormField is optional; isValidField
    MUST accept undefined.

2.0.2 changes:
  - Principle XX added: Canvas Zoom — zoom state lives in App.tsx; renderScale = BASE_SCALE * zoom
  - Principle XXI added: ThumbnailStrip is leftmost panel, white background, collapsible
  - Principle XXII added: Field delete button hidden when field is selected (hover only on unselected)
  - Copy/paste bug fixed: pasted fields now carry page: currentPage instead of source page

2.0.1 changes:
  - Principle XVIII added: App Shell Layout (two-panel: left=FieldList, right=PropertiesPanel)
  - Principle XIX added: Mode-Aware Cursor Feedback (cursor reflects active interaction mode)
  - next.config.ts devIndicators: false — hides Next.js development overlay badge
  - ThumbnailStrip: img elements require explicit width + object-fit:contain

2.0.0 changes:
  Modified principles:
    - Principle I  → amended: server/ + Express replaced by src/app/api/ (API Routes)
    - Principle II → amended: workspace package path updated for single-project layout
    - Principle VII → amended: HTTP boundary tests now use Vitest + fetch against
      Next.js API routes (no Express / supertest)

  Added principles:
    - IX.   Next.js Fullstack
    - X.    API Routes as Backend
    - XI.   CSS per Component
    - XII.  Design Tokens
    - XIII. Reusable Base Components
    - XIV.  Feature Architecture
    - XV.   Hooks for Logic
    - XVI.  Barrel Exports
    - XVII. No Independent Server

  Removed sections: none (per amendment policy)

  Templates updated:
    ✅ .specify/memory/constitution.md  — this file
    ⚠  .specify/templates/plan-template.md — path conventions reference
       client/server monorepo; update Option 2 paths to Next.js layout when next
       plan is generated for this project.
    ⚠  .specify/templates/tasks-template.md — path conventions list client/server;
       update "Web app" option paths to src/app/api / src/features when next
       tasks file is generated.

  Follow-up TODOs: none — all fields resolved.
-->

# PDF Form Editor Constitution

## Core Principles

### I. Client/Server Separation

PDF **rendering** (pdfjs-dist, canvas) MUST live exclusively in **client components**
under `src/` (files without server-only imports).
PDF **writing** (pdf-lib, AcroForm embedding) MUST live exclusively in **API Routes**
under `src/app/api/`.
No PDF-writing code may exist in client components; no PDF-rendering code may exist in
API Routes.
The single crossing point is the HTTP boundary: `POST /api/generate-pdf` receives the
raw PDF bytes + a JSON array of `FormField` objects and returns the modified PDF bytes.

**Rationale**: Keeps each side's dependency graph clean, prevents bundle bloat on the
client (pdf-lib is ~800 KB), and makes the API route independently testable without a
browser. In Next.js this boundary is enforced by the React Server/Client split and
Vercel's function boundary.

### II. Shared-Types Contract

`src/types/shared.ts` is the **sole source of truth** for data structures that cross
the client/API-route boundary. Both client components and API routes import from this
file. No ad-hoc inline types or duplicated interfaces may be used in place of shared
types. Adding a field to `FormField` requires a single edit in `src/types/shared.ts`.

**Rationale**: Prevents silent schema drift between client components and API routes.
The shared types file MUST have no runtime dependencies — it is types only.

### III. Session-Only State (No Database)

Field state lives exclusively in React hooks (`useFieldStore`) during the browser
session. There is no database, no localStorage persistence beyond template saves, no
backend session storage. When the user closes the tab or loads a new PDF, all field
state resets. This is by design.

**Rationale**: The tool is a local/internal utility. Persistence adds infrastructure
complexity (auth, migration, data model versioning) with no user need. State in hooks
is sufficient and simpler to reason about.

### IV. AcroForm Standard Output

All exported PDFs MUST embed fields as **standard AcroForm text fields** using
pdf-lib's `form.createTextField()` API with `textField.updateAppearances(embeddedFont)`
called per field. Omitting `updateAppearances` is a known defect (fields invisible in
most PDF readers) and MUST NOT be introduced. Supported fonts are limited to PDF
standard fonts: Helvetica, TimesRoman, Courier. No custom font embedding.

When a field carries a default value, `textField.setText(value)` MUST be called
**before** `textField.updateAppearances(font)`. Reversing this order silently drops
the text from the rendered appearance stream — the field is saved but appears blank
in PDF readers.

Custom TTF fonts may be embedded when a field has `displayFont` set. See Principle XXVIII
for the complete embedding rules. The restriction "No custom font embedding" is superseded
by Principle XXVIII (added in v2.3.0).

**Rationale**: Compatibility with Adobe Acrobat, Preview, and all AcroForm-aware
readers is the primary output requirement. Standard fonts guarantee zero-dependency
embedding for fields without a custom font. Embedded TTF fonts extend that guarantee
to fields where the user has explicitly chosen a Google Font.

### V. TypeScript Strict Mode — No Unqualified `any`

The project compiles with `"strict": true` in tsconfig.json. `any` MUST NOT appear in
production code without an explicit inline comment explaining why the type system
cannot express the constraint (e.g., `// unknown shape from JSON.parse`). `unknown`
with a type guard is preferred over `any` whenever the shape can be validated.

**Rationale**: Strict mode catches null-dereference and type-mismatch bugs at compile
time. The API route's `isValidField` type guard is the canonical example of the
preferred pattern.

### VI. YAGNI — No Premature Abstraction

No helper, utility, base class, or abstraction may be introduced unless there are
**3 or more concrete, existing call sites** in the codebase that would use it.
The rule applies equally to:
- New utility functions (prefer inline code until the 3rd duplication)
- New React contexts or providers
- New API route middleware
- New configuration infrastructure

Error handling is validated only at **system boundaries** (HTTP request parsing, user
file input). Internal functions may trust their callers and MUST NOT add defensive
guards for states that the type system already prevents.

**Rationale**: Every abstraction is a future maintenance obligation. The codebase is
small and single-purpose; premature generalization adds complexity with no return.

### VII. Test Discipline

**Pure functions** (coordinate math, field-name utilities, `intersectsRect`) MUST have
Vitest unit tests.
**API Route boundaries** MUST have integration tests using Vitest + native `fetch`
(or `undici`) against the Next.js dev server or a locally instantiated route handler.
No Express / supertest dependency.
**React components** with non-trivial interaction logic (context menus, drag handles,
rubber band) MUST have @testing-library/react tests.
Mocking internal modules (e.g., the coordinate utils, the field store) is PROHIBITED
in tests for the same layer. Only external boundaries (pdfjs canvas rendering, file
system) may be mocked.
Tests MUST NOT use `any` to bypass type checking.

**Event-blocking in interactive components**: Any component that must block event
propagation to prevent a parent library (e.g., `@dnd-kit`) from activating MUST stop
**both** the `onPointerDown` and `onMouseDown` events. Stopping only `onMouseDown` is
insufficient — `@dnd-kit`'s `PointerSensor` listens for native `pointerdown`, which is
a separate event chain from `mousedown` and is not stopped by React's synthetic mouse
event propagation.

**`position: fixed` does not change DOM parentage**: A context menu rendered with
`position: fixed` is visually detached from its parent but remains a DOM child. Click
events on its children still bubble up through the full DOM tree to ancestor handlers
(e.g., a canvas overlay `onClick`). Every action handler inside a `position: fixed`
overlay MUST call `e.stopPropagation()` to prevent ancestor click handlers from
interpreting the action as a canvas interaction.

**Rationale**: Mock-heavy tests gave false confidence in prior projects (bugs masked by
mocks passing while real integrations failed). The pointer/mouse event distinction was
discovered via BF-003-01. The fixed-position DOM parentage issue was discovered via
BF-003-02.

### VIII. No Authentication

This tool has no authentication, authorization, or user identity concept.
No login screen, no JWT, no session middleware, no role system may be added.
The tool is intended for local or trusted-network use only.

**Rationale**: Authentication infrastructure (tokens, refresh, RBAC) is a significant
complexity multiplier. The use-case is a local/internal utility, not a multi-tenant
service.

### IX. Next.js Fullstack

The project uses **Next.js** (App Router) as the single fullstack framework, replacing
the previous React + Vite + Express monorepo. The deployment target is **Vercel**. No
separate build pipeline for client and server is needed; `next build` produces both
the client bundle and the serverless API functions. No Vite config, no Express server,
no `concurrently` startup scripts.

**Rationale**: Eliminates the operational overhead of running two separate processes
in development, two separate build pipelines in CI, and two separate deployment units
in production. Vercel's zero-config Next.js support makes deployment trivial.

### X. API Routes as Backend

All server-side logic MUST live in `src/app/api/` as Next.js Route Handlers. The
canonical endpoint is `src/app/api/generate-pdf/route.ts`. Future endpoints are added
under `src/app/api/`. **pdf-lib MUST only be imported inside API routes.** Importing
pdf-lib in any client component is PROHIBITED — it would be included in the client
bundle and negate the bundle-size benefit of the separation.

**Rationale**: API Routes run in Vercel's serverless environment, giving the same
isolation the previous Express server provided, with zero extra infrastructure.
Enforcing the import constraint at the file-system level (api/ folder) makes
violations immediately visible.

### XI. CSS per Component

Every component MUST have its own CSS Module file (`.module.css`) in the same folder
as the component. Inline styles (`style={{ }}`) are PROHIBITED except for dynamic
values that cannot be expressed as CSS variables (e.g., computed pixel positions for
canvas overlays). Global CSS files other than `src/styles/tokens.css` and
`src/styles/reset.css` are PROHIBITED.

**Rationale**: Co-located CSS modules eliminate class name collisions, make dead code
obvious when a component is deleted, and keep styles reviewable alongside the component
logic in the same pull request.

### XII. Design Tokens

A single file `src/styles/tokens.css` defines **all** CSS custom properties for the
project: colors, typography scale, shadows, border radii, spacing scale, and z-index
layers. No component may hardcode a color hex, a pixel size that belongs to the
spacing scale, or a z-index integer — all MUST reference a token from `tokens.css`.

**Official colour palette** (adopted 2026-03-29 — Teal/Aqua design system):

| Role | Light | Dark |
|------|-------|------|
| Background (`--color-surface`) | `#F4F7F8` | `#091214` |
| Surface/Cards (`--color-panel-bg`) | `#C4DFE6` | `#0d2028` |
| Input bg (`--color-input-bg`) | `#ffffff` | `#132c38` |
| Body text (`--color-text`) | `#151E20` | `#E8EDEF` |
| Secondary text (`--color-text-muted`) | `#003B46` | `#7ab5bd` |
| Primary (`--color-primary`) | `#07575B` | `#66A5AD` |
| Accent (`--color-accent`) | `#E76F51` | `#F4A261` |
| Navbar bg (`--color-navbar-bg`) | `#07575B` | `#051519` |

**Dark mode layer hierarchy**: navbar (`#051519`) → surface (`#091214`) → panel (`#0d2028`) →
input (`#132c38`). Each elevation is distinct and readable.

All foreground/background pairs MUST meet WCAG AA (4.5:1 contrast ratio) for normal text.
The danger palette (`--color-danger`, `--color-danger-bg`, `--color-danger-border`) is
unchanged from its accessibility-compliant red values.

**Rationale**: A single source of truth for visual constants enables global theming
changes in one file and prevents the gradual accumulation of one-off magic values
scattered across dozens of CSS modules.

### XIII. Reusable Base Components

The folder `src/components/ui/` contains the project's base UI primitives: `Button`,
`Modal`, `Input`, `Select`, `Tooltip`, `IconButton`. No feature folder may
re-implement a component that already exists in `ui/`. New primitives needed by two or
more features are added to `ui/`, not duplicated inside feature folders.

**Rationale**: Eliminates the "five slightly different modals" problem that accumulates
in feature-first codebases. A shared primitive library forces design consistency and
reduces the total amount of component code to maintain.

### XIV. Feature Architecture

Application code is organized by domain feature under `src/features/`. The canonical
top-level features are: `canvas/`, `toolbar/`, `fields/`, `templates/`, `pdf/`. Each
feature folder is self-contained: it owns its components, feature-specific hooks,
local state slices, and CSS modules. Cross-feature imports are permitted; cross-feature
circular imports are PROHIBITED.

**Rationale**: Feature-based structure keeps related code co-located and makes it
straightforward to identify the blast radius of a change — everything for a feature
is in one folder.

### XV. Hooks for Logic

Business logic and state derivations MUST live in custom hooks (`use*.ts`), not inside
component render functions. Components are responsible for layout and event wiring
only. A component that contains non-trivial conditional logic, data transformation, or
side effects that are not purely UI concerns MUST extract that logic into a hook.

**Rationale**: Hooks are unit-testable in isolation (via `renderHook`); component
render functions are not. Keeping components thin also makes them easier to refactor
without breaking business logic.

### XVI. Barrel Exports

Every folder that contains more than one exported module MUST expose its public API
via an `index.ts` barrel file. Consumers import from the folder path, not from deep
internal files. Internal implementation files that are not part of the folder's public
API MUST NOT be re-exported from the barrel.

**Rationale**: Barrel files create a stable import surface. Renaming or splitting an
internal file does not break external consumers as long as the public export name is
preserved in `index.ts`.

### XVII. No Independent Server

No `/server` folder, no Express process, no standalone HTTP server of any kind exists
in this project. All server-side compute runs as Next.js API Route Handlers. Running
the project in development requires only `next dev`. Running in production requires
only `vercel deploy` (or `next start` for self-hosting). Any proposal to add a
standalone server process MUST be rejected.

**Rationale**: A second server process reintroduces the two-process coordination
problem that the migration to Next.js was designed to eliminate. Vercel's platform
is fully compatible with API Routes as-is.

### XVIII. App Shell Layout

The app shell uses a **three-column editor layout** when a PDF is loaded:
`[FieldList sidebar] [ThumbnailStrip?] [PDF viewer] [PropertiesPanel sidebar]`.

- **Left sidebar** (`src/App.module.css` `.sidebar`): field list only — navigation of all
  fields across pages.
- **Center**: scrollable PDF canvas with DnD field overlay.
- **ThumbnailStrip**: optional dark column between left sidebar and center, visible only
  for multi-page PDFs.
- **Right sidebar** (`.properties-panel`): field properties only — shown when one or more
  fields are selected. Never mixed into the left sidebar.

This separation is intentional: the left panel is an index (always visible), the right
panel is a context-sensitive editor (visible when relevant). Merging them into a single
panel is PROHIBITED.

**Rationale**: Two-panel separation keeps the field index always accessible while
editing properties, matching common PDF editor conventions (similar to Figma/InDesign).

### XIX. Mode-Aware Cursor Feedback

The field overlay div MUST expose the current interaction mode as `data-mode={mode}`
and `PdfViewer.module.css` MUST define cursor rules per mode:
- `select` → `cursor: default`
- `insert` → `cursor: crosshair`
- `move`   → `cursor: grab`
- `pan`    → `cursor: grab`

No hardcoded `cursor:` value is permitted on `.field-overlay` — the cursor MUST always
derive from the active mode token. This pattern uses the `data-mode` attribute selector
(e.g., `[data-mode='insert'] { cursor: crosshair; }`) to keep cursor logic in CSS only,
with no JavaScript conditional required.

**Rationale**: Visual cursor feedback is the primary affordance that tells the user which
interaction mode is active. Hardcoding a single cursor ignores mode state and misleads
the user about what a click will do.

### XX. Canvas Zoom

Zoom is a multiplier stored as `zoom: number` state in `App.tsx`. The effective render
scale passed to `usePdfRenderer` is always `BASE_SCALE * zoom` (where `BASE_SCALE = 1.5`).
Zoom is **continuous** in the range `MIN_ZOOM = 0.25` to `MAX_ZOOM = 3.0` with step
`ZOOM_STEP = 0.1` (10 % per click or Ctrl+Scroll tick). Zoom is clamped with
`Math.round((z ± ZOOM_STEP) * 100) / 100` to avoid floating-point drift.
Zoom controls (−, %, +) render inside `.header-toolbar-center` alongside `ToolbarModes`.

The zoom multiplier MUST NOT be stored inside `usePdfRenderer` or `useFieldStore` — it is
view-only state owned by the App shell. Field coordinates in PDF points are zoom-independent;
`renderScale` is the only value that changes.

**Rationale**: Zoom is a display concern, not a data concern. Separating it keeps field
coordinate math unaffected by zoom changes.

### XXI. ThumbnailStrip Position and Appearance

The `ThumbnailStrip` MUST be the leftmost element in the `editor-layout` flex row — to the
left of the `FieldList` sidebar. Its background is `var(--color-white)` (not dark). Width is
110 px; thumbnail images are 90 px wide with `object-fit: contain`.

Visibility is controlled by a `thumbnailsVisible` boolean in `App.tsx`, toggled by a
"Ver páginas / Ocultar páginas" button in the header that appears only when `totalPages > 1`.
The computed flag `hasThumbnails = !!pdfDoc && totalPages > 1` guards both the toggle button
and the strip render.

**Rationale**: A dark thumbnail strip conflicts with the white panel aesthetic established
by the FieldList and PropertiesPanel. Leftmost position mirrors conventional page-panel
placement (e.g., PDF viewers, Figma).

### XXII. Field Delete Button Visibility

The delete (✕) button on a `DraggableField` MUST only appear on hover when the field is
**not** selected. The CSS rule is:

```css
.draggable-field:not(.selected):hover .field-delete-btn { display: flex; }
```

The rule `.selected .field-delete-btn { display: flex; }` is PROHIBITED. When a field is
selected, the PropertiesPanel delete action and the Delete/Backspace keyboard shortcut are
the canonical deletion paths. The hover button would clutter the selection state UI
(resize handles, red border) and invite accidental deletion.

**Rationale**: Showing the delete button on selected fields creates visual noise during the
common workflow of selecting → editing properties → confirming. Restricting it to hover-only
on unselected fields keeps it discoverable without being intrusive.

### XXIII. Mandatory Dark Mode

All components and features MUST support dark mode from the point of implementation.
Retrofitting light-mode-only components is PROHIBITED — dark support is a precondition
for merging any new UI code, not a follow-up task.

Dark mode is implemented **exclusively** through CSS custom properties in
`src/styles/tokens.css` using two complementary mechanisms:

1. `@media (prefers-color-scheme: dark)` — automatic, OS-level detection with no
   JavaScript required.
2. `[data-theme="dark"]` on the root `<html>` element — manual toggle override that
   takes precedence over the media query when present.

**Token rules**:
- Every color token in `tokens.css` MUST declare both a light and a dark value.
  A token defined only for one mode is a constitution violation.
- Hardcoding a color (hex, `rgb()`, named) in any component CSS file is PROHIBITED
  regardless of mode (this is already covered by Principle XII; XXIII strengthens
  the rationale by adding the per-mode requirement).

**Component rules**:
- Components MUST NOT detect the active theme directly. Using `window.matchMedia`,
  a React context, or any JavaScript variable to branch on the current mode is
  PROHIBITED. Components consume CSS custom properties only; the CSS layer is
  solely responsible for mode switching.
- No component may import or depend on a "theme provider" wrapping component.
  The `data-theme` attribute is set on the root element by a single, top-level
  toggle mechanism (e.g., a button in the app header); it is not propagated
  through React context.

**Rationale**: Dark mode implemented per-component produces inconsistent results and
requires every future component to repeat the same conditional logic. Centralising the
switch in `tokens.css` means a single selector change flips the entire UI atomically.
Mandating it from implementation start (not as a retrofit) prevents the accumulation
of hardcoded light-only colors that are expensive to change later.

### XXIV. Coordinate Decimal Precision

All position and size properties of form fields (`x`, `y`, `width`, `height`) MUST be
stored and displayed as floating-point numbers with up to 2 decimal places.
No component or utility may round coordinates to integers without an explicit,
documented justification. The canonical rounding helper, if needed, is
`Math.round(value * 100) / 100` — applied only at display boundaries (e.g., input
fields in PropertiesPanel), never when reading or writing to `useFieldStore`.

**Rationale**: Rounding to integers introduces cumulative drift when fields are moved
or resized repeatedly. Sub-pixel precision in PDF points maps to visible misalignment
at high DPI. Coordinates remain authoritative at full float precision throughout the
data pipeline; only the UI layer may display a rounded representation for readability.

### XXV. Canvas Zoom via Ctrl+Scroll

The canvas scroll container MUST intercept `wheel` events where `ctrlKey === true`
and call `event.preventDefault()` before the browser processes them. This prevents the
browser's native page-zoom from activating while the cursor is over the canvas.

Canvas zoom MUST be the **sole handler** of `Ctrl+Scroll` gestures. No other feature
may register a `wheel` listener with `ctrlKey` without routing through the canvas zoom
system. The zoom step per scroll tick is `±ZOOM_STEP` (clamped to `[MIN_ZOOM, MAX_ZOOM]`
as defined in Principle XX). The listener MUST be attached as a **non-passive** event
listener (`{ passive: false }`) so that `preventDefault()` is honoured by the browser.

**Rationale**: Browsers treat `Ctrl+Scroll` as a native zoom gesture. Without
`preventDefault`, the page zooms instead of (or in addition to) the canvas, creating a
disorienting double-zoom effect. Non-passive attachment is required because passive
listeners cannot call `preventDefault`.

### XXVI. Scroll-Based Page Navigation

When the user scrolls continuously within the canvas viewer:
- Reaching the **bottom limit** of the last visible page MUST advance to the next page.
- Reaching the **top limit** of the first visible page MUST retreat to the previous page.

This behaviour is owned exclusively by the `canvas` feature module
(`src/features/canvas/`). No other feature may override or suppress it. The transition
fires only after the scroll position has reached the boundary for a full scroll event
(no artificial momentum or delay). Page advance/retreat calls `setCurrentPage` from
`usePdfRenderer`; the scroll container is reset to the top (or bottom) of the new page
immediately after the page change.

**Rationale**: Continuous scroll is the natural reading gesture for multi-page
documents. Forcing the user to click a page navigator to move between pages breaks the
reading flow. Owning the behaviour in the canvas module prevents conflicting scroll
handlers from other features.

### XXVII. Google Fonts as Typography Source

All font options available for PDF form fields MUST be loaded from the **Google Fonts
API**. The font list MUST include a minimum of 20 fonts covering all five categories:
serif, sans-serif, monospace, display, and handwriting.

Font configuration is centralised in a single module (e.g.,
`src/features/pdf/config/fonts.ts`). Components MUST import font metadata from this
module — hardcoding font names, URLs, or weights anywhere outside of it is PROHIBITED.
Adding a new font requires a single edit to the fonts configuration module; no
component changes are needed.

Font loading (Google Fonts `<link>` or `@import`) is injected once at the application
root (`layout.tsx` or equivalent). Individual components MUST NOT add their own font
imports.

**Rationale**: Google Fonts provides a large, versioned, CDN-delivered catalogue with
no self-hosting overhead. Centralising the font list prevents the proliferation of
hardcoded strings across components and makes it trivial to add, remove, or update
fonts without touching UI code.

### XXVIII. PDF Font Embedding

When a `FormField` has `displayFont` set (a Google Font name from the catalog), the
exported PDF MUST embed the corresponding TTF file rather than using a standard PDF font.

**Asset location**: All TTF files are stored as static assets at `public/fonts/` with
the naming convention `{font-slug}-regular.ttf` (e.g. `montserrat-regular.ttf`).
These files are committed to the repository and served from the filesystem.
**No runtime HTTP fetch to external URLs is permitted** for font resolution.

**API Route behaviour** (`src/app/api/generate-pdf/pdfService.ts`):
- Fields with `displayFont`: read TTF bytes via `fs.readFileSync(path.join(process.cwd(), 'public', 'fonts', entry.ttfFilename))` and embed with `pdfDoc.embedFont(fontBytes)`.
- Fields without `displayFont`: continue using `StandardFonts` as before.
- If the TTF file is missing, throw a descriptive `Error` — silent fallback to Helvetica is PROHIBITED.
- Deduplication: if multiple fields share the same `displayFont`, the TTF is read and embedded **once** per PDF document.

**Font catalog (`src/features/pdf/config/fonts.ts`)**: Each `FontEntry` MUST include a
`ttfFilename: string` field mapping the font name to its asset filename. This file is the
single source of truth for both canvas preview (Google Fonts `<link>`) and PDF export (TTF path).

**Rationale**: Embedding TTF files closes the gap between what the user sees on the canvas
(Google Font via CSS) and what appears in the exported PDF. Bundling the assets at build
time removes the runtime dependency on Google Fonts CDN for PDF generation, making export
reliable and deterministic regardless of network connectivity.

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Language | TypeScript | ^5.7.2 |
| Fullstack framework | Next.js (App Router) | ^15.x |
| Drag-and-drop | @dnd-kit/core | ^6.3.1 |
| PDF rendering (client) | pdfjs-dist | ^4.9.155 |
| PDF writing (API Routes) | pdf-lib | ^1.17.1 |
| Tests | Vitest + @testing-library/react | ^2.x / ^16.x |
| Deployment | Vercel | — |

**Development**: `next dev` starts the fullstack dev server on **3000** (default).
No separate frontend/backend ports or proxy configuration required.

Dependency changes require a note in CLAUDE.md under "Active Technologies" for the
relevant feature branch.

---

## Project Structure & Conventions

### Source layout

```text
src/
├── app/
│   ├── api/
│   │   └── generate-pdf/
│   │       └── route.ts          # PDF generation API Route (pdf-lib lives here)
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── ui/                       # Reusable base primitives (Principle XIII)
│       ├── Button/
│       ├── Modal/
│       ├── Input/
│       ├── Select/
│       ├── Tooltip/
│       └── IconButton/
├── features/                     # One folder per domain (Principle XIV)
│   ├── canvas/
│   ├── toolbar/
│   ├── fields/
│   ├── templates/
│   └── pdf/
├── hooks/                        # Global hooks used across features
├── store/                        # Global state (non-feature-specific)
├── styles/
│   ├── tokens.css                # All CSS custom properties (Principle XII)
│   └── reset.css
└── types/
    └── shared.ts                 # FormField and other cross-boundary types (Principle II)

tests/
└── unit/                         # Vitest tests mirroring src/ structure
```

### Naming conventions

- **Components**: PascalCase, folder + file share the name (`FieldList/FieldList.tsx`).
- **Hooks**: camelCase with `use` prefix (`useFieldStore`, `usePdfRenderer`).
- **Utilities**: camelCase functions, noun-verb or noun file names
  (`coordinates.ts`, `fieldName.ts`).
- **Types/Interfaces**: PascalCase, no `I` prefix (`FormField`, `PdfRenderer`).
- **CSS**: CSS Modules (`.module.css`) per component; class names camelCase inside
  the module (`.draggableField`, `.fieldLabel`).
- **Test files**: Mirror source path, suffix `.test.ts` / `.test.tsx`
  (`src/features/fields/fieldName.ts` → `tests/unit/fields/fieldName.test.ts`).

### Coordinate system

PDF coordinates use bottom-left origin (Y increases upward).
Canvas coordinates use top-left origin (Y increases downward).
All conversions MUST go through `src/features/canvas/utils/coordinates.ts`
(`canvasToPdf` / `pdfToCanvas`). No inline coordinate math is permitted outside
that file.

---

## Governance

This constitution supersedes all prior conventions and informal agreements.
Any proposed change to a Core Principle requires:

1. A written rationale explaining why the current principle is insufficient.
2. An assessment of which existing specs/plans/code would be affected.
3. A MINOR or MAJOR version bump (see versioning policy below).
4. An update to CLAUDE.md "Key Notes" for the active feature branch if the change
   affects in-flight work.

**Versioning policy**:
- MAJOR — backward-incompatible removal or redefinition of an existing principle.
- MINOR — new principle added, new section added, or material expansion of existing
  guidance.
- PATCH — clarification, wording fix, typo, non-semantic refinement.

**Compliance review**: Every `/speckit.plan` execution MUST include a "Constitution
Check" section that gates Phase 0 research. Re-check is required after Phase 1 design
artifacts are produced. Any violation MUST be either resolved or explicitly justified
in the plan's "Complexity Tracking" table.

**Version**: 2.3.0 | **Ratified**: 2026-03-26 | **Last Amended**: 2026-04-12
