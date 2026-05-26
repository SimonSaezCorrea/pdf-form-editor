# POST /api/fill-pdf

Fills AcroForm text fields in an uploaded PDF and returns a flattened (non-editable) PDF.

## Request

**Content-Type**: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File (binary) | Yes | PDF with AcroForm fields. Validated via `%PDF-` magic bytes. |
| `fields` | string (JSON) | Yes | JSON object mapping field names to values. Use `{}` to flatten without filling. |

## Responses

| Status | Body | Condition |
|--------|------|-----------|
| 200 | PDF binary (`application/pdf`) | Success — `Content-Disposition: attachment; filename="filled.pdf"` |
| 400 | `{ "error": "INVALID_PDF" }` | `file` missing or not a valid PDF |
| 400 | `{ "error": "INVALID_FIELDS" }` | `fields` missing or not valid JSON |
| 400 | `{ "error": "FIELD_NOT_FOUND", "field": "<name>" }` | A key in `fields` does not exist in the PDF |
| 500 | `{ "error": "PROCESSING_ERROR" }` | Unexpected internal error |

## Examples

### curl

```bash
curl -X POST http://localhost:3000/api/fill-pdf \
  -F "file=@contrato.pdf" \
  -F 'fields={"fullname":"Juan Pérez","petname":"Firulais","startDate":"2026-04-12"}' \
  --output filled.pdf
```

### fetch

```javascript
const formData = new FormData();
formData.append('file', pdfBlob, 'contrato.pdf');
formData.append('fields', JSON.stringify({
  fullname: 'Juan Pérez',
  petname: 'Firulais',
  startDate: '2026-04-12',
}));

const res = await fetch('/api/fill-pdf', { method: 'POST', body: formData });
if (!res.ok) {
  const err = await res.json();
  throw new Error(err.error);
}
const pdfBlob = await res.blob();
const url = URL.createObjectURL(pdfBlob);
// Trigger download:
const a = document.createElement('a');
a.href = url;
a.download = 'filled.pdf';
a.click();
URL.revokeObjectURL(url);
```

### axios

```javascript
import axios from 'axios';

const formData = new FormData();
formData.append('file', pdfFile); // File from <input type="file">
formData.append('fields', JSON.stringify({ fullname: 'Juan Pérez' }));

const res = await axios.post('/api/fill-pdf', formData, {
  responseType: 'blob',
});
const url = URL.createObjectURL(res.data);
const a = document.createElement('a');
a.href = url;
a.download = 'filled.pdf';
a.click();
URL.revokeObjectURL(url);
```

## Notes

- Only AcroForm **text fields** (`TextField`) are supported in v1.
- Maximum PDF size: 4 MB (Next.js Route Handler default).
- The endpoint is stateless and requires no authentication.
- Encrypted PDFs return `500 PROCESSING_ERROR`.
