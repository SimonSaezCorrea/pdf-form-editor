# Quickstart: Dark Mode with Manual Toggle

**Phase**: 1 — Integration scenarios
**Feature**: 008-dark-mode-toggle
**Date**: 2026-03-28

---

## Integration Scenarios

These scenarios describe how the feature integrates with existing application surfaces. Each maps to one or more acceptance criteria in the spec.

---

### Scenario 1 — First visit, OS dark mode (SC-001, FR-001)

```
1. User opens the app for the first time (no localStorage entry).
2. OS preference: dark.
3. Inline script in <head> runs:
   - localStorage.getItem('pdf-editor-theme') → null
   - matchMedia('(prefers-color-scheme: dark)').matches → true
   - Sets: document.documentElement.dataset.theme = 'dark'
4. CSS [data-theme="dark"] block activates → dark palette applied before first paint.
5. React hydrates → useTheme() reads dataset.theme → state = 'dark', preference = null.
6. ThemeToggle renders moon icon (dark active, click to switch to light).
```

---

### Scenario 2 — Manual toggle (SC-002, SC-003, FR-002, FR-003, FR-004)

```
1. App is in light mode (OS light, no stored preference).
2. User clicks ThemeToggle (moon icon shown).
3. useTheme.setTheme('dark'):
   - localStorage.setItem('pdf-editor-theme', 'dark')
   - document.documentElement.dataset.theme = 'dark'
   - state updates → re-render < 100 ms
4. All CSS tokens switch to dark values instantly (no reload).
5. ThemeToggle now shows sun icon.
6. User reloads page:
   - Inline script reads localStorage → 'dark'
   - Sets dataset.theme = 'dark' before first paint
   - App opens in dark mode regardless of OS setting.
```

---

### Scenario 3 — FOUC prevention (SC-004, FR-005)

```
1. User has stored preference 'dark' in localStorage.
2. Browser loads page (even on slow connection / CPU throttle):
   a. HTML parsed → <script> in <head> executes synchronously
   b. document.documentElement.dataset.theme = 'dark' set
   c. <link rel="stylesheet"> loads → [data-theme="dark"] already matches
   d. First painted frame: dark background, dark panel colours
3. React hydration begins (may be 100–500 ms later on slow devices).
4. Zero frames show light theme.
```

---

### Scenario 4 — OS change while app is open (FR-001 §3, FR-004)

```
Case A — No manual preference stored:
  - User switches OS from light → dark
  - matchMedia 'change' event fires
  - useTheme OS listener: preference === null → update theme to 'dark'
  - UI switches to dark without reload

Case B — Manual preference stored ('dark'):
  - User switches OS from dark → light
  - matchMedia 'change' event fires
  - useTheme OS listener: preference !== null → ignore
  - UI stays in dark mode
```

---

### Scenario 5 — PDF canvas fields in dark mode (SC-007, FR-008)

```
1. Dark mode is active.
2. User opens a PDF and places a form field.
3. DraggableField renders .field-bg div:
   - CSS rule: background-color: #fff !important
   - Parent dark-mode tokens do NOT bleed into field background.
4. Field shows: white fill + visible indigo border + dark field-name label.
5. Selected field: blue selection border visible; fill still white.
```

---

### Scenario 6 — localStorage unavailable (edge case, FR-spec)

```
1. User is in private browsing mode.
2. Inline script runs: localStorage.getItem() throws SecurityError.
3. try/catch absorbs error → no dataset.theme set.
4. CSS defaults (light mode :root) apply.
5. useTheme() initializes: tries localStorage → throws → preference = null.
6. OS preference read from matchMedia → theme applied correctly.
7. Toggling works in-memory for the session; toggle result not persisted.
```

---

### Scenario 7 — Corrupted localStorage value (edge case)

```
1. localStorage['pdf-editor-theme'] = 'blue' (invalid).
2. Inline script: 'blue' !== 'dark' && 'blue' !== 'light' → skip.
3. Falls back to matchMedia OS detection.
4. useTheme() on mount: reads 'blue' → not valid → treats as null → discard.
5. App behaves as if no preference stored.
```

---

## Component Integration Map

| Component / File | Change type | What changes |
|-----------------|-------------|-------------|
| `src/app/layout.tsx` | Modify | Add inline anti-FOUC `<script>` to `<head>` |
| `src/styles/tokens.css` | Modify | Add dark-mode override blocks |
| `src/hooks/useTheme.ts` | New | Hook: read/write/reset theme preference |
| `src/features/toolbar/components/ThemeToggle/ThemeToggle.tsx` | New | Sun/moon toggle button |
| `src/features/toolbar/components/ThemeToggle/ThemeToggle.module.css` | New | Toggle button styles |
| `src/App.tsx` | Modify | Mount `<ThemeToggle />` in `.header-toolbar-actions` |
| `src/features/fields/components/FieldOverlay/DraggableField.module.css` | Modify | Add `background-color: #fff !important` to field bg |
| Component CSS Modules (panels, inputs, modal) | Modify | Replace hardcoded `#fff` / `#111827` with semantic tokens (`--color-panel-bg`, `--color-text`, `--color-input-bg`) |
| `tests/unit/useTheme.test.ts` | New | Unit tests for hook state machine |
