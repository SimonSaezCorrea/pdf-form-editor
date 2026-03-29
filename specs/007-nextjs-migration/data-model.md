# Data Model: Next.js Architecture Migration

**Branch**: `007-nextjs-migration` | **Date**: 2026-03-27

---

## Entities

### FormField

The primary domain entity. Unchanged from existing `shared/types.ts` — only the
file location changes (`src/types/shared.ts`).

| Field | Type | Rules |
|-------|------|-------|
| `id` | `string` | Client-side UUID. Never sent to PDF output. Format: `field-{timestamp}-{counter}`. |
| `name` | `string` | AcroForm field name. 1–128 chars. Unique across the entire document (all pages). |
| `page` | `number` | 1-indexed. Must be ≥ 1 and ≤ document page count. |
| `x` | `number` | PDF points from bottom-left (horizontal). Must be ≥ 0. |
| `y` | `number` | PDF points from bottom-left (vertical). Must be ≥ 0. |
| `width` | `number` | PDF points. Must be > 0. Canvas minimum: 20px at current renderScale. |
| `height` | `number` | PDF points. Must be > 0. Canvas minimum: 10px at current renderScale. |
| `fontSize` | `number` | Integer, 6–72. |
| `fontFamily` | `FontFamily` | `'Helvetica' \| 'TimesRoman' \| 'Courier'` |
| `value` | `string?` | Optional default text. Undefined or empty string = no pre-fill. |

**Validation locations**:
- Client: `isValidField()` in the UI before export
- API Route: `isValidField()` guard in `route.ts` (identical logic, server-side)

**Coordinate system**: `x`, `y`, `width`, `height` are always in **PDF points**
(bottom-left origin). Canvas pixels are converted via `coordinates.ts` before storage.

---

### FontFamily

```typescript
export type FontFamily = 'Helvetica' | 'TimesRoman' | 'Courier';
```

Constrained to PDF standard fonts. No custom font embedding. Font names map
directly to `pdf-lib`'s `StandardFonts` enum.

---

### Design Token

A CSS custom property defined in `src/styles/tokens.css`. Not a TypeScript entity —
purely a CSS convention.

**Convention**: `--{category}-{variant}` where category is one of:
`color`, `font-family`, `font-size`, `font-weight`, `space`, `radius`, `shadow`, `z`.

| Category | Examples |
|----------|---------|
| Colors | `--color-primary`, `--color-danger`, `--color-dark-900`, `--color-neutral-300` |
| Typography | `--font-family-base`, `--font-size-sm`, `--font-weight-semibold` |
| Spacing | `--space-1` (4px) through `--space-6` (24px) |
| Borders | `--radius-sm`, `--radius-md`, `--radius-lg`, `--border-color` |
| Shadows | `--shadow-sm`, `--shadow-md`, `--shadow-lg` |
| Z-index | `--z-canvas`, `--z-field-overlay`, `--z-toolbar`, `--z-modal`, `--z-tooltip` |

**Validation rule**: A codebase search for hex color codes (e.g., `#4f46e5`) or
named shadows/fonts outside `tokens.css` MUST return zero results.

---

### Feature Module

Structural entity — describes the shape of each folder under `src/features/`.

| Subfolder | Required | Contents |
|-----------|----------|---------|
| `components/` | Yes | React components (each in own folder with `.module.css`) |
| `hooks/` | When feature-specific hooks exist | Custom React hooks |
| `utils/` | When feature-specific pure functions exist | Pure utility functions |
| `index.ts` | Yes | Barrel export of public API |

**Cross-feature import rule**: Files inside `src/features/X/` MUST NOT import from
`src/features/Y/` internal paths. Cross-feature dependencies go through
`src/hooks/` (global hooks) or `src/components/ui/` (shared primitives).

---

### Base UI Component

Structural entity — describes the contract for each component in `src/components/ui/`.

| Component | Required Props | Variants |
|-----------|---------------|---------|
| `Button` | `children`, `onClick?` | `primary` (default), `secondary`, `ghost`, `danger` |
| `Button` | `size?` | `sm`, `md` (default), `lg` |
| `Button` | `disabled?`, `loading?`, `icon?` | Boolean flags |
| `Modal` | `isOpen`, `onClose`, `title`, `children` | — |
| `Modal` | `footer?` | Optional footer slot |
| `Input` | `value`, `onChange`, `label?` | Text, number (`type` prop) |
| `Input` | `error?`, `hint?`, `disabled?` | String / boolean flags |
| `Select` | `value`, `onChange`, `options` | — |
| `Select` | `label?`, `error?` | Optional decorators |
| `Tooltip` | `content`, `children` | Appears on hover (CSS-only) |
| `IconButton` | `icon`, `onClick?`, `label` (a11y) | `sm`, `md` sizes |

**Implementation rule**: Each component is a `'use client'` component (interactive
UI). Each has a co-located `.module.css`. No component has inline styles except for
programmatic values (e.g., `style={{ left: canvasX }}` for canvas overlays).

---

## State Transitions

### PDF Lifecycle

```
null (no PDF)
  → loading (user uploads or drops a file)
  → loaded (pdfjs-dist document ready, pages rendered)
  → export-in-progress (POST /api/generate-pdf)
  → loaded (export complete, user downloads file)
  → null (user loads new PDF, previous state reset)
```

### Field Selection State

```
empty selection (Set<string> = {})
  → single selected (selectSingle(id) or addField)
  → multi-selected (toggleSelect, setSelection, selectAll)
  → empty selection (clearSelection, Escape key)
  → single selected (selectSingle from multi)
```

### Interaction Mode State

```
'select' (default)
  → 'insert' (I key)
  → 'move' (M key)
  → 'pan' (H key)
  → 'select' (S key or Escape from any mode)
```

---

## Migration Mapping

| Old Location | New Location | Change |
|-------------|-------------|--------|
| `shared/types.ts` | `src/types/shared.ts` | File move; no type changes |
| `client/src/hooks/useFieldStore.ts` | `src/hooks/useFieldStore.ts` | Move to global hooks |
| `client/src/hooks/useInteractionMode.ts` | `src/hooks/useInteractionMode.ts` | Move to global hooks |
| `client/src/hooks/usePdfRenderer.ts` | `src/features/canvas/hooks/usePdfRenderer.ts` | Move to feature |
| `client/src/hooks/useRubberBand.ts` | `src/features/canvas/hooks/useRubberBand.ts` | Move to feature |
| `client/src/hooks/useFieldResize.ts` | `src/features/fields/hooks/useFieldResize.ts` | Move to feature |
| `client/src/hooks/useTemplateStore.ts` | `src/features/templates/hooks/useTemplateStore.ts` | Move to feature |
| `client/src/utils/*.ts` | `src/features/pdf/utils/*.ts` | Move to pdf feature |
| `server/src/services/pdfService.ts` | `src/app/api/generate-pdf/pdfService.ts` | Move; no logic changes |
| `server/src/routes/generatePdf.ts` | `src/app/api/generate-pdf/route.ts` | Rewrite: Express → Route Handler |
| `client/src/index.css` (1,266 lines) | `src/styles/tokens.css` + per-component `.module.css` | Decompose |
