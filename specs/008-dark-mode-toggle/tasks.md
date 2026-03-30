# Tasks: Dark Mode with Manual Toggle

**Input**: Design documents from `/specs/008-dark-mode-toggle/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: Unit tests for `useTheme` hook included in Polish phase (manual visual review is the v1 bar per spec Assumptions).

**Organization**: Foundational CSS tokens first, then each user story in priority order.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)

---

## Phase 1: Setup

> No new project scaffolding needed — existing Next.js project. Proceed to Foundational.

---

## Phase 2: Foundational — CSS Tokens (Blocking Prerequisite)

**Purpose**: Add new semantic tokens and dark-mode override blocks to `tokens.css`. Every user story depends on this — no dark theme is visible without it.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] - [X] T001 Add four semantic token variables to `:root` in `src/styles/tokens.css`: `--color-panel-bg: #fff`, `--color-input-bg: #fff`, `--color-text: #111827`, `--color-text-muted: #4b5563`
- [X] - [X] T002 Add `@media (prefers-color-scheme: dark)` block to `src/styles/tokens.css` overriding: `--color-surface: #111827`, `--color-panel-bg: #1f2937`, `--color-input-bg: #374151`, `--color-text: #f9fafb`, `--color-text-muted: #9ca3af`, `--border-color: #374151`, `--color-neutral-100: #1f2937`, `--color-neutral-200: #374151`, `--color-danger-bg: #3b0f0f`, `--color-danger-border: #7f1d1d`; selector must be `:root:not([data-theme="light"])` so manual light preference suppresses it
- [X] - [X] T003 Add `[data-theme="dark"]` block to `src/styles/tokens.css` with identical overrides as T002 (manual preference wins over OS via higher specificity)

**Checkpoint**: `tokens.css` has all dark-mode colour values. Applying `data-theme="dark"` to `<html>` in DevTools should visually flip all `--color-surface` and `--border-color` usages.

---

## Phase 3: User Story 3 — No Flash of Incorrect Theme (Priority: P1)

**Goal**: The very first painted frame matches the stored or OS-detected theme — no light flash before dark theme appears.

**Independent Test**: Set `localStorage['pdf-editor-theme'] = 'dark'`. Open the page with CPU throttled (Chrome DevTools → 4× slowdown). Observe initial paint — must be dark from the first frame.

- [X] - [X] T004 [US3] Add an inline anti-FOUC `<script dangerouslySetInnerHTML>` inside `<head>` in `src/app/layout.tsx`; the script reads `localStorage.getItem('pdf-editor-theme')`, falls back to `window.matchMedia('(prefers-color-scheme: dark)').matches`, then sets `document.documentElement.dataset.theme`; wrap entire script body in `try/catch` to absorb `SecurityError`

**Checkpoint**: With `localStorage['pdf-editor-theme'] = 'dark'` and page loaded at any speed, the `<html>` element already has `data-theme="dark"` before React hydration.

---

## Phase 4: User Story 1 — Automatic Theme on First Visit (Priority: P1)

**Goal**: On first visit with no stored preference, the app automatically matches the OS colour-scheme and updates live if the OS theme changes while the app is open.

**Independent Test**: Clear localStorage. Set OS to dark → reload → app is dark. Set OS to light → reload → app is light. Toggle OS while app is open (no manual pref stored) → app updates.

- [X] - [X] T005 [US1] Create `src/hooks/useTheme.ts`: define `type Theme = 'light' | 'dark'` and `const STORAGE_KEY = 'pdf-editor-theme' as const`; export `useTheme()` returning `{ theme, preference, setTheme, resetTheme }`; initial state reads `document.documentElement.dataset.theme` (set by FOUC script) then falls back to `matchMedia`; register a `matchMedia` `change` listener that only fires when `preference === null`; guard all DOM/localStorage access with `typeof window !== 'undefined'`

**Checkpoint**: Mount `useTheme()` in any component. Clear localStorage, set OS to dark → `theme` returns `'dark'`. Toggle OS live → `theme` updates reactively.

---

## Phase 5: User Story 2 — Manual Toggle in Toolbar (Priority: P1)

**Goal**: A sun/moon button in the toolbar switches the theme instantly, persists the choice in localStorage, and the manual preference survives page reloads and beats OS changes.

**Independent Test**: Click the toggle → theme flips in < 100 ms. Reload → same theme restored. Change OS → theme does not change.

- [X] - [X] T006 [US2] Implement `setTheme(t: Theme)` in `src/hooks/useTheme.ts`: writes `localStorage.setItem(STORAGE_KEY, t)`, sets `document.documentElement.dataset.theme = t`, updates `preference` and `theme` state; implement `resetTheme()`: removes localStorage key, removes `dataset.theme` attribute, sets `preference` to `null` and re-reads OS
- [X] - [X] T007 [P] [US2] Create `src/features/toolbar/components/ThemeToggle/ThemeToggle.tsx`: `'use client'` component; calls `useTheme()`; renders an `<IconButton>` with a sun SVG icon when dark mode is active (click → `setTheme('light')`) and a moon SVG icon when light mode is active (click → `setTheme('dark')`); sets `aria-label` to `'Cambiar a modo claro'` / `'Cambiar a modo oscuro'` matching active state
- [X] - [X] T008 [P] [US2] Create `src/features/toolbar/components/ThemeToggle/ThemeToggle.module.css`: minimal styles (icon size 16px, button inherits `IconButton` sizing); no hardcoded colours — use `--color-text` or `--color-neutral-400` for icon fill
- [X] - [X] T009 [US2] Import and mount `<ThemeToggle />` inside the `.header-toolbar-actions` div in `src/App.tsx` (alongside existing export/import buttons); no new layout changes needed

**Checkpoint**: Toggle button appears in toolbar. Click → theme flips instantly. Reload → preference restored. OS change with manual pref active → no change.

---

## Phase 6: User Story 4 — PDF Canvas Fields Stay White (Priority: P2)

**Goal**: Form field overlays on the PDF canvas keep a white background in both themes.

**Independent Test**: Activate dark mode. Open a PDF and place a field. The field background must be white, not the dark panel colour.

- [X] - [X] T010 [US4] Add `.field-bg { background-color: #fff !important; }` rule to `src/features/fields/components/FieldOverlay/DraggableField.module.css`; the `!important` is intentional and documented — it prevents dark-mode token inheritance from reaching PDF canvas field fills (FR-008)

**Checkpoint**: In dark mode, placed form fields show white fill. Selected fields show blue selection border; fill remains white.

---

## Phase 7: User Story 5 — All UI Components Correct in Both Themes (Priority: P2)

**Goal**: Every surface (panels, modals, inputs, toolbar) renders with correct contrast and no invisible text or missing backgrounds in dark mode.

**Independent Test**: Activate dark mode. Open a PDF, place a field, open Properties Panel, open Export modal, open Import modal, hover toolbar buttons, open TemplatePanel. No invisible text, no white-on-white, no black-on-black.

> All tasks in this phase are independent (different files) — mark [P] and run together.

- [X] - [X] T011 [P] [US5] Update `src/components/ui/Input/Input.module.css`: replace `var(--color-white)` background with `var(--color-input-bg)`; replace hardcoded `var(--color-dark-900)` / `var(--color-dark-700)` text colours with `var(--color-text)` where used on white/panel backgrounds
- [X] - [X] T012 [P] [US5] Update `src/components/ui/Select/Select.module.css`: same substitutions as T011 (`--color-input-bg` for background, `--color-text` for text on white backgrounds)
- [X] - [X] T013 [P] [US5] Update `src/components/ui/Modal/Modal.module.css`: replace `var(--color-white)` panel background with `var(--color-panel-bg)`; replace body text `var(--color-dark-900)` with `var(--color-text)`; replace muted text `var(--color-neutral-500)` with `var(--color-text-muted)`
- [X] - [X] T014 [P] [US5] Update `src/features/fields/components/FieldList/FieldList.module.css`: replace any `var(--color-white)` sidebar background with `var(--color-panel-bg)`; replace text tokens with `--color-text` / `--color-text-muted` where used on panel backgrounds
- [X] - [X] T015 [P] [US5] Update `src/features/fields/components/PropertiesPanel/PropertiesPanel.module.css`: replace panel background `var(--color-white)` (if present) with `var(--color-panel-bg)`; ensure label text uses `--color-text` or `--color-text-muted`
- [X] - [X] T016 [P] [US5] Update `src/features/templates/components/TemplatePanel/TemplatePanel.module.css`: replace `var(--color-white)` panel backgrounds with `var(--color-panel-bg)`; replace body text tokens with `--color-text` / `--color-text-muted`
- [X] - [X] T017 [P] [US5] Update `src/features/templates/components/ImportExportModal/ExportModal.module.css`: replace `var(--color-white)` content area background with `var(--color-panel-bg)`; replace text colour tokens with `--color-text` / `--color-text-muted`
- [X] - [X] T018 [P] [US5] Update `src/features/templates/components/ImportExportModal/ImportModal.module.css`: same substitutions as T017
- [X] - [X] T019 [P] [US5] Update `src/features/toolbar/components/ShortcutsPanel/ShortcutsPanel.module.css`: replace `var(--color-white)` panel background with `var(--color-panel-bg)`; replace text tokens with `--color-text` / `--color-text-muted`
- [X] - [X] T020 [P] [US5] Update `src/features/canvas/components/ThumbnailStrip/ThumbnailStrip.module.css`: verify strip background uses `var(--color-white)` → replace with `var(--color-panel-bg)`; thumbnail selected border remains `var(--color-primary)` (no change)
- [X] - [X] T021 [P] [US5] Update `src/features/fields/components/PageNavigator/PageNavigator.module.css`: replace `var(--color-white)` background with `var(--color-panel-bg)`; replace text tokens with `--color-text`
- [X] - [X] T022 [P] [US5] Audit `src/App.module.css` header and sidebar area tokens: header uses `--color-dark-900` background (intentional, stays dark in both themes — no change); verify `.app-sidebar` and `.app-main` use `--color-surface` (already has dark override — no change); no-op if already correct

**Checkpoint**: All panels, modals, inputs, and the thumbnail strip display correct colours in dark mode. The app header stays dark in both themes (by design).

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] - [X] T023 Create `tests/unit/useTheme.test.ts`: test cases — (a) no stored pref + OS dark → `theme='dark'`; (b) stored `'dark'` → `theme='dark'` regardless of OS; (c) `setTheme('light')` → localStorage updated + `theme='light'`; (d) `resetTheme()` → localStorage cleared + `theme` reverts to OS; (e) invalid localStorage value → treated as no preference; (f) localStorage throws → falls back to OS gracefully
- [X] - [X] T024 Run `npm run typecheck` and resolve any TypeScript errors introduced by the new hook and component
- [X] - [X] T025 Manual visual review per SC-006: open app in dark mode and verify — toolbar, field list, properties panel, template panel, export modal, import modal, thumbnail strip, page navigator, tooltips, button hover states; confirm no invisible text, missing backgrounds, or invisible borders

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No dependencies — start immediately. **BLOCKS** all user story phases.
- **US3 / Phase 3**: Depends on Phase 2 (dark CSS tokens must exist for the script to have visual effect)
- **US1 / Phase 4**: Depends on Phase 3 (hook reads `dataset.theme` set by the FOUC script)
- **US2 / Phase 5**: Depends on Phase 4 (`setTheme` extends the hook built in US1)
- **US4 / Phase 6**: Depends on Phase 2 only — can run in parallel with Phases 3–5
- **US5 / Phase 7**: Depends on Phase 2 only — can run in parallel with Phases 3–6
- **Polish (Phase 8)**: Depends on all user story phases

### User Story Dependencies

```
Phase 2 (tokens.css)
  ├──► Phase 3 (FOUC script)
  │       └──► Phase 4 (useTheme hook)
  │               └──► Phase 5 (ThemeToggle + manual toggle)
  ├──► Phase 6 (canvas field bg) [independent]
  └──► Phase 7 (component CSS) [independent, all [P]]
```

### Within Each Phase

- T001 → T002 → T003 (sequential — same file)
- T006 → T007/T008/T009 (T006 must exist before ThemeToggle can import hook)
- T007 and T008 can be written simultaneously (different files)
- T009 depends on T007 (mounts the component)
- All Phase 7 tasks (T011–T022) are fully parallel — different files

---

## Parallel Execution Examples

### Phase 2 (tokens.css — sequential, same file)
```
T001 → T002 → T003
```

### Phase 6 + Phase 7 (parallel with Phase 3–5)
```
Parallel: T010, T011, T012, T013, T014, T015, T016, T017, T018, T019, T020, T021, T022
(all different files, only depend on Phase 2 completion)
```

### Phase 5 (ThemeToggle)
```
T006 (hook additions)
  └──► T007 + T008 (parallel — .tsx and .module.css)
           └──► T009 (App.tsx wiring)
```

---

## Implementation Strategy

### MVP (User Stories 1, 2, 3 — P1 only)

1. Complete Phase 2: tokens.css dark blocks
2. Complete Phase 3: FOUC script in layout.tsx
3. Complete Phase 4: useTheme hook (OS detection)
4. Complete Phase 5: setTheme + ThemeToggle
5. **STOP and VALIDATE**: toggle works, FOUC is gone, OS auto-detects
6. Merge/demo if ready

### Full Delivery (add P2 stories)

6. Complete Phase 6: canvas field white fix
7. Complete Phase 7: all component CSS audits (run in parallel)
8. Complete Phase 8: unit tests + typecheck + visual review

---

## Notes

- [P] tasks = different files, no shared state dependencies
- [US*] label maps each task to the user story it delivers
- `--color-white` is NOT overridden globally in dark mode — it stays `#fff` for PDF canvas fields
- `--color-panel-bg` is the semantic token for panel/sidebar/modal backgrounds (switches to dark)
- `--color-input-bg` is the semantic token for form control backgrounds (switches to dark)
- The header (`--color-dark-900` background) is intentionally dark in both themes — no changes needed there
- Tooltip already has a dark background — no change needed
- Commit after each checkpoint
