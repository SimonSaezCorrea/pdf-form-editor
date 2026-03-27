<!--
SYNC IMPACT REPORT
==================
Version change: (template) → 1.0.0  [initial fill, 2026-03-26]
Version change: 1.0.0 → 1.0.1  [PATCH, 2026-03-27]

1.0.1 changes:
  - Principle VII amended: added rule that event-blocking code in interactive
    components MUST stop both `onPointerDown` and `onMouseDown`; motivated by
    BF-003-01 (resize handles also triggered @dnd-kit move drag because
    stopPropagation on mousedown alone does not stop the native pointerdown
    that @dnd-kit's PointerSensor consumes).
  Bump rationale: clarification of an existing interaction rule → PATCH.
  Templates reviewed: no template changes required.
  Files also updated: CLAUDE.md Key Notes (003), specs/003-field-duplicate-resize/research.md §3.

Version change: 1.0.1 → 1.0.2  [PATCH, 2026-03-27]
1.0.2 changes:
  - Principle VII amended: added rule that context menu action handlers MUST
    call e.stopPropagation(); motivated by BF-003-02 (clicking "Duplicar campo"
    also created a new field because the click bubbled to field-overlay's
    handleOverlayClick — position:fixed is visual only, DOM parentage is unchanged).
  Bump rationale: clarification of existing event-propagation rule → PATCH.
  Files also updated: CLAUDE.md Key Notes (003), specs/003-field-duplicate-resize/research.md §5.
-->

# PDF Form Editor Constitution

## Core Principles

### I. Client/Server Separation

PDF **rendering** (pdfjs-dist, canvas) MUST live exclusively in `client/`.
PDF **writing** (pdf-lib, AcroForm embedding) MUST live exclusively in `server/`.
No PDF-writing code may exist in the client; no PDF-rendering code may exist in the server.
The single crossing point is the HTTP boundary: `POST /api/generate-pdf` receives the raw
PDF bytes + a JSON array of `FormField` objects and returns the modified PDF bytes.

**Rationale**: Keeps each side's dependency graph clean, prevents bundle bloat on the client
(pdf-lib is ~800 KB), and makes the server independently testable via supertest without a browser.

### II. Shared-Types Contract

`shared/types.ts` is the **sole source of truth** for data structures that cross the
client/server boundary. Both workspaces import from `pdf-form-editor-shared`.
No ad-hoc inline types or duplicated interfaces may be used in place of shared types.
Adding a field to `FormField` requires a single edit in `shared/types.ts`.

**Rationale**: Prevents silent schema drift between client and server. The shared package
has no runtime dependencies — it is types only.

### III. Session-Only State (No Database)

Field state lives exclusively in React hooks (`useFieldStore`) during the browser session.
There is no database, no localStorage persistence, no backend session storage.
When the user closes the tab or loads a new PDF, all field state resets. This is by design.

**Rationale**: The tool is a local/internal utility. Persistence adds infrastructure complexity
(auth, migration, data model versioning) with no user need. State in hooks is sufficient and
simpler to reason about.

### IV. AcroForm Standard Output

All exported PDFs MUST embed fields as **standard AcroForm text fields** using pdf-lib's
`form.createTextField()` API with `textField.updateAppearances(embeddedFont)` called per field.
Omitting `updateAppearances` is a known defect (fields invisible in most PDF readers) and
MUST NOT be introduced. Supported fonts are limited to PDF standard fonts: Helvetica,
TimesRoman, Courier. No custom font embedding.

**Rationale**: Compatibility with Adobe Acrobat, Preview, and all AcroForm-aware readers is the
primary output requirement. Standard fonts guarantee zero-dependency embedding.

### V. TypeScript Strict Mode — No Unqualified `any`

All three packages (`client`, `server`, `shared`) compile with `"strict": true` in tsconfig.json.
`any` MUST NOT appear in production code without an explicit inline comment explaining why
the type system cannot express the constraint (e.g., `// unknown shape from JSON.parse`).
`unknown` with a type guard is preferred over `any` whenever the shape can be validated.

**Rationale**: Strict mode catches null-dereference and type-mismatch bugs at compile time.
The server's `isValidField` type guard is the canonical example of the preferred pattern.

### VI. YAGNI — No Premature Abstraction

No helper, utility, base class, or abstraction may be introduced unless there are
**3 or more concrete, existing call sites** in the codebase that would use it.
The rule applies equally to:
- New utility functions (prefer inline code until the 3rd duplication)
- New React contexts or providers
- New server middleware or service layers
- New configuration infrastructure

Error handling is validated only at **system boundaries** (HTTP request parsing, user file input).
Internal functions may trust their callers and MUST NOT add defensive guards for states that
the type system already prevents.

**Rationale**: Every abstraction is a future maintenance obligation. The codebase is small
and single-purpose; premature generalization adds complexity with no return.

### VII. Test Discipline

**Pure functions** (coordinate math, field-name utilities) MUST have Vitest unit tests.
**HTTP boundaries** MUST have Jest + supertest integration tests hitting a real Express app.
**React components** with non-trivial interaction logic (context menus, drag handles) MUST
have @testing-library/react tests.
Mocking internal modules (e.g., the coordinate utils, the field store) is PROHIBITED in tests
for the same layer. Only external boundaries (pdfjs canvas rendering, file system) may be mocked.
Tests MUST NOT use `any` to bypass type checking.

**Event-blocking in interactive components**: Any component that must block event propagation
to prevent a parent library (e.g., `@dnd-kit`) from activating MUST stop **both** the
`onPointerDown` and `onMouseDown` events. Stopping only `onMouseDown` is insufficient —
`@dnd-kit`'s `PointerSensor` listens for native `pointerdown`, which is a separate event
chain from `mousedown` and is not stopped by React's synthetic mouse event propagation.

**`position: fixed` does not change DOM parentage**: A context menu rendered with
`position: fixed` is visually detached from its parent but remains a DOM child. Click
events on its children still bubble up through the full DOM tree to ancestor handlers
(e.g., a canvas overlay `onClick`). Every action handler inside a `position: fixed`
overlay MUST call `e.stopPropagation()` to prevent ancestor click handlers from
interpreting the action as a canvas interaction.

**Rationale**: Mock-heavy tests gave false confidence in prior projects (bugs masked by mocks
passing while real integrations failed). Integration tests via supertest catch real schema
mismatches that unit tests with mocks cannot. The pointer/mouse event distinction was
discovered via BF-003-01. The fixed-position DOM parentage issue was discovered via
BF-003-02: clicking "Duplicar campo" simultaneously created an extra field because the
click bubbled to `field-overlay`'s `handleOverlayClick`.

### VIII. No Authentication

This tool has no authentication, authorization, or user identity concept.
No login screen, no JWT, no session middleware, no role system may be added.
The tool is intended for local or trusted-network use only.

**Rationale**: Authentication infrastructure (tokens, refresh, RBAC) is a significant
complexity multiplier. The use-case is a local/internal utility, not a multi-tenant service.

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Language | TypeScript | ^5.7.2 |
| Frontend framework | React | ^18.3.1 |
| Frontend build | Vite | ^5.4.11 |
| Drag-and-drop | @dnd-kit/core | ^6.3.1 |
| PDF rendering (client) | pdfjs-dist | ^4.9.155 |
| PDF writing (server) | pdf-lib | ^1.17.1 |
| HTTP server | Express | ^4.21.2 |
| File upload | multer | ^1.4.5-lts.1 |
| Client tests | Vitest + @testing-library/react | ^2.1.8 / ^16.1.0 |
| Server tests | Jest + supertest + ts-jest | ^29.7.0 / ^7.0.0 |
| Server dev runner | tsx | ^4.19.2 |
| Monorepo | npm workspaces | — |

**Ports**: Frontend Vite dev server on **5173**; Express API on **3002**.
Vite proxies `/api/*` → `http://localhost:3002`.

Dependency changes require a note in CLAUDE.md under "Active Technologies" for the
relevant feature branch.

---

## Project Structure & Conventions

### Workspace layout

```text
pdf-form-editor/
├── client/          # React SPA (pdfjs-dist, @dnd-kit, Vitest)
│   ├── src/
│   │   ├── components/{ComponentName}/ComponentName.tsx  # one folder per component
│   │   ├── hooks/use{Name}.ts                            # custom React hooks
│   │   ├── utils/{name}.ts                              # pure utility functions
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css                                    # single global stylesheet
│   └── tests/unit/                                      # Vitest tests
├── server/          # Express API (pdf-lib, multer, Jest)
│   ├── src/
│   │   ├── routes/{routeName}.ts                        # Express router per endpoint
│   │   └── services/{serviceName}.ts                    # business logic, no HTTP
│   └── tests/unit/                                      # Jest tests
└── shared/
    └── types.ts                                         # FormField, FontFamily — types only
```

### Naming conventions

- **Components**: PascalCase, folder + file share the name (`FieldList/FieldList.tsx`).
- **Hooks**: camelCase with `use` prefix (`useFieldStore`, `usePdfRenderer`).
- **Utilities**: camelCase functions, noun-verb or noun file names (`coordinates.ts`, `fieldName.ts`).
- **Types/Interfaces**: PascalCase, no `I` prefix (`FormField`, `PdfRenderer`, `CanvasRect`).
- **CSS classes**: kebab-case, component-scoped by name prefix (`.draggable-field`, `.field-label`).
  All styles live in `client/src/index.css`; no CSS modules, no CSS-in-JS.
- **Test files**: Mirror source path, suffix `.test.ts` / `.test.tsx`
  (`src/utils/fieldName.ts` → `tests/unit/fieldName.test.ts`).

### Coordinate system

PDF coordinates use bottom-left origin (Y increases upward).
Canvas coordinates use top-left origin (Y increases downward).
All conversions MUST go through `client/src/utils/coordinates.ts` (`canvasToPdf` / `pdfToCanvas`).
No inline coordinate math is permitted outside that file.

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
- MINOR — new principle added, new section added, or material expansion of existing guidance.
- PATCH — clarification, wording fix, typo, non-semantic refinement.

**Compliance review**: Every `/speckit.plan` execution MUST include a "Constitution Check"
section that gates Phase 0 research. Re-check is required after Phase 1 design artifacts
are produced. Any violation MUST be either resolved or explicitly justified in the plan's
"Complexity Tracking" table.

**Version**: 1.0.2 | **Ratified**: 2026-03-26 | **Last Amended**: 2026-03-27
