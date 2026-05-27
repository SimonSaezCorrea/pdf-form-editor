# Data Model: New Design System Integration

**Branch**: `011-new-design-integration` | **Date**: 2026-05-27

---

This feature has **no changes to runtime data models** (`FormField`, `AcroFormField`, store shapes). The "data model" for this migration is the **CSS token schema** — the structured set of design tokens that define the visual language.

---

## Token Schema (post-migration `tokens.css`)

All tokens are CSS custom properties declared on `:root` (dark-mode defaults) with overrides in `[data-theme="light"]`.

### Color — Raw Scale

| Token | Dark (root) | Light override |
|-------|-------------|----------------|
| `--color-dark-900` | `#003B46` | — |
| `--color-dark-800` | `#07575B` | — |
| `--color-dark-700` | `#0d6e75` | — |
| `--color-neutral-600` | `#2a5a65` | — |
| `--color-neutral-500` | `#3d7280` | — |
| `--color-neutral-400` | `#66A5AD` | — |
| `--color-neutral-300` | `#8ec4cc` | — |
| `--color-neutral-200` | `#b2d7de` | — |
| `--color-neutral-100` | `#d6eef2` | — |
| `--color-white` | `#ffffff` | — |
| `--color-primary-brand` | `#07575B` | — |
| `--color-accent-brand` | `#E76F51` | — |
| `--color-danger` | `#dc2626` | — |

### Color — Semantic (theme-aware)

| Token | Dark | Light |
|-------|------|-------|
| `--color-surface` | `#091214` | `#F4F7F8` |
| `--color-panel-bg` | `#0d2028` | `#C4DFE6` |
| `--color-input-bg` | `#132c38` | `#ffffff` |
| `--color-viewer-bg` | `#0f1e25` | `#dce8eb` |
| `--color-navbar-bg` | `#051519` | `#07575B` |
| `--color-navbar-text` | `#E8EDEF` | `#ffffff` |
| `--color-text` | `#E8EDEF` | `#151E20` |
| `--color-text-muted` | `#7ab5bd` | `#003B46` |
| `--color-primary` | `#66A5AD` | `#07575B` |
| `--color-primary-hover` | `#7bbdc5` | `#004d52` |
| `--color-accent` | `#F4A261` | `#E76F51` |
| `--color-accent-hover` | `#e8904c` | `#d4593d` |
| `--border-color` | `#1a3a45` | `#8ec4cc` |
| `--color-danger-bg` | `#3b0f0f` | `#fee2e2` |
| `--color-danger-border` | `#7f1d1d` | `#fca5a5` |

### Color — Foreground/Background Aliases

| Token | Resolves to |
|-------|-------------|
| `--fg-1` | `var(--color-text)` |
| `--fg-2` | `var(--color-text-muted)` |
| `--fg-accent` | `var(--color-accent)` |
| `--fg-brand` | `var(--color-primary)` |
| `--fg-danger` | `var(--color-danger)` |
| `--bg-app` | `var(--color-surface)` |
| `--bg-panel` | `var(--color-panel-bg)` |
| `--bg-input` | `var(--color-input-bg)` |
| `--bg-canvas` | `var(--color-viewer-bg)` |
| `--bg-navbar` | `var(--color-navbar-bg)` |

### Typography

| Token | Value |
|-------|-------|
| `--font-family` | `'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` |
| `--font-family-mono` | `'SF Mono', 'Fira Code', 'Cascadia Code', monospace` |
| `--font-size-xs` | `11px` |
| `--font-size-sm` | `12px` |
| `--font-size-base` | `13px` |
| `--font-size-md` | `14px` |
| `--font-size-lg` | `16px` |
| `--font-size-xl` | `18px` |
| `--font-size-2xl` | `22px` |
| `--font-size-3xl` | `28px` |
| `--font-weight-normal` | `400` |
| `--font-weight-medium` | `500` |
| `--font-weight-semibold` | `600` |
| `--font-weight-bold` | `700` |
| `--line-height-tight` | `1.2` |
| `--line-height-base` | `1.5` |
| `--line-height-loose` | `1.6` |

### Spacing (4px grid)

| Token | Value |
|-------|-------|
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `20px` |
| `--space-6` | `24px` |
| `--space-8` | `32px` |
| `--space-10` | `40px` |
| `--space-12` | `48px` |
| `--space-16` | `64px` |

### Border Radius

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | `4px` | Controls, inputs |
| `--radius-md` | `5px` | Buttons (default) |
| `--radius-lg` | `8px` | Modals, panels |
| `--radius-xl` | `12px` | Reserved |
| `--radius-pill` | `999px` | Tags only |

### Shadows

| Token | Value |
|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` |
| `--shadow-md` | `0 2px 8px rgba(0,0,0,0.10)` |
| `--shadow-lg` | `0 4px 16px rgba(0,0,0,0.15)` |
| `--shadow-xl` | `0 8px 32px rgba(0,0,0,0.20)` |

### Z-Index Layers

| Token | Value | Element |
|-------|-------|---------|
| `--z-canvas` | `0` | PDF canvas |
| `--z-field` | `10` | Field overlays |
| `--z-resize` | `20` | Resize handles |
| `--z-context-menu` | `50` | Context menus |
| `--z-toolbar` | `100` | Navbar, toolbar |
| `--z-modal` | `200` | Modals |
| `--z-tooltip` | `300` | Tooltips |

---

## New Component: `Kbd`

```typescript
// src/components/ui/Kbd/Kbd.tsx
interface KbdProps {
  children: React.ReactNode;
  className?: string;
}
```

Renders a `<kbd>` HTML element with key-cap CSS styling. No state. No logic. Pure display.

---

## Unchanged Data Models

The following remain **exactly unchanged**:

- `FormField` (`src/types/shared.ts`) — all fields including optional `value?`, `displayFont?`
- `AcroFormField` (`src/features/filler/types.ts`)
- `useFieldStore` state shape
- `useFillerStore` state shape
- `useInteractionMode` shape
- All API route request/response shapes
