# Implementation Plan: Multi-Page PDF Navigation and Field Editing

**Branch**: `002-multipage-pdf-navigation` | **Date**: 2026-03-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-multipage-pdf-navigation/spec.md`

## Summary

Extends the existing PDF form editor with page navigation UI so users can work with multi-page PDFs. The backend (`pdfService.ts`) and shared data model (`FormField.page`) are already fully multi-page capable — no server changes are required. The `usePdfRenderer` hook already tracks `currentPage`, `setCurrentPage`, and `totalPages`. The primary deliverable is a `PageNavigator` component (Previous/Next buttons + "Página X de N" indicator) wired into `App.tsx`, plus a per-page dimension cache in `usePdfRenderer` to correctly handle mixed-size pages. A `ThumbnailStrip` component (P3) provides direct page jumping.

## Technical Context

**Language/Version**: TypeScript 5.x — Node.js 20 LTS (server), browser-compatible (client)
**Primary Dependencies**: React 18, Vite 5, Express 4, pdf-lib 1.x, pdfjs-dist 4.x, @dnd-kit/core — no new dependencies added
**Storage**: N/A — all state is in-memory in the browser session; no persistence
**Testing**: Vitest (frontend unit/component tests), Jest (backend unit/integration tests)
**Target Platform**: Modern web browser (Chrome 120+, Firefox 120+, Safari 17+) + Node.js 20 server
**Project Type**: Web application — monorepo (/client + /server)
**Performance Goals**: Page switch renders in under 2 seconds for typical PDFs; thumbnail strip renders lazily for PDFs >20 pages
**Constraints**: No new npm dependencies; reuse pdfjs-dist for thumbnails; AcroForm field names remain globally unique across all pages
**Scale/Scope**: Single-user local tool; PDFs up to 50 pages and 20 MB

## Constitution Check

The project constitution (`/.specify/memory/constitution.md`) contains only the default template placeholders — no project-specific principles have been ratified yet.

**Gate status**: No violations to check. Proceeding without blocking gates.

> When the constitution is filled in, re-run `/speckit.plan` to evaluate compliance.

## Project Structure

### Documentation (this feature)

```text
specs/002-multipage-pdf-navigation/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── generate-pdf.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code Changes (repository root)

All changes are additive to the existing structure. Files marked **NEW** or **MODIFIED**; everything else is unchanged.

```text
client/
├── src/
│   ├── components/
│   │   ├── PageNavigator/
│   │   │   └── PageNavigator.tsx     # NEW: Prev/Next buttons + "Página X de N"
│   │   ├── ThumbnailStrip/
│   │   │   └── ThumbnailStrip.tsx    # NEW (P3): clickable thumbnail panel
│   │   ├── FieldList/
│   │   │   └── FieldList.tsx         # MODIFIED: add page badge on each field row
│   │   └── PdfViewer/               # UNCHANGED
│   ├── hooks/
│   │   ├── usePdfRenderer.ts         # MODIFIED: add pageDimensionsMap cache
│   │   └── useFieldStore.ts          # UNCHANGED
│   └── App.tsx                       # MODIFIED: wire PageNavigator + ThumbnailStrip

server/                               # UNCHANGED (already multi-page capable)
shared/                               # UNCHANGED (FormField.page already present)

client/tests/
└── unit/
    ├── PageNavigator.test.tsx         # NEW
    └── ThumbnailStrip.test.tsx        # NEW (P3)
```

**Structure Decision**: Additive — no structural changes to the monorepo. Two new React components, one hook modification, one App.tsx wiring update. Zero server-side changes.

## Complexity Tracking

No constitution violations to justify.
