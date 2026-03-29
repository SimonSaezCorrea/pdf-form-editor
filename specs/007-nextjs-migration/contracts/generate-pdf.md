# API Contract: POST /api/generate-pdf

**Route file**: `src/app/api/generate-pdf/route.ts`
**Runtime**: Node.js (not Edge — pdf-lib requires Node.js APIs)

---

## Request

**Method**: `POST`
**Content-Type**: `multipart/form-data`

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `pdf` | File (binary) | Yes | Valid PDF file. Max size: 4.5 MB on Vercel hobby; no limit on `next dev`. |
| `fields` | string (JSON) | Yes | JSON array of `FormField` objects. Empty array `[]` is valid (returns unmodified PDF). |

### FormField JSON Schema

```typescript
interface FormField {
  id: string;           // Non-empty string (ignored server-side, passed through for client correlation)
  name: string;         // 1–128 chars, unique within the document
  page: number;         // Integer ≥ 1, ≤ document page count
  x: number;            // ≥ 0, PDF points from bottom-left
  y: number;            // ≥ 0, PDF points from bottom-left
  width: number;        // > 0, PDF points
  height: number;       // > 0, PDF points
  fontSize: number;     // Integer, 6–72
  fontFamily: 'Helvetica' | 'TimesRoman' | 'Courier';
  value?: string;       // Optional default text (undefined or '' = no pre-fill)
}
```

### Request Example (fetch)

```typescript
const form = new FormData();
form.append('pdf', pdfFile);       // Blob/File
form.append('fields', JSON.stringify(fields));

const response = await fetch('/api/generate-pdf', {
  method: 'POST',
  body: form,
});
```

---

## Responses

### 200 OK — Success

**Content-Type**: `application/pdf`
**Content-Disposition**: `attachment; filename="form.pdf"`
**Body**: Binary PDF bytes with AcroForm text fields embedded.

---

### 400 Bad Request — Validation Error

**Content-Type**: `application/json`

Returned when:
- `pdf` field is missing or empty
- `fields` field is missing or not a string
- `fields` is not valid JSON
- `fields` is not a JSON array
- Any field in the array fails validation rules
- Duplicate field names exist in the array

**Body**:
```json
{ "error": "<human-readable description of the validation failure>" }
```

**Examples**:

```json
{ "error": "Missing required field: pdf (PDF file)." }
{ "error": "Missing required field: fields (JSON array)." }
{ "error": "Invalid JSON in fields parameter." }
{ "error": "fields must be a JSON array." }
{ "error": "Field at index 2 is invalid. Required: id, name, page≥1, x≥0, y≥0, width>0, height>0, fontSize(6–72), fontFamily(Helvetica|TimesRoman|Courier)." }
{ "error": "Duplicate field name(s): 'invoice_date'. Field names must be unique." }
```

---

### 422 Unprocessable Entity — PDF Error

**Content-Type**: `application/json`

Returned when the uploaded file is not a valid PDF, is encrypted/password-protected,
or is corrupted.

**Body**:
```json
{ "error": "Cannot load PDF: file may be corrupted or encrypted." }
```

---

### 500 Internal Server Error — Unexpected Error

**Content-Type**: `application/json`

Returned for unexpected server errors (bugs, OOM, etc.).

**Body**:
```json
{ "error": "Internal server error" }
```

---

## Unchanged Contract Guarantee

This contract is **byte-for-byte identical** to the previous Express
`POST /api/generate-pdf` endpoint:
- Same field names (`pdf`, `fields`)
- Same JSON structure for `FormField`
- Same HTTP status codes (200, 400, 422, 500)
- Same error message formats
- Same response headers for success

The client-side `export.ts` utility requires **no changes**.

---

## Route Handler Implementation Notes

1. `export const runtime = 'nodejs'` — required; pdf-lib uses Node.js crypto APIs.
2. `await request.formData()` — replaces `multer`. Returns a `FormData` object.
3. `form.get('pdf') as File` — file is a Web `File` object (extends `Blob`).
4. `Buffer.from(await pdfFile.arrayBuffer())` — converts Web `File` to Node.js `Buffer`.
5. The `isValidField()` guard and `generatePdf()` logic are **identical** to the Express version.
6. Return `new Response(buffer, { status: 200, headers: { 'Content-Type': 'application/pdf', ... } })`.
