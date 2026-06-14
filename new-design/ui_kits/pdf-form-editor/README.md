# PDF Form Editor — UI Kit

High-fidelity click-through recreation of the product, faithful to the
component code in `src/`.

## What's here
- **`index.html`** — entry point. Loads React 18 + Babel inline (matches the design-system stack).
- **`app.css`** — kit-specific layout: app shell, two-row navbar, editor three-pane body, filler split, modal & overlays. Composes the foundations from `colors_and_type.css`.
- **`colors_and_type.css`** — copied from the root so this kit is self-contained.
- **JSX modules** — split because Babel-in-browser scope is per-script-tag. Components are exported to `window` at the bottom of each file.
  - `primitives.jsx` — `Button`, `IconButton`, `Input`, `Select`, `Modal`, `Tooltip`, `Kbd`, `Icon` (Lucide subset).
  - `AppHeader.jsx` — two-row navbar (branding + mode tabs + actions / canvas toolbar).
  - `UploadScreen.jsx` — empty-state dropzone shared by editor & filler entry.
  - `MockPdfPage.jsx` — HTML-rendered fake PDF (`Contrato de Arriendo`) used as the canvas backdrop.
  - `EditorScreen.jsx` — `ThumbnailStrip · FieldList · Canvas (DraggableField) · PropertiesPanel`.
  - `FillerScreen.jsx` — form panel + live-text overlay on the PDF.
  - `ShortcutsPanel.jsx` — floating keyboard-shortcut card + FAB.
  - `app.jsx` — root: theme, app mode, sample data, modals.

## How to use as design context
1. **Recreate a flow.** Copy `app.jsx` as a starting point; replace the `SEED_FIELDS` and screen toggles with your scenario.
2. **Lift one screen.** Drop just `EditorScreen.jsx` (plus its CSS classes) into another mock.
3. **Pull components.** `Button`, `Input`, `Select`, `Modal` etc. are 1:1 with the codebase API — variant names match.

## Coverage vs. real source
| Recreated faithfully | Approximated | Skipped |
| --- | --- | --- |
| Navbar, mode tabs, toolbar | Drag/resize of fields (cosmetic only) | Real PDF.js rendering |
| Field list, properties panel | Multi-select properties merge | Coordinate math, font catalog |
| Filler form + live overlay | Export flow (mocked toast) | AcroForm extraction, server API |
| Modals, tooltips, kbd panel | — | Persistence, undo/redo |

## Caveats
- The canvas is an HTML mock — no actual PDF rendering. Field positions are tuned to look right over the seeded contract content.
- Drag/resize handles are decorative; only selection and form-field text editing work.
- Dark theme is the default; toggle the sun/moon in the navbar to preview light mode.
