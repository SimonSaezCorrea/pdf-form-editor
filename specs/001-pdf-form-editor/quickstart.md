# Quickstart: PDF Form Editor

**Branch**: `001-pdf-form-editor` | **Date**: 2026-03-26

---

## Prerequisites

- Node.js 20 LTS (`node --version` → `v20.x.x`)
- npm 10+ (comes with Node 20)

---

## Project Bootstrap

```bash
# 1. Clone and enter the repo
git clone <repo-url>
cd pdf-form-editor
git checkout 001-pdf-form-editor

# 2. Install all workspace dependencies
npm install

# 3. Start development servers (client + server concurrently)
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3002

---

## Directory Structure

```text
pdf-form-editor/
├── client/           # React 18 + Vite frontend
├── server/           # Express backend
├── shared/           # Shared TypeScript types
└── package.json      # Root workspace config
```

---

## Development Commands

```bash
# Run everything (recommended during development)
npm run dev

# Frontend only
npm run dev -w client

# Backend only
npm run dev -w server

# Run all tests
npm test

# Frontend tests (Vitest)
npm test -w client

# Backend tests (Jest)
npm test -w server

# Type-check all packages
npm run typecheck
```

---

## Environment

No `.env` file needed. Both ports are hardcoded defaults:

| Service | Default Port | Override |
|---------|-------------|---------|
| Vite dev server | 5173 | `VITE_PORT` |
| Express server | 3002 | `PORT` |

The Vite dev server proxies `/api/*` requests to `localhost:3002` — no CORS configuration needed in development.

---

## Testing an Export Manually

```bash
# With a local PDF file:
curl -X POST http://localhost:3002/api/generate-pdf \
  -F "pdf=@./test-fixtures/sample.pdf" \
  -F 'fields=[{"id":"1","name":"full_name","page":1,"x":72,"y":680,"width":200,"height":24,"fontSize":12,"fontFamily":"Helvetica"}]' \
  --output result.pdf

# Open result.pdf in your PDF reader and verify the form field is present and fillable
```

---

## Key Implementation Notes

- **Coordinate system**: All `x`, `y`, `width`, `height` values in `FormField` are in **PDF points**, bottom-left origin. See `client/src/utils/coordinates.ts` and `research.md § 3`.
- **pdfjs worker**: The Vite config copies `pdfjs-dist/build/pdf.worker.min.js` to the public directory. Do not import the worker inline — it must be a separate file for performance.
- **Field name uniqueness**: The UI warns on duplicate names; the server returns HTTP 400 for duplicates.
- **Font embedding**: Call `textField.updateAppearances(embeddedFont)` after `addToPage` for each field, otherwise the appearance stream is missing and some PDF readers won't render the text.

---

## Architecture Decision Quick Reference

| Decision | Choice | See |
|----------|--------|-----|
| DnD library | @dnd-kit/core | research.md § 1 |
| PDF rendering | pdfjs-dist → canvas | research.md § 2 |
| Coordinate conversion | canvas px ↔ PDF pts | research.md § 3 |
| AcroForm embedding | pdf-lib 1.x | research.md § 4 |
| Monorepo setup | npm workspaces | research.md § 5 |
| Upload format | multipart/form-data | research.md § 6 |
