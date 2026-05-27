# Implementation Plan: New Design System Integration

**Branch**: `011-new-design-integration` | **Date**: 2026-05-27 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/011-new-design-integration/spec.md`

## Summary

Migrate all production UI styles to match the `new-design/` system (dark-first teal palette, Geist variable font, comprehensive token ramp, restyled primitives). Zero functional changes — all hooks, stores, API routes, and PDF logic are preserved exactly. The migration is layered: token foundation → primitives → app shell → feature components → filler → typography/animation polish.

## Technical Context

**Language/Version**: TypeScript 5.7.2 + React 18  
**Primary Dependencies**: Next.js 15 (App Router), CSS Modules, pdfjs-dist (unchanged), pdf-lib (unchanged)  
**Storage**: N/A (session-only state per Principle III)  
**Testing**: Vitest + @testing-library/react (existing suite must pass unchanged)  
**Target Platform**: Web browser (desktop), deployed to Vercel  
**Project Type**: Web application — single Next.js project  
**Performance Goals**: Theme toggle < 50ms (no FOUC); no render-blocking from Geist font load (woff2 preload)  
**Constraints**: Zero new npm dependencies; Geist via local `.woff2`; no changes to TypeScript logic  
**Scale/Scope**: ~15 component CSS Modules + 1 tokens.css replacement + 1 new primitive (`Kbd`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| XI — CSS per Component | New `enhancements.css` keyframes go into feature `.module.css` files, NOT a new global file | ✅ PASS |
| XII — Design Tokens | `tokens.css` is being upgraded (not bypassed); all hex values stay in tokens | ✅ PASS |
| XXIII — Mandatory Dark Mode | New token set supports both modes; dark-first is compliant with the `[data-theme]` mechanism | ✅ PASS |
| XIII — Reusable Base Components | `Kbd` added to `src/components/ui/` — new primitive, not a re-implementation | ✅ PASS |
| VI — YAGNI | `Kbd` has 1 call-site (ShortcutsPanel). Justified: it is a design-system visual primitive per Principle XIII, not a logic abstraction. Documented in Complexity Tracking. | ✅ JUSTIFIED |
| I, X — Client/Server Separation | No API route touched | ✅ PASS |
| VII — Test Discipline | No new pure functions or components with logic; existing tests unmodified | ✅ PASS |
| II — Shared Types Contract | `FormField` in `shared.ts` unchanged | ✅ PASS |

**Gate result: PASS — proceed to Phase 0.**

*Post-design re-check*: After Phase 1, verify that `app.css` content from the UI kit is split correctly into component CSS Modules (not introduced as a new global file).

## Project Structure

### Documentation (this feature)

```text
specs/011-new-design-integration/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output (token schema)
├── quickstart.md        ← Phase 1 output
├── checklists/
│   └── requirements.md
└── tasks.md             ← Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (affected files)

```text
src/
├── styles/
│   ├── tokens.css          ← REPLACE (full rewrite)
│   └── fonts/
│       └── Geist_wght_.woff2    ← ADD (copy from new-design/fonts/)
├── components/
│   └── ui/
│       ├── Button/Button.module.css       ← RESTYLE
│       ├── IconButton/IconButton.module.css  ← RESTYLE
│       ├── Input/Input.module.css         ← RESTYLE
│       ├── Select/Select.module.css       ← RESTYLE
│       ├── Modal/Modal.module.css         ← RESTYLE
│       ├── Tooltip/Tooltip.module.css     ← RESTYLE
│       └── Kbd/                           ← ADD NEW
│           ├── Kbd.tsx
│           ├── Kbd.module.css
│           └── index.ts
├── features/
│   ├── canvas/
│   │   ├── PdfViewer.module.css           ← RESTYLE
│   │   └── ThumbnailStrip.module.css      ← RESTYLE
│   ├── toolbar/
│   │   ├── ToolbarModes.module.css        ← RESTYLE
│   │   ├── ShortcutsPanel.module.css      ← RESTYLE (+ Kbd usage in TSX)
│   │   └── ThemeToggle/ThemeToggle.tsx    ← PROP-DRIVEN refactor
│   ├── fields/
│   │   ├── DraggableField.module.css      ← RESTYLE
│   │   ├── FieldOverlay.module.css        ← RESTYLE
│   │   ├── FieldList.module.css           ← RESTYLE
│   │   └── PropertiesPanel.module.css     ← RESTYLE
│   ├── filler/
│   │   ├── FillerLayout.module.css        ← RESTYLE
│   │   └── DynamicForm.module.css         ← RESTYLE (uses Input primitive)
│   └── pdf/
│       └── PdfUploader.module.css         ← RESTYLE (+ icon-document.svg ref)
├── App.tsx                                ← state wiring: showEditorToolbar, mode nav
├── App.module.css                         ← navbar bg, viewer bg tokens
└── assets/
    └── icon-document.svg                  ← ADD (copy from new-design/assets/)

new-design/   ← READ ONLY reference; not imported by build
```

**Structure Decision**: Single Next.js project (Option 1). Token migration affects only CSS files; no directory restructuring needed.

## Complexity Tracking

| Item | Why Needed | Simpler Alternative Rejected Because |
|------|------------|--------------------------------------|
| `Kbd` primitive (1 call-site) | Part of the new design system's component set (Principle XIII); ShortcutsPanel needs it for visual consistency | Inline `<span>` would require re-implementing key-cap styling at each usage point when other panels adopt shortcuts display |
| Token strategy inversion (dark-first) | New design system is dark-first; keeping light-first would require maintaining two parallel token sets | Light-first with `[data-theme="dark"]` override has been the source of cascading specificity bugs in the existing code |
| `showEditorToolbar` prop in App.tsx | Required by new design's conditional toolbar rendering | Keeps toolbar always visible as-is → defeats new design's cleaner filler-mode UX |
