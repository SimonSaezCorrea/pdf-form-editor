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

- [X] T001 Copy `new-design/fonts/Geist_wght_.woff2` → `public/fonts/Geist_wght_.woff2`
- [X] T002 [P] Copy `new-design/assets/icon-document.svg` → `src/assets/icon-document.svg`
- [X] T003 [P] Copy `new-design/assets/icon-sun.svg` → `src/assets/icon-sun.svg`
- [X] T004 [P] Copy `new-design/assets/icon-moon.svg` → `src/assets/icon-moon.svg`

**Checkpoint**: All four asset files exist in their production locations. `npm run dev` still starts cleanly.

---

## Phase 2: Foundational — Token Layer (US1)

**Purpose**: Replace `src/styles/tokens.css` with the new design system token set. This is the single biggest change and blocks all subsequent styling work.

**⚠️ CRITICAL**: No component restyling can begin until T005–T008 are complete and verified.

- [X] T005 [US1] Rewrite `src/styles/tokens.css` with dark-first strategy: `:root` block = dark defaults (all semantic tokens, color ramp, spacing, radii, shadows, z-index, typography) per the token schema in `specs/011-new-design-integration/data-model.md`. Remove the `@media (prefers-color-scheme: dark)` block entirely (dark is now the root default).
- [X] T006 [US1] Add `@font-face` for Geist at top of `src/styles/tokens.css`: `font-family: 'Geist'`, `src: url('/fonts/Geist_wght_.woff2') format('woff2')`, `font-weight: 100 900`, `font-display: swap`.
- [X] T007 [US1] Add `[data-theme="light"]` override block to `src/styles/tokens.css` with light-mode values for all semantic tokens (mirrors the `:root` dark block but with light palette per data-model.md). Verify `[data-theme="dark"]` explicit override block still exists and matches `:root` values (supports localStorage manual override).
- [ ] T008 [US1] Smoke-test token migration: run `npm run dev`, open app in browser, verify (a) dark background `#091214` renders on cold start with no localStorage key, (b) `document.documentElement.dataset.theme` is set before first paint by the anti-FOUC script in `src/app/layout.tsx` (use DevTools → Performance to confirm), (c) clicking the theme toggle switches to light mode `#F4F7F8` and back, (d) Geist font loads (DevTools → Fonts), (e) no CSS console errors about undefined custom properties.

**Checkpoint** (US1 complete): App renders in dark mode with teal palette, Geist font, and working theme toggle. Anti-FOUC intact. `npm test` passes with zero changes.

---

## Phase 3: Primitive Components Restyle (US2)

**Purpose**: Restyle all `src/components/ui/` primitives and add the new `Kbd` component. Depends on Phase 2 (tokens must be defined).

**Goal**: Every primitive uses new tokens; Kbd is available; all existing prop APIs unchanged.

**Independent Test**: Load any screen that uses a Modal (e.g., Export Template) — verify 8px radius, shadow, backdrop. Hover a Button — verify 5px radius and fast transition.

- [X] T009 [US2] Create `src/components/ui/Kbd/Kbd.tsx`: renders `<kbd className={styles.kbd}>{children}</kbd>` with props `{ children: React.ReactNode; className?: string }`. Create `src/components/ui/Kbd/Kbd.module.css` with key-cap styling: `font-family: var(--font-family-mono)`, `font-size: var(--font-size-xs)`, `padding: 1px 5px`, `border: 1px solid var(--border-color)`, `border-bottom-width: 2px`, `border-radius: var(--radius-sm)`, `background: var(--color-input-bg)`, `color: var(--color-text-muted)`. Create `src/components/ui/Kbd/index.ts` barrel export.
- [X] T010 [P] [US2] Update `src/components/ui/Button/Button.module.css`: set `border-radius: var(--radius-md)` (5px) on `.btn`, padding `var(--space-1) var(--space-3)` (4px 12px), transition `background .15s, opacity .15s`. Verify primary/secondary/danger/ghost variants still render distinctly with new tokens.
- [X] T011 [P] [US2] Update `src/components/ui/IconButton/IconButton.module.css`: add `.navbar` variant with `background: transparent`, hover `background: rgba(255,255,255,0.12)`, `transition: background .15s`. Existing variants unchanged.
- [X] T012 [P] [US2] Update `src/components/ui/Input/Input.module.css`: `font-size: var(--font-size-base)` (13px), `background: var(--color-input-bg)`, `border-radius: var(--radius-sm)` (4px), `border: 1px solid var(--border-color)`, focus `border-color: var(--color-primary)`, error state `border-color: var(--color-danger)` + `background: var(--color-danger-bg)`, `transition: border-color .15s`.
- [X] T013 [P] [US2] Update `src/components/ui/Select/Select.module.css`: identical changes to T012 (same base style as Input).
- [X] T014 [P] [US2] Update `src/components/ui/Modal/Modal.module.css`: `border-radius: var(--radius-lg)` (8px) on `.modal`, `box-shadow: var(--shadow-lg)`, backdrop `.backdrop` → `background: rgba(0,0,0,0.5)`.
- [X] T015 [P] [US2] Update `src/components/ui/Tooltip/Tooltip.module.css`: `box-shadow: var(--shadow-sm)`, `border-radius: var(--radius-sm)`. Update `Tooltip.tsx` open-delay logic: 700ms before showing, 0ms on close (use `setTimeout` ref on hover enter/leave if not already implemented).
- [X] T016 [US2] Update `src/features/toolbar/components/ShortcutsPanel/ShortcutsPanel.tsx`: replace any inline `<kbd>` or `<span>` keyboard hint elements with `<Kbd>` primitive imported from `@/components/ui/Kbd`. Update `ShortcutsPanel.module.css` for panel layout tokens (background, border, spacing via `--space-N` tokens).

**Checkpoint** (US2 complete): All primitives use new tokens. `Kbd` renders in ShortcutsPanel. `npm test` passes. `npm run typecheck` clean.

---

## Phase 4: App Shell & Toolbar State Wiring (US3)

**Purpose**: Wire conditional rendering logic in `App.tsx` and update app shell CSS. Depends on Phase 2 (token `--color-navbar-bg` and `--color-viewer-bg` must be defined).

**Goal**: Toolbar row hides in filler mode; mode nav shows "← Cambiar PDF" when filler+file loaded; ThemeToggle is prop-driven.

**Independent Test**: Load a PDF in editor mode → second navbar row visible. Switch to filler mode → second row hidden, "← Cambiar PDF" appears. Click it → returns to upload state.

- [X] T017 [US3] In `src/App.tsx`: add `const showEditorToolbar = !!pdfBytes && appMode === 'editor'` derived value. Wrap the second navbar row (`header-toolbar` div) in `{showEditorToolbar && ...}`.
- [X] T018 [US3] In `src/App.tsx`: add conditional mode nav — when `!!pdfBytes && appMode === 'filler'` render a "← Cambiar PDF" `<button>` that resets `pdfBytes` to null (triggers upload screen). Otherwise render existing editor/filler mode tabs. Wrap mode nav container in a fixed-`min-width` to prevent layout shift during switch.
- [X] T019 [US3] Refactor `src/features/toolbar/components/ThemeToggle/ThemeToggle.tsx` to accept props `{ theme: 'dark' | 'light' | null; onToggleTheme: () => void }` instead of calling `useTheme()` internally. In `src/App.tsx`: read `const { theme, toggle } = useTheme()` and pass `theme={theme} onToggleTheme={toggle}` to ThemeToggle. `useTheme` hook remains the sole localStorage owner — no duplication.
- [X] T020 [US3] Update `src/App.module.css`: set `.app-header { background: var(--color-navbar-bg) }` and `.viewer-area { background: var(--color-viewer-bg) }`. Remove any hardcoded hex colors from these selectors.

**Checkpoint** (US3 complete): Toolbar visibility and mode nav work correctly in all states. Theme toggle prop API works. `npm run typecheck` clean. `npm test` passes.

---

## Phase 5: Feature Components — Canvas & Toolbar (US4 Part A)

**Purpose**: Restyle canvas and toolbar feature components. All tasks in this phase target different files and can run in parallel.

**Goal**: ThumbnailStrip, ToolbarModes, and ShortcutsPanel match new design. Depends on Phases 2–4.

- [X] T021 [P] [US4] Update `src/features/canvas/components/ThumbnailStrip/ThumbnailStrip.module.css`: strip container `width: 110px`, thumbnail images `box-shadow: var(--shadow-sm)`, selected thumbnail `border: 1px solid var(--color-primary)`, hover thumbnail `border: 1px solid var(--color-neutral-400)`. Verify Constitution Principle XXI: ThumbnailStrip background stays `var(--color-white)`.
- [X] T022 [P] [US4] Update `src/features/toolbar/components/ToolbarModes/ToolbarModes.module.css`: active mode button `.mode-btn--active { background: rgba(255,255,255,0.18); border: 1px solid transparent; }`, inactive buttons `opacity: 0.7`, hover `opacity: 1; background: rgba(255,255,255,0.12)`, `transition: background .15s, opacity .15s`. Remove any heavier transitions.
- [X] T023 [P] [US4] Update `src/features/toolbar/components/ShortcutsPanel/ShortcutsPanel.module.css`: FAB `.shortcuts-fab { position: fixed; bottom: var(--space-4); right: var(--space-4); width: 40px; height: 40px; border-radius: 50%; background: var(--color-panel-bg); border: 1px solid var(--border-color); }`, shortcuts group title → `.t-eyebrow` class or equivalent inline CSS (`font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); text-transform: uppercase; letter-spacing: 0.08em`).

**Checkpoint**: Canvas/toolbar components visually match new design. Zoom controls, mode buttons, and thumbnail strip all render correctly.

---

## Phase 6: Feature Components — Fields (US4 Part B)

**Purpose**: Restyle field-related components. All tasks target different files and can run in parallel.

**Goal**: DraggableField, FieldList, PropertiesPanel, and FieldOverlay match new design. Critical: `#fff !important` on field backgrounds must survive.

- [X] T024 [P] [US4] Update `src/features/fields/components/DraggableField/DraggableField.module.css`: selected state border `1.5px solid var(--color-primary)`, danger/conflict state `1.5px solid var(--color-danger)`. Confirm `.field-bg { background-color: #fff !important; }` rule is still present and takes precedence (CLAUDE.md FR-008 / Constitution XII).
- [X] T025 [P] [US4] Update `src/features/fields/components/FieldList/FieldList.module.css`: field list item hover `background: rgba(102,165,173,0.08)`, selected item `background: rgba(102,165,173,0.08); border-left: 2px solid var(--color-primary)` (or `border: 1px solid var(--color-primary)` per new design), `transition: background .15s`. Remove any heavier transitions.
- [X] T026 [P] [US4] Update `src/features/fields/components/PropertiesPanel/PropertiesPanel.module.css`: section headers `font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted)`, input groups use `--space-2` gap, panel uses `--color-panel-bg` background. Verify `step=0.5` and `parseFloat(field.x.toFixed(2))` logic in PropertiesPanel.tsx is NOT touched (CLAUDE.md BF-009-02).
- [X] T027 [P] [US4] Update `src/features/fields/components/FieldOverlay/FieldOverlay.module.css`: rubber-band selection rect `border: 1px dashed var(--color-primary); background: rgba(102,165,173,0.08)`. Add `@keyframes alignBarIn { from { opacity: 0; transform: translate(-50%,-6px); } to { opacity: 1; transform: translate(-50%,0); } }` if alignment bar DOM element exists in FieldOverlay.tsx; skip if not.

**Checkpoint**: Field components render with teal-tint hover/selected states. White `#fff` field backgrounds confirmed in dark mode via browser DevTools (inspect `.field-bg` computed style).

---

## Phase 7: Feature Components — Filler & PDF Utils (US4 Part C)

**Purpose**: Restyle filler mode components and PDF utility components.

**Goal**: FillerLayout 320px panel, filler animations, PdfUploader with new icon.

- [X] T028 [US4] Update `src/features/filler/components/FillerLayout/FillerLayout.module.css`: form panel `width: 320px; border-right: 1px solid var(--border-color); background: var(--color-panel-bg)`. Add keyframes: `@keyframes live-pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }` and `@keyframes jump-pulse { 0% { box-shadow: 0 0 0 0 rgba(244,162,97,0.45); } 40% { box-shadow: 0 0 0 8px rgba(244,162,97,0.18); } 100% { box-shadow: 0 0 0 0 rgba(244,162,97,0); } }`. Apply `live-pulse` to the live indicator element and `jump-pulse` to the field highlight on value change. Verify all token names use `--space-N` (not `--spacing-N`) and `--border-color` (not `--color-border`).
- [X] T029 [P] [US4] Verify `src/features/filler/components/DynamicForm/DynamicForm.module.css`: confirm any input styling delegates to the `Input` primitive (which was restyled in T012). If DynamicForm has its own input overrides, remove them in favor of Input primitive defaults.
- [X] T030 [P] [US4] Update `src/features/pdf/components/PdfUploader/PdfUploader.tsx` (editor entry) and `src/features/filler/components/PdfUploadScreen/PdfUploadScreen.tsx` (filler entry): replace current document icon SVG with `src/assets/icon-document.svg`. Import as raw SVG string using `import IconDocument from '@/assets/icon-document.svg?raw'` and inject via `dangerouslySetInnerHTML={{ __html: IconDocument }}`, or import as a React component if the project uses `@svgr/webpack`. Inline SVG, NOT `<img>` tag.
- [X] T031 [P] [US4] Update template-related modals: `src/features/templates/components/ExportModal/ExportModal.module.css` and `src/features/templates/components/ImportModal/ImportModal.module.css` — verify they use `Modal` primitive (restyled in T014) with no overriding radius/shadow values. Update any hardcoded panel backgrounds to `var(--color-panel-bg)`.

**Checkpoint** (US4 complete): Filler renders with 320px panel; PdfUploader shows document icon; template modals use correct shadows/radii. `npm test` passes. Live-preview canvas alignment verified at zoom 100% and 150%.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Typography pass, animation audit, final validation.

- [X] T032 Typography pass — in `src/features/pdf/components/PdfUploader/PdfUploader.module.css` and `PdfUploadScreen`: apply `font-size: var(--font-size-2xl); font-weight: var(--font-weight-semibold)` to upload title. In `src/features/toolbar/components/ShortcutsPanel/`: verify group title uses eyebrow style (uppercase, xs, semibold). Scan all `.module.css` for hardcoded `px` font-size values and replace with `var(--font-size-*)` tokens.
- [X] T033 [P] Animation audit — scan all `src/**/*.module.css` for `transition` declarations longer than `0.15s` or for `ease-in-out` / spring values. Replace with `background .15s, opacity .15s` (or `border-color .15s`). Document any intentional exceptions (e.g., progress bars with `width .25s ease`) with a comment.
- [X] T034 [P] Token name audit for filler — run `grep -r "spacing-" src/features/filler/` and `grep -r "color-border" src/features/filler/`: must return zero hits. Fix any occurrences (`--spacing-N` → `--space-N`, `--color-border` → `--border-color`).
- [X] T035 Run `npm test` — confirm all tests pass with ZERO modifications to test files. If a test fails, it is a test that queries a CSS class name that was renamed — document the class name, do NOT change the test; add a `data-testid` attribute to the component instead, then update the test to use `data-testid`.
- [X] T036 [P] Run `npm run typecheck` and `npm run build` — confirm zero TypeScript errors and successful build. Fix any type errors introduced by T019 (ThemeToggle props refactor).
- [ ] T037 Visual verification against `specs/011-new-design-integration/quickstart.md` checklist — open the running app and check each item: dark mode default, light mode toggle, no FOUC, Geist renders, field overlay white bg in dark mode, filler canvas alignment at all zooms, modal shadows, tooltip delay, Kbd keys visible, thumbnail strip width.

---

## Phase B: Feature Enhancements (IN PROGRESS)

**Status**: Tasks T001–T036 complete (Phase A CSS). T008/T037 pending manual browser verification.  
**Phase B starts at T038.**

---

## Phase 9: Data Model + Store Foundation (US5)

**Purpose**: Extend `FormField`, add `FieldTypeId`, extend `useFieldStore` with undo/redo. Must complete before any canvas/toolbar changes.

- [ ] T038 [US5] Add `FieldTypeId = 'text' | 'number' | 'date' | 'checkbox' | 'signature'` to `src/types/shared.ts`. Add optional `fieldType?: FieldTypeId` and `locked?: boolean` to `FormField`. Update `isValidField` in `src/features/pdf/utils/templateSchema.ts` to accept both as undefined.
- [ ] T039 [US5] Create `src/features/fields/config/fieldTypes.ts` with `FIELD_TYPE_CONFIG` array (id, label, short, color) and `getFieldTypeConfig(id?) → FieldTypeConfig` helper. Export both.
- [ ] T040 [US5] Extend `useFieldStore` in `src/hooks/useFieldStore.ts`: add `undoStack: FormField[][]`, `redoStack: FormField[][]` (max 50), `isDirty: boolean`. Add `recordHistory(fields)` internal helper. Add `undo()`, `redo()`, `setDirty(v)`, `bringToFront(id)`, `sendToBack(id)`, `toggleLock(id)` actions. Wire all existing mutating actions (`addField`, `deleteField`, `updateField`, `updateFields`, `duplicateField`) to call `recordHistory` before mutating and `setDirty(true)` after.

**Checkpoint**: `npm run typecheck` passes. `useFieldStore` exports new actions. Existing tests unaffected.

---

## Phase 10: Editor Toolbar — Field Types & Undo/Redo (US5)

**Purpose**: Add type chips to toolbar, undo/redo navbar buttons, unsaved pill, keyboard shortcuts for types.

- [ ] T041 [US5] Update `src/features/toolbar/components/ToolbarModes/ToolbarModes.tsx`: add `insertType: FieldTypeId | null` and `onSetInsertType(type: FieldTypeId)` props. Render type chip buttons (T/N/D/C/F) from `FIELD_TYPE_CONFIG` — chips only visible in insert mode or as the trigger to enter insert mode. Active chip has teal bg tint; each chip's dot/badge uses its type color.
- [ ] T042 [US5] Update `src/App.tsx`: add `insertType` state (`useState<FieldTypeId | null>(null)`). Wire to `ToolbarModes`. Add keyboard handler cases: `T` → insert+text, `N` → insert+number, `D` → insert+date, `C` → insert+checkbox, `F` → insert+firma. Existing `I` → insert with last selected type or 'text'. Update `handleFieldCreate` to pass `fieldType: insertType ?? 'text'` when creating new fields.
- [ ] T043 [US5] Add undo/redo navbar buttons in `src/App.tsx` header: two `<IconButton>` (undo arrow, redo arrow) rendered when `showEditorToolbar`. Disabled when respective stack is empty. Keyboard: `Ctrl+Z` / `Cmd+Z` → `undo()`; `Ctrl+Shift+Z` / `Cmd+Shift+Z` → `redo()`. Ignored inside inputs/textareas.
- [ ] T044 [US5] Add "sin guardar" pill in `src/App.tsx` navbar: render accent-colored pill `<span>sin guardar</span>` when `isDirty && showEditorToolbar`. Set `isDirty(false)` after successful export (in `handleExport`).

**Checkpoint**: Type chips appear in toolbar. Ctrl+Z reverses last action. "sin guardar" badge appears after field creation.

---

## Phase 11: Canvas — DraggableField Type Colors + Inline Rename (US5+US6)

**Purpose**: Apply type colors to canvas field overlays. Add inline rename on double-click.

- [ ] T045 [US5] Update `src/features/fields/components/DraggableField/DraggableField.tsx`: use `getFieldTypeConfig(field.fieldType)` to get the type color. Apply as border color when NOT selected (`border: 1.5px solid typeColor`); background tint `typeColor + '20'`. When selected: border uses `--color-primary` (CSS token, overrides type color). When locked: show a small lock badge icon in top-right corner; `data-locked` attribute for CSS styling.
- [ ] T046 [US5] Add inline rename to `DraggableField.tsx`: on `onDoubleClick` (only when not locked, not in pan mode), set `renamingId` local state. Render `<input>` inside the field overlay with `defaultValue={field.name}`, autoFocus. `onBlur` and `Enter` → call `updateField(id, { name: value.trim() || field.name })` and clear `renamingId`. `Escape` → clear without update. Stop event propagation so double-click doesn't bubble to overlay.
- [ ] T047 [US5] Update `DraggableField.module.css`: add `.field-locked` class (reduced opacity badge icon), `.field-rename-input` class (fills field width, transparent bg, no border, same font), `.field-type-badge` class if needed for lock icon positioning.

**Checkpoint**: Fields show type-colored borders. Double-click shows rename input. Lock icon visible on locked fields.

---

## Phase 12: FieldList + PropertiesPanel Updates (US5+US6)

**Purpose**: Type badge in list, group name row, collapsible PropertiesPanel sections, fieldType selector.

- [ ] T048 [US5] Update `src/features/fields/components/FieldList/FieldList.tsx`: for each field item, add a type badge chip `<span className={styles['type-badge']} style={{ background: typeColor + '20', color: typeColor }}>T</span>` using `getFieldTypeConfig(field.fieldType).short`. If `field.group` exists, show it below the field name in muted style.
- [ ] T049 [US6] Update `src/features/fields/components/PropertiesPanel/PropertiesPanel.tsx`: wrap properties into collapsible `<Section>` components (General, Posición y tamaño, Tipografía, Comportamiento). Each section has a header button with chevron. Local `useState` tracks open/closed per section. Comportamiento defaults to closed. Add `fieldType` selector (Select primitive) in the General section.
- [ ] T050 [US5] Update `FieldList.module.css` and `PropertiesPanel.module.css`: add `.type-badge`, `.field-group` (muted, xs font), `.prop-section`, `.prop-section__head`, `.prop-section__body`, `.prop-section--collapsed` styles.

**Checkpoint**: FieldList shows type chips and group names. PropertiesPanel has collapsible sections. fieldType selector changes the field's type color on canvas.

---

## Phase 13: AlignBar + Snap Guides (US6)

**Purpose**: Alignment bar for multi-selection. Snap guide lines during drag.

- [ ] T051 [US6] Create `src/features/fields/components/AlignBar/AlignBar.tsx`: accepts `count: number`, `onAlign(action: string)`, `onDistribute(axis: 'h' | 'v')`. Renders 6 align buttons (left/center-h/right/top/center-v/bottom with SVG icons from prototype) + 2 distribute buttons + separator + count label. Shows a toast when distribute called with < 3 fields.
- [ ] T052 [US6] Create `src/features/fields/components/AlignBar/AlignBar.module.css`: `.align-bar` (horizontal flex strip, `--color-panel-bg`, `border-bottom`, `padding: var(--space-1) var(--space-4)`), `.align-btn` (icon buttons).
- [ ] T053 [US6] Implement `alignSelected(kind)` and `distributeSelected(axis)` functions in `useFieldStore`. Logic from research.md R-104. Both call `updateFields(ids, partial)` (single history snapshot per alignment operation).
- [ ] T054 [US6] Wire `AlignBar` in `src/App.tsx`: render below the toolbar row (inside `showEditorToolbar` block) when `selectionIds.size >= 2`. Pass `onAlign` → `alignSelected`, `onDistribute` → `distributeSelected`.
- [ ] T055 [US6] Implement snap guides in `src/features/canvas/components/PdfViewer/PdfViewer.tsx`: during field drag (inside `handleDragMove` / pointer events), call `computeSnapGuides(activeId, x, y, w, h, allFields)` and store result in `useState`. Render guide lines as 1px `#ec4899` divs (full-height vertical, full-width horizontal) as `position:absolute` children of the canvas wrapper. Clear on `pointerup`. `computeSnapGuides` is a pure function — export for unit test.

**Checkpoint**: Selecting 2+ fields shows AlignBar. Aligning moves fields correctly. Snap guides appear magenta during drag within 4px of another field.

---

## Phase 14: Insert Banner + Canvas Empty State (US6)

**Purpose**: Visual hints when in insert mode or when canvas is empty.

- [ ] T056 [US6] Add insert mode banner in `src/App.tsx` or `src/features/canvas/components/PdfViewer/PdfViewer.tsx`: render a banner `<div>` when `interactionMode === 'insert' && insertType !== null`: "Modo Insertar · {label} · arrastra sobre el PDF [Esc para cancelar]". Apply `insertBannerIn` CSS animation (slide from top). Banner sits below the toolbar row, above the canvas body.
- [ ] T057 [US6] Add canvas empty state in `PdfViewer.tsx`: when `fields.length === 0 && !!pdfBytes && appMode === 'editor'`, render a centered card over the canvas: `<h3>Aún no hay campos</h3>`, instruction text, keyboard hint `<Kbd>I</Kbd>` + `<Kbd>S</Kbd>`.
- [ ] T058 [P] [US6] Add banner + empty state CSS to `src/features/canvas/components/PdfViewer/PdfViewer.module.css`: `.insert-banner` (fixed bottom strip or top strip; accent bg; `@keyframes insertBannerIn`), `.canvas-empty` (absolute centered card; `--color-panel-bg` bg, `--radius-lg`).

**Checkpoint**: Switching to insert mode with a type shows the banner. Canvas with no fields shows the empty-state card.

---

## Phase 15: Landing Screen Hero (US7)

**Purpose**: Replace bare dropzone with full hero + CTA landing screen.

- [ ] T059 [US7] Update `src/features/pdf/components/PdfUploader/PdfUploader.tsx`: add `appMode: 'editor' | 'filler'` prop (passed from `App.tsx`). Add hero section above dropzone: `<span className="eyebrow">`, `<h1 className="headline">`, `<p className="subhead">` with mode-specific copy from research.md R-108. Add `<Button variant="primary" onClick={() => inputRef.current?.click()}>Seleccionar PDF</Button>` inside the dropzone area. Add hint "o arrastra un archivo aquí". Add quick-row `<div>PDF <span>·</span> hasta 50 MB <span>·</span> se procesa localmente</div>`.
- [ ] T060 [US7] Add CSS for hero section in `src/features/pdf/components/PdfUploader/PdfUploader.module.css`: `.upload-screen` (full-height flex column, `--color-surface` bg, radial-gradient vignette via `background-image`), `.menu-eyebrow` (xs, semibold, uppercase, `--color-primary`), `.menu-headline` (3xl font-size, semibold, max-width 540px, centered), `.menu-subhead` (sm, muted, max-width 460px), `.dropzone-cta` (flex row: button + hint), `.quick-row` (xs, muted, flex gap with dot separators), `.menu-footer` (fixed or sticky bottom row: `⌘O abrir · ? atajos · T cambiar tema`).
- [ ] T061 [US7] Update `src/features/filler/components/PdfUploadScreen/PdfUploadScreen.tsx`: same hero treatment with filler-specific copy (from research.md R-108). Hero renders above the existing drag zone.
- [ ] T062 [P] [US7] Update `src/App.tsx` to pass `appMode` prop to `PdfUploader`.

**Checkpoint**: Landing screen shows hero + CTA button + vignette background. Copy changes when switching between editor and filler mode.

---

## Phase 16: Filler Store Extensions (US8)

**Purpose**: Add all new state to the filler before wiring UI components.

- [ ] T063 [US8] Update `src/features/filler/types.ts` (`AcroFormField`): add optional `group?: string`, `required?: boolean`, `label?: string`, `fieldType?: FieldTypeId`.
- [ ] T064 [US8] Update `src/features/filler/hooks/useFieldDetection.ts`: extract `required` from `annotation.fieldFlags & 4`. Derive `group` from `fieldName` prefix (split on `_`, take first segment, capitalize; fallback `'General'`). Set `label = group + ' · ' + fieldName` as a readable label. Set `fieldType` from annotation field type if detectable (pdfjs `fieldType` property, maps `Tx` → `text`).
- [ ] T065 [US8] Add filler state to `FillerMode` component (in `src/features/filler/components/FillerMode/FillerMode.tsx` or wherever `useFillerStore` state lives): `collapsed: Set<string>`, `lastSaved: number | null`, `finalPreview: boolean`, `resetConfirm: boolean`, `errors: Set<string>`, `jumpedId: string | null`. Add handler functions: `toggleCollapse(group)`, `toggleFinalPreview()`, `jumpToNextEmpty(fromId)`, `handleResetConfirm()`, `handleChange(name, value)`, auto-collapse effect, autosave effect (400ms debounce to localStorage), relTime ticker (10s interval). These match the filler prototype App() root logic.

**Checkpoint**: `npm run typecheck` passes. Filler state types are correct.

---

## Phase 17: DynamicForm Sections + Progress + Validation (US8)

**Purpose**: Render grouped sections with progress bars, required indicators, validation banner, jump button, autosave pill.

- [ ] T066 [US8] Update `src/features/filler/components/DynamicForm/DynamicForm.tsx`: group fields by `field.group`. Render each group as a collapsible section: header button (chevron + group name + done/total count + ✓ badge when complete + "N faltantes" in red when required missing). Render a mini progress bar `<div>` at `width: pct%`. Content: fields in that group, each with label (`field.label || field.name`), required `*` or "(opcional)" suffix, input component, ✓ / ! status icon.
- [ ] T067 [US8] Add validation submit handler in `DynamicForm`: check all `field.required` fields that are unfilled → set `errors` (field ids) → show banner `<div className="filler-banner warning">` → expand collapsed sections containing missing fields → focus first missing field → scroll to it. On success: show `<div className="filler-banner success">`.
- [ ] T068 [US8] Add autosave pill and "↓ Siguiente vacío" button: in form header add `<span className="save-pill"><span className="dot-live" />{lastSaved ? relTime(lastSaved) : 'Sin guardar'}</span>`. Add `<button className="next-empty">↓ Siguiente vacío <Kbd>Enter</Kbd></button>` in the form footer above the Generar PDF button.
- [ ] T069 [US8] Add reset confirmation banner in `DynamicForm` (or `FillerLayout`): when `resetConfirm` is true, render inline banner with Cancelar / Sí, limpiar buttons.
- [ ] T070 [P] [US8] Update `DynamicForm.module.css`: add `.filler-section`, `.filler-section__head`, `.filler-section__head.collapsed`, `.filler-section__body`, `.section-progress` (bar container + fill), `.save-pill`, `.dot-live` (animated green dot), `.filler-banner` (warning/success variants), `.next-empty`, `.filler-field--error`, `.filler-field-status`.

**Checkpoint**: Sections render with progress bars. Filling last field in a group auto-collapses it. Submit with missing required fields shows banner + red borders. Autosave pill updates within 500ms.

---

## Phase 18: FillerLayout Click-to-Focus + Vista Final + PDF Auto-scroll (US8)

**Purpose**: Interactive PDF overlay — clicking fields focuses the corresponding input. Vista final toggle.

- [ ] T071 [US8] Add click targets in `src/features/filler/components/FillerLayout/FillerLayout.tsx`: for each detected field, render a `<button>` absolutely positioned over the field's rect (using the same coordinate transform as the live-preview canvas: `canvasX = rect[0]*renderScale`, `canvasY = (pageH - rect[3])*renderScale`). On click: `setFocusedId(field.name)`, expand section if collapsed, focus the input ref after 100ms. Buttons are transparent, no border, `pointer-events: auto`; hidden when `finalPreview` is true.
- [ ] T072 [US8] Implement PDF auto-scroll in `FillerLayout.tsx`: `useEffect` on `focusedId` → find field → compute `fieldVisualTop = rect[1-ish] * renderScale * zoom` → `pdfPanelRef.current?.scrollTo({ top: fieldVisualTop - 100, behavior: 'smooth' })`.
- [ ] T073 [US8] Add "Vista final" toggle button in `FillerLayout.tsx` header: `<button className="toggle-pill" onClick={toggleFinalPreview}>{finalPreview ? '◉' : '○'} Vista final</button>`. When `finalPreview`: hide click targets, hide field highlight overlay, keep only the text value overlay canvas.
- [ ] T074 [P] [US8] Update `FillerLayout.module.css`: add `.pdf-field-target` (absolute positioned, transparent, cursor pointer), `.toggle-pill` (pill-shaped button, accent border when active), `.filler-pdf-toolbar` (slim toolbar above PDF preview: previsualización label + vista final toggle + zoom controls).

**Checkpoint**: Clicking a field in PDF preview focuses the form input. PDF panel scrolls to show focused field. Vista final hides overlays.

---

## Phase 19: PdfUploadScreen Filler Hero (US7)

- [ ] T075 [US7] Update `src/features/filler/components/PdfUploadScreen/PdfUploadScreen.tsx`: add hero section with filler-specific copy (from research.md R-108). Match PdfUploader structure from T059/T060. Hero renders above the drag zone.
- [ ] T076 [P] [US7] Update `PdfUploadScreen.module.css`: same hero classes as PdfUploader (`.menu-eyebrow`, `.menu-headline`, `.menu-subhead`, `.quick-row`, etc.).

---

## Phase 20: Tests + Typecheck + Build (US5–US8)

- [ ] T077 [US5] Unit tests for new pure functions: `computeSnapGuides(activeId, x, y, w, h, fields)` → correct guide axes at ±4px. `alignSelected(kind, fields, selectedIds)` → correct output coordinates. `distributeSelected(axis, fields, selectedIds)` → equal spacing. Add tests to `tests/unit/` following existing naming conventions.
- [ ] T078 [P] [US8] Unit tests for filler helpers: `findNextEmpty(fromId, fields, values)` → correct next empty field. `relTime(ts)` → correct output for < 5s, < 60s, < 60min. `deriveGroup(fieldName)` → correct prefix extraction.
- [ ] T079 Run `npm test` — all tests pass with ZERO modifications to existing test files. New tests from T077/T078 must also pass.
- [ ] T080 [P] Run `npm run typecheck` — zero TypeScript errors. Fix any type errors from Phase 9–19.
- [ ] T081 [P] Run `npm run build` — production build succeeds. No unused imports, no type errors.
- [ ] T082 Visual verification against `specs/011-new-design-integration/quickstart.md` Phase B checklist — run through all Scenarios B-1 through B-11 in the browser.

---

## Phase B Dependencies

```
Phase 9  (Data Model + Store)      → no dependencies — start here
Phase 10 (Toolbar: types, undo)    → depends on Phase 9 (FieldTypeId, store actions)
Phase 11 (DraggableField colors)   → depends on Phase 9 (fieldTypes.ts, FormField.fieldType)
Phase 12 (FieldList + PropPanel)   → depends on Phase 9 + Phase 11
Phase 13 (AlignBar + Snap)         → depends on Phase 9 (store align actions)
Phase 14 (Banner + Empty State)    → depends on Phase 10 (insertType state)
Phase 15 (Landing Hero)            → independent of Phase 9–14
Phase 16 (Filler Store)            → independent; depends on Phase 9 for FieldTypeId
Phase 17 (DynamicForm sections)    → depends on Phase 16
Phase 18 (FillerLayout click+scroll) → depends on Phase 16 + Phase 17
Phase 19 (PdfUploadScreen hero)    → independent
Phase 20 (Tests + Build)           → depends on all prior phases
```

### Parallel Opportunities (Phase B)

- Phase 9 → Phase 10 + Phase 11 + Phase 15 + Phase 16 can all start in parallel after Phase 9.
- Phase 12 needs Phase 11 done.
- Phase 13 needs Phase 9 done (independent of 10–12).
- Phase 14 needs Phase 10 done.
- Phase 17 needs Phase 16 done.
- Phase 18 needs Phase 16 + 17.
- Phase 19 independent.

---

## Notes

- **[P]** tasks = different files, safe to parallelize
- **`#fff !important`** on `.field-bg` in DraggableField is a constitutional requirement — do NOT remove in T045
- **Token names in filler**: `--space-N` and `--border-color` ONLY (Phase A constraint, still applies)
- **Filler independence (Principle XXIX)**: No imports from `src/features/fields/` or `src/features/templates/` in filler files — use `FIELD_TYPE_CONFIG` via shared `src/types/shared.ts` FieldTypeId only
- **Undo/Redo drag optimization**: During drag/resize, suppress history recording inside the gesture — record ONE snapshot on pointerdown. Use a `dragging` flag in the store.
- **Field type in PDF export**: All field types export as `PDFTextField` — `pdf-lib` doesn't support typed fields. Type is UI-only.
