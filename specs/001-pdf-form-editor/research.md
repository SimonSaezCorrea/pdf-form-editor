# Research: PDF Form Editor

**Branch**: `001-pdf-form-editor` | **Date**: 2026-03-26

---

## 1. DnD Library Selection: @dnd-kit vs react-dnd

**Decision**: Use `@dnd-kit/core` + `@dnd-kit/utilities`

**Rationale**:
- TypeScript-first library with full type coverage out of the box
- Does not depend on the HTML5 Drag-and-Drop API — uses Pointer Events instead, which works correctly over `<canvas>` elements (HTML5 DnD does not fire events over canvas)
- Smaller bundle (~10 KB gzip vs ~30 KB for react-dnd)
- Accessible by default (keyboard navigation support)
- Actively maintained; react-dnd has slowed significantly

**Alternatives considered**:
- `react-dnd`: Older API, relies on HTML5 DnD which has known issues over canvas elements. Would require a custom backend.
- Native pointer events + `useRef`: Possible but requires re-implementing all drag semantics manually.

---

## 2. PDF Rendering with pdfjs-dist

**Decision**: Render each PDF page to a `<canvas>` element using `pdfjs-dist`, with an absolutely-positioned div overlay for draggable fields.

**Approach**:
```
Container (position: relative, exact canvas dimensions)
├── <canvas>  — PDF page rendered by pdfjs-dist
└── <div>     — Field overlay (position: absolute, top:0, left:0, same width/height)
    └── Draggable <div> per field
```

**Key implementation details**:
- Load the worker: `pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'` (copy from node_modules via Vite)
- Get viewport: `const viewport = page.getViewport({ scale: renderScale })`
- Set canvas dimensions: `canvas.width = viewport.width; canvas.height = viewport.height`
- Render: `page.render({ canvasContext: ctx, viewport })`
- Use `renderScale = 1.5` by default for crisp rendering on standard displays; consider `window.devicePixelRatio` for HiDPI

**Alternatives considered**:
- Rendering to `<img>` via `canvas.toDataURL()`: Loses sharpness on HiDPI, adds an extra async step
- iframe + PDF embed: No control over rendering, no overlay possible
- react-pdf wrapper: Adds abstraction over pdfjs-dist without benefit for this use case

---

## 3. Coordinate System Mapping (Critical)

**Decision**: Store all field positions in **PDF points** (pdf-lib's coordinate system), convert to/from canvas pixels only in the UI layer.

**Coordinate systems**:

| System | Origin | Y direction | Unit |
|--------|--------|-------------|------|
| PDF (pdf-lib) | Bottom-left | Up ↑ | PDF points (1/72 inch) |
| pdfjs-dist canvas | Top-left | Down ↓ | Pixels (at renderScale) |

**Canonical conversion functions** (implemented in `client/src/utils/coordinates.ts`):

```typescript
// Canvas pixel → PDF point (for storing a dragged field position)
function canvasToPdf(
  canvasX: number,      // pixels from canvas left
  canvasY: number,      // pixels from canvas top (top-left of field)
  fieldWidthPx: number,
  fieldHeightPx: number,
  renderScale: number,
  pdfPageHeight: number // page.getViewport({ scale: 1 }).height
): { x: number; y: number; width: number; height: number } {
  return {
    x: canvasX / renderScale,
    y: pdfPageHeight - (canvasY / renderScale) - (fieldHeightPx / renderScale),
    width: fieldWidthPx / renderScale,
    height: fieldHeightPx / renderScale,
  };
}

// PDF point → canvas pixel (for rendering a stored field back on canvas)
function pdfToCanvas(
  pdfX: number,
  pdfY: number,        // bottom-left of field in PDF coords
  pdfWidth: number,
  pdfHeight: number,
  renderScale: number,
  pdfPageHeight: number
): { left: number; top: number; width: number; height: number } {
  return {
    left: pdfX * renderScale,
    top: (pdfPageHeight - pdfY - pdfHeight) * renderScale,
    width: pdfWidth * renderScale,
    height: pdfHeight * renderScale,
  };
}
```

**Why this matters**: If the conversion is wrong, fields will appear in the correct position in the editor but land in the wrong place in the exported PDF. This is the primary source of visual-to-export misalignment.

---

## 4. pdf-lib AcroForm Text Field API

**Decision**: Use `form.createTextField(name)` + `textField.addToPage(page, rect)` with standard PDF fonts.

**Key API surface** (pdf-lib 1.x):

```typescript
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const pdfDoc = await PDFDocument.load(existingPdfBytes);
const form = pdfDoc.getForm();

// Embed font (required for appearance streams)
const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

// Create and position a text field
const field = form.createTextField('applicant.name');
field.setText('');           // empty default
field.setFontSize(12);
field.addToPage(pdfDoc.getPages()[pageIndex], {
  x: 72,                    // PDF points from bottom-left
  y: 680,
  width: 200,
  height: 24,
  borderWidth: 1,
  borderColor: rgb(0.5, 0.5, 0.5),
});
field.updateAppearances(font);  // generate appearance stream

const pdfBytes = await pdfDoc.save();
```

**Available standard fonts** (v1 scope):
- `StandardFonts.Helvetica` → maps to UI label "Helvetica"
- `StandardFonts.TimesRoman` → maps to UI label "Times Roman"
- `StandardFonts.Courier` → maps to UI label "Courier"

**Constraints**:
- Field `name` must be unique across the entire PDF — duplicate names cause AcroForm conflicts. Validate on the server before calling `form.createTextField`.
- `updateAppearances(font)` must be called with an embedded font, not a standard font reference — embed it first with `pdfDoc.embedFont(StandardFonts.X)`.
- `page` parameter in `addToPage` is the PDF page object, obtained via `pdfDoc.getPages()[0]` (0-indexed).

---

## 5. Monorepo Structure & Shared Types

**Decision**: Flat monorepo with `/client`, `/server`, and `/shared` — no Turborepo or Nx.

**Rationale**: Single feature, two packages, straightforward build. Adding a workspace manager introduces setup overhead without benefit.

**npm workspaces setup** (root `package.json`):
```json
{
  "workspaces": ["client", "server", "shared"],
  "scripts": {
    "dev": "concurrently \"npm run dev -w server\" \"npm run dev -w client\"",
    "test": "npm run test -w client && npm run test -w server",
    "build": "npm run build -w client && npm run build -w server"
  }
}
```

**Shared types** (`/shared/types.ts`):
- `FormField` interface used by both client state and server request validation
- Avoids type drift between frontend and backend

---

## 6. Multipart Form Upload & Response

**Decision**: `multipart/form-data` for the request (PDF binary + JSON fields), `application/pdf` binary for the response.

**Rationale**:
- Sending a PDF binary as base64 JSON adds ~33% size overhead; multipart avoids this
- The response is a direct file download (blob), not a JSON wrapper — simplest approach for the frontend to trigger a browser download

**Server-side**: Use `multer` middleware for multipart parsing. `req.file` = PDF buffer, `req.body.fields` = JSON string.

**Client-side**: Use `fetch` with `FormData`, receive response as `blob()`, create object URL, trigger anchor download.

---

## 7. Field Name Uniqueness Validation

**Decision**: Validate on both client (UX warning) and server (hard error) that field names are unique within the document.

**Rationale**: AcroForm fields with duplicate names share their value — filling one fills all. This is a silent data-corruption issue that the spec explicitly calls out (FR-013).

**Client**: Warn in the PropertiesPanel when a name matches an existing field; prevent export if duplicates exist.
**Server**: Validate uniqueness of all `name` values in the fields array before calling `form.createTextField`. Return 400 if duplicates found.
