# API Contract: POST /api/generate-pdf

**Version**: 1.0 | **Date**: 2026-03-26

---

## Overview

Single endpoint that accepts an original PDF and a list of form field definitions, embeds the fields as AcroForm text fields using pdf-lib, and returns the modified PDF as a downloadable binary.

---

## Request

**Method**: `POST`
**Path**: `/api/generate-pdf`
**Content-Type**: `multipart/form-data`

### Parts

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `pdf` | File (binary) | Yes | The original PDF. Max size: 50 MB. Must be a valid, unencrypted PDF. |
| `fields` | String (JSON) | Yes | JSON array of `FormField` objects. May be empty array `[]` (returns original PDF unchanged). |

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

### Example Request (cURL)

```bash
curl -X POST http://localhost:3002/api/generate-pdf \
  -F "pdf=@/path/to/document.pdf" \
  -F 'fields=[{"id":"abc","name":"applicant_name","page":1,"x":72,"y":680,"width":200,"height":24,"fontSize":12,"fontFamily":"Helvetica"}]' \
  --output result.pdf
```

---

## Response

### 200 OK — Success

**Content-Type**: `application/pdf`
**Content-Disposition**: `attachment; filename="form.pdf"`
**Body**: Binary PDF file with all AcroForm text fields embedded.

### 400 Bad Request — Invalid Input

**Content-Type**: `application/json`

```json
{
  "error": "string — human-readable error message"
}
```

**Triggers**:
- `pdf` part missing from request
- `fields` part missing or not valid JSON
- Any field fails schema validation (missing required property, value out of range, unknown fontFamily)
- Duplicate `name` values in the fields array
- `page` value exceeds total number of pages in the uploaded PDF

**Example**:
```json
{ "error": "Duplicate field name: 'applicant_name'. Field names must be unique." }
```

### 422 Unprocessable Entity — Cannot Process PDF

**Content-Type**: `application/json`

```json
{
  "error": "string — human-readable error message"
}
```

**Triggers**:
- Uploaded file is not a valid PDF (corrupted or wrong format)
- PDF is password-protected or encrypted

**Example**:
```json
{ "error": "Cannot load PDF: file is password-protected or encrypted." }
```

### 413 Payload Too Large

**Triggers**: `pdf` file exceeds 50 MB.

### 500 Internal Server Error

**Content-Type**: `application/json`

```json
{
  "error": "Internal server error"
}
```

**Triggers**: Unexpected error during pdf-lib processing. Message is intentionally generic (no internal details leaked).

---

## Validation Order (Server)

The server validates in this order, returning the first error found:

1. `pdf` part present and non-empty
2. `fields` part present and valid JSON array
3. Each field object passes schema validation
4. All `name` values are unique
5. All `page` values are ≤ total page count in the PDF
6. PDF can be loaded by pdf-lib (not encrypted/corrupted)

---

## Client Usage Pattern

```typescript
async function exportPdf(pdfBytes: ArrayBuffer, fields: FormField[]): Promise<void> {
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

---

## Notes

- Field `id` is accepted but ignored by the server — it exists only for client-side UI state.
- Coordinates (`x`, `y`, `width`, `height`) are in **PDF points** (1/72 inch), measured from the **bottom-left** of the page. The client is responsible for converting from canvas pixel coordinates before sending.
- The server does not validate that a field's bounding box fits within the page dimensions — oversized/out-of-bounds fields will be embedded as-is by pdf-lib.
- The server is stateless — each request is independent. No session, no stored PDFs.
