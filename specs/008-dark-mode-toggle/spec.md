# Feature Specification: Dark Mode with Manual Toggle

**Feature Branch**: `008-dark-mode-toggle`
**Created**: 2026-03-28
**Status**: Draft
**Input**: User description: "Nueva feature: modo oscuro con toggle manual y respeto a preferencia del sistema."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Automatic Theme on First Visit (Priority: P1)

A user opens the application for the first time. They have never manually set a
theme preference. The application reads their operating system's colour-scheme
preference and renders in the matching mode — dark if the OS is dark, light if
the OS is light — with no manual action required.

**Why this priority**: The most common interaction is the first visit. If the app
opens in the wrong mode, the user immediately perceives the product as
unpolished. This is zero-effort value.

**Independent Test**: Open the app with no stored preference. Set the OS to dark
mode and verify the app renders in dark mode. Set the OS to light mode and verify
the app renders in light mode.

**Acceptance Scenarios**:

1. **Given** no theme preference is stored in localStorage, **When** the app loads
   on a device with OS dark mode active, **Then** the app renders in dark mode
   without any user interaction.
2. **Given** no theme preference is stored in localStorage, **When** the app loads
   on a device with OS light mode active, **Then** the app renders in light mode.
3. **Given** no theme preference is stored, **When** the OS theme changes while the
   app is open, **Then** the app theme updates automatically to match.

---

### User Story 2 — Manual Toggle in the Toolbar (Priority: P1)

A user who prefers a different theme from their OS clicks the sun/moon toggle
button in the application toolbar. The theme switches instantly — no page reload,
no layout shift. The chosen mode persists across browser sessions.

**Why this priority**: Equal priority to auto-detection: users who explicitly
override the OS preference expect their choice to be respected. This is the
primary manual control.

**Independent Test**: Click the toggle button. Verify the theme flips immediately.
Reload the page and verify the same theme is still active.

**Acceptance Scenarios**:

1. **Given** the app is in light mode, **When** the user clicks the theme toggle,
   **Then** the app switches to dark mode instantly without reloading.
2. **Given** the app is in dark mode, **When** the user clicks the theme toggle,
   **Then** the app switches to light mode instantly without reloading.
3. **Given** the user has toggled to dark mode, **When** the page is reloaded,
   **Then** the app starts in dark mode regardless of OS preference.
4. **Given** the user has toggled to dark mode, **When** the OS theme changes to
   light, **Then** the app stays in dark mode (manual preference prevails).

---

### User Story 3 — No Flash of Incorrect Theme (FOUC Prevention) (Priority: P1)

A returning user with a stored dark-mode preference reloads the page. The app
renders in dark mode from the very first painted frame — there is no brief flash
of the light theme before switching.

**Why this priority**: FOUC is one of the most visually jarring UX failures in
theming. Even a 100 ms flash of the wrong theme destroys trust.

**Independent Test**: Store a dark-mode preference in localStorage. Open the page
in a browser with CPU throttled (slow 3G simulation). Observe the initial paint —
there must be no white/light flash before the dark theme appears.

**Acceptance Scenarios**:

1. **Given** dark mode is stored as the manual preference, **When** the browser
   begins rendering the page, **Then** the very first painted frame is dark — no
   light theme is visible at any point during page load.
2. **Given** OS dark mode with no stored preference, **When** the page loads,
   **Then** the first painted frame is dark.

---

### User Story 4 — PDF Canvas Fields Stay White (Priority: P2)

A user in dark mode places form fields on a PDF. The field overlays (text input
boxes drawn on top of the PDF canvas) keep a white background with a clearly
visible border, matching the appearance of a real PDF form field — the dark theme
does not bleed into the field fill.

**Why this priority**: PDF form fields have a defined visual contract: white
background, visible border. Inverting them in dark mode would make them look
broken and inconsistent with the exported PDF.

**Independent Test**: Switch to dark mode. Open a PDF and place a form field.
Verify the field box has a white fill regardless of the active theme.

**Acceptance Scenarios**:

1. **Given** dark mode is active, **When** a form field is placed on the canvas,
   **Then** the field box background is white and the border is clearly visible.
2. **Given** dark mode is active, **When** a form field is selected, **Then** the
   selection indicator (border/handles) is visible but the field fill remains white.

---

### User Story 5 — All UI Components Correct in Both Themes (Priority: P2)

A user navigates the full application in dark mode: toolbar, sidebars (field list
and properties panel), modals (import/export), tooltips, and buttons all render
with appropriate contrast and no invisible text, unreadable borders, or
missing backgrounds.

**Why this priority**: A partially themed UI is worse than no dark mode at all.
Every surface the user touches must be correct.

**Independent Test**: Switch to dark mode. Exercise every major surface: open a
PDF, place a field, open the properties panel, open the export modal, open the
import modal, hover over toolbar buttons. No element should have invisible text or
missing background.

**Acceptance Scenarios**:

1. **Given** dark mode is active, **When** a user opens any modal (export/import
   template), **Then** the modal background, text, and controls are clearly visible.
2. **Given** dark mode is active, **When** a user hovers over a toolbar button,
   **Then** the hover state is visible and distinct from the default state.
3. **Given** dark mode is active, **When** a user reads the field list or properties
   panel, **Then** all labels and inputs have sufficient contrast.

---

### Edge Cases

- What happens if localStorage is unavailable (private browsing, storage quota
  exceeded)? The app falls back gracefully to OS preference for the current session
  without throwing an error.
- What happens if the stored preference value is corrupted (invalid string)?
  The app discards the corrupted value and falls back to OS preference.
- What happens when the OS theme changes while a manual preference is stored?
  The stored manual preference takes priority and the app does not change.
- What happens on a system where `prefers-color-scheme` is not supported?
  The app defaults to light mode.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST detect the OS `prefers-color-scheme` preference
  on load and apply the matching theme when no manual preference is stored.
- **FR-002**: The toolbar MUST contain a toggle button (sun/moon icon) that switches
  the active theme between light and dark instantly without a page reload.
- **FR-003**: The manual theme preference MUST be persisted in localStorage so it
  survives page reloads and new browser sessions on the same device.
- **FR-004**: A stored manual preference MUST take precedence over the OS
  `prefers-color-scheme` value on every subsequent load.
- **FR-005**: The theme MUST be applied before the first painted frame to prevent
  any flash of incorrect theme (FOUC). This requires inline script execution in
  `<head>` before CSS is applied.
- **FR-006**: All CSS color, background, border, and shadow values MUST be expressed
  as CSS custom properties sourced from `tokens.css`. No component may hardcode
  a colour value for a single theme.
- **FR-007**: `tokens.css` MUST define dark-mode overrides for every colour token,
  activated by both `@media (prefers-color-scheme: dark)` (when no manual
  preference is set) and the attribute selector `[data-theme="dark"]` on the root
  element (manual override).
- **FR-008**: Form field overlays on the PDF canvas MUST maintain a white background
  and visible border in both themes — they MUST NOT inherit dark-mode background
  colours.
- **FR-009**: A `useTheme()` hook MUST be the single point of access for reading and
  writing the theme preference. No component may access localStorage directly for
  theme state.
- **FR-010**: Removing the manual preference (reset to OS default) MUST be
  achievable programmatically via `useTheme()`, even if no UI control exposes this
  in v1.

### Key Entities

- **Theme**: The active visual mode (`'light' | 'dark'`). Derived from either the
  manual stored preference or the OS preference. Applied as `data-theme` on the
  `<html>` element.
- **Theme Preference**: The user's explicit manual choice, persisted in localStorage
  under a stable key. Absent when the user has never toggled.
- **Token**: A CSS custom property in `tokens.css` that has both a light default
  value and a dark override.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On first load with no stored preference, the applied theme matches the
  OS `prefers-color-scheme` setting in 100% of test cases.
- **SC-002**: Clicking the toggle button switches the visible theme in under 100 ms
  (imperceptible to the user as a layout change).
- **SC-003**: After toggling and reloading, the manually selected theme is restored
  in 100% of test cases.
- **SC-004**: Zero painted frames show the incorrect theme during page load when a
  preference is stored (FOUC = 0 ms).
- **SC-005**: Every colour token in `tokens.css` has a corresponding dark-mode
  value — zero tokens define only a light value.
- **SC-006**: All `src/components/ui/` primitives (Button, Modal, Input, Select,
  Tooltip, IconButton) pass a manual visual review in both themes with no
  invisible text, missing backgrounds, or invisible borders.
- **SC-007**: Form field overlays on the canvas display a white background in both
  themes — verified by visual inspection and automated snapshot if feasible.

## Assumptions

- The anti-FOUC script is injected as an inline `<script>` tag in the `<head>` of
  the Next.js root layout, executed synchronously before any CSS or React hydration.
  This is the only pattern that reliably prevents FOUC in SSR/SSG frameworks.
- The localStorage key used to store the manual preference is a stable string
  (`'pdf-editor-theme'`) defined as a constant in `useTheme()` — not configurable
  at runtime.
- No server-side per-user theme storage is implemented; the feature is entirely
  client-side. Users who clear localStorage lose their manual preference and revert
  to OS default.
- The toggle button icon (sun = light mode active, moon = dark mode active) is
  sufficient UI affordance; no separate settings page is required for v1.
- Snapshot/visual regression tests for theming are desirable but not blocking;
  manual visual review against the component checklist is the v1 acceptance bar.
- The colour palette for both themes is the Teal/Aqua design system adopted on
  2026-03-29. Light: Background `#F4F7F8`, Surface `#C4DFE6`, Text `#151E20`,
  Muted `#003B46`, Primary `#07575B`, Accent `#E76F51`. Dark: Background `#091214`,
  Surface `#003B46`, Text `#E8EDEF`, Muted `#C4DFE6`, Primary `#66A5AD`,
  Accent `#F4A261`. All values meet WCAG AA (4.5:1) for normal text.
