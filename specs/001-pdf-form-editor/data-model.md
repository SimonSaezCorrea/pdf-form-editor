# Data Model: PDF Form Editor

**Branch**: `001-pdf-form-editor` | **Date**: 2026-03-26

---

## Overview

All data is ephemeral — it exists only for the duration of the browser session. There is no persistent storage, no database, and no server-side state between requests.

---

## Entities

### FormField

The central entity. Represents a single AcroForm text field placed on a specific page of the PDF.

**Source of truth**: `shared/types.ts` — used by both client state and server request validation.

```typescript
interface FormField {
  id: string;           // UUID, client-generated (not sent to pdf-lib; used for UI keying only)
  name: string;         // AcroForm field name — MUST be unique within the document
  page: number;         // 1-indexed page number
  x: number;            // PDF points from bottom-left of page (horizontal)
  y: number;            // PDF points from bottom-left of page (vertical)
  width: number;        // PDF points
  height: number;       // PDF points
  fontSize: number;     // Points (e.g., 10, 12, 14)
  fontFamily: FontFamily; // Enum — one of the three supported standard fonts
}

type FontFamily = 'Helvetica' | 'TimesRoman' | 'Courier';
```

**Validation rules**:
- `name`: non-empty string, max 128 characters, must be unique within the fields array
- `page`: integer ≥ 1, ≤ total pages in the PDF
- `x`, `y`: numbers ≥ 0; field must not exceed page boundaries (`x + width ≤ pageWidth`, `y + height ≤ pageHeight`)
- `width`: number > 0, practical minimum 20 PDF points (~7mm)
- `height`: number > 0, practical minimum 10 PDF points (~3.5mm)
- `fontSize`: integer, range 6–72
- `fontFamily`: must be one of the `FontFamily` values

---

### EditorState (client-only)

The complete in-memory state of the editor. Never leaves the browser.

```typescript
interface EditorState {
  // PDF source
  pdfFile: File | null;             // Original file object (for display name)
  pdfBytes: ArrayBuffer | null;     // Raw bytes for upload to server

  // pdfjs-dist loaded document
  pdfDocument: PDFDocumentProxy | null;

  // Page navigation
  currentPage: number;              // 1-indexed, default 1
  totalPages: number;               // 0 until doc loaded

  // Rendering
  renderScale: number;              // Default 1.5; affects canvas resolution

  // Field management
  fields: FormField[];
  selectedFieldId: string | null;   // Currently selected field for editing

  // Per-page dimensions (PDF points, populated on load)
  pageDimensions: Record<number, { width: number; height: number }>;
}
```

---

### GeneratePdfRequest (API boundary)

What the client sends to the server. This is the wire format, not a stored entity.

```typescript
interface GeneratePdfRequest {
  pdf: Buffer;          // Raw PDF bytes (from multipart upload)
  fields: FormField[];  // Parsed from JSON string in multipart body
}
```

**Note**: `FormField.id` is included in the JSON (it's part of the shared type) but the server ignores it — only `name`, `page`, `x`, `y`, `width`, `height`, `fontSize`, and `fontFamily` are used to embed fields.

---

## State Transitions

### PDF Loading Flow

```
idle
  → [user selects file] → loading
  → [pdfjs loads document] → ready (fields: [], currentPage: 1)
  → [user loads a different file] → loading (fields reset to [])
```

### Field Lifecycle

```
(no field)
  → [user drags new field onto canvas] → field created with defaults, selected
  → [user edits properties] → field updated
  → [user drags to reposition] → field x/y updated
  → [user deletes field] → field removed from array
```

### Export Flow

```
ready (fields populated)
  → [user clicks Export] → exporting (upload in progress)
  → [server returns PDF] → ready (state unchanged; file downloaded)
  → [server returns error] → ready (error shown to user)
```

---

## Default Values for New Fields

When a field is created by dragging, it is initialized with these defaults:

| Property | Default | Rationale |
|----------|---------|-----------|
| `name` | `field_N` (N = auto-increment) | Avoids empty-name constraint; user should rename |
| `width` | `150` PDF points | ~5.3 cm, fits most form labels |
| `height` | `20` PDF points | Standard single-line input height |
| `fontSize` | `12` | Standard body text size |
| `fontFamily` | `'Helvetica'` | Most common PDF form font |

Position (`x`, `y`) is derived from the canvas drop coordinates using the coordinate conversion in `research.md § 3`.
