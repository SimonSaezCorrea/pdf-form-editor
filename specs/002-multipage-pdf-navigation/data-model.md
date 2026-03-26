# Data Model: Multi-Page PDF Navigation and Field Editing

**Branch**: `002-multipage-pdf-navigation` | **Date**: 2026-03-26

---

## Overview

This document extends the data model from `001-pdf-form-editor`. All data remains ephemeral — in-memory for the browser session only. No persistence, no database, no server-side state.

The `FormField` type is **unchanged**. The `page` property was already present and correct. The primary change is in `EditorState`: `pageDimensions` is promoted from a single-page value to a map indexed by page number.

---

## Entities

### FormField (unchanged)

Defined in `shared/types.ts`. No modifications for this feature.

```typescript
interface FormField {
  id: string;           // UUID, client-generated
  name: string;         // AcroForm field name — MUST be unique within the entire document (all pages)
  page: number;         // 1-indexed page number
  x: number;            // PDF points from bottom-left of page
  y: number;            // PDF points from bottom-left of page
  width: number;        // PDF points
  height: number;       // PDF points
  fontSize: number;     // Points (6–72)
  fontFamily: FontFamily;
}

type FontFamily = 'Helvetica' | 'TimesRoman' | 'Courier';
```

**Uniqueness scope**: `name` must be unique across the entire document — not just within a single page. Two fields on different pages with the same name will share their value in a PDF reader (AcroForm constraint).

---

### PageDimensions

```typescript
interface PageDimensions {
  /** Page width in PDF points at scale 1 */
  width: number;
  /** Page height in PDF points at scale 1 */
  height: number;
}
```

This type already exists in `usePdfRenderer.ts`. No change to the type itself.

---

### EditorState (client-only, extended)

The complete in-memory state of the editor. Changes from `001-pdf-form-editor` are marked with `// UPDATED`.

```typescript
interface EditorState {
  // PDF source
  pdfFile: File | null;
  pdfBytes: ArrayBuffer | null;

  // pdfjs-dist loaded document
  pdfDocument: PDFDocumentProxy | null;

  // Page navigation
  currentPage: number;              // 1-indexed, default 1
  totalPages: number;               // 0 until doc loaded

  // Rendering
  renderScale: number;              // Default 1.5

  // Field management
  fields: FormField[];              // All fields across all pages
  selectedFieldId: string | null;

  // Per-page dimensions (PDF points) — UPDATED: now covers ALL pages, not just current
  pageDimensionsMap: Record<number, PageDimensions>;  // key = 1-indexed page number

  // Thumbnail cache (P3 — ThumbnailStrip feature)
  thumbnails: Record<number, string>;  // key = 1-indexed page number, value = data URL
}
```

**Key change**: `pageDimensions: PageDimensions | null` → `pageDimensionsMap: Record<number, PageDimensions>`.

The `usePdfRenderer` hook continues to expose the current page's dimensions as a convenience alias:
```typescript
pageDimensions: pageDimensionsMap[currentPage] ?? null
```

---

### PdfRendererHook (updated interface)

What `usePdfRenderer` returns — extended with `pageDimensionsMap`.

```typescript
interface PdfRenderer {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  totalPages: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageDimensions: PageDimensions | null;        // current page only (backwards compat)
  pageDimensionsMap: Record<number, PageDimensions>;  // NEW: all pages
  renderScale: number;
  isLoading: boolean;
  error: string | null;
}
```

---

## State Transitions

### PDF Loading Flow (updated)

```
idle
  → [user selects file] → loading
  → [pdfjs loads document] → dimensionCaching
  → [all page dimensions loaded into map] → ready (fields: [], currentPage: 1, pageDimensionsMap populated)
  → [user loads a different file] → loading (fields reset, pageDimensionsMap reset)
```

### Page Navigation Flow (new)

```
ready (currentPage = N)
  → [user clicks Next / presses ArrowRight] → ready (currentPage = N+1, new page renders)
  → [user clicks Prev / presses ArrowLeft] → ready (currentPage = N-1, new page renders)
  → [user clicks thumbnail for page M] → ready (currentPage = M, page M renders)
```

**Invariant**: `1 ≤ currentPage ≤ totalPages` at all times. Navigation actions that would violate this are blocked (button disabled, keyboard event ignored).

### Field Add — Multi-Page

```
ready (currentPage = P)
  → [user clicks canvas] → addField(pageNum = P, canvasX, canvasY, pageDimensionsMap[P].height, renderScale)
  → field created with page = P, appended to fields array
```

The field's `page` is derived from the renderer's `currentPage` at the moment of the click — the user cannot accidentally add a field to the wrong page.

### Thumbnail Generation Flow (P3)

```
dimensionCaching complete (pageDimensionsMap populated)
  → [ThumbnailStrip mounts] → generate thumbnails lazily via IntersectionObserver
  → [thumbnail slot visible] → render page at scale 0.2 → store dataURL in thumbnails[N]
  → [thumbnail dataURL available] → <img src={dataUrl} /> renders
```

---

## Default Values for New Fields

Unchanged from `001-pdf-form-editor`:

| Property | Default | Rationale |
|----------|---------|-----------|
| `name` | `field_N` (N = auto-increment) | Avoids empty-name constraint |
| `width` | `150` PDF points | ~5.3 cm, fits most form labels |
| `height` | `20` PDF points | Standard single-line input height |
| `fontSize` | `12` | Standard body text size |
| `fontFamily` | `'Helvetica'` | Most common PDF form font |
| `page` | `currentPage` at time of add | Field goes to the visible page |
