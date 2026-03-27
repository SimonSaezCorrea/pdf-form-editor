# Quickstart & Test Scenarios: Field Duplication and Visual Resize Handles

**Branch**: `003-field-duplicate-resize` | **Date**: 2026-03-26

---

## Prerequisites

```bash
npm run dev    # starts client (port 5173) and server (port 3002)
```

Open `http://localhost:5173` and import any PDF (single-page or multi-page).

---

## Scenario 1: Basic Field Duplication via Ctrl+D

1. Click anywhere on the PDF canvas → a field named `field_1` appears.
2. Ensure the field is selected (blue border).
3. Press `Ctrl+D`.
4. **Expected**: A second field named `field_1_2` appears, offset ~7 pt right and ~7 pt down from the original. `field_1_2` is selected (red border). `field_1` is deselected.
5. Press `Ctrl+D` again with `field_1_2` selected.
6. **Expected**: A third field named `field_1_3` appears. (Base is `field_1`, suffix `_3` because `_2` is taken.)
7. Click away to deselect. Press `Ctrl+D`. **Expected**: nothing happens (no field selected).

---

## Scenario 2: Duplication of Unnamed Field

1. Add a field and clear its name in the Properties panel (empty string).
2. Press `Ctrl+D`.
3. **Expected**: Duplicate is named `campo_2`. If `campo_2` already exists, it would be `campo_3`.

---

## Scenario 3: Right-Click Context Menu

1. Right-click on a field on the canvas.
2. **Expected**: Browser default context menu is suppressed. A small menu appears at the cursor with "Duplicar campo".
3. Click "Duplicar campo".
4. **Expected**: Same result as Ctrl+D. Menu dismisses.
5. Right-click on a different (unselected) field.
6. **Expected**: That field becomes selected AND the menu appears simultaneously.
7. Press `Escape`.
8. **Expected**: Menu dismisses, field remains selected, no duplication.

---

## Scenario 4: Resize via Edge Handle

1. Add a field and select it. Note its width in the Properties panel (≈150 pt).
2. Hover over the right-edge handle (E) — cursor changes to `e-resize`.
3. Drag the E handle to the right by ~50 pixels.
4. **Expected**: Field width increases by ~33 pt (50px ÷ 1.5 scale). Properties panel width updates in real time during the drag. Releasing the mouse commits the size.
5. Drag the E handle to the left all the way past the minimum.
6. **Expected**: Field stops at minimum width (~13.3 pt); handle cannot compress further.

---

## Scenario 5: Resize via Corner Handle (Free)

1. Select a field. Note its width and height.
2. Drag the SE (bottom-right) corner handle diagonally down-right.
3. **Expected**: Both width and height increase. Properties panel updates both in real time.
4. Drag the SE corner handle up-left past the minimum.
5. **Expected**: Both dimensions clamp at their respective minimums independently (width at 20px canvas, height at 10px canvas).

---

## Scenario 6: Proportional Resize (Shift + Corner)

1. Select a field that is 150 pt wide × 20 pt tall (aspect ratio 7.5:1).
2. Hold `Shift` and drag the SE corner handle.
3. **Expected**: The ratio 7.5:1 is maintained throughout the drag. If you move 30 px right, height also increases by 4 px (30÷7.5=4). Properties panel reflects the constrained values.

---

## Scenario 7: Multi-Page Compatibility

1. Load a multi-page PDF.
2. Navigate to page 3 via Previous/Next buttons or thumbnail strip.
3. Add a field on page 3. Select it. Press `Ctrl+D`.
4. **Expected**: Duplicate appears on page 3 (not page 1). Both fields have `page = 3`.
5. Navigate to page 5. Add a field. Resize it by dragging a handle.
6. **Expected**: Resize works correctly on page 5. Field remains on page 5 after resize.

---

## Scenario 8: Export with Duplicated and Resized Fields

1. Load a multi-page PDF.
2. Page 1: Add 1 field, duplicate it (now 2 fields on page 1), resize one.
3. Page 3: Add 1 field, resize it via corner handle.
4. Click **Export PDF**.
5. Open the exported file in any PDF reader (Adobe Acrobat, Firefox, Preview).
6. **Expected**:
   - Page 1 has 2 fillable text fields, one larger than the other.
   - Page 3 has 1 fillable text field with the resized dimensions.
   - All fields are fillable and display at the correct position and size.
   - No field name collisions (all names are unique).

---

## Automated Test Validation

```bash
npm test -w client   # Vitest — should include fieldName.test.ts (naming algorithm)
npm test -w server   # Jest — no changes; all 16 tests should still pass
```

Key unit tests to verify:
- `duplicatedName('fullname', new Set(['fullname']))` → `'fullname_2'`
- `duplicatedName('fullname', new Set(['fullname', 'fullname_2']))` → `'fullname_3'`
- `duplicatedName('fullname_2', new Set(['fullname_2']))` → `'fullname_2'` stripped to `'fullname'` → `'fullname_2'` (since `fullname_2` is taken) → `'fullname_3'`
  Wait: `duplicatedName('fullname_2', {'fullname_2'})` → base = 'fullname' → 'fullname_2' is in set → 'fullname_3' ✓
- `duplicatedName('', new Set())` → `'campo_2'`
- `duplicatedName('  ', new Set())` → `'campo_2'`
