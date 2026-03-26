# API Contract: POST /api/generate-pdf (v1.1)

**Version**: 1.1 | **Date**: 2026-03-26 | **Previous version**: [001-pdf-form-editor/contracts/generate-pdf.md](../../001-pdf-form-editor/contracts/generate-pdf.md)

---

## Change Summary

**No breaking changes.** The endpoint signature, request format, and response codes are identical to v1.0.

The only clarification added in v1.1: the `fields` array **may contain fields from multiple pages**. The server already embeds each field on its correct page using `field.page`. This was always supported by the implementation; it is now explicitly documented.

---

## Overview

Single endpoint that accepts an original PDF and a list of form field definitions (across any number of pages), embeds the fields as AcroForm text fields using pdf-lib, and returns the modified PDF as a downloadable binary.

---

## Request

**Method**: `POST`
**Path**: `/api/generate-pdf`
**Content-Type**: `multipart/form-data`

### Parts

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `pdf` | File (binary) | Yes | The original PDF. Max size: 50 MB. Must be a valid, unencrypted PDF. |
| `fields` | String (JSON) | Yes | JSON array of `FormField` objects, spanning any pages. May be empty array `[]`. |

### `fields` JSON Schema

```json
{
  "type": "array",
  "items": {
    "type": "object",
    "required": ["id", "name", "page", "x", "y", "width", "height", "fontSize", "fontFamily"],
    "properties": {
      "id":         { "type": "string" },
      "name":       { "type": "string", "minLength": 1, "maxLength": 128 },
      "page":       { "type": "integer", "minimum": 1 },
      "x":          { "type": "number", "minimum": 0 },
      "y":          { "type": "number", "minimum": 0 },
      "width":      { "type": "number", "exclusiveMinimum": 0 },
      "height":     { "type": "number", "exclusiveMinimum": 0 },
      "fontSize":   { "type": "integer", "minimum": 6, "maximum": 72 },
      "fontFamily": { "type": "string", "enum": ["Helvetica", "TimesRoman", "Courier"] }
    }
  }
}
```

### Multi-Page Example Request (cURL)

```bash
curl -X POST http://localhost:3002/api/generate-pdf \
  -F "pdf=@/path/to/document.pdf" \
  -F 'fields=[
    {"id":"a1","name":"name_p1","page":1,"x":72,"y":680,"width":200,"height":24,"fontSize":12,"fontFamily":"Helvetica"},
    {"id":"a2","name":"notes_p1","page":1,"x":72,"y":640,"width":300,"height":24,"fontSize":12,"fontFamily":"Helvetica"},
    {"id":"b1","name":"signature_p7","page":7,"x":72,"y":100,"width":200,"height":30,"fontSize":14,"fontFamily":"TimesRoman"},
    {"id":"c1","name":"date_p12","page":12,"x":400,"y":50,"width":120,"height":24,"fontSize":10,"fontFamily":"Courier"}
  ]' \
  --output result.pdf
```

---

## Response

### 200 OK — Success

**Content-Type**: `application/pdf`
**Content-Disposition**: `attachment; filename="form.pdf"`
**Body**: Binary PDF file with all AcroForm text fields embedded on their respective pages.

### 400 Bad Request — Invalid Input

**Content-Type**: `application/json`

```json
{ "error": "string — human-readable error message" }
```

**Triggers** (unchanged from v1.0):
- `pdf` part missing from request
- `fields` part missing or not valid JSON
- Any field fails schema validation
- Duplicate `name` values in the fields array (regardless of which pages they are on)
- `page` value exceeds total number of pages in the uploaded PDF

**Multi-page specific example**:
```json
{ "error": "Field 'signature' references page 15, but the PDF has 12 page(s)." }
```

### 422 Unprocessable Entity — Cannot Process PDF

**Content-Type**: `application/json`

**Triggers**: File is not a valid PDF; PDF is encrypted.

### 413 Payload Too Large

**Triggers**: `pdf` file exceeds 50 MB.

### 500 Internal Server Error

**Content-Type**: `application/json`

**Triggers**: Unexpected error during pdf-lib processing.

---

## Validation Order (unchanged)

1. `pdf` part present and non-empty
2. `fields` part present and valid JSON array
3. Each field object passes schema validation
4. All `name` values are unique **across the entire fields array** (not per-page)
5. All `page` values are ≤ total page count in the PDF
6. PDF can be loaded by pdf-lib (not encrypted/corrupted)

---

## Field Name Uniqueness — Multi-Page Clarification

AcroForm field names are global identifiers within a PDF document. Two fields with the same name on different pages will share their value when a user fills the form in a PDF reader — filling one fills the other. This is a PDF specification constraint, not a server implementation choice.

The server rejects requests with duplicate `name` values even when those fields are on different pages.

**Bad** (server returns 400):
```json
[
  {"name": "signature", "page": 1, ...},
  {"name": "signature", "page": 7, ...}
]
```

**Correct**:
```json
[
  {"name": "signature_page1", "page": 1, ...},
  {"name": "signature_page7", "page": 7, ...}
]
```

---

## Client Usage Pattern (multi-page)

```typescript
async function exportPdf(pdfBytes: ArrayBuffer, fields: FormField[]): Promise<void> {
  // fields contains entries from all pages — send them all together
  const formData = new FormData();
  formData.append('pdf', new Blob([pdfBytes], { type: 'application/pdf' }), 'document.pdf');
  formData.append('fields', JSON.stringify(fields));

  const response = await fetch('/api/generate-pdf', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const { error } = await response.json();
    throw new Error(error);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'form.pdf';
  a.click();
  URL.revokeObjectURL(url);
}
```

**Note**: The export utility at `client/src/utils/export.ts` is unchanged — it already sends the entire `fields` array, which now naturally includes fields from all pages.

---

## Notes

- Coordinates (`x`, `y`, `width`, `height`) are in **PDF points** per page — each page has its own coordinate space with origin at the page's bottom-left corner.
- The server is stateless — each request is independent.
- Field ordering within the array does not affect the output PDF.
