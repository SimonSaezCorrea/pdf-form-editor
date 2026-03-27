<!--
SYNC IMPACT REPORT
==================
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

**Rationale**: Compatibility with Adobe Acrobat, Preview, and all AcroForm-aware
readers is the primary output requirement. Standard fonts guarantee zero-dependency
embedding.

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

**Version**: 2.0.0 | **Ratified**: 2026-03-26 | **Last Amended**: 2026-03-27
