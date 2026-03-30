# Research: Dark Mode with Manual Toggle

**Phase**: 0 — Resolve unknowns before design
**Feature**: 008-dark-mode-toggle
**Date**: 2026-03-28

---

## R-001 — Anti-FOUC pattern in Next.js 15 App Router

**Decision**: Inject a static inline `<script>` via `dangerouslySetInnerHTML` inside the `<head>` of `src/app/layout.tsx`, executed synchronously before any CSS or React hydration.

**Rationale**: The inline script runs in the browser before the first paint, reading `localStorage` and `matchMedia`. It sets `document.documentElement.dataset.theme = 'dark' | 'light'`. Because the CSS `[data-theme="dark"]` block is loaded in the same `<head>`, the correct palette is applied on the very first painted frame. No other pattern (React `useEffect`, Next.js middleware, cookies) can guarantee zero-FOUC for client-side-only theming.

**Script content**:
```js
(function(){
  try {
    var stored = localStorage.getItem('pdf-editor-theme');
    if (stored === 'dark' || stored === 'light') {
      document.documentElement.dataset.theme = stored;
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.dataset.theme = 'dark';
    }
  } catch(e) {}
})();
```

The outer `try/catch` absorbs `SecurityError` when localStorage is unavailable (private browsing, storage quota). If neither condition fires the attribute is absent and the CSS `:root` defaults (light) apply.

**Alternatives considered**:
- `useEffect` in layout: Runs after hydration → always causes FOUC for stored dark-mode users.
- Next.js middleware + cookie: Requires SSR per-request overhead and cookie management. Not justified for a purely client-side preference.
- CSS `@media` only (no JS): Cannot override for manual preference. FR-004 requires manual preference beats OS.

---

## R-002 — CSS token strategy for dark mode

**Decision**: Add two CSS blocks to `tokens.css`:

1. `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … } }` — OS dark, no stored preference.
2. `[data-theme="dark"] { … }` — explicit manual override.

All dark-mode colour overrides live in these two blocks only. Light defaults stay in `:root { … }`.

**Design palette** (adopted 2026-03-29 — replaces the original grey/indigo defaults):

| Role | Light value | Dark value |
|------|-------------|------------|
| Background (`--color-surface`) | `#F4F7F8` — cold off-white | `#091214` — near-black teal |
| Surface/Cards (`--color-panel-bg`) | `#C4DFE6` — seafoam | `#0d2028` — dark teal-grey, low saturation |
| Input bg (`--color-input-bg`) | `#ffffff` | `#132c38` — slightly lighter than panel |
| Body text (`--color-text`) | `#151E20` — near-black | `#E8EDEF` — soft off-white |
| Secondary text (`--color-text-muted`) | `#003B46` — deep aqua | `#7ab5bd` — muted teal, clearly softer than text |
| Primary (`--color-primary`) | `#07575B` — ocean | `#66A5AD` — wave |
| Primary hover (`--color-primary-hover`) | `#004d52` | `#7bbdc5` |
| Accent (`--color-accent`) | `#E76F51` — coral | `#F4A261` — soft orange |
| Navbar bg (`--color-navbar-bg`) | `#07575B` — ocean | `#051519` — darkest layer, creates top hierarchy |
| Navbar text (`--color-navbar-text`) | `#F4F7F8` | `#E8EDEF` |
| Border (`--border-color`) | `var(--color-neutral-300)` = `#8ec4cc` | `#1a3a45` — subtle, not distracting |
| `--color-neutral-100` | `#d6eef2` | `#0d2028` — = panel-bg |
| `--color-neutral-200` | `#b2d7de` | `#132c38` — = input-bg |
| `--color-danger-bg` | `#fee2e2` | `#3b0f0f` |
| `--color-danger-border` | `#fca5a5` | `#7f1d1d` |
| `--color-white` | `#ffffff` | keep `#ffffff` (PDF canvas field fills) |

**Dark mode layer hierarchy** (bottom → top, increasing elevation):
```
#091214  surface (main bg, PDF viewer area)
#0d2028  panel-bg (sidebars, modals, thumbnail strip)
#132c38  input-bg (inputs, selects, interactive controls)
#051519  navbar-bg (topmost bar — darkest to anchor the layout)
```

**WCAG AA check** (minimum 4.5:1 for normal text):
- `#151E20` on `#F4F7F8` ≈ 16:1 ✓ (light body)
- `#151E20` on `#C4DFE6` ≈ 9:1 ✓ (light panels)
- `#E8EDEF` on `#091214` ≈ 17:1 ✓ (dark body)
- `#E8EDEF` on `#0d2028` ≈ 14:1 ✓ (dark panels)
- `#E8EDEF` on `#051519` ≈ 16:1 ✓ (navbar)
- `#7ab5bd` on `#0d2028` ≈ 5.5:1 ✓ (muted text on panels)
- `#ffffff` on `#07575B` ≈ 5.5:1 ✓ (light-mode primary button)
- `#151E20` on `#66A5AD` ≈ 5:1 ✓ (dark-mode primary button)

**Alternatives considered**:
- Separate `dark-tokens.css` file: Adds import complexity. No benefit for a single override block.
- CSS `color-scheme` property alone: Applies browser UA default colours but doesn't control custom design tokens.

---

## R-003 — `useTheme()` hook design

**Decision**: React hook in `src/hooks/useTheme.ts` using `useState` + `useEffect` pattern.

```ts
type Theme = 'light' | 'dark';
const STORAGE_KEY = 'pdf-editor-theme';

function getInitialTheme(): Theme {
  // Reads document.documentElement.dataset.theme set by the inline script.
  // Falls back to OS preference. Runs only in the browser (useEffect guard).
  const attr = document.documentElement.dataset.theme;
  if (attr === 'dark' || attr === 'light') return attr;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
```

State:
- `theme: Theme` — current effective theme.
- `preference: Theme | null` — null means "follow OS".

`setTheme(t: Theme)` → writes `localStorage`, sets `dataset.theme`, updates state.
`resetTheme()` → removes `localStorage` key, removes `dataset.theme`, re-reads OS.
OS change listener (`matchMedia.addEventListener('change', …)`) fires only when `preference === null`.

**Why a hook and not Context**: Only one component (`ThemeToggle`) reads/writes theme. Context would be over-engineering (Principle VIII). If more consumers are added later, converting to context is a one-file change.

**Alternatives considered**:
- Zustand store: New dependency, not justified for a single boolean state.
- Context provider at root: Premature; only one consumer in v1.

---

## R-004 — PDF canvas field overlay white-fill guarantee

**Decision**: Add an explicit CSS rule in `DraggableField.module.css`:

```css
.field-bg {
  background-color: #fff !important;
}
```

This targets only the field background div (not the selection border or resize handles) and uses `!important` to override any inherited dark-mode token that a parent might propagate.

**Alternatives considered**:
- Wrapping canvas in a `data-theme="light"` attribute: Correct in principle but couples field rendering to an artificial DOM wrapper. The `!important` override on a single class is simpler.
- Inline style in JSX: Works but bypasses CSS Modules; harder to audit.

---

## R-005 — ThemeToggle component placement

**Decision**: Add `<ThemeToggle />` to the right side of the `.header-toolbar-actions` div in `App.tsx`. The icon is a filled sun (☀) when dark mode is active (click to go light) and a crescent moon (☾) when light mode is active (click to go dark). Both icons use SVG inline (no new icon dependency).

**Rationale**: The spec says "toolbar must contain a toggle button (sun/moon icon)". The existing two-row header has a `.header-toolbar-actions` div on the right side of the bottom row — the natural location alongside the existing action buttons.

**Accessibility**: `aria-label="Cambiar a modo claro"` / `"Cambiar a modo oscuro"` updates with current theme. `title` attribute mirrors `aria-label` for tooltip-less hover.

---

## NEEDS CLARIFICATION — None remaining

All spec items were unambiguous. All decisions above are implementable with zero new npm dependencies.
