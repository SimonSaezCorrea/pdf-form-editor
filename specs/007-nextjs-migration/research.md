# Research: Next.js Architecture Migration

**Branch**: `007-nextjs-migration` | **Date**: 2026-03-27
**Status**: Complete — all NEEDS CLARIFICATION resolved

---

## Decision 1: File Upload Handling in Next.js App Router

**Question**: How to receive `multipart/form-data` (PDF file + JSON fields) in a
Next.js App Router Route Handler, replacing `multer`?

**Decision**: Use the Web-native `Request.formData()` API, available in Next.js
App Router Route Handlers without any library.

```typescript
// src/app/api/generate-pdf/route.ts
export const runtime = 'nodejs'; // pdf-lib requires Node.js (not Edge)

export async function POST(request: Request): Promise<Response> {
  const form = await request.formData();
  const pdfFile = form.get('pdf') as File | null;
  const fieldsJson = form.get('fields') as string | null;
  const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());
  // ... rest of validation and generatePdf() call
}
```

**Rationale**: `multer` is an Express middleware — it has no equivalent in Next.js
Route Handlers. The Web `FormData` API is the standard replacement and is fully
supported in Next.js 15 Node.js runtime.

**Alternatives considered**:
- `formidable` npm package — unnecessary; `request.formData()` covers the use case
  with zero extra dependencies.
- `busboy` (multer's underlying parser) — same as above; extra dependency not justified.

**Constraint found**: Vercel Serverless Functions on the free/hobby plan have a
**4.5 MB request body limit**. The current Express server allows 50 MB. For local
`next dev`, there is no enforced limit. For Vercel, large PDFs (> 4 MB) will fail on
the hobby plan. This is a **known regression** accepted as a deployment-tier constraint
— the app still works correctly for typical PDFs (< 4 MB) and in local dev.

**Resolution for 50 MB**: Users on Vercel Pro can increase limits via `vercel.json`
`"functions"` config. Documenting the 4.5 MB constraint in `quickstart.md` is
sufficient; no code change required.

---

## Decision 2: pdfjs-dist Worker Configuration in Next.js

**Question**: Does the existing `GlobalWorkerOptions.workerSrc` setup work in Next.js?

**Decision**: Yes, with one change: the worker must be loaded in a `'use client'`
component because it references `import.meta.url` (browser-only).

```typescript
// In a 'use client' component or layout:
import * as pdfjs from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();
```

This is identical to the current Vite setup. Next.js 15 supports `import.meta.url`
in client components.

**Rationale**: pdfjs-dist is a browser library; its worker initialization in a
`'use client'` component is the correct pattern in App Router. No additional Next.js
config is needed.

**Alternatives considered**:
- Dynamic import with `next/dynamic` for pdfjs — unnecessary complexity; the worker
  URL pattern already ensures browser-only execution.
- Using a CDN URL for the worker — introduces an external network dependency and
  breaks offline use.

---

## Decision 3: Unified Testing with Vitest

**Question**: Should we keep Jest for server tests + Vitest for client tests, or
unify under one runner?

**Decision**: **Unify under Vitest** for all tests (unit + API route tests).

Vitest can test Next.js API Route Handlers by importing the handler function directly
and calling it with a `Request` object:

```typescript
// tests/unit/generate-pdf.test.ts
import { POST } from '@/app/api/generate-pdf/route';

test('returns 400 for missing pdf', async () => {
  const form = new FormData();
  const res = await POST(new Request('http://localhost/api/generate-pdf', {
    method: 'POST',
    body: form,
  }));
  expect(res.status).toBe(400);
});
```

**Rationale**: Eliminates the Jest/Vitest dual-runner complexity. The `supertest`
dependency (Express-specific) is removed. Direct handler invocation in Vitest tests
the route logic with no HTTP server overhead — faster than supertest and fully
constitution-compliant (Constitution Principle VII).

**Alternatives considered**:
- Keep Jest for API route tests — requires a running Next.js server; adds test
  infrastructure complexity. Rejected.
- `@playwright/test` for API routes — integration-level, not unit-level; overkill
  for schema validation tests. Rejected.

---

## Decision 4: Shared Types — Location and Import Path

**Question**: How should `FormField` and `FontFamily` types be shared between the
API Route and client components in a single-project Next.js layout?

**Decision**: Move `shared/types.ts` → `src/types/shared.ts`. Configure `@` path
alias in `tsconfig.json` pointing to `./src`. Both the API route and client
components import from `@/types/shared`.

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

```typescript
// Usage everywhere:
import type { FormField, FontFamily } from '@/types/shared';
```

**Rationale**: Eliminates the npm workspace package (`pdf-form-editor-shared`) and
the associated alias hacks in both Vite config and tsconfig. The `@` alias is
Next.js's built-in convention — no configuration beyond tsconfig is needed.

**Alternatives considered**:
- Keep the workspace package — requires `package.json` workspaces setup in the new
  single project; unnecessary complexity. Rejected.
- Duplicate types in API route and client — violates Constitution Principle II. Rejected.

---

## Decision 5: CSS Strategy — Design Tokens + CSS Modules

**Question**: How to extract the 1,266-line `index.css` into design tokens and
component-scoped styles?

**Decision**: Two-step approach:

1. **Extract tokens** from `index.css` into `src/styles/tokens.css` as CSS custom
   properties. Import `tokens.css` once in `src/app/layout.tsx` (global scope).

2. **Decompose** the remaining rules into per-component `.module.css` files. Each
   component's CSS module imports tokens via `var(--token-name)`.

Identified token groups from existing `index.css`:

```css
/* src/styles/tokens.css */
:root {
  /* Colors */
  --color-primary: #4f46e5;
  --color-primary-hover: #4338ca;
  --color-danger: #dc2626;
  --color-dark-900: #111827;
  --color-dark-800: #1f2937;
  --color-neutral-500: #6b7280;
  --color-neutral-400: #9ca3af;
  --color-neutral-300: #d1d5db;
  --color-neutral-200: #e5e7eb;
  --color-surface: #f9fafb;
  --color-white: #fff;

  /* Typography */
  --font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-size-xs: 11px;
  --font-size-sm: 12px;
  --font-size-base: 13px;
  --font-size-md: 14px;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;

  /* Spacing (4px scale) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;

  /* Borders */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --border-color: var(--color-neutral-300);

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 2px 8px rgba(0,0,0,0.1);
  --shadow-lg: 0 4px 16px rgba(0,0,0,0.15);

  /* Z-index layers */
  --z-canvas: 0;
  --z-field-overlay: 10;
  --z-toolbar: 100;
  --z-modal: 200;
  --z-tooltip: 300;
}
```

**Rationale**: CSS Modules are built into Next.js with zero configuration. Extracting
tokens first makes the decomposition mechanical — each rule that referenced a
hardcoded color just changes to `var(--color-primary)`. Constitution Principles XI
and XII are satisfied together.

**Alternatives considered**:
- Tailwind CSS — would require rewriting all class names; scope creep beyond this
  feature. Rejected.
- CSS-in-JS (styled-components) — adds a runtime dependency; incompatible with
  Constitution Principle VI (YAGNI). Rejected.

---

## Decision 6: Package Structure — Single `package.json`

**Question**: How to consolidate 4 `package.json` files (root + client + server +
shared) into one?

**Decision**: Replace all 4 with a single `package.json` at the repository root.
All dependencies from client and server are merged. npm workspaces are removed.

**Key dependencies in merged `package.json`**:

| Category | Dependencies |
|----------|-------------|
| Runtime (client) | react, react-dom, @dnd-kit/core, @dnd-kit/utilities, pdfjs-dist |
| Runtime (API route) | pdf-lib |
| Framework | next |
| Dev | typescript, vitest, @testing-library/react, @vitejs/plugin-react, jsdom |

**Removed** (Express monorepo): `express`, `multer`, `tsx`, `concurrently`,
`supertest`, `jest`, `ts-jest`, `@types/express`, `@types/multer`, `@types/supertest`.

**Rationale**: Next.js manages both client and server build pipelines. No separate
build or dev scripts are needed for each workspace.

---

## Decision 7: Feature Boundaries and Cross-Feature Communication

**Question**: How do the current "global" hooks (`useFieldStore`, `useInteractionMode`)
map to the feature architecture?

**Decision**: Hooks that are consumed by more than one feature live in `src/hooks/`
(global). Hooks used exclusively within one feature live inside that feature's
`hooks/` subfolder.

**Classification**:

| Hook | Consumers | Location |
|------|-----------|----------|
| `useFieldStore` | canvas, toolbar, fields, templates, pdf | `src/hooks/` (global) |
| `useInteractionMode` | canvas, toolbar | `src/hooks/` (global) |
| `usePdfRenderer` | canvas only | `src/features/canvas/hooks/` |
| `useRubberBand` | canvas only | `src/features/canvas/hooks/` |
| `useFieldResize` | fields only | `src/features/fields/hooks/` |
| `useTemplateStore` | templates only | `src/features/templates/hooks/` |

Cross-feature communication goes only through `src/hooks/` global hooks — never
via direct feature-to-feature imports. Constitution Principle XIV enforced.

---

## Decision 8: `next.config.ts` Key Settings

**Decision**: Minimal configuration required:

```typescript
import type { NextConfig } from 'next';

const config: NextConfig = {
  // pdf-lib and pdfjs-dist use Node.js APIs not available in Edge Runtime
  // This is the default for App Router — explicit for documentation
  // serverExternalPackages ensures pdf-lib is not bundled into client
  serverExternalPackages: ['pdf-lib'],
};

export default config;
```

`pdfjs-dist` requires a `'use client'` boundary — no additional config needed.
Worker files in `pdfjs-dist/build/` are served from `node_modules` via Next.js's
static file handling.

**Vercel config** (`vercel.json`) simplifies to empty or minimal (no output
directory, no buildCommand — Next.js defaults handle everything):

```json
{}
```

---

## Summary Table

| Research Question | Decision | Key Constraint |
|-------------------|----------|----------------|
| File upload | `request.formData()` — no multer | 4.5 MB Vercel limit (hobby plan) |
| pdfjs-dist worker | Same URL pattern in `'use client'` | Must be in client component |
| Testing | Vitest unified (no Jest/supertest) | Direct handler invocation |
| Shared types | `src/types/shared.ts` + `@/` alias | npm workspace removed |
| CSS | tokens.css + CSS Modules | No Tailwind/CSS-in-JS |
| Package structure | Single `package.json` | Express + concurrently removed |
| Feature boundaries | Global hooks in `src/hooks/` | No cross-feature direct imports |
| Next.js config | `serverExternalPackages: ['pdf-lib']` | Edge runtime not supported |
