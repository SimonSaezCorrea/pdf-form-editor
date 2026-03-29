# Implementation Plan: Next.js Architecture Migration

**Branch**: `007-nextjs-migration` | **Date**: 2026-03-27 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/007-nextjs-migration/spec.md`

## Summary

Migrate the pdf-form-editor from a React + Vite + Express npm-workspaces monorepo to a
single Next.js 15 (App Router) project deployable on Vercel with zero extra configuration.
The Express PDF generation server (`server/`) is eliminated; its logic moves to a Next.js
Route Handler at `src/app/api/generate-pdf/route.ts`. The React SPA migrates to Next.js
App Router with `'use client'` components. All 6 existing hooks, 13 components, and 6
utilities are preserved and reorganized under `src/features/` by domain. The 1,266-line
`index.css` is decomposed into `src/styles/tokens.css` (design tokens) plus co-located
`.module.css` files per component. Six reusable base UI primitives (`Button`, `Modal`,
`Input`, `Select`, `Tooltip`, `IconButton`) are created in `src/components/ui/`.
**Zero functional regression** is required.

## Technical Context

**Language/Version**: TypeScript 5.7.x
**Primary Dependencies**: Next.js 15.x (App Router), pdfjs-dist 4.9.x, pdf-lib 1.17.x,
@dnd-kit/core 6.x
**Storage**: localStorage (template persistence only) — no database
**Testing**: Vitest 2.x + @testing-library/react 16.x (unified; replaces Jest + supertest)
**Target Platform**: Vercel (serverless, Node.js 20.x runtime for API routes)
**Project Type**: Fullstack web application — single project, single build
**Performance Goals**: PDF generation < 10s for typical documents; canvas rendering 60fps
**Constraints**: Vercel hobby plan caps serverless request body at 4.5 MB (vs. current 50 MB
Express limit). Local `next dev` has no limit. Accepted as a deployment-tier constraint.
**Scale/Scope**: Single-user local/internal tool; no concurrency requirements.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | Client/Server Separation | ✅ PASS | pdf-lib in `src/app/api/` only; pdfjs-dist in client components |
| II | Shared-Types Contract | ✅ PASS | `FormField` → `src/types/shared.ts`; single source of truth |
| III | Session-Only State | ✅ PASS | No DB; localStorage template store unchanged |
| IV | AcroForm Standard Output | ✅ PASS | `pdfService.ts` logic is a straight file move; no logic changes |
| V | TypeScript Strict Mode | ✅ PASS | `"strict": true` in unified `tsconfig.json` |
| VI | YAGNI | ✅ PASS | 6 primitives each used by 3+ features; no speculative abstractions |
| VII | Test Discipline | ✅ PASS | Vitest unified; API routes tested via direct handler invocation |
| VIII | No Authentication | ✅ PASS | No auth added |
| IX | Next.js Fullstack | ✅ PASS | This feature IS the migration |
| X | API Routes as Backend | ✅ PASS | pdf-lib exclusively in `src/app/api/generate-pdf/route.ts` |
| XI | CSS per Component | ✅ PASS | Every component gets co-located `.module.css` |
| XII | Design Tokens | ✅ PASS | `src/styles/tokens.css` replaces all hardcoded values |
| XIII | Reusable Base Components | ✅ PASS | `src/components/ui/` with 6 primitives |
| XIV | Feature Architecture | ✅ PASS | `src/features/{canvas,toolbar,fields,templates,pdf}/` |
| XV | Hooks for Logic | ✅ PASS | All existing hooks migrate as-is; no logic moves into components |
| XVI | Barrel Exports | ✅ PASS | `index.ts` in each feature folder |
| XVII | No Independent Server | ✅ PASS | Express server eliminated; no new server process |

**All 17 principles pass. Gate cleared.**

**Post-Phase 1 re-check**: All decisions in `research.md` and `data-model.md` confirm
compliance. No violations identified in design artifacts.

## Project Structure

### Documentation (this feature)

```text
specs/007-nextjs-migration/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── generate-pdf.md  # Phase 1 output — API contract
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (post-migration layout)

```text
src/
├── app/
│   ├── api/
│   │   └── generate-pdf/
│   │       ├── route.ts          # ← Express route handler rewritten as Next.js Route Handler
│   │       └── pdfService.ts     # ← server/src/services/pdfService.ts (no logic changes)
│   ├── layout.tsx                # Imports tokens.css + reset.css; sets 'use client' boundary
│   └── page.tsx                  # Root page — mounts <App>
├── components/
│   └── ui/
│       ├── Button/
│       │   ├── Button.tsx
│       │   └── Button.module.css
│       ├── Modal/
│       │   ├── Modal.tsx
│       │   └── Modal.module.css
│       ├── Input/
│       │   ├── Input.tsx
│       │   └── Input.module.css
│       ├── Select/
│       │   ├── Select.tsx
│       │   └── Select.module.css
│       ├── Tooltip/
│       │   ├── Tooltip.tsx
│       │   └── Tooltip.module.css
│       ├── IconButton/
│       │   ├── IconButton.tsx
│       │   └── IconButton.module.css
│       └── index.ts
├── features/
│   ├── canvas/
│   │   ├── components/
│   │   │   ├── PdfViewer/
│   │   │   │   ├── PdfViewer.tsx
│   │   │   │   └── PdfViewer.module.css
│   │   │   └── ThumbnailStrip/
│   │   │       ├── ThumbnailStrip.tsx
│   │   │       └── ThumbnailStrip.module.css
│   │   ├── hooks/
│   │   │   ├── usePdfRenderer.ts
│   │   │   └── useRubberBand.ts
│   │   └── index.ts
│   ├── toolbar/
│   │   ├── components/
│   │   │   ├── ToolbarModes/
│   │   │   │   ├── ToolbarModes.tsx
│   │   │   │   └── ToolbarModes.module.css
│   │   │   └── ShortcutsPanel/
│   │   │       ├── ShortcutsPanel.tsx
│   │   │       └── ShortcutsPanel.module.css
│   │   ├── hooks/
│   │   │   └── useInteractionMode.ts
│   │   └── index.ts
│   ├── fields/
│   │   ├── components/
│   │   │   ├── DraggableField/
│   │   │   │   ├── DraggableField.tsx
│   │   │   │   └── DraggableField.module.css
│   │   │   ├── FieldList/
│   │   │   │   ├── FieldList.tsx
│   │   │   │   └── FieldList.module.css
│   │   │   ├── FieldOverlay/
│   │   │   │   ├── FieldOverlay.tsx
│   │   │   │   └── FieldOverlay.module.css
│   │   │   ├── PropertiesPanel/
│   │   │   │   ├── PropertiesPanel.tsx
│   │   │   │   └── PropertiesPanel.module.css
│   │   │   ├── ResizeHandles/
│   │   │   │   ├── ResizeHandles.tsx
│   │   │   │   └── ResizeHandles.module.css
│   │   │   └── PageNavigator/
│   │   │       ├── PageNavigator.tsx
│   │   │       └── PageNavigator.module.css
│   │   ├── hooks/
│   │   │   ├── useFieldResize.ts
│   │   │   └── useFieldStore.ts       # ← moved here from global (single main consumer)
│   │   └── index.ts
│   ├── templates/
│   │   ├── components/
│   │   │   ├── TemplatePanel/
│   │   │   │   ├── TemplatePanel.tsx
│   │   │   │   └── TemplatePanel.module.css
│   │   │   ├── ExportModal/
│   │   │   │   ├── ExportModal.tsx
│   │   │   │   └── ExportModal.module.css
│   │   │   └── ImportModal/
│   │   │       ├── ImportModal.tsx
│   │   │       └── ImportModal.module.css
│   │   ├── hooks/
│   │   │   └── useTemplateStore.ts
│   │   └── index.ts
│   └── pdf/
│       ├── components/
│       │   └── PdfUploader/
│       │       ├── PdfUploader.tsx
│       │       └── PdfUploader.module.css
│       ├── utils/
│       │   ├── coordinates.ts
│       │   ├── export.ts
│       │   ├── extractFields.ts
│       │   ├── fieldName.ts
│       │   ├── templateSchema.ts
│       │   └── thumbnails.ts
│       └── index.ts
├── hooks/
│   ├── useFieldStore.ts           # Global: used by canvas + fields + toolbar + templates + pdf
│   └── useInteractionMode.ts      # Global: used by canvas + toolbar
├── styles/
│   ├── tokens.css
│   └── reset.css
├── types/
│   └── shared.ts                  # ← shared/types.ts (FormField, FontFamily)
└── App.tsx                        # Root app component (keyboard shortcuts, layout)

tests/
└── unit/                          # Vitest tests — mirrors src/ structure

next.config.ts                     # serverExternalPackages: ['pdf-lib']
tsconfig.json                      # Unified; paths: { "@/*": ["./src/*"] }
package.json                       # Merged; no npm workspaces
```

**Structure Decision**: Single Next.js project. Option 1 (single project) from the
plan template. All source under `src/`. API route at `src/app/api/`. Features under
`src/features/`. Global hooks in `src/hooks/` (consumed by 3+ features).

> **Note on `useFieldStore` placement**: The research classified it as "global" (5
> feature consumers). However, it is called only from `App.tsx` and passed down as
> props — making `src/hooks/` the correct location for it. `useInteractionMode` is
> similarly global. Feature-specific hooks (usePdfRenderer, useRubberBand,
> useFieldResize, useTemplateStore) stay inside their feature folders.

## Complexity Tracking

> No Constitution Check violations — section not required.

---

## Phase 0: Research Summary

*Complete. See [research.md](research.md) for full findings.*

| Unknown | Resolution |
|---------|-----------|
| File upload (no multer) | `request.formData()` Web API — zero new dependencies |
| pdfjs-dist in Next.js | Same worker URL pattern in `'use client'` component |
| Testing (no supertest) | Vitest unified; direct Route Handler invocation |
| Shared types path | `src/types/shared.ts` + `@/` alias |
| CSS strategy | tokens.css + CSS Modules (built into Next.js) |
| Package consolidation | Single `package.json`; workspaces removed |
| Feature boundaries | Global hooks in `src/hooks/` for 3+ consumers |
| Next.js config | `serverExternalPackages: ['pdf-lib']`; no Edge runtime |

---

## Phase 1: Design Summary

*Complete. See [data-model.md](data-model.md), [contracts/generate-pdf.md](contracts/generate-pdf.md), [quickstart.md](quickstart.md).*

**Data model**: `FormField` unchanged in shape; moves to `src/types/shared.ts`. Design
Tokens defined as CSS custom properties in 8 categories. Feature Modules have a standard
subfolder shape. Base UI Components have defined prop contracts.

**API contract**: `POST /api/generate-pdf` is byte-for-byte identical to the Express
endpoint. Same fields, same error codes, same response headers. Client `export.ts`
requires no changes.

**Quickstart**: `npm install` → `npm run dev` → open `localhost:3000`. Single command.
Full validation checklist included.

---

## Implementation Sequence (for /speckit.tasks)

The tasks command should organize work in this order:

### Phase A — Scaffold (unblocks everything)
1. Create `package.json` (merged deps, no workspaces)
2. Create `next.config.ts`
3. Create `tsconfig.json` (with `@/` alias)
4. Create `src/app/layout.tsx` + `src/app/page.tsx`
5. Create `src/types/shared.ts` (copy from `shared/types.ts`)
6. Create `src/styles/tokens.css` + `src/styles/reset.css`

### Phase B — API Route (US1: Vercel deploy)
7. Create `src/app/api/generate-pdf/pdfService.ts` (copy from server/src/services)
8. Create `src/app/api/generate-pdf/route.ts` (rewrite Express route as Route Handler)
9. Migrate API route tests to Vitest (direct handler invocation)

### Phase C — Base UI Components (US4: unified primitives)
10. `Button`, `Modal`, `Input`, `Select`, `Tooltip`, `IconButton` in `src/components/ui/`
11. Co-located `.module.css` for each
12. `src/components/ui/index.ts` barrel

### Phase D — Feature Folders (US5: code organization)
13. Scaffold `src/features/{canvas,toolbar,fields,templates,pdf}/` with `index.ts`
14. Move hooks to feature subfolders (per classification in data-model.md)
15. Move utilities to `src/features/pdf/utils/`
16. Move global hooks to `src/hooks/`

### Phase E — Components + CSS Decomposition (US3 + US4)
17. Migrate each component to its feature folder with co-located `.module.css`
18. Replace hardcoded values with `var(--token-*)` references
19. Verify zero hardcoded hex codes outside `tokens.css`

### Phase F — App Wiring + Regression (US2: zero regression)
20. Update `App.tsx` imports to use new paths
21. Remove `client/`, `server/`, `shared/` folders and old config files
22. Run full validation checklist from `quickstart.md`
23. `npm run build` must pass cleanly
