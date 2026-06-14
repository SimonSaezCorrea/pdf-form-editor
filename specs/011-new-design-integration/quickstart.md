# Quickstart: New Design System Integration + Feature Enhancements

**Branch**: `011-new-design-integration`

---

## Status

**Phase A (CSS Migration)** — COMPLETE. Tasks T001–T036 done. Outstanding: T008/T037 browser smoke tests.

**Phase B (Feature Enhancements)** — IN PROGRESS. Tasks T038+ (see tasks.md).

---

## Phase A: Completed Migration Checklist

```
✅ T001-T004  Assets copied (Geist font, icon-document, icon-sun, icon-moon)
✅ T005-T007  tokens.css rewritten (dark-first, @font-face, [data-theme="light"])
⬜ T008       Browser smoke test (manual — verify dark bg, Geist, theme toggle)
✅ T009-T016  Kbd primitive + all UI primitives restyled
✅ T017-T020  App.tsx shell wiring (showEditorToolbar, ThemeToggle props, App.module.css)
✅ T021-T027  Feature CSS: canvas, toolbar, fields
✅ T028-T031  Feature CSS: filler, PDF utils, template modals
✅ T032-T036  Polish: typography pass, animation audit, typecheck, build
⬜ T037       Visual verification against quickstart checklist (manual)
```

---

## Phase B: Pre-conditions

1. Branch `011-new-design-integration` — Phase A changes committed.
2. `npm run dev` starts without errors.
3. `npm test` passes (baseline: 92 tests green).
4. `npm run typecheck` clean.

---

## Phase B: Integration Scenarios

### Scenario B-1: Field Type Creation

```
1. Open the app and load any PDF.
2. In editor mode, look at the toolbar row — you should see type chips:
   [T Texto] [N Número] [D Fecha] [C Checkbox] [F Firma]
3. Click "N Número" chip → cursor becomes crosshair.
4. Drag a rectangle on the PDF → a new field appears with orange (#F4A261) border.
5. Check FieldList → field shows an "N" badge in orange.
6. Check PropertiesPanel → "Tipo" selector shows "Número".
7. Press Ctrl+Z → field disappears. Press Ctrl+Shift+Z → field reappears.
8. Check navbar → "sin guardar" accent badge appears after step 4.
```

### Scenario B-2: Alignment Bar

```
1. Load a PDF and create 3+ fields.
2. Shift+click to select 2 fields → AlignBar appears below the toolbar.
3. Click "Alinear a la izquierda" → both fields' X values set to the leftmost X.
4. Select 3 fields → click "Distribuir horizontalmente" → equal spacing applied.
5. Select 2 fields → click "Distribuir horizontalmente" → toast: "Selecciona al menos 3 campos".
```

### Scenario B-3: Snap Guides

```
1. Load a PDF with 2+ fields.
2. Drag one field near another → a magenta vertical or horizontal line appears
   when the field edge/center is within 4px of the other field.
3. Release the mouse → guide disappears.
```

### Scenario B-4: Context Menu Enhancement

```
1. Right-click a field → context menu opens.
2. Verify items: Duplicar, Copiar propiedades, [separator],
   Traer al frente, Enviar al fondo, [separator],
   Bloquear campo, [separator], Eliminar.
3. Click "Bloquear campo" → lock icon appears on field in FieldList; dragging is disabled.
4. Right-click again → item now shows "Desbloquear campo".
```

### Scenario B-5: PropertiesPanel Collapsible Sections

```
1. Select a field → PropertiesPanel opens.
2. Verify sections: General, Posición y tamaño, Tipografía, Comportamiento.
3. Click a section header → section collapses. Click again → expands.
4. "Comportamiento" should be collapsed by default.
```

### Scenario B-6: Double-Click Rename

```
1. Double-click a field on the canvas → an inline input appears inside the field.
2. Type a new name → press Enter → field name updates everywhere (canvas + FieldList + PropertiesPanel).
3. Double-click again → press Escape → name unchanged.
```

### Scenario B-7: Landing Screen Hero

```
1. Load the app with no PDF → landing screen shows.
2. Verify: eyebrow "Editor de plantilla", headline text, subhead text,
   "Seleccionar PDF" primary button, "o arrastra un archivo aquí" hint,
   quick-row "PDF · hasta 50 MB · se procesa localmente".
3. Switch mode to "Rellenar PDF" (navbar) → verify copy changes to filler context.
4. Drag a file over the dropzone → border brightens, teal tint appears.
5. Drop the file (or click CTA) → spinner "Analizando campos del PDF…" appears.
```

### Scenario B-8: Filler Sections + Progress

```
1. Enter filler mode and load a PDF with named fields.
2. Verify fields are grouped in sections by prefix (e.g. "arrendador_*" → "Arrendador" section).
3. Each section shows a progress bar and "N/M" count.
4. Fill all fields in a section → section auto-collapses and shows ✓.
5. Clear a field in that section → it auto-expands.
```

### Scenario B-9: Filler Autosave & Restore

```
1. Enter filler mode with a PDF, fill some fields.
2. Wait 1 second → "Guardado · hace N s" pill appears in form header.
3. Close/refresh the tab.
4. Re-enter filler mode with the same PDF → previously filled values are restored.
5. Click the reset/trash icon → confirmation banner appears.
6. Click "Sí, limpiar todo" → all values cleared, localStorage key removed.
```

### Scenario B-10: Filler Validation & Jump

```
1. In filler mode, click "Generar PDF" with required fields empty.
2. Banner: "Faltan N campo(s) obligatorio(s). Te llevamos al primero."
3. First missing required field is highlighted with red border; form scrolls to it.
4. Fill that field → red border clears.
5. Press Enter in a filled input → next empty field receives focus.
6. Click "↓ Siguiente vacío" button → same behavior.
7. Press Enter when all fields are filled → toast "¡Todos los campos están completos!".
```

### Scenario B-11: Filler Click-to-Focus + Vista Final

```
1. In filler mode with fields detected, look at the PDF preview.
2. Click on any field area in the PDF → corresponding form input focuses.
3. The form panel scrolls to show that input.
4. Toggle "Vista final" → field outlines/highlights disappear from PDF preview;
   only filled text values remain visible.
5. Toggle back → outlines return.
```

---

## Verification Checklist — Phase B

Before marking Phase B complete:

- [ ] All 5 field types create correctly with correct colors
- [ ] Undo/Redo works for create, delete, move, resize, rename
- [ ] AlignBar aligns correctly; distribute requires 3+ fields
- [ ] Snap guides appear at ±4px during single-field drag
- [ ] Context menu has Traer al frente, Enviar al fondo, Bloquear
- [ ] Locked fields cannot be dragged or deleted via keyboard
- [ ] PropertiesPanel sections collapse correctly; Comportamiento defaults closed
- [ ] Double-click canvas rename works; Escape cancels
- [ ] Insert banner shows when type is active; Esc exits
- [ ] Canvas empty state shows when no fields present
- [ ] Landing hero shows correct copy per mode; CTA button works
- [ ] Vignette background visible on landing screen
- [ ] Filler sections group by prefix; auto-collapse on completion
- [ ] Progress bars update correctly per section
- [ ] Required validation shows banner + red borders on submit
- [ ] "↓ Siguiente vacío" + Enter-in-filled-input navigation works
- [ ] Autosave fires within 500ms; "Guardado · hace N s" pill shows
- [ ] Draft restores on page reload
- [ ] Reset confirmation banner with Cancelar / Sí, limpiar
- [ ] Click PDF field → form input focused + form scrolls
- [ ] PDF preview auto-scrolls to focused field
- [ ] Vista final toggle hides outlines/highlights
- [ ] Number values formatted es-CL; dates formatted DD/MM/YYYY
- [ ] `npm test` passes (0 modifications to test files)
- [ ] `npm run typecheck` clean
- [ ] `npm run build` succeeds
