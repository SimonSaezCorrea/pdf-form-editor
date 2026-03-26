# Implementation Plan: PDF Form Editor

**Branch**: `001-pdf-form-editor` | **Date**: 2026-03-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-pdf-form-editor/spec.md`

## Summary

A web-based, sessionless tool that lets non-technical users visually place AcroForm text fields onto any PDF by dragging them on a rendered page preview, then exporting the annotated PDF. The monorepo splits into a React 18 + TypeScript frontend (Vite, pdfjs-dist for rendering, @dnd-kit for drag-and-drop) and a Node.js + Express backend (pdf-lib for AcroForm embedding). All state lives in the browser; the backend exposes a single PDF-generation endpoint.

## Technical Context

**Language/Version**: TypeScript 5.x — Node.js 20 LTS (server), browser-compatible (client)
**Primary Dependencies**: React 18, Vite 5, Express 4, pdf-lib 1.x, pdfjs-dist 4.x, @dnd-kit/core, @dnd-kit/utilities
**Storage**: N/A — all state is in-memory in the browser session; no persistence
**Testing**: Vitest (frontend unit/component tests), Jest (backend unit/integration tests)
**Target Platform**: Modern web browser (Chrome 120+, Firefox 120+, Safari 17+) + Node.js 20 server
**Project Type**: Web application — monorepo (/client + /server)
**Performance Goals**: PDF export response under 3 seconds for PDFs up to 20 pages; field drag interaction at 60 fps
**Constraints**: No authentication, no database, single-session workflow, AcroForm-compatible output (pdf-lib standard fonts only for v1)
**Scale/Scope**: Single-user local tool; no concurrency requirements

## Constitution Check

The project constitution (`/.specify/memory/constitution.md`) contains only the default template placeholders — no project-specific principles have been ratified yet.

**Gate status**: No violations to check. Proceeding without blocking gates.

> When the constitution is filled in, re-run `/speckit.plan` to evaluate compliance.

## Project Structure

### Documentation (this feature)

```text
specs/001-pdf-form-editor/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── generate-pdf.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
client/
├── src/
│   ├── components/
│   │   ├── PdfViewer/        # PDF canvas renderer + overlay container
│   │   ├── FieldOverlay/     # Draggable field elements on canvas
│   │   ├── FieldList/        # Sidebar list of all placed fields
│   │   └── PropertiesPanel/  # Form to edit selected field properties
│   ├── hooks/
│   │   ├── usePdfRenderer.ts # pdfjs-dist page rendering logic
│   │   └── useFieldStore.ts  # Field CRUD state management
│   ├── utils/
│   │   └── coordinates.ts    # Canvas-pixel ↔ PDF-point conversion
│   ├── types/
│   │   └── index.ts          # Shared FormField type (mirrors shared/)
│   └── App.tsx
├── tests/
│   └── unit/
└── vite.config.ts

server/
├── src/
│   ├── routes/
│   │   └── generatePdf.ts    # POST /api/generate-pdf handler
│   ├── services/
│   │   └── pdfService.ts     # pdf-lib AcroForm embedding logic
│   └── index.ts
└── tests/
    └── unit/

shared/
└── types.ts                  # FormField interface shared by client + server
```

**Structure Decision**: Web application monorepo (Option 2) with a `/shared` package for the FormField type contract. No build tool orchestration (Turborepo/Nx) needed — root `package.json` workspace scripts suffice for this single-feature tool.

## Complexity Tracking

No constitution violations to justify.
