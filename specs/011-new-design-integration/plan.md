# Implementation Plan: New Design System Integration + Feature Enhancements

**Branch**: `011-new-design-integration` | **Date**: 2026-05-27 | **Spec**: [spec.md](./spec.md)

## Summary

**Phase A (COMPLETE)**: CSS-only migration — dark-first teal tokens, Geist font, all component CSS Modules restyled, Kbd primitive, ThemeToggle prop-driven, showEditorToolbar wiring. Tasks T001–T036 done.

**Phase B (IN PROGRESS)**: Functional enhancements from the `new-design/prototype/` files:
- Editor: field types with colors, undo/redo, alignment bar, snap guides, enhanced context menu, field locking, collapsible PropertiesPanel, insert banner, canvas empty state
- Landing: hero section, CTA button, quick-row, vignette, footer shortcuts
- Filler: collapsible sections with progress, required validation, autosave, jump-to-next-empty, Vista final toggle, click-to-focus, PDF auto-scroll, formatted display values, reset confirmation

## Technical Context

**Language/Version**: TypeScript 5.7.2 + React 18  
**Primary Dependencies**: Next.js 15 (App Router), CSS Modules, Zustand (useFieldStore), pdfjs-dist, pdf-lib  
**Storage**: localStorage for filler autosave (`pdf-filler-draft-v1`); no new backend routes  
**Testing**: Vitest + @testing-library/react; existing suite unchanged  
**Performance**: Undo stack capped at 50 snapshots; snap guide computation O(n) where n = fields  
**Constraints**: Zero new npm dependencies; no API route changes

## Constitution Check (Phase B)

| Principle | Gate | Status |
|-----------|------|--------|
| I — Client/Server Separation | No new API routes; all features are client-side | ✅ PASS |
| II — Shared Types Contract | `FormField` gets `fieldType?` and `locked?` (both optional, backward compatible) | ✅ PASS |
| III — Ephemeral Filler State | `useFillerStore` stays `useState` local to `FillerMode` — filler state is ephemeral by design. Autosave is to localStorage, not store | ✅ PASS |
| VI — YAGNI | `AlignBar` and `SnapGuides` are high-value, directly prototyped features; not speculative | ✅ PASS |
| VII — Test Discipline | New pure functions (`alignSelected`, `distributeSelected`, `computeSnapGuides`, `findNextEmpty`) get unit tests | ✅ REQUIRED |
| XI — CSS per Component | Banner, empty state, snap guides styles go into existing feature CSS Modules | ✅ PASS |
| XIII — Reusable Base Components | `AlignBar` goes in `src/features/fields/components/`; not a generic primitive | ✅ PASS |
| XXIX — Filler Independence | Filler changes stay within `src/features/filler/`; no imports from `fields/` or `templates/` | ✅ PASS |

## Project Structure — New Files (Phase B)

```text
src/
├── features/
│   ├── fields/
│   │   ├── config/
│   │   │   └── fieldTypes.ts          ← NEW: FIELD_TYPE_CONFIG constant
│   │   ├── components/
│   │   │   ├── AlignBar/
│   │   │   │   ├── AlignBar.tsx       ← NEW: alignment + distribute buttons
│   │   │   │   └── AlignBar.module.css
│   │   │   ├── DraggableField/
│   │   │   │   └── DraggableField.tsx ← MODIFY: fieldType color, lock icon, inline rename
│   │   │   ├── FieldList/
│   │   │   │   └── FieldList.tsx      ← MODIFY: type badge, group name
│   │   │   └── PropertiesPanel/
│   │   │       └── PropertiesPanel.tsx ← MODIFY: collapsible sections, fieldType select
│   ├── canvas/
│   │   └── components/
│   │       └── PdfViewer/
│   │           └── PdfViewer.tsx      ← MODIFY: snap guides, group move uses fieldType color
│   ├── toolbar/
│   │   └── components/
│   │       └── ToolbarModes/
│   │           └── ToolbarModes.tsx   ← MODIFY: type chips, insert mode UX
│   ├── pdf/
│   │   └── components/
│   │       └── PdfUploader/
│   │           └── PdfUploader.tsx    ← MODIFY: hero section, CTA button, quick-row
│   └── filler/
│       ├── useFillerStore.ts          ← MODIFY: add collapsed, lastSaved, finalPreview, isDirty
│       ├── components/
│       │   ├── FillerLayout/
│       │   │   └── FillerLayout.tsx   ← MODIFY: click-to-focus, autoscroll, Vista final, sections
│       │   ├── DynamicForm/
│       │   │   └── DynamicForm.tsx    ← MODIFY: sections, progress, validation, jump, autosave pill
│       │   └── PdfUploadScreen/
│       │       └── PdfUploadScreen.tsx ← MODIFY: hero section, CTA button
├── hooks/
│   └── useFieldStore.ts               ← MODIFY: undo/redo stacks, isDirty, bringToFront, sendToBack, locked
├── types/
│   └── shared.ts                      ← MODIFY: FormField + fieldType?, locked?; FieldTypeId type
├── App.tsx                            ← MODIFY: isDirty pill, undo/redo keybindings, AlignBar wiring
```

## Affected Files — Modified (Phase B)

| File | Change |
|------|--------|
| `src/types/shared.ts` | Add `fieldType?: FieldTypeId`, `locked?: boolean` to `FormField` |
| `src/hooks/useFieldStore.ts` | Add `undoStack`, `redoStack`, `isDirty`, `bringToFront`, `sendToBack`, `locked` toggle |
| `src/App.tsx` | Add Ctrl+Z/Shift+Z handler, AlignBar conditional, isDirty pill |
| `src/features/fields/components/DraggableField/DraggableField.tsx` | fieldType color, lock badge, inline rename input |
| `src/features/fields/components/FieldList/FieldList.tsx` | Type badge chip, group name row |
| `src/features/fields/components/PropertiesPanel/PropertiesPanel.tsx` | Collapsible sections, fieldType selector |
| `src/features/canvas/components/PdfViewer/PdfViewer.tsx` | Snap guides render layer, computeSnapGuides |
| `src/features/toolbar/components/ToolbarModes/ToolbarModes.tsx` | Type chips, insert type state, banner |
| `src/features/pdf/components/PdfUploader/PdfUploader.tsx` | Hero, CTA, quick-row, vignette, footer |
| `src/features/filler/useFillerStore.ts` | collapsed, lastSaved, finalPreview, isDirty, resetValues |
| `src/features/filler/components/FillerLayout/FillerLayout.tsx` | Click targets, Vista final, PDF auto-scroll |
| `src/features/filler/components/DynamicForm/DynamicForm.tsx` | Sections+progress, jump, autosave pill, validation banner, reset confirm |
| `src/features/filler/components/PdfUploadScreen/PdfUploadScreen.tsx` | Hero, CTA, filler-specific copy |

## New Files (Phase B)

| File | Purpose |
|------|---------|
| `src/features/fields/config/fieldTypes.ts` | `FIELD_TYPE_CONFIG`: id, label, short, color per type |
| `src/features/fields/components/AlignBar/AlignBar.tsx` | Alignment + distribute action bar |
| `src/features/fields/components/AlignBar/AlignBar.module.css` | AlignBar styles |

## Complexity Tracking (Phase B)

| Item | Why Needed | Simpler Alternative Rejected |
|------|------------|------------------------------|
| Undo/Redo history stack in `useFieldStore` | Most-requested UX; 50-snapshot cap keeps memory bounded | Zustand temporal middleware: adds a dependency; overkill for this use case |
| `FIELD_TYPE_CONFIG` constant | Single source of truth for type colors and labels; referenced by DraggableField, FieldList, ToolbarModes, PropertiesPanel | Inlining per component creates drift risk when adding new types |
| `AlignBar` as separate component | 12+ buttons with SVG icons; better isolated | Inline in App.tsx: too noisy in the root component |
| Snap guides in PdfViewer | High UX value for precision field placement | Skip entirely: acceptable for MVP but the prototype shows it as a core feature |
| Filler autosave (localStorage) | Draft survival across page reloads is essential for long forms | Session storage only: lost on tab close, worse UX |

## Execution Order (Phase B)

```
Phase 9:  Data model (shared.ts FieldTypeId, FormField extensions)
Phase 10: useFieldStore (undo/redo, isDirty, bringToFront, sendToBack, locked)
Phase 11: FIELD_TYPE_CONFIG + DraggableField fieldType color + FieldList badge
Phase 12: ToolbarModes type chips + insert banner
Phase 13: AlignBar + PropertiesPanel collapsible sections + snap guides
Phase 14: App.tsx undo keybindings + isDirty pill + AlignBar wiring
Phase 15: PdfUploader hero + CTA + quick-row + vignette (landing screen)
Phase 16: useFillerStore extensions (collapsed, lastSaved, finalPreview, isDirty)
Phase 17: DynamicForm sections + progress + jump + autosave pill + validation banner
Phase 18: FillerLayout click-to-focus + Vista final toggle + PDF auto-scroll
Phase 19: PdfUploadScreen filler hero
Phase 20: Tests + typecheck + build
```

## Notes on Filler Independence (Principle XXIX)

- `DynamicForm` must detect field groups from `AcroFormField.group?` — this field needs to be added to `AcroFormField` in `src/features/filler/types.ts` (NOT to `FormField` in `shared.ts`).
- Group derivation heuristic: split `fieldName` on `_` and take the first segment as a candidate group name. If `fieldName` has no `_`, use "General" as the group.
- `useFillerStore` holds `collapsed`, `lastSaved`, `finalPreview` as `useState` inside `FillerMode` (not global Zustand) — preserving Principle III (ephemeral filler state).
