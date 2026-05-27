# Research: New Design System Integration

**Branch**: `011-new-design-integration` | **Date**: 2026-05-27

---

## R-001: Token Strategy Inversion (Dark-First vs Light-First)

**Decision**: Switch `tokens.css` from light-first (`:root` = light, `@media prefers-color-scheme: dark` + `[data-theme="dark"]` = dark) to dark-first (`:root` = dark, `[data-theme="light"]` = light).

**Rationale**: The new design system is dark-first by design. The existing mechanism uses `[data-theme="dark"]` for manual override — **this attribute is already the hook used by the anti-FOUC inline script in `layout.tsx`**. Switching to dark-first means:
- The anti-FOUC script does not need to change: it reads `localStorage['pdf-editor-theme']` and sets `document.documentElement.dataset.theme` before first paint. If the user has no preference, no attribute is set → root defaults (now dark) render immediately.
- The `@media (prefers-color-scheme: dark)` block is **removed**: it was a fallback for OS-level detection, but with dark as default, OS detection is only needed for *light mode* (OS light → do nothing; OS dark → already default).
- `[data-theme="light"]` replaces the former `[data-theme="dark"]` override block.

**Compatibility check**:
- `useTheme` hook reads `localStorage['pdf-editor-theme']` and sets `dataset.theme`. No changes needed to the hook — it already writes the correct `[data-theme="X"]` attribute.
- Constitution Principle XXIII documents both mechanisms. Dark-first complies: dark is the default, light is the `[data-theme="light"]` override.

**Alternatives considered**:
- Keep light-first + add `[data-theme="dark"]` override for new tokens: Rejected — would require maintaining two parallel token value sets with no structural gain.
- Use CSS `color-scheme` property: Rejected — project doesn't use native form controls that benefit from it; adds complexity.

---

## R-002: Geist Font Integration

**Decision**: Copy `new-design/fonts/Geist_wght_.woff2` to `src/styles/fonts/Geist_wght_.woff2` and declare `@font-face` at the top of `tokens.css`. No npm font package.

**Rationale**:
- `tokens.css` is imported by `src/app/layout.tsx` (global CSS import). `@font-face` declared here is available to all components with no duplication.
- The woff2 file is ~70KB (variable font with full weight axis); a single file replaces all weight variants.
- No CDN dependency at runtime for UI text rendering.

**Wiring detail**:
```css
@font-face {
  font-family: 'Geist';
  src: url('/fonts/Geist_wght_.woff2') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
```
The file goes to `src/styles/fonts/` but Next.js serves static assets from `public/`. Two options:
1. **Option A (chosen)**: Copy to `public/fonts/Geist_wght_.woff2` — served as `/fonts/Geist_wght_.woff2`. Next.js static asset path. URL in `@font-face`: `/fonts/Geist_wght_.woff2`.
2. Option B: Keep in `src/styles/fonts/` and use a relative CSS `url()` path. Works but Next.js CSS bundler behavior with relative URLs in CSS Modules is less predictable.

**Note**: `public/fonts/` already used by Principle XXVIII for TTF font assets. Geist goes there too. No conflict — different file names.

**Alternatives considered**:
- Google Fonts CDN for Geist: Rejected — introduces CDN dependency for UI text; also Geist is not on Google Fonts.
- `next/font/local`: Rejected — requires changing `layout.tsx` and adds Next.js-specific font optimization that may interfere with the `@font-face` in `tokens.css`.

---

## R-003: `showEditorToolbar` App.tsx State

**Decision**: Add `showEditorToolbar: boolean` derived state to `App.tsx`, computed as `!!pdfBytes && appMode === 'editor'`. Pass it as a prop to the header area.

**Rationale**:
- Currently `App.tsx` manages `pdfBytes`, `appMode` ('editor' | 'filler'), and all toolbar state. The new design conditionally renders the second navbar row based on these.
- Derivation is trivial (`const showEditorToolbar = !!pdfBytes && appMode === 'editor'`), no new state — just a derived boolean.
- The existing `ThemeToggle` component becomes prop-driven: `App.tsx` passes `theme` (from `useTheme()`) and `onToggleTheme` down to the header section. `useTheme` hook stays as the single owner of localStorage.

**Mode nav conditional**:
- When `!!pdfBytes && appMode === 'filler'`: show "← Cambiar PDF" button (triggers upload reset).
- Otherwise: show editor/filler mode tabs.
- Width of the nav area is fixed (use `min-width` on the nav container) to prevent layout shift.

**Alternatives considered**:
- Extract navbar to its own component receiving all props: Acceptable future refactor, but out of scope for this migration. Keep changes minimal in App.tsx.
- Add a React context for toolbar visibility: Rejected — overkill for a single boolean prop, violates Principle VI (YAGNI).

---

## R-004: `Kbd` Primitive Design

**Decision**: Create `src/components/ui/Kbd/Kbd.tsx` — a simple `<kbd>` HTML element with key-cap styling.

**API**:
```tsx
<Kbd>Ctrl</Kbd>
<Kbd>S</Kbd>
```

**Styling** (from new-design ShortcutsPanel):
- `font-family: var(--font-family-mono)`
- `font-size: var(--font-size-xs)` (11px)
- `padding: 1px 5px`
- `border: 1px solid var(--border-color)`
- `border-bottom-width: 2px` (key-cap depth effect)
- `border-radius: var(--radius-sm)` (4px)
- `background: var(--color-input-bg)`
- `color: var(--color-text-muted)`

**Constitution VI compliance**: Single call-site (ShortcutsPanel). Justified as a design-system primitive (Principle XIII). Document in Complexity Tracking (done).

---

## R-005: `enhancements.css` Keyframes Placement

**Decision**: Integrate keyframes from `new-design/prototype/editor/enhancements.css` and `new-design/prototype/filler/filler-enhancements.css` into the specific feature `.module.css` files that own the animated elements.

**Mapping**:
| Keyframe | Source | Target CSS Module |
|----------|--------|-------------------|
| `insertBannerIn` | enhancements.css | `src/features/toolbar/ToolbarModes.module.css` (insert mode banner) |
| `alignBarIn` | enhancements.css | `src/features/fields/FieldOverlay.module.css` (alignment bar) |
| `live-pulse` | filler-enhancements.css | `src/features/filler/FillerLayout.module.css` (live indicator) |
| `jump-pulse` | filler-enhancements.css | `src/features/filler/FillerLayout.module.css` (field highlight) |

**Condition**: Only integrate a keyframe if the corresponding DOM element already exists in production. If it doesn't exist yet (e.g., alignment bar is a new UX element), skip the keyframe until that element is implemented.

**Rationale**: Constitution Principle XI prohibits global CSS files beyond `tokens.css` and `reset.css`. Keyframes must live in the module of the component that uses them.

---

## R-006: ThumbnailStrip Background Token

**Decision**: Update ThumbnailStrip background from `var(--color-white)` (Constitution Principle XXI) to use the new token. Principle XXI says "background is `var(--color-white)`" — the new design system defines `--color-white: #ffffff` as a token. No conflict: use `var(--color-white)` which resolves to `#ffffff` in both modes.

**Note**: `--color-white` must be defined in the new `tokens.css` (it is in `new-design/colors_and_type.css`). This is an existing constitutional requirement, not a new one.

---

## R-007: `--color-primary` Dark Mode Change

**Decision**: Accept the dark-mode primary color change: `#07575B` → `#66A5AD`.

**Impact analysis**:
- `DraggableField` selected border uses `var(--color-primary)`. In dark mode this becomes a lighter teal (`#66A5AD`) against the white `#fff !important` field background. Contrast: white background + `#66A5AD` border = clearly visible.
- `FieldList` selected item border: same change. Against panel background `#0d2028`, `#66A5AD` has good contrast.
- Constitution Principle XII already documents this: "Primary (`--color-primary`) | Light: `#07575B` | Dark: `#66A5AD`".

**No action needed**: The new token values exactly match what the constitution already defines. The current `tokens.css` is the one out of sync — the migration brings it into constitutional compliance.

---

## R-008: Filler CSS Token Names (Critical)

**Decision**: Continue using `--space-N` (not `--spacing-N`) and `--border-color` (not `--color-border`) in all filler CSS files.

**Source**: CLAUDE.md explicit constraint: "ALL filler CSS files use `--space-N` (NOT `--spacing-N`) and `--border-color` (NOT `--color-border`)."

**Verification**: New `tokens.css` from `new-design/colors_and_type.css` defines `--space-1` through `--space-16` (4px grid) and `--border-color`. Compatible.

---

## Resolved Clarifications

All NEEDS CLARIFICATION items from spec: none remained. All decisions above were derivable from reading `new-design/` + `src/` source files.
