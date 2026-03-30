# Implementation Plan: Dark Mode with Manual Toggle

**Branch**: `008-dark-mode-toggle` | **Date**: 2026-03-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-dark-mode-toggle/spec.md`

## Summary

Add a dark mode to the application driven by CSS custom properties in `tokens.css`, with a `useTheme()` hook as the single read/write point, a sun/moon toggle button in the toolbar, localStorage persistence, FOUC prevention via an inline `<script>` in `<head>`, and explicit opt-out for PDF canvas field overlays so they remain white in both themes.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: Next.js 15 (App Router), React 18, CSS Modules, pdfjs-dist, pdf-lib
**Storage**: `localStorage` key `'pdf-editor-theme'` (client-side only)
**Testing**: Vitest + jsdom
**Target Platform**: Browser (modern Chromium/Firefox/Safari)
**Project Type**: Web application
**Performance Goals**: Theme switch < 100 ms (SC-002); zero FOUC frames (SC-004)
**Constraints**: No SSR theme read (inline script only); no server-side storage
**Scale/Scope**: Single-user client app; all theming is purely CSS custom properties

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I — Simplicity | ✅ | CSS custom properties + one hook; no new packages |
| II — TypeScript strict | ✅ | `useTheme` returns typed `'light' \| 'dark'`; no `any` |
| III — Component boundaries | ✅ | `useTheme` is the single boundary; components don't touch localStorage |
| IV — Operation ordering | ✅ | `data-theme` set before React hydration via inline script |
| V — Testing | ✅ | `useTheme` unit-tested; manual visual review for component tokens |
| VI — CSS Modules + tokens | ✅ | All colours via `tokens.css` custom properties; no hardcoded colours |
| VII — No orphan state | ✅ | Theme state lives only in `useTheme` + DOM attribute |
| VIII — No over-engineering | ✅ | One hook, one attribute, one CSS block |
| IX — Naming conventions | ✅ | `useTheme`, `ThemeToggle`, `--color-*` tokens |
| X — File structure | ✅ | Hook in `src/hooks/`, component in `src/features/toolbar/` |
| XI — Error boundaries | ✅ | localStorage errors caught and swallowed gracefully |
| XII — Accessibility | ✅ | Toggle has `aria-label` reflecting current state; WCAG AA contrast |
| XIII — Performance | ✅ | FOUC prevention ensures 0 ms of wrong theme |
| XIV — Security | ✅ | No user-supplied values evaluated; inline script is static |
| XV — Consistency | ✅ | One `tokens.css` source of truth for all colours |
| XXIII — Mandatory Dark Mode | ✅ | This feature implements the principle |

No violations. Complexity Tracking table omitted.

## Project Structure

### Documentation (this feature)

```text
specs/008-dark-mode-toggle/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
  app/
    layout.tsx                          # add inline anti-FOUC <script> to <head>
  hooks/
    useTheme.ts                         # NEW — theme read/write/reset; localStorage
  features/
    toolbar/
      components/
        ThemeToggle/
          ThemeToggle.tsx               # NEW — sun/moon IconButton; consumes useTheme
          ThemeToggle.module.css        # NEW — button layout styles
        ToolbarModes/
          ToolbarModes.tsx              # add ThemeToggle to right side of toolbar row
  styles/
    tokens.css                          # add dark-mode overrides for every colour token

tests/
  unit/
    useTheme.test.ts                    # NEW — unit tests for hook logic
```

**Structure Decision**: Single Next.js project (Option 1). No new packages; all changes are CSS + TypeScript within the existing `src/` tree.
