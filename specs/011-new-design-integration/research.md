# Research: New Design System Integration + Feature Enhancements

**Branch**: `011-new-design-integration` | **Date**: 2026-05-27

---

## Phase A Research (CSS Migration) — COMPLETE

### R-001: Token Strategy Inversion (Dark-First)

**Decision**: `:root` = dark defaults; `[data-theme="light"]` = light overrides. Anti-FOUC inline script unchanged.

**Rationale**: New design system is dark-first. The `[data-theme]` attribute is already the hook used by the anti-FOUC script — no conflict. `@media (prefers-color-scheme: dark)` removed because dark is now the root default.

---

### R-002: Geist Font Integration

**Decision**: Copy `new-design/fonts/Geist_wght_.woff2` → `public/fonts/Geist_wght_.woff2`. Declare `@font-face` in `tokens.css`. Not `next/font/local`.

**Rationale**: Single `@font-face` in `tokens.css` (imported globally by `layout.tsx`). No CDN dependency. `next/font/local` would require modifying `layout.tsx` and could conflict with the existing `@font-face`.

---

### R-003: `showEditorToolbar` App.tsx

**Decision**: Derived boolean `!!pdfBytes && appMode === 'editor'`. NOT new state. ThemeToggle made prop-driven.

**Rationale**: Conditional toolbar visibility required by new design. Derivation is sufficient — no new state needed.

---

### R-004: Kbd Primitive

**Decision**: New primitive at `src/components/ui/Kbd/`. Justified as design-system component (Principle XIII). One call-site (ShortcutsPanel).

---

## Phase B Research (Feature Enhancements)

### R-101: Undo/Redo Architecture

**Decision**: Store snapshots of the full `fields: FormField[]` array in `undoStack` and `redoStack` inside `useFieldStore`. Max depth 50.

**Rationale**: The simplest correct approach for this data size (typical PDF form: 5–30 fields, each ~200 bytes → 50 snapshots ≈ 300KB worst case, acceptable).

**Alternatives rejected**:
- Command pattern (delta per action): More complex to implement; every action type needs encode/decode. For this field count, snapshot is simpler and equally performant.
- Zustand temporal middleware (`zustand/middleware/temporal`): Adds a runtime dependency for a single feature; overkill.
- Immer + patches: Also adds a dependency; same complexity as command pattern.

**Implementation note**: Snapshot is pushed in `recordHistory(fields)` before mutating. `set()` call follows immediately after. `undo()` and `redo()` must update both stacks atomically using Zustand's `set()` — no double-render.

**Drag/resize**: A drag or resize operation produces many micro-mutations. To avoid recording 100 snapshots per drag, record ONE snapshot on `pointerdown` (drag start / resize start) and suppress subsequent recordings during the same gesture. Use a `dragging: boolean` flag in the store that is set on start and cleared on `pointerup`.

---

### R-102: Field Type Color System

**Decision**: Field type colors are hardcoded in `FIELD_TYPE_CONFIG` — not in `tokens.css`. Colors are decorative/categorical, not semantic. They follow the accent palette of the design system but are type-specific constants.

**Rationale**: Semantic tokens are for theme-aware UI. Type colors are categorical constants (like tag colors in a kanban) — they don't change with dark/light mode. Hardcoding avoids adding 5+ tokens to `tokens.css` for a specific feature.

**Type color palette** (consistent with prototype `editor/app.jsx`):
```
text      → #66A5AD (teal primary — already the brand color, most common type)
number    → #F4A261 (warm coral — the accent color)
date      → #a78bfa (purple — neutral distinguisher)
checkbox  → #22c55e (green — positive/boolean association)
signature → #ec4899 (pink — unique, memorable)
```

---

### R-103: Snap Guides Algorithm

**Decision**: Compute candidate axes from all non-dragged fields during `mousemove`. Threshold: 4px in canvas-pixel space. Render as 1px magenta lines on the `FieldOverlay` canvas.

**Rationale**: The prototype's `computeGuides` function is the reference (editor/app.jsx lines 63–89). The approach is O(n×3×3) = O(n) per move event — negligible for typical field counts (<50).

**Implementation detail**:
- 3 X-axes per field: left edge, center-X, right edge
- 3 Y-axes per field: top edge, center-Y, bottom edge
- For the dragged field, check all 3 of its X/Y positions against all candidates
- If distance ≤ 4px, snap to that candidate and emit a guide line
- Guides are stored in component state (`useState<{ v: number[]; h: number[] }>`), cleared on `pointerup`

**Scope**: Single-field drags only. Group moves (multi-select) do not show snap guides.

---

### R-104: AlignBar Architecture

**Decision**: `AlignBar` is a separate component rendered conditionally in the layout when `selectionIds.size >= 2`. It receives `count`, `onAlign(action)`, `onDistribute(axis)` callbacks.

**Placement**: Below the toolbar row in the header area OR as a floating strip above the canvas (similar to a contextual toolbar). Implementation follows the prototype (`editor/app.jsx` AlignBar component).

**Alignment logic** (ports from prototype):
```typescript
// From selected fields bounding box:
const minL = Math.min(...selected.map(f => f.x));
const maxR = Math.max(...selected.map(f => f.x + f.width));
const minT = Math.min(...selected.map(f => f.y));
const maxB = Math.max(...selected.map(f => f.y + f.height));
const cx = (minL + maxR) / 2;
const cy = (minT + maxB) / 2;

// Per action:
left     → x = minL
right    → x = maxR - f.width
center-h → x = cx - f.width / 2
top      → y = minT
bottom   → y = maxB - f.height
center-v → y = cy - f.height / 2
```

**Distribute H** (≥3 fields): Sort by x, compute equal spacing between first and last field centers.
**Distribute V** (≥3 fields): Sort by y, compute equal spacing.

All alignment operations go through `updateFields(ids, partial)` — which records a single history snapshot.

---

### R-105: Filler Group Derivation

**Decision**: Derive group from `fieldName` prefix by splitting on `_` and taking the first segment, capitalized.

**Examples**: `arrendador_nombre` → `Arrendador`, `renta_monto` → `Renta`, `startDate` → `Startdate` (camelCase has no `_` → use `'General'`).

**Edge cases**:
- `fieldName` with no `_`: group = `'General'`
- `fieldName` that is just one word: group = `'General'`  
- `fieldName` starts with `_`: skip prefix, use `'General'`

**Why not use PDF AcroForm structure**: PDF AcroForm field hierarchy (field parents) can theoretically provide grouping, but pdfjs annotation extraction doesn't expose parent hierarchy cleanly. Prefix derivation is reliable for the real-world PDFs this app targets (Pawer contracts).

---

### R-106: Filler Required Field Detection

**Decision**: Extract `required` flag from `annotation.fieldFlags` in `useFieldDetection`. Bit 2 (value `0x4` or `4`) of the FieldFlags integer indicates "Required".

```typescript
const required = Boolean(annotation.fieldFlags & 4);
```

**Reference**: PDF spec §12.7.3.1, Table 221 — Bit position 3 (1-indexed) = Required. In 0-indexed bit arithmetic: `fieldFlags & 0x4`.

**Fallback**: If `annotation.fieldFlags` is undefined or 0, `required` = false.

---

### R-107: Filler Autosave Strategy

**Decision**: 400ms debounce on `values` change → localStorage write. Matches the prototype implementation.

**Key**: `'pdf-filler-draft-v1'` — the `v1` suffix allows future schema changes without reading stale data.

**Draft shape**: `{ values: Record<string, string>, ts: number }`. `ts` = `Date.now()` at save time.

**Restore**: On `FillerMode` mount, read and parse the key. If `saved.values` exists, use it as initial values for `useState(initialValues)`. The `useMemo` approach ensures this runs once (not on re-renders).

**relTime display** (matches prototype):
- `< 5s`: "recién"
- `< 60s`: "hace N s"
- `< 3600s`: "hace N min"
- `>= 3600s`: "hace N h"

A `setInterval` of 10s forces re-render to keep the pill text fresh.

---

### R-108: Landing Screen Architecture

**Decision**: Modify `PdfUploader.tsx` to accept `appMode: 'editor' | 'filler'` prop and render the hero section + adapted copy. The dropzone area gets a `<Button>` CTA that triggers the hidden file `<input>`.

**Scope**: `PdfUploader` (editor entry, `src/features/pdf/components/PdfUploader/PdfUploader.tsx`) and `PdfUploadScreen` (filler entry, `src/features/filler/components/PdfUploadScreen/PdfUploadScreen.tsx`) are both updated — they are separate components.

**Vignette**: CSS `radial-gradient` on the `.upload-screen` wrapper: `radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.18) 100%)`. No image needed.

**Copy per mode**:

| Element | Editor | Filler |
|---------|--------|--------|
| Eyebrow | "Editor de plantilla" | "Rellenar PDF" |
| Headline | "Coloca campos de formulario sobre cualquier PDF." | "Rellena cualquier formulario PDF, sin imprimirlo." |
| Subhead | "Importa un PDF, dibuja los campos donde los necesites y exporta el archivo listo para firmar." | "Sube un PDF con campos AcroForm, complétalos con vista previa en vivo y descarga el resultado." |
| CTA | "Seleccionar PDF" | "Seleccionar PDF" |

---

### R-109: Insert Mode Keyboard Shortcuts for Field Types

**Current**: `I` switches to insert mode; `S/M/H` switch other modes.
**New**: `T/N/D/C/F` activate the corresponding field type AND switch to insert mode. `I` activates insert with the previously selected type (or 'text' as default).

**Conflict check**: None of T/N/D/C/F conflict with existing shortcuts (S=Select, M=Move, H=Pan, I=Insert, Ctrl+A=selectAll, Ctrl+D=duplicate, Ctrl+Z=undo, Ctrl+Shift+Z=redo, Delete/Backspace=delete, Escape=deselect).

**Handler location**: `App.tsx` keyboard `keydown` handler — same place as existing S/I/M/H shortcuts.
