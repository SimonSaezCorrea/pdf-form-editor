# Implementation Plan: Canvas Toolbar — Interaction Modes

**Branch**: `006-canvas-toolbar-modes` | **Date**: 2026-03-27 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `.specify/features/006-canvas-toolbar-modes/spec.md`

---

## Summary

Add a visible toolbar with four mutually-exclusive interaction modes (Select, Insert, Move, Pan), multi-field selection via Shift+click / rubber band / Ctrl+A, group move for selected fields, and a multi-selection properties panel showing "—" for mixed font values. All changes are client-only — no server or shared-types changes required.

---

## Technical Context

**Language/Version**: TypeScript 5.x + React 18
**Primary Dependencies**: React 18, @dnd-kit/core, pdfjs-dist (client) — no new dependencies
**Storage**: N/A (session-only React state per Constitution §III)
**Testing**: Vitest + @testing-library/react (client unit/component tests)
**Target Platform**: Web browser (SPA, desktop-first)
**Project Type**: Web application (client-only feature)
**Performance Goals**: Group move must apply the same delta to all selected fields with no visible lag for groups of up to 50 fields
**Constraints**: No new npm dependencies; TypeScript strict mode throughout; all event-blocking must stop both `onPointerDown` and `onMouseDown` (Constitution §VII)
**Scale/Scope**: Client-only; single user; multi-page PDF support required

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Client/Server Separation | ✅ PASS | All changes are client-only; no server files touched |
| II. Shared-Types Contract | ✅ PASS | `InteractionMode` is client-only UI state — not a cross-boundary type; no `FormField` changes required |
| III. Session-Only State | ✅ PASS | Mode + selection are ephemeral `useState` — not persisted |
| IV. AcroForm Standard Output | ✅ PASS | Export pipeline unaffected |
| V. TypeScript Strict Mode | ✅ PASS | No `any`; `InteractionMode` as a string literal union type |
| VI. YAGNI | ✅ PASS | Each new hook/component has exactly 1 call site; no speculative abstraction. See rationale in research.md §5 |
| VII. Test Discipline | ✅ PASS | Rubber band intersection math → Vitest unit test; ToolbarModes interaction → @testing-library/react; event-blocking: both `onPointerDown` + `onMouseDown` on rubber band start per §VII |
| VIII. No Authentication | ✅ PASS | Unaffected |

**Gate result**: All gates pass. Phase 0 research authorized.

---

## Project Structure

### Documentation (this feature)

```text
.specify/features/006-canvas-toolbar-modes/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output (N/A — no new env setup)
└── tasks.md             ← Phase 2 output (/speckit.tasks — not yet created)
```

### Source Code (repository root)

```text
client/
  src/
    components/
      ToolbarModes/
        ToolbarModes.tsx        # NEW (006): 4 mode buttons, active highlight
      PdfViewer/
        PdfViewer.tsx           # MODIFIED (006): mode-aware overlay, rubber band div, group move in handleDragEnd
      FieldOverlay/
        DraggableField.tsx      # MODIFIED (006): disabled prop from mode, isSelected via selectionIds
      PropertiesPanel/
        PropertiesPanel.tsx     # MODIFIED (006): multi-selection mode with "—" for mixed values
    hooks/
      useInteractionMode.ts     # NEW (006): InteractionMode state + keyboard shortcuts (S/I/M/H/Escape)
      useRubberBand.ts          # NEW (006): rubber band drag rect state + intersection logic
      useFieldStore.ts          # MODIFIED (006): selectionIds replaces selectedFieldId; updateFields() for bulk
    App.tsx                     # MODIFIED (006): wires mode + multi-selection; Ctrl+A shortcut
    index.css                   # MODIFIED (006): .toolbar-modes, .mode-btn, .rubber-band-rect styles
  tests/unit/
    rubberBand.test.ts          # NEW (006): intersectsRect() pure function unit tests
    ToolbarModes.test.tsx       # NEW (006): mode switching + keyboard shortcut component tests

server/                         # UNCHANGED
shared/                         # UNCHANGED
```

**Structure Decision**: Single-project monorepo (Option 1). Only `client/` is modified. The new `ToolbarModes` component follows the existing PascalCase one-folder-per-component convention. New hooks follow the `use{Name}.ts` camelCase convention. All styles go into `client/src/index.css`.

---

## Complexity Tracking

> No constitution violations to justify.

---

## Implementation Notes (from research.md)

Key decisions distilled from Phase 0:

1. **Mode state lives in `useInteractionMode`** (new hook, consumed by App.tsx) — not in `useFieldStore`. Mode is not tied to field data; it is UI-only. App.tsx passes `mode` as a prop to `PdfViewer` and `ToolbarModes`.

2. **`selectedFieldId` → `selectionIds: ReadonlySet<string>`** in `useFieldStore`. A computed getter `selectedFieldId` is derived as: `selectionIds.size === 1 ? [...selectionIds][0] : null`. All existing consumers that read `selectedFieldId` continue to work. `isSelected` prop in `DraggableField` becomes `selectionIds.has(field.id)`.

3. **`updateFields(ids: string[], partial)` added to `useFieldStore`** for bulk font/size edits from the multi-selection properties panel.

4. **Rubber band is native pointer events** on the field-overlay, NOT @dnd-kit. Rubber band `onPointerDown` on the overlay (when no field is hit) sets `isDrawing = true`. `pointermove` on `document` updates the rect. `pointerup` on `document` computes `intersectsRect()` for each field and calls `setSelection`. The rubber band div renders as `position: absolute; pointer-events: none` inside the overlay.

5. **Group move via @dnd-kit `onDragEnd`**: `handleDragEnd` in `PdfViewer` receives `selectionIds` from the store. If `selectionIds.size > 1` and the dragged field is in the selection, apply the same `delta` to all selected fields via `updateFields`.

6. **@dnd-kit `disabled` per field**: `useDraggable({ id, disabled })`. Disabled when: `mode === 'pan'`. In Select mode, @dnd-kit is active on all fields (group move handles the multi case). In Move mode, @dnd-kit is active on all fields (no selection required). In Insert mode, @dnd-kit is active (user may still want to reposition accidentally placed fields). Drag in Pan mode would conflict with viewport scrolling.

7. **Pan mode**: `onPointerDown` on the `pdf-canvas-container` starts scroll tracking. `pointermove` on `document` updates `scrollLeft`/`scrollTop` of the container's scroll parent. `pointerup` cleans up. Cursor is `grab` while idle, `grabbing` while dragging.

8. **`ToolbarModes` toolbar position**: Rendered inside `<header class="app-header">` in App.tsx, to the right of the filename and left of the action buttons — only when a PDF is loaded.

9. **Ctrl+A shortcut**: Added to the existing `keydown` handler in App.tsx. Calls `store.selectAll(currentPage)` — a new method added to `useFieldStore`.

10. **Resize handles visibility**: `ResizeHandles` is rendered only when `selectionIds.size === 1` (i.e., exactly one field is selected). The condition in `DraggableField` changes from `isSelected && <ResizeHandles ...>` to `isSelected && selectionIds.size === 1 && <ResizeHandles ...>`. Since `DraggableField` receives `isSelected = selectionIds.has(field.id)`, it also needs to receive `isSingleSelection: boolean` so it knows whether handles should show.
