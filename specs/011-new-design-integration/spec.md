# Feature Specification: New Design System Integration

**Feature Branch**: `011-new-design-integration`  
**Created**: 2026-05-27  
**Status**: Draft  
**Input**: Integrate `new-design/` system into production `src/` — visual migration only, zero logic changes.

---

## Overview

The app already has a complete new design system in `new-design/` (dark-first teal palette, Geist variable font, comprehensive token set, UI-kit prototypes). This feature migrates the production UI to match it. Functional correctness is preserved: all hooks, stores, API routes, PDF logic, and CLAUDE.md constraints are untouched. Only CSS tokens, component styles, and minor JSX restructuring (prop-driven theme/toolbar state) are changed.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Token & Font Layer Migration (Priority: P1)

A developer replaces `src/styles/tokens.css` with the consolidated token set from `new-design/colors_and_type.css`, adds the Geist font, and verifies the app renders correctly in both dark and light mode with no FOUC.

**Why this priority**: Foundation for all other stories. Nothing else can be visually correct until the token layer is right.

**Independent Test**: Load the app on cold start. Verify: (a) no flash of light background before dark mode applies, (b) all semantic color tokens resolve to teal-tinted values, (c) Geist renders for body text, (d) toggling the theme switch cycles dark↔light cleanly.

**Acceptance Scenarios**:

1. **Given** app loads in a browser with no localStorage key, **When** page renders, **Then** `<html data-theme="dark">` is set before first paint (anti-FOUC inline script still works) and background is `#091214`.
2. **Given** user clicks the theme toggle, **When** light mode activates, **Then** `[data-theme="light"]` applies and surface becomes `#F4F7F8`; toggle again restores dark.
3. **Given** Geist woff2 is present at `src/styles/fonts/Geist_wght_.woff2`, **When** page loads, **Then** body text renders in Geist (variable font, weight axis 400–700); system UI stack is the fallback only.
4. **Given** existing CLAUDE.md dark-mode rule (anti-FOUC in `layout.tsx` `<head>`), **When** token strategy changes to dark-first, **Then** inline script still functions without modification (mechanism is `[data-theme]` attribute — compatible).

---

### User Story 2 — Primitive Components Restyle (Priority: P2)

A developer updates `src/components/ui/` (Button, IconButton, Input, Select, Modal, Tooltip) and adds a new `Kbd` primitive, matching the new design spec. All existing prop APIs are preserved.

**Why this priority**: Primitives are used everywhere; getting them right propagates correctness to all feature components.

**Independent Test**: Each primitive can be visually verified in isolation by loading any screen that uses it. No behavioral change means existing unit tests pass unchanged.

**Acceptance Scenarios**:

1. **Given** Button with variant `primary`, **When** rendered, **Then** border-radius is 5px (`--radius-md`), padding is `4px 12px`, hover darkens background.
2. **Given** Modal rendered, **When** displayed, **Then** border-radius is 8px (`--radius-lg`), backdrop is `rgba(0,0,0,0.5)`, shadow is `--shadow-lg`.
3. **Given** Tooltip on an IconButton, **When** user hovers, **Then** tooltip opens after 700ms hold and closes immediately on mouse-out.
4. **Given** ShortcutsPanel, **When** rendered, **Then** keyboard hints display using the new `Kbd` primitive (styled key cap, not plain text).
5. **Given** Input with error state, **When** error prop is set, **Then** border changes to `--color-danger` with `--color-danger-bg` background.
6. **Given** IconButton with `variant="navbar"`, **When** hovered, **Then** background becomes `rgba(255,255,255,0.12)`.

---

### User Story 3 — App Shell & Toolbar State Wiring (Priority: P3)

The navbar becomes prop-driven: `App.tsx` manages `showEditorToolbar` and the mode-nav visibility state, passing them to the header component. CSS class names remain unchanged.

**Why this priority**: Structural change needed to match new design's conditional rendering, but lower risk than token/primitive layers.

**Independent Test**: Verify that loading a PDF shows the toolbar row; filler mode hides it; "← Cambiar PDF" appears instead of mode tabs when a file is open in filler.

**Acceptance Scenarios**:

1. **Given** no PDF loaded (upload screen), **When** app renders, **Then** second navbar row is hidden; mode tabs (Editor / Rellenar PDF) are visible.
2. **Given** PDF loaded in editor mode, **When** app renders, **Then** second navbar row shows toolbar (Select/Insert/Move/Pan + Zoom); mode tabs still visible.
3. **Given** PDF loaded in filler mode, **When** app renders, **Then** second navbar row is hidden; mode tabs replaced by "← Cambiar PDF" link.
4. **Given** `App.tsx` manages theme state (currently done via `useTheme`), **When** ThemeToggle renders inside header, **Then** it receives `theme` and `onToggleTheme` as props — `useTheme` hook still owns localStorage, no duplication.

---

### User Story 4 — Feature Component Restyle (Priority: P4)

All feature-level components (ThumbnailStrip, FieldList, DraggableField, ResizeHandles, PropertiesPanel, ToolbarModes, ShortcutsPanel, PdfUploader, FillerLayout, DynamicForm) are restyled to match the new design. Zero logic changes.

**Why this priority**: Dependent on P1 (tokens) and P2 (primitives) being complete.

**Independent Test**: Each component can be visually verified independently in the running app. Unit tests (which test logic, not style) pass unchanged.

**Acceptance Scenarios**:

1. **Given** ThumbnailStrip, **When** rendered, **Then** each thumb has `--shadow-sm`, strip width is 110px, selected thumb has 1px `--color-primary` border.
2. **Given** FieldList, **When** user hovers a field item, **Then** background becomes `rgba(102,165,173,0.08)`; when selected, border is 1px `--color-primary`.
3. **Given** DraggableField selected, **When** in single-select mode, **Then** border is 1.5px `--color-primary`; field background is `#fff !important` (PDF canvas must read true — no dark-mode bleed per CLAUDE.md FR-008).
4. **Given** ToolbarModes button active, **When** mode is active, **Then** button shows `rgba(255,255,255,0.18)` fill with 1px transparent border — no shrink, no shadow change.
5. **Given** PdfUploader (both editor and filler entry), **When** rendered, **Then** uses `icon-document.svg` from `new-design/assets/` (copied to `src/`).
6. **Given** FillerLayout, **When** PDF is loaded in filler mode, **Then** form panel is 320px with `border-right` partition; PDF viewer is on the right; zoom controls work.
7. **Given** DynamicForm, **When** rendered, **Then** inputs use restyled `Input` primitive (compact, 13px base, teal focus ring).

---

### Edge Cases

- What happens when `--color-primary` changes in dark mode (`#07575B` → `#66A5AD`)? DraggableField uses `--color-primary` for selected-field border. Verify the 1.5px border remains visible against the PDF background.
- CLAUDE.md: `DraggableField .field-bg: background-color: #fff !important` — dark tokens MUST NOT bleed. Verify after token migration that this rule still wins the cascade.
- Filler live-preview canvas: coordinate math unchanged; only CSS wrapper changes. Verify `max-width:100%` still applies identically to both the PDF canvas and overlay canvas (no CSS-scale mismatch per CLAUDE.md feedback_canvas_overlay_css_scale memory).
- Geist `@font-face` declared twice if both `tokens.css` and `layout.tsx` import it — ensure single declaration point.
- `--color-viewer-bg` new token — verify it is used in `.viewer-area` background, not `--color-surface` (they are intentionally different).

---

## Requirements *(mandatory)*

### Functional Requirements

**Token Layer**

- **FR-001**: `src/styles/tokens.css` MUST be replaced with the consolidated token set from `new-design/colors_and_type.css`, preserving all tokens already consumed by production code and adding new ones (semantic aliases, full neutral ramp, type roles, shadow ramp, radius ramp).
- **FR-002**: Token strategy MUST switch to dark-first defaults: `:root` block defines dark-mode values; `[data-theme="light"]` block overrides to light values. The existing `@media (prefers-color-scheme: dark)` block is removed.
- **FR-003**: Geist variable font MUST be wired via `@font-face` referencing `src/styles/fonts/Geist_wght_.woff2` (file copied from `new-design/fonts/`). System UI stack is the fallback. No npm font package.
- **FR-004**: All existing token names consumed by production CSS Modules MUST continue to resolve. Deprecated tokens must be aliased (not deleted) in a `/* deprecated */` comment block until all consumers are updated.
- **FR-005**: `[data-theme="dark"]` mechanism remains the hook for both the anti-FOUC inline script in `layout.tsx` and CSS override blocks — the inline script is NOT modified.

**Primitive Components**

- **FR-006**: `Button` component CSS MUST update border-radius to `--radius-md` (5px), padding to `var(--space-1) var(--space-3)` (4px 12px), transitions to `background .15s, opacity .15s`.
- **FR-007**: `IconButton` MUST add `variant="navbar"` variant with `rgba(255,255,255,0.12)` hover fill. Existing variants unchanged.
- **FR-008**: `Input` and `Select` MUST update to 13px base size, `--color-input-bg` background, `--radius-sm` (4px) border-radius, error state with `--color-danger` border + `--color-danger-bg` fill.
- **FR-009**: `Modal` MUST update backdrop to `rgba(0,0,0,0.5)`, border-radius to `--radius-lg` (8px), shadow to `--shadow-lg`.
- **FR-010**: `Tooltip` MUST implement 700ms open delay, 0ms close delay, `--shadow-sm` shadow. Delay implemented via CSS or JS — no new library.
- **FR-011**: A new `Kbd` primitive MUST be created at `src/components/ui/Kbd/`. Renders a single keyboard key: small, monospaced, bordered key-cap style. Used by `ShortcutsPanel`.

**App Shell**

- **FR-012**: `App.tsx` MUST expose `showEditorToolbar: boolean` state (true when PDF loaded AND appMode==='editor'). Passed as prop to the header area.
- **FR-013**: Mode nav MUST conditionally render: when filler mode AND file loaded, show "← Cambiar PDF" link instead of mode tabs. Width of the nav area must remain stable to prevent layout shift.
- **FR-014**: `--color-viewer-bg` MUST be applied to the `.viewer-area` scroll container background.
- **FR-015**: `--color-navbar-bg` MUST be applied to `.app-header` background (both rows).

**Feature Components (CSS/Style only)**

- **FR-016**: `ThumbnailStrip` thumbnails MUST have `box-shadow: var(--shadow-sm)`. Strip container width 110px. Selected thumb: 1px `--color-primary` border.
- **FR-017**: `FieldList` items MUST have hover `background: rgba(102,165,173,0.08)` and selected state `border: 1px solid var(--color-primary)` with same teal-tint fill.
- **FR-018**: `DraggableField` selected state MUST use 1.5px `--color-primary` border (or `--color-danger` for invalid/conflict). `.field-bg` keeps `background-color: #fff !important` — dark tokens MUST NOT override this.
- **FR-019**: `ToolbarModes` active button MUST show `background: rgba(255,255,255,0.18)` with `border: 1px solid transparent`. No opacity change on inactive buttons (use 0.7 opacity for non-active, 1.0 for active/hover).
- **FR-020**: `ShortcutsPanel` FAB remains fixed bottom-right 40×40px circle. Panel uses `Kbd` primitive for keyboard hints.
- **FR-021**: `PdfUploader` (both editor entry and filler entry) MUST use `icon-document.svg` (copied to `src/assets/`). Inline SVG, not `<img>`.
- **FR-022**: `FillerLayout` form panel width MUST be 320px. Panel uses `border-right: 1px solid var(--border-color)` as the only partition (no card/shadow).
- **FR-023**: `DynamicForm` inputs MUST use the restyled `Input` primitive.
- **FR-024**: All feature component CSS files MUST use `--space-N` (NOT `--spacing-N`) and `--border-color` (NOT `--color-border`). These are the tokens actually defined in `tokens.css` (per CLAUDE.md filler key notes).

**Iconography**

- **FR-025**: No new icon library introduced. Additional icons (if needed) sourced from `unpkg.com/lucide-static@0.469.0/icons/<name>.svg`, 1.5–2px stroke, `currentColor`, inline SVG.
- **FR-026**: Unicode glyphs (`+`, `−`, `✕`, `?`, `▾`) remain as text inside `IconButton` — no change.

**Typography**

- **FR-027**: Base font-size MUST be 13px (`--font-size-base`). All existing CSS that uses px-based font sizes MUST be converted to use tokens.
- **FR-028**: `.t-*` semantic type-role classes from `new-design/colors_and_type.css` MUST be available globally (imported in `layout.tsx` or `tokens.css`). Components MAY use them; existing CSS Module class definitions are NOT deleted — `.t-*` classes complement, not replace, until a full typography pass is done.

**Animation**

- **FR-029**: All interactive element transitions MUST use `background .15s, opacity .15s` (or border-color .15s). Any longer or spring-based transitions found in production CSS MUST be removed.
- **FR-030**: `enhancements.css` keyframes (`insertBannerIn`, `alignBarIn`) and `filler-enhancements.css` keyframes (`live-pulse`, `jump-pulse`) MUST be integrated into the relevant feature CSS Modules if the corresponding UI elements exist.

**What MUST NOT change**

- **FR-031**: All TypeScript logic — hooks (`useFieldStore`, `useInteractionMode`, `useFillerStore`, `useFieldDetection`, `useRubberBand`, `useTheme`, `usePdfRenderer`), stores, and API route handlers — MUST NOT be modified.
- **FR-032**: CLAUDE.md constraints MUST remain enforced: `annotationMode:2` in `usePdfRenderer`, field dedup in `pdfService`, fill order in `fillService`, `buffer.slice(0)` in filler, `defaultAppearanceData` for pdfjs v4.
- **FR-033**: Existing Vitest unit tests MUST pass without modification. Style-only changes must not break tests that query by class name (use `data-*` attributes in tests, not CSS class selectors — flag any test that queries a CSS class for team review).
- **FR-034**: No new npm dependencies. Geist is a local `.woff2` file.

### Key Entities

- **Design System Source**: `new-design/` folder — read-only reference, never imported by production build.
- **Token File**: `src/styles/tokens.css` — the single source of truth for all design tokens in production.
- **CSS Module Files**: One per component (e.g., `Button.module.css`, `App.module.css`) — consume tokens via `var(--token-name)`.
- **Primitive Components**: `src/components/ui/` — Button, IconButton, Input, Select, Modal, Tooltip, **Kbd** (new).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All visual surfaces match the new design system: teal-tinted dark palette (`#091214` base), Geist type, 13px density — verifiable by comparing running app screenshots to `new-design/screenshots/`.
- **SC-002**: Theme toggle cycles dark↔light in under 50ms with no visible flash (anti-FOUC inline script preserves sub-paint application of `data-theme`).
- **SC-003**: 100% of existing Vitest unit tests pass after migration with zero modifications.
- **SC-004**: Zero `--spacing-N` or `--color-border` token references remain in filler feature CSS (use `--space-N` / `--border-color` per CLAUDE.md).
- **SC-005**: Zero inline `px` font-size values remain in component CSS — all use `var(--font-size-*)` tokens.
- **SC-006**: `npm run build` completes without TypeScript or CSS module errors.
- **SC-007**: PDF canvas field overlays maintain white `#fff` background in dark mode — no teal bleed into PDF fill area.
- **SC-008**: Filler live-preview overlay aligns with PDF canvas at all zoom levels (no CSS-scale mismatch).

---

## Migration Sequence

Execute layers in this order to minimize regression risk:

1. **Token layer** — Replace `tokens.css`; copy Geist `.woff2`; verify anti-FOUC still applies.
2. **Primitive components** — Restyle Button, IconButton, Input, Select, Modal, Tooltip; add `Kbd`.
3. **App shell** — Update `App.tsx` state wiring + `App.module.css` (navbar bg, viewer bg, conditional toolbar).
4. **Canvas & toolbar** — ThumbnailStrip, ToolbarModes, ThemeToggle (prop-driven), ShortcutsPanel.
5. **Fields** — FieldOverlay, DraggableField, ResizeHandles, FieldList, PropertiesPanel.
6. **Filler** — FillerLayout, DynamicForm, live-preview CSS wrapper.
7. **PDF utilities** — PdfUploader icon swap; TemplatePanel/ExportModal/ImportModal restyle.
8. **Typography pass** — Apply `.t-*` classes to headings/labels where appropriate.
9. **Animation audit** — Remove heavy transitions; integrate enhancement keyframes.

---

## Assumptions

- Geist `@font-face` is declared once, in `tokens.css` (imported by `layout.tsx`). Not repeated in `layout.tsx` directly.
- The `new-design/` folder stays in the repo as a reference artifact but is excluded from the Next.js build (not under `src/` or `public/`).
- Mobile/responsive layout is out of scope: this is a power-user desktop tool.
- The `new-design/prototype/editor/enhancements.css` insert-banner and alignment-bar features are design explorations — include only if corresponding DOM elements already exist in production.
- Mixed EN/ES strings in component UI are kept as-is; no i18n library is introduced.
- `useTheme` hook remains the sole owner of `localStorage['pdf-editor-theme']` — `App.tsx` reads theme state from the hook, does not manage localStorage directly.
- The `new-design/ui_kits/pdf-form-editor/` components (JSX files) are **reference only** — their APIs are not imported into production. Production components are updated to match their visual output.
