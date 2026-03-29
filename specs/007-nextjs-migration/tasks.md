---

description: "Task list for 007-nextjs-migration"
---

# Tasks: Next.js Architecture Migration

**Input**: Design documents from `/specs/007-nextjs-migration/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Tests**: No TDD requested. Test migration tasks are included as implementation tasks
(migrating existing server tests from Jest+supertest → Vitest direct invocation).

**Organization**: Phases 1–2 are foundational (unblock all stories). Phases 3–7 map
one-to-one to user stories from spec.md.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: User story label (US1–US5 from spec.md)
- All paths are relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the new single-project scaffold. All tasks in this phase can run
in parallel once T001 is complete.

- [X] T001 Create root `package.json`: merge all dependencies from `client/package.json` + `server/package.json`; add `next` as dependency; replace monorepo scripts with `"dev": "next dev"`, `"build": "next build"`, `"start": "next start"`, `"test": "vitest run"`, `"typecheck": "tsc --noEmit"`; remove `"workspaces"` field
- [X] T002 [P] Create `next.config.ts` with `serverExternalPackages: ['pdf-lib']` (prevents pdf-lib from being bundled into the client) and default Next.js settings
- [X] T003 [P] Create `tsconfig.json` at repo root: `"strict": true`, `"jsx": "preserve"`, `"moduleResolution": "bundler"`, `"paths": { "@/*": ["./src/*"] }`, `"include": ["src", "tests"]`
- [X] T004 [P] Create `src/styles/tokens.css` with all 8 token categories extracted from `client/src/index.css`: colors (`--color-primary: #4f46e5`, `--color-danger: #dc2626`, dark/neutral scale), typography (`--font-family-base`, `--font-size-xs` through `--font-size-md`, `--font-weight-*`), spacing (`--space-1: 4px` through `--space-6: 24px`), borders (`--radius-sm/md/lg`, `--border-color`), shadows (`--shadow-sm/md/lg`), z-index layers (`--z-canvas: 0`, `--z-field-overlay: 10`, `--z-toolbar: 100`, `--z-modal: 200`, `--z-tooltip: 300`)
- [X] T005 [P] Create `src/styles/reset.css` with global reset rules from `client/src/index.css`: box-sizing, margin, padding resets; body font, background, line-height defaults
- [X] T006 [P] Create `src/types/shared.ts` by copying content of `shared/types.ts` verbatim (`FormField` interface + `FontFamily` type); no changes to type definitions

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Lift-and-shift ALL existing client code into `src/` with minimal changes
(add `'use client'` directives, update import paths). After this phase the app MUST
compile and run. The feature-folder reorganization happens in Phase 6 (US5).

**⚠️ CRITICAL**: No user story implementation begins until `npm run build` passes.

- [X] T007 Create `src/app/api/generate-pdf/pdfService.ts` by copying `server/src/services/pdfService.ts`; change the single import `from 'pdf-form-editor-shared'` to `from '@/types/shared'`; no other changes
- [X] T008 Create `src/app/api/generate-pdf/route.ts` as Next.js App Router Route Handler: add `export const runtime = 'nodejs'` at top; copy `isValidField` guard and `VALID_FONT_FAMILIES` constant from `server/src/routes/generatePdf.ts`; replace `multer` upload handling with `const form = await request.formData(); const pdfFile = form.get('pdf') as File | null; const rawFields = form.get('fields') as string | null;`; replace `res.status(N).json(...)` returns with `return Response.json({ error }, { status: N })`; replace success `res.send(buffer)` with `return new Response(buffer, { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="form.pdf"' } })`; import `generatePdf` from `./pdfService`
- [X] T009 Create `src/app/layout.tsx`: add `'use client'` directive; import `@/styles/tokens.css` and `@/styles/reset.css`; configure `pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()` inside a `useEffect`; export default `RootLayout` with `<html><body>{children}</body></html>`
- [X] T010 Create `src/app/page.tsx`: use `dynamic(() => import('@/App'), { ssr: false })` to load the app without server-side rendering (canvas + pdfjs require browser); export default `Page` component that renders the dynamically imported `App`
- [X] T011 Move `client/src/App.tsx` → `src/App.tsx`: add `'use client'` as first line; replace all `from 'pdf-form-editor-shared'` with `from '@/types/shared'`; replace all relative imports (`../`, `./`) with `@/` absolute paths
- [X] T012 [P] Move all 6 hooks from `client/src/hooks/` → `src/hooks/`: for each file (`useFieldStore.ts`, `useInteractionMode.ts`, `usePdfRenderer.ts`, `useRubberBand.ts`, `useFieldResize.ts`, `useTemplateStore.ts`) — add `'use client'` at top; replace `pdf-form-editor-shared` imports with `@/types/shared`; update relative utility imports to `@/utils/` paths
- [X] T013 [P] Move all 6 utils from `client/src/utils/` → `src/utils/`: for each file (`coordinates.ts`, `export.ts`, `extractFields.ts`, `fieldName.ts`, `templateSchema.ts`, `thumbnails.ts`) — replace `pdf-form-editor-shared` imports with `@/types/shared`; update relative imports; no `'use client'` needed (pure functions, except `export.ts` which is a fetch utility)
- [X] T014 [P] Move all components from `client/src/components/` → `src/components/` (preserve entire subfolder structure: FieldList, FieldOverlay, ImportExportModal, PageNavigator, PdfUploader, PdfViewer, PropertiesPanel, ShortcutsPanel, TemplatePanel, ThumbnailStrip, ToolbarModes); for each `.tsx` file: add `'use client'` as first line; update all imports to `@/` paths
- [X] T015 Copy `client/src/main.tsx` content for reference; delete it (Next.js uses `src/app/page.tsx` as entry point instead)
- [X] T016 Run `npm install` then `npm run build`; fix any TypeScript errors from path changes or missing `'use client'` directives; fix any `moduleResolution` errors; the build MUST pass before proceeding

**Checkpoint**: `npm run build` passes. `npm run dev` starts. App is accessible at
`localhost:3000` and visually identical to the previous version.

---

## Phase 3: User Story 1 — API Route + Vercel Deploy (Priority: P1) 🎯 MVP

**Goal**: Verify `POST /api/generate-pdf` works identically to the Express endpoint
and `npm run build` produces a Vercel-deployable artifact.

**Independent Test**: Run `npm run build`. Start `npm run dev`. Use `curl -X POST localhost:3000/api/generate-pdf -F 'pdf=@tests/fixtures/test.pdf' -F 'fields=[]'` and verify a valid PDF blob is returned. Alternatively, upload a PDF via the UI and export — the downloaded PDF must contain AcroForm fields.

### Implementation for User Story 1

- [X] T017 [P] [US1] Migrate API route tests: copy `server/tests/unit/generatePdf.test.ts` → `tests/unit/api/generate-pdf.test.ts`; replace `import request from 'supertest'; import app from '../../src/index'` with `import { POST } from '@/app/api/generate-pdf/route'`; replace `request(app).post(...).attach(...).field(...)` calls with `const form = new FormData(); form.append(...); const res = await POST(new Request('http://localhost/api/generate-pdf', { method: 'POST', body: form }))`; replace `res.status` and `res.body` assertions with `res.status` and `await res.json()`
- [X] T018 [P] [US1] Migrate pdfService tests: copy `server/tests/unit/pdfService.test.ts` → `tests/unit/api/pdfService.test.ts`; update imports to `@/app/api/generate-pdf/pdfService`; replace any `jest.*` APIs with Vitest equivalents (`vi.fn()`, `vi.spyOn()`)
- [X] T019 [US1] Create `vitest.config.ts` at repo root: `environment: 'jsdom'`, `globals: true`, `setupFiles: ['./tests/setup.ts']`, `resolve.alias: { '@': path.resolve(__dirname, './src') }`; migrate `client/tests/setup.ts` → `tests/setup.ts`
- [X] T020 [US1] Run `npm test` and fix any failing tests; confirm all existing client unit tests (fieldName, ResizeHandles, coordinates, usePdfRenderer, etc.) pass under the new Vitest config
- [X] T021 [US1] Delete `client/`, `server/`, `shared/`, `api/` directories and old `vercel.json` from repo root; run `npm run build` and `npm test` one final time to confirm nothing references the deleted paths

**Checkpoint**: `npm run build` ✅ `npm test` ✅ App loads at `localhost:3000`. API route at `/api/generate-pdf` accepts `multipart/form-data` and returns valid PDF. Zero references to deleted folders remain.

---

## Phase 4: User Story 4 — Reusable Base UI Components (Priority: P2)

**Goal**: Create the six shared primitives in `src/components/ui/`. No feature
re-implements buttons, modals, or inputs.

**Independent Test**: Import each primitive from `@/components/ui` and render it in a
test or Storybook. Verify each variant renders correctly. Search `src/` for `<button`,
`<input`, `<select` outside `src/components/ui/` — must return zero results (after
Phase 5 replaces them).

### Implementation for User Story 4

- [X] T022 [P] [US4] Create `src/components/ui/Button/Button.tsx`: props `variant?: 'primary'|'secondary'|'ghost'|'danger'` (default `primary`), `size?: 'sm'|'md'|'lg'` (default `md`), `disabled?: boolean`, `loading?: boolean`, `icon?: React.ReactNode`, `children`, `onClick?`, `type?`; use CSS module classes; mark `'use client'`
- [X] T023 [P] [US4] Create `src/components/ui/Button/Button.module.css`: base `.button` class using `var(--font-family-base)`, `var(--radius-md)`, `var(--space-2)`, `var(--space-4)`; variant modifiers `.primary` (`var(--color-primary)`), `.secondary`, `.ghost`, `.danger` (`var(--color-danger)`); size modifiers `.sm`, `.md`, `.lg`; `.loading` with opacity; `.disabled` with cursor
- [X] T024 [P] [US4] Create `src/components/ui/Modal/Modal.tsx`: props `isOpen: boolean`, `onClose: () => void`, `title: string`, `children: React.ReactNode`, `footer?: React.ReactNode`; close on Escape keydown and backdrop click; `useEffect` for keydown listener; render portal via `createPortal` into `document.body`; mark `'use client'`
- [X] T025 [P] [US4] Create `src/components/ui/Modal/Modal.module.css`: `.backdrop` with `var(--z-modal)`, semi-transparent background; `.dialog` with `var(--shadow-lg)`, `var(--radius-lg)`, white background, max-width constraint; `.header`, `.body`, `.footer` sections
- [X] T026 [P] [US4] Create `src/components/ui/Input/Input.tsx`: props `value: string`, `onChange`, `label?: string`, `error?: string`, `hint?: string`, `disabled?: boolean`, `type?: 'text'|'number'`, `placeholder?`; mark `'use client'`
- [X] T027 [P] [US4] Create `src/components/ui/Input/Input.module.css`: `.wrapper`, `.label` using `var(--font-size-sm)`, `.input` using `var(--border-color)`, `var(--radius-sm)`, `var(--space-2)`; `.error` class with `var(--color-danger)`; `.hint` with `var(--color-neutral-500)`
- [X] T028 [P] [US4] Create `src/components/ui/Select/Select.tsx`: props `value: string`, `onChange`, `options: Array<{value: string, label: string}>`, `label?: string`, `error?: string`, `disabled?: boolean`; renders native `<select>` wrapped in styled container; mark `'use client'`
- [X] T029 [P] [US4] Create `src/components/ui/Select/Select.module.css`: styled wrapper with custom dropdown indicator; uses same token set as Input
- [X] T030 [P] [US4] Create `src/components/ui/Tooltip/Tooltip.tsx`: props `content: string`, `children: React.ReactNode`; CSS-only hover (no JS state); wraps children in relative-positioned container; mark `'use client'`
- [X] T031 [P] [US4] Create `src/components/ui/Tooltip/Tooltip.module.css`: `.wrapper` with `position: relative`; `.tip` absolutely positioned, `var(--z-tooltip)`, `var(--shadow-sm)`, `var(--radius-sm)`, `var(--color-dark-800)` background; visible on `.wrapper:hover .tip`
- [X] T032 [P] [US4] Create `src/components/ui/IconButton/IconButton.tsx`: props `icon: React.ReactNode`, `onClick?`, `label: string` (aria-label), `size?: 'sm'|'md'`, `variant?: 'default'|'active'|'danger'`, `disabled?: boolean`; mark `'use client'`
- [X] T033 [P] [US4] Create `src/components/ui/IconButton/IconButton.module.css`: square button with icon centered; `.active` variant with `var(--color-primary)` background; size variants using `var(--space-*)` tokens
- [X] T034 [US4] Create `src/components/ui/index.ts` barrel: `export { Button } from './Button/Button'`; same for Modal, Input, Select, Tooltip, IconButton

**Checkpoint**: All 6 primitives importable from `@/components/ui`. Each renders
correctly in isolation. `npm run build` ✅

---

## Phase 5: User Story 5 — Feature-Based Code Organization (Priority: P3)

**Goal**: Reorganize `src/` into `src/features/{canvas,toolbar,fields,templates,pdf}/`
with barrel exports. Update `App.tsx` imports. No cross-feature direct imports.

**Independent Test**: Verify each feature folder has `index.ts`. Run static import
analysis: no file inside `src/features/X/` imports from `src/features/Y/` internal
paths. `npm run build` must still pass.

### Implementation for User Story 5

- [X] T035 [P] [US5] Create feature folder scaffolds with placeholder `index.ts`: `src/features/canvas/index.ts`, `src/features/toolbar/index.ts`, `src/features/fields/index.ts`, `src/features/templates/index.ts`, `src/features/pdf/index.ts` (each starts as `export {};`)
- [X] T036 [P] [US5] Move canvas hooks: `src/hooks/usePdfRenderer.ts` → `src/features/canvas/hooks/usePdfRenderer.ts`; `src/hooks/useRubberBand.ts` → `src/features/canvas/hooks/useRubberBand.ts`; update their internal imports to `@/` paths
- [X] T037 [P] [US5] Move fields hook: `src/hooks/useFieldResize.ts` → `src/features/fields/hooks/useFieldResize.ts`; update imports
- [X] T038 [P] [US5] Move templates hook: `src/hooks/useTemplateStore.ts` → `src/features/templates/hooks/useTemplateStore.ts`; update imports
- [X] T039 [P] [US5] Move canvas components: `src/components/PdfViewer/` → `src/features/canvas/components/PdfViewer/`; `src/components/ThumbnailStrip/` → `src/features/canvas/components/ThumbnailStrip/`; update internal imports
- [X] T040 [P] [US5] Move toolbar components: `src/components/ToolbarModes/` → `src/features/toolbar/components/ToolbarModes/`; `src/components/ShortcutsPanel/` → `src/features/toolbar/components/ShortcutsPanel/`; update imports
- [X] T041 [P] [US5] Move field components: `src/components/FieldOverlay/` → `src/features/fields/components/FieldOverlay/`; `src/components/FieldList/` → `src/features/fields/components/FieldList/`; `src/components/PropertiesPanel/` → `src/features/fields/components/PropertiesPanel/`; `src/components/PageNavigator/` → `src/features/fields/components/PageNavigator/`; update imports
- [X] T042 [P] [US5] Move template components: `src/components/TemplatePanel/` → `src/features/templates/components/TemplatePanel/`; `src/components/ImportExportModal/` → `src/features/templates/components/ImportExportModal/`; update imports
- [X] T043 [P] [US5] Move PDF components and utils: `src/components/PdfUploader/` → `src/features/pdf/components/PdfUploader/`; move all `src/utils/*.ts` → `src/features/pdf/utils/`; update imports in components that use these utils
- [X] T044 [US5] Update `src/features/canvas/index.ts` barrel: export `PdfViewer`, `ThumbnailStrip` from components; export `usePdfRenderer`, `useRubberBand` from hooks
- [X] T045 [US5] Update `src/features/toolbar/index.ts` barrel: export `ToolbarModes`, `ShortcutsPanel` from components; export `useInteractionMode` from `@/hooks/useInteractionMode` (re-export — stays global)
- [X] T046 [US5] Update `src/features/fields/index.ts` barrel: export all field components and `useFieldStore` from `@/hooks/useFieldStore` (re-export — stays global), `useFieldResize` from hooks
- [X] T047 [US5] Update `src/features/templates/index.ts` barrel: export template components and `useTemplateStore` from hooks
- [X] T048 [US5] Update `src/features/pdf/index.ts` barrel: export `PdfUploader` and all utils from `./utils/`
- [X] T049 [US5] Update `src/App.tsx` to import from feature barrels (`@/features/canvas`, `@/features/toolbar`, `@/features/fields`, `@/features/templates`, `@/features/pdf`) instead of flat `@/components/` and `@/hooks/` paths
- [X] T050 [US5] Delete `src/components/` (all moved to features) and empty `src/hooks/` and `src/utils/` folders; run `npm run build` — must pass; run grep to confirm no import references deleted paths

**Checkpoint**: All 5 feature folders have `index.ts`. `src/components/` only contains
`ui/`. `src/hooks/` only contains `useFieldStore.ts` and `useInteractionMode.ts`.
`npm run build` ✅

---

## Phase 6: User Story 3 — Design Tokens & CSS per Component (Priority: P2)

**Goal**: Replace all hardcoded color/font/shadow values with `var(--token-*)` references.
Add `.module.css` to every component. Eliminate the remaining global `index.css`.

**Independent Test**: Search `src/` for hardcoded hex values outside `tokens.css` —
zero results. Every `.tsx` component file has a sibling `.module.css`.

### Implementation for User Story 3

- [X] T051 [P] [US3] Create `src/features/canvas/components/PdfViewer/PdfViewer.module.css`: extract all PdfViewer CSS rules from `client/src/index.css`; replace `#4f46e5` → `var(--color-primary)`, `#111827` → `var(--color-dark-900)`, pixel spacing → `var(--space-*)`, `z-index` values → `var(--z-canvas)` / `var(--z-field-overlay)`; import in `PdfViewer.tsx` as `import styles from './PdfViewer.module.css'`
- [X] T052 [P] [US3] Create `src/features/canvas/components/ThumbnailStrip/ThumbnailStrip.module.css`: extract thumbnail strip rules; use `var(--color-primary)` for active border, `var(--color-neutral-200)` for dividers; import in component
- [X] T053 [P] [US3] Create `src/features/toolbar/components/ToolbarModes/ToolbarModes.module.css`: extract toolbar mode button rules; use `var(--color-dark-900)` background, `var(--color-primary)` for active state, `var(--z-toolbar)`, `var(--shadow-md)`; import in component
- [X] T054 [P] [US3] Create `src/features/toolbar/components/ShortcutsPanel/ShortcutsPanel.module.css`: extract shortcuts FAB rules; use `var(--color-dark-800)`, `var(--z-toolbar)`, `var(--shadow-lg)`, `var(--radius-lg)`; import in component
- [X] T055 [P] [US3] Create CSS modules for field overlay components: `FieldOverlay/FieldOverlay.module.css` (canvas overlay container), `DraggableField/DraggableField.module.css` (`var(--color-primary)` border, `var(--color-danger)` for selected), `ResizeHandles/ResizeHandles.module.css` (8×8px handles using `var(--color-primary)`); import each in its component
- [X] T056 [P] [US3] Create CSS modules for field UI components: `FieldList/FieldList.module.css`, `PropertiesPanel/PropertiesPanel.module.css` (form controls using `var(--space-*)`, `var(--border-color)`), `PageNavigator/PageNavigator.module.css`; import each in its component
- [X] T057 [P] [US3] Create CSS modules for template components: `TemplatePanel/TemplatePanel.module.css`, `ImportExportModal/ExportModal.module.css`, `ImportExportModal/ImportModal.module.css`; import each in its component
- [X] T058 [P] [US3] Create `src/features/pdf/components/PdfUploader/PdfUploader.module.css`: drop zone styles using `var(--color-primary)`, `var(--radius-lg)`, `var(--border-color)`; import in component
- [X] T059 [US3] For each component updated in T051–T058: remove all inline `style={{ color: ..., background: ... }}` properties that were hardcoded values; replace with CSS module class references; keep only dynamic inline styles (e.g., `style={{ left: canvasX, top: canvasY }}` for canvas overlays)
- [X] T060 [US3] Replace all remaining `<button>`, `<input>`, `<select>` elements in feature components with `<Button>`, `<Input>`, `<Select>` from `@/components/ui`; replace icon-only buttons with `<IconButton>`; replace any modal implementations with `<Modal>`
- [X] T061 [US3] Run hardcoded-value audit: `grep -rn "#[0-9a-fA-F]\{3,6\}" src/ --include="*.tsx" --include="*.ts" | grep -v "tokens.css"`; fix every hit by replacing with appropriate `var(--token-*)` reference; repeat until grep returns zero results

**Checkpoint**: Zero hardcoded color/font/shadow values outside `tokens.css`. Every
`.tsx` has a `.module.css` sibling. `npm run build` ✅

---

## Phase 7: User Story 2 — Zero Regression Validation (Priority: P1)

**Goal**: Confirm every feature from the pre-migration app works identically in the
migrated Next.js app. This is the final integration gate.

**Independent Test**: Complete the manual smoke test checklist. All automated tests pass.
All validation scripts from `quickstart.md` return clean results.

### Implementation for User Story 2

- [X] T062 [US2] Run `npm test` — fix any test failures introduced by Phase 5–6 path changes; all tests from the pre-migration client must pass; API route tests must pass
- [X] T063 [US2] Run `npm run typecheck` — fix any TypeScript errors; zero `any` types introduced by the migration
- [ ] T064 [US2] Manual smoke test (run `npm run dev`, open localhost:3000): (1) upload a multi-page PDF; (2) navigate pages; (3) place fields on different pages; (4) resize a field; (5) duplicate a field (Ctrl+D); (6) set a default value in PropertiesPanel; (7) save and load a template; (8) use rubber-band multi-select; (9) move multiple selected fields; (10) export PDF; (11) verify exported PDF contains AcroForm fields at correct positions with correct default values
- [X] T065 [US2] Run full validation checklist from `specs/007-nextjs-migration/quickstart.md`: verify no hardcoded colors, no `<button>` outside `ui/`, every feature `index.ts` exists, no component > 150 lines, no cross-feature imports; all checks MUST return clean

**Checkpoint**: All user stories verified. `npm run build` ✅ `npm test` ✅ Manual
smoke test ✅ Validation scripts ✅

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, documentation, and final delivery preparation.

- [X] T066 [P] Update `CLAUDE.md` project structure section to reflect new `src/features/` layout; update "Active Technologies" entry for 007
- [X] T067 [P] Delete any remaining empty directories (`src/components/` non-ui leftovers, root-level `api/` stub); verify `git status` shows no unintended deletions of test fixtures or config files
- [X] T068 Run `npm run build` one final time on a clean install (`rm -rf node_modules && npm install && npm run build`); record build output size and confirm no warnings

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately; T002–T006 run in parallel after T001
- **Foundational (Phase 2)**: Depends on Phase 1 complete — BLOCKS all user stories; T007–T010 can run in parallel; T011–T014 can run in parallel; T015 depends on T010–T014; T016 depends on T015
- **US1 (Phase 3)**: Depends on T016 (build passing) — T017–T018 in parallel; T019–T021 sequential
- **US4 (Phase 4)**: Depends on Phase 2 complete — all T022–T033 in parallel; T034 depends on T022–T033
- **US5 (Phase 5)**: Depends on Phase 2 complete — T035–T043 in parallel; T044–T049 depend on T035–T043; T050 depends on T049
- **US3 (Phase 6)**: Depends on Phase 5 complete (components in final locations) — T051–T058 in parallel; T059–T061 sequential after
- **US2 (Phase 7)**: Depends on Phase 3 + Phase 4 + Phase 5 + Phase 6 complete — T062–T065 sequential
- **Polish (Final)**: Depends on Phase 7 complete

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational — no dependency on US3/US4/US5
- **US2 (P1)**: Depends on ALL other stories complete — final validation gate
- **US3 (P2)**: Depends on US5 (components must be in final feature locations first)
- **US4 (P2)**: Can start after Foundational — no dependency on US5
- **US5 (P3)**: Can start after Foundational — no dependency on US3/US4

### Within Each Phase

- Setup tasks: T002–T006 fully parallel after T001
- Foundational: T007–T014 have no sequential dependency between them (different files)
- US4: All primitive components (T022–T033) fully parallel (different files)
- US5: All move tasks (T035–T043) fully parallel after T035

### Parallel Opportunities

```bash
# Phase 1 — after T001 completes:
# Run simultaneously:
T002  # next.config.ts
T003  # tsconfig.json
T004  # tokens.css
T005  # reset.css
T006  # shared.ts

# Phase 2 — run simultaneously:
T007 T008 T009 T010  # API route files + layout + page
# Then simultaneously:
T011 T012 T013 T014  # App.tsx + hooks + utils + components

# Phase 4 — all US4 primitives simultaneously:
T022 T023  # Button + Button.module.css
T024 T025  # Modal + Modal.module.css
T026 T027  # Input + Input.module.css
T028 T029  # Select + Select.module.css
T030 T031  # Tooltip + Tooltip.module.css
T032 T033  # IconButton + IconButton.module.css

# Phase 5 — move operations simultaneously:
T035 T036 T037 T038 T039 T040 T041 T042 T043

# Phase 6 — CSS module creation simultaneously:
T051 T052 T053 T054 T055 T056 T057 T058
```

---

## Implementation Strategy

### MVP First (US1 + US2 only — app works on Vercel)

1. Complete Phase 1: Setup (T001–T006)
2. Complete Phase 2: Foundational (T007–T016)
3. Complete Phase 3: US1 (T017–T021)
4. **STOP and VALIDATE**: API route responds correctly, `npm run build` passes, app loads
5. Run smoke test (T064) — if all features work, MVP is deployable on Vercel immediately

The app at this point is functionally complete. Phases 4–7 improve code organization and visual consistency.

### Incremental Delivery

1. MVP: Setup + Foundational + US1 → Deployable on Vercel ✅
2. Add US4 → Unified UI primitives (no duplicate buttons/modals) ✅
3. Add US5 → Feature-organized codebase ✅
4. Add US3 → Design tokens (no hardcoded values) ✅
5. Validate US2 → Full regression confirmed ✅

### Parallel Team Strategy

With multiple developers after Foundational phase completes:

- **Developer A**: US1 (T017–T021) — API tests + folder cleanup
- **Developer B**: US4 (T022–T034) — UI primitive library
- **Developer C**: US5 (T035–T050) — feature folder reorganization
- Merge all → Developer A/B/C together: US3 (T051–T061) — CSS tokens
- All together: US2 (T062–T065) — regression validation

---

## Notes

- `[P]` tasks = different files, no shared dependencies at that moment
- Each user story has an independent test criteria — stop and validate at each checkpoint
- T016 (`npm run build`) is the critical gate for the entire migration
- Dynamic import (`next/dynamic`) in T010 is required because pdfjs-dist uses browser APIs
- Keep `client/`, `server/`, `shared/` folders intact until T021 — they serve as the reference implementation during migration
- All moves in Phase 5 are file moves, not rewrites — logic is preserved exactly
- `useFieldStore` and `useInteractionMode` stay in `src/hooks/` (global) because they are consumed by 4–5 different features each
