# Tasks: New Design System Integration

**Input**: Design documents from `/specs/011-new-design-integration/`  
**Branch**: `011-new-design-integration` | **Date**: 2026-05-27  
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ quickstart.md ✅

**Organization**: Layered by migration sequence — token foundation first, then primitives, then shell, then feature components. Each phase is independently verifiable before proceeding.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Which user story [US1–US4]
- Exact file paths in every description

---

## Phase 1: Setup (Asset Copy)

**Purpose**: Copy reference assets from `new-design/` into production source locations. No code changes.

- [ ] T001 Copy `new-design/fonts/Geist_wght_.woff2` → `public/fonts/Geist_wght_.woff2`
- [ ] T002 [P] Copy `new-design/assets/icon-document.svg` → `src/assets/icon-document.svg`
- [ ] T003 [P] Copy `new-design/assets/icon-sun.svg` → `src/assets/icon-sun.svg`
- [ ] T004 [P] Copy `new-design/assets/icon-moon.svg` → `src/assets/icon-moon.svg`

**Checkpoint**: All four asset files exist in their production locations. `npm run dev` still starts cleanly.

---

## Phase 2: Foundational — Token Layer (US1)

**Purpose**: Replace `src/styles/tokens.css` with the new design system token set. This is the single biggest change and blocks all subsequent styling work.

**⚠️ CRITICAL**: No component restyling can begin until T005–T008 are complete and verified.

- [ ] T005 [US1] Rewrite `src/styles/tokens.css` with dark-first strategy: `:root` block = dark defaults (all semantic tokens, color ramp, spacing, radii, shadows, z-index, typography) per the token schema in `specs/011-new-design-integration/data-model.md`. Remove the `@media (prefers-color-scheme: dark)` block entirely (dark is now the root default).
- [ ] T006 [US1] Add `@font-face` for Geist at top of `src/styles/tokens.css`: `font-family: 'Geist'`, `src: url('/fonts/Geist_wght_.woff2') format('woff2')`, `font-weight: 100 900`, `font-display: swap`.
- [ ] T007 [US1] Add `[data-theme="light"]` override block to `src/styles/tokens.css` with light-mode values for all semantic tokens (mirrors the `:root` dark block but with light palette per data-model.md). Verify `[data-theme="dark"]` explicit override block still exists and matches `:root` values (supports localStorage manual override).
- [ ] T008 [US1] Smoke-test token migration: run `npm run dev`, open app in browser, verify (a) dark background `#091214` renders on cold start with no localStorage key, (b) `document.documentElement.dataset.theme` is set before first paint by the anti-FOUC script in `src/app/layout.tsx` (use DevTools → Performance to confirm), (c) clicking the theme toggle switches to light mode `#F4F7F8` and back, (d) Geist font loads (DevTools → Fonts), (e) no CSS console errors about undefined custom properties.

**Checkpoint** (US1 complete): App renders in dark mode with teal palette, Geist font, and working theme toggle. Anti-FOUC intact. `npm test` passes with zero changes.

---

## Phase 3: Primitive Components Restyle (US2)

**Purpose**: Restyle all `src/components/ui/` primitives and add the new `Kbd` component. Depends on Phase 2 (tokens must be defined).

**Goal**: Every primitive uses new tokens; Kbd is available; all existing prop APIs unchanged.

**Independent Test**: Load any screen that uses a Modal (e.g., Export Template) — verify 8px radius, shadow, backdrop. Hover a Button — verify 5px radius and fast transition.

- [ ] T009 [US2] Create `src/components/ui/Kbd/Kbd.tsx`: renders `<kbd className={styles.kbd}>{children}</kbd>` with props `{ children: React.ReactNode; className?: string }`. Create `src/components/ui/Kbd/Kbd.module.css` with key-cap styling: `font-family: var(--font-family-mono)`, `font-size: var(--font-size-xs)`, `padding: 1px 5px`, `border: 1px solid var(--border-color)`, `border-bottom-width: 2px`, `border-radius: var(--radius-sm)`, `background: var(--color-input-bg)`, `color: var(--color-text-muted)`. Create `src/components/ui/Kbd/index.ts` barrel export.
- [ ] T010 [P] [US2] Update `src/components/ui/Button/Button.module.css`: set `border-radius: var(--radius-md)` (5px) on `.btn`, padding `var(--space-1) var(--space-3)` (4px 12px), transition `background .15s, opacity .15s`. Verify primary/secondary/danger/ghost variants still render distinctly with new tokens.
- [ ] T011 [P] [US2] Update `src/components/ui/IconButton/IconButton.module.css`: add `.navbar` variant with `background: transparent`, hover `background: rgba(255,255,255,0.12)`, `transition: background .15s`. Existing variants unchanged.
- [ ] T012 [P] [US2] Update `src/components/ui/Input/Input.module.css`: `font-size: var(--font-size-base)` (13px), `background: var(--color-input-bg)`, `border-radius: var(--radius-sm)` (4px), `border: 1px solid var(--border-color)`, focus `border-color: var(--color-primary)`, error state `border-color: var(--color-danger)` + `background: var(--color-danger-bg)`, `transition: border-color .15s`.
- [ ] T013 [P] [US2] Update `src/components/ui/Select/Select.module.css`: identical changes to T012 (same base style as Input).
- [ ] T014 [P] [US2] Update `src/components/ui/Modal/Modal.module.css`: `border-radius: var(--radius-lg)` (8px) on `.modal`, `box-shadow: var(--shadow-lg)`, backdrop `.backdrop` → `background: rgba(0,0,0,0.5)`.
- [ ] T015 [P] [US2] Update `src/components/ui/Tooltip/Tooltip.module.css`: `box-shadow: var(--shadow-sm)`, `border-radius: var(--radius-sm)`. Update `Tooltip.tsx` open-delay logic: 700ms before showing, 0ms on close (use `setTimeout` ref on hover enter/leave if not already implemented).
- [ ] T016 [US2] Update `src/features/toolbar/components/ShortcutsPanel/ShortcutsPanel.tsx`: replace any inline `<kbd>` or `<span>` keyboard hint elements with `<Kbd>` primitive imported from `@/components/ui/Kbd`. Update `ShortcutsPanel.module.css` for panel layout tokens (background, border, spacing via `--space-N` tokens).

**Checkpoint** (US2 complete): All primitives use new tokens. `Kbd` renders in ShortcutsPanel. `npm test` passes. `npm run typecheck` clean.

---

## Phase 4: App Shell & Toolbar State Wiring (US3)

**Purpose**: Wire conditional rendering logic in `App.tsx` and update app shell CSS. Depends on Phase 2 (token `--color-navbar-bg` and `--color-viewer-bg` must be defined).

**Goal**: Toolbar row hides in filler mode; mode nav shows "← Cambiar PDF" when filler+file loaded; ThemeToggle is prop-driven.

**Independent Test**: Load a PDF in editor mode → second navbar row visible. Switch to filler mode → second row hidden, "← Cambiar PDF" appears. Click it → returns to upload state.

- [ ] T017 [US3] In `src/App.tsx`: add `const showEditorToolbar = !!pdfBytes && appMode === 'editor'` derived value. Wrap the second navbar row (`header-toolbar` div) in `{showEditorToolbar && ...}`.
- [ ] T018 [US3] In `src/App.tsx`: add conditional mode nav — when `!!pdfBytes && appMode === 'filler'` render a "← Cambiar PDF" `<button>` that resets `pdfBytes` to null (triggers upload screen). Otherwise render existing editor/filler mode tabs. Wrap mode nav container in a fixed-`min-width` to prevent layout shift during switch.
- [ ] T019 [US3] Refactor `src/features/toolbar/components/ThemeToggle/ThemeToggle.tsx` to accept props `{ theme: 'dark' | 'light' | null; onToggleTheme: () => void }` instead of calling `useTheme()` internally. In `src/App.tsx`: read `const { theme, toggle } = useTheme()` and pass `theme={theme} onToggleTheme={toggle}` to ThemeToggle. `useTheme` hook remains the sole localStorage owner — no duplication.
- [ ] T020 [US3] Update `src/App.module.css`: set `.app-header { background: var(--color-navbar-bg) }` and `.viewer-area { background: var(--color-viewer-bg) }`. Remove any hardcoded hex colors from these selectors.

**Checkpoint** (US3 complete): Toolbar visibility and mode nav work correctly in all states. Theme toggle prop API works. `npm run typecheck` clean. `npm test` passes.

---

## Phase 5: Feature Components — Canvas & Toolbar (US4 Part A)

**Purpose**: Restyle canvas and toolbar feature components. All tasks in this phase target different files and can run in parallel.

**Goal**: ThumbnailStrip, ToolbarModes, and ShortcutsPanel match new design. Depends on Phases 2–4.

- [ ] T021 [P] [US4] Update `src/features/canvas/components/ThumbnailStrip/ThumbnailStrip.module.css`: strip container `width: 110px`, thumbnail images `box-shadow: var(--shadow-sm)`, selected thumbnail `border: 1px solid var(--color-primary)`, hover thumbnail `border: 1px solid var(--color-neutral-400)`. Verify Constitution Principle XXI: ThumbnailStrip background stays `var(--color-white)`.
- [ ] T022 [P] [US4] Update `src/features/toolbar/components/ToolbarModes/ToolbarModes.module.css`: active mode button `.mode-btn--active { background: rgba(255,255,255,0.18); border: 1px solid transparent; }`, inactive buttons `opacity: 0.7`, hover `opacity: 1; background: rgba(255,255,255,0.12)`, `transition: background .15s, opacity .15s`. Remove any heavier transitions.
- [ ] T023 [P] [US4] Update `src/features/toolbar/components/ShortcutsPanel/ShortcutsPanel.module.css`: FAB `.shortcuts-fab { position: fixed; bottom: var(--space-4); right: var(--space-4); width: 40px; height: 40px; border-radius: 50%; background: var(--color-panel-bg); border: 1px solid var(--border-color); }`, shortcuts group title → `.t-eyebrow` class or equivalent inline CSS (`font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); text-transform: uppercase; letter-spacing: 0.08em`).

**Checkpoint**: Canvas/toolbar components visually match new design. Zoom controls, mode buttons, and thumbnail strip all render correctly.

---

## Phase 6: Feature Components — Fields (US4 Part B)

**Purpose**: Restyle field-related components. All tasks target different files and can run in parallel.

**Goal**: DraggableField, FieldList, PropertiesPanel, and FieldOverlay match new design. Critical: `#fff !important` on field backgrounds must survive.

- [ ] T024 [P] [US4] Update `src/features/fields/components/DraggableField/DraggableField.module.css`: selected state border `1.5px solid var(--color-primary)`, danger/conflict state `1.5px solid var(--color-danger)`. Confirm `.field-bg { background-color: #fff !important; }` rule is still present and takes precedence (CLAUDE.md FR-008 / Constitution XII).
- [ ] T025 [P] [US4] Update `src/features/fields/components/FieldList/FieldList.module.css`: field list item hover `background: rgba(102,165,173,0.08)`, selected item `background: rgba(102,165,173,0.08); border-left: 2px solid var(--color-primary)` (or `border: 1px solid var(--color-primary)` per new design), `transition: background .15s`. Remove any heavier transitions.
- [ ] T026 [P] [US4] Update `src/features/fields/components/PropertiesPanel/PropertiesPanel.module.css`: section headers `font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted)`, input groups use `--space-2` gap, panel uses `--color-panel-bg` background. Verify `step=0.5` and `parseFloat(field.x.toFixed(2))` logic in PropertiesPanel.tsx is NOT touched (CLAUDE.md BF-009-02).
- [ ] T027 [P] [US4] Update `src/features/fields/components/FieldOverlay/FieldOverlay.module.css`: rubber-band selection rect `border: 1px dashed var(--color-primary); background: rgba(102,165,173,0.08)`. Add `@keyframes alignBarIn { from { opacity: 0; transform: translate(-50%,-6px); } to { opacity: 1; transform: translate(-50%,0); } }` if alignment bar DOM element exists in FieldOverlay.tsx; skip if not.

**Checkpoint**: Field components render with teal-tint hover/selected states. White `#fff` field backgrounds confirmed in dark mode via browser DevTools (inspect `.field-bg` computed style).

---

## Phase 7: Feature Components — Filler & PDF Utils (US4 Part C)

**Purpose**: Restyle filler mode components and PDF utility components.

**Goal**: FillerLayout 320px panel, filler animations, PdfUploader with new icon.

- [ ] T028 [US4] Update `src/features/filler/components/FillerLayout/FillerLayout.module.css`: form panel `width: 320px; border-right: 1px solid var(--border-color); background: var(--color-panel-bg)`. Add keyframes: `@keyframes live-pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }` and `@keyframes jump-pulse { 0% { box-shadow: 0 0 0 0 rgba(244,162,97,0.45); } 40% { box-shadow: 0 0 0 8px rgba(244,162,97,0.18); } 100% { box-shadow: 0 0 0 0 rgba(244,162,97,0); } }`. Apply `live-pulse` to the live indicator element and `jump-pulse` to the field highlight on value change. Verify all token names use `--space-N` (not `--spacing-N`) and `--border-color` (not `--color-border`).
- [ ] T029 [P] [US4] Verify `src/features/filler/components/DynamicForm/DynamicForm.module.css`: confirm any input styling delegates to the `Input` primitive (which was restyled in T012). If DynamicForm has its own input overrides, remove them in favor of Input primitive defaults.
- [ ] T030 [P] [US4] Update `src/features/pdf/components/PdfUploader/PdfUploader.tsx` (editor entry) and `src/features/filler/components/PdfUploadScreen/PdfUploadScreen.tsx` (filler entry): replace current document icon SVG with `src/assets/icon-document.svg`. Import as raw SVG string using `import IconDocument from '@/assets/icon-document.svg?raw'` and inject via `dangerouslySetInnerHTML={{ __html: IconDocument }}`, or import as a React component if the project uses `@svgr/webpack`. Inline SVG, NOT `<img>` tag.
- [ ] T031 [P] [US4] Update template-related modals: `src/features/templates/components/ExportModal/ExportModal.module.css` and `src/features/templates/components/ImportModal/ImportModal.module.css` — verify they use `Modal` primitive (restyled in T014) with no overriding radius/shadow values. Update any hardcoded panel backgrounds to `var(--color-panel-bg)`.

**Checkpoint** (US4 complete): Filler renders with 320px panel; PdfUploader shows document icon; template modals use correct shadows/radii. `npm test` passes. Live-preview canvas alignment verified at zoom 100% and 150%.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Typography pass, animation audit, final validation.

- [ ] T032 Typography pass — in `src/features/pdf/components/PdfUploader/PdfUploader.module.css` and `PdfUploadScreen`: apply `font-size: var(--font-size-2xl); font-weight: var(--font-weight-semibold)` to upload title. In `src/features/toolbar/components/ShortcutsPanel/`: verify group title uses eyebrow style (uppercase, xs, semibold). Scan all `.module.css` for hardcoded `px` font-size values and replace with `var(--font-size-*)` tokens.
- [ ] T033 [P] Animation audit — scan all `src/**/*.module.css` for `transition` declarations longer than `0.15s` or for `ease-in-out` / spring values. Replace with `background .15s, opacity .15s` (or `border-color .15s`). Document any intentional exceptions (e.g., progress bars with `width .25s ease`) with a comment.
- [ ] T034 [P] Token name audit for filler — run `grep -r "spacing-" src/features/filler/` and `grep -r "color-border" src/features/filler/`: must return zero hits. Fix any occurrences (`--spacing-N` → `--space-N`, `--color-border` → `--border-color`).
- [ ] T035 Run `npm test` — confirm all tests pass with ZERO modifications to test files. If a test fails, it is a test that queries a CSS class name that was renamed — document the class name, do NOT change the test; add a `data-testid` attribute to the component instead, then update the test to use `data-testid`.
- [ ] T036 [P] Run `npm run typecheck` and `npm run build` — confirm zero TypeScript errors and successful build. Fix any type errors introduced by T019 (ThemeToggle props refactor).
- [ ] T037 Visual verification against `specs/011-new-design-integration/quickstart.md` checklist — open the running app and check each item: dark mode default, light mode toggle, no FOUC, Geist renders, field overlay white bg in dark mode, filler canvas alignment at all zooms, modal shadows, tooltip delay, Kbd keys visible, thumbnail strip width.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)          → no dependencies — start immediately
Phase 2 (Foundational)   → depends on Phase 1 (font file must exist for @font-face)
Phase 3 (US2 Primitives) → depends on Phase 2 (token custom properties must exist)
Phase 4 (US3 App Shell)  → depends on Phase 2 (--color-navbar-bg, --color-viewer-bg)
Phase 5 (US4 Canvas)     → depends on Phase 2 + Phase 4 (shell layout must be correct)
Phase 6 (US4 Fields)     → depends on Phase 2 (tokens) + Phase 3 (Kbd not needed here)
Phase 7 (US4 Filler)     → depends on Phase 2 + Phase 3 (Input primitive)
Phase 8 (Polish)         → depends on all prior phases
```

### User Story Dependencies

- **US1 (Token & Font)**: Foundational — blocks all others. Complete Phases 1–2 first.
- **US2 (Primitives)**: Can start once US1 tokens are defined (Phase 2 done).
- **US3 (App Shell)**: Can start once US1 tokens are defined (Phase 2 done). Parallel with US2.
- **US4 (Feature Components)**: Requires US1 + US2 (Input primitive needed for DynamicForm). US4 parts A/B/C can run in parallel with each other.

### Parallel Opportunities

Within **Phase 1**: T001–T004 all run in parallel (different files).  
Within **Phase 2**: T005→T006→T007 sequential (same file); T008 after all three.  
Within **Phase 3**: T010–T015 in parallel after T009 (Kbd must exist first for T016).  
Within **Phase 4**: T017→T018 sequential (same file App.tsx); T019 parallel; T020 parallel.  
Within **Phase 5**: T021, T022, T023 all parallel.  
Within **Phase 6**: T024, T025, T026, T027 all parallel.  
Within **Phase 7**: T028 sequential; T029, T030, T031 parallel after T028.  
Within **Phase 8**: T032, T033, T034 parallel; T035, T036 parallel after those; T037 last.

---

## Parallel Example: US4 Field Components (Phase 6)

```
# All four tasks touch different files — launch together:
T024: DraggableField.module.css  (1.5px border, #fff !important confirmed)
T025: FieldList.module.css       (teal-tint hover, selected border)
T026: PropertiesPanel.module.css (density, section headers)
T027: FieldOverlay.module.css    (rubber-band, alignBarIn keyframe)
```

---

## Implementation Strategy

### MVP First (US1 only — Phases 1 & 2)

1. Complete Phase 1: Copy assets
2. Complete Phase 2: Token layer migration
3. **STOP and VALIDATE**: Dark mode renders, Geist loads, theme toggle works, `npm test` passes.
4. Ship or demo: the new color palette and font are live even before any component restyling.

### Incremental Delivery

```
Phase 1 + 2 → Token foundation live (dark teal palette, Geist font)
Phase 3     → Primitives restyled (buttons, inputs, modals, Kbd)
Phase 4     → App shell correct (navbar bg, conditional toolbar)
Phase 5     → Canvas/toolbar polished
Phase 6     → Fields polished (critical: white field bg confirmed)
Phase 7     → Filler polished (320px panel, icons, animations)
Phase 8     → Full audit and sign-off
```

### Single Developer Sequence

Phases 1→2→3→4→5→6→7→8 in order. Each phase has a checkpoint — verify before continuing. Estimated ~8–12 hours total for a developer familiar with the codebase.

---

## Notes

- **[P]** tasks = different files, safe to parallelize
- **[US1–US4]** maps each task to its user story for traceability
- **`#fff !important`** on `.field-bg` in DraggableField is a constitutional requirement (CLAUDE.md, Principle XII) — do NOT remove in T024
- **No logic changes**: all hooks, stores, API routes, PDF logic are read-only for this feature
- **Token names in filler**: `--space-N` and `--border-color` ONLY (see T034 audit task)
- **SVG icon import**: if `?raw` import syntax is not available, copy SVG content inline in TSX instead
- Commit after each phase checkpoint to enable rollback if needed
