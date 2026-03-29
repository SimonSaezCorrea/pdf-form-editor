# Quickstart: Next.js Migration

**Branch**: `007-nextjs-migration`

---

## Prerequisites

- Node.js 20.x or later
- npm 10.x or later

---

## Local Development

```bash
# 1. Install dependencies (single package.json at root)
npm install

# 2. Start the development server
npm run dev
# → http://localhost:3000

# 3. Open the app
open http://localhost:3000
```

No second terminal needed. The Next.js dev server serves both the frontend and the
`/api/generate-pdf` endpoint.

---

## Build

```bash
npm run build
# → Produces .next/ directory (Next.js production build)
# → API routes compiled as Node.js serverless functions

npm run start
# → Serves the production build locally on port 3000
```

**Verify the build is clean before any deploy**:
```bash
npm run build 2>&1 | grep -E '(error|Error|warn)' | grep -v '^\[next\]'
# → Should output nothing (zero errors, zero migration warnings)
```

---

## Tests

```bash
# Run all tests (unit + integration)
npm test

# Watch mode during development
npm run test:watch

# Type-check only (no compilation output)
npm run typecheck
```

**Test structure**:
```
tests/unit/
├── canvas/
│   ├── usePdfRenderer.test.ts
│   └── useRubberBand.test.ts
├── fields/
│   ├── fieldName.test.ts
│   ├── useFieldStore.test.ts
│   └── useFieldResize.test.ts
├── pdf/
│   ├── coordinates.test.ts
│   └── extractFields.test.ts
└── api/
    ├── generate-pdf.test.ts   # Tests POST handler directly (no supertest)
    └── pdfService.test.ts
```

---

## Vercel Deployment

```bash
# First time: install Vercel CLI
npm i -g vercel

# Deploy (from project root)
vercel

# Production deploy
vercel --prod
```

**No `vercel.json` required.** Next.js + Vercel zero-config works out of the box.
The `api/generate-pdf` route is automatically deployed as a serverless function.

**Known constraint**: Vercel hobby plan limits API function request bodies to **4.5 MB**.
PDFs larger than ~4 MB will fail with a 413 error on the Vercel hobby plan. Local
development (`npm run dev`) has no such limit.

---

## Environment Variables

No environment variables are required for basic operation. The app runs entirely
client-side + serverless with no external service dependencies.

If you need to override defaults, create `.env.local` at the project root:

```env
# Optional: change the server port (default: 3000)
PORT=3001
```

---

## Validation Checklist (Post-Migration)

Run these checks before marking the feature complete:

```bash
# 1. Build passes with no errors
npm run build

# 2. All tests pass
npm test

# 3. No hardcoded colors outside tokens.css
grep -rn '#[0-9a-fA-F]\{3,6\}' src/ --include='*.ts' --include='*.tsx' \
  | grep -v 'tokens.css' | grep -v '// allow'
# → Should return nothing

# 4. No <button> elements outside ui/
grep -rn '<button' src/ --include='*.tsx' \
  | grep -v 'src/components/ui/'
# → Should return nothing

# 5. No component exceeds 150 lines
find src -name '*.tsx' | xargs wc -l | awk '$1 > 150 {print}' | grep -v ' total'
# → Should return nothing

# 6. Every feature folder has an index.ts
for f in canvas toolbar fields templates pdf; do
  [ -f "src/features/$f/index.ts" ] && echo "✅ $f" || echo "❌ MISSING: $f/index.ts"
done

# 7. No cross-feature imports
grep -rn 'from.*features/' src/features/ --include='*.ts' --include='*.tsx' \
  | grep -v 'from.*hooks/' | grep -v 'from.*components/ui/'
# → Should return nothing
```

---

## Key Differences from the Old Monorepo

| Topic | Before | After |
|-------|--------|-------|
| Start dev | `npm run dev` (starts 2 processes) | `npm run dev` (1 process) |
| API URL | `http://localhost:3002/api/generate-pdf` | `http://localhost:3000/api/generate-pdf` |
| Build | `npm run build -w client && npm run build -w server` | `npm run build` |
| Test | `npm run test -w client && npm run test -w server` | `npm test` |
| Deploy | Static client only; server not deployed | Full app on Vercel |
| Type imports | `import from 'pdf-form-editor-shared'` | `import from '@/types/shared'` |
