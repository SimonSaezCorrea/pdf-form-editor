# POST /api/pdf-fields

Inspects a PDF and returns all AcroForm text fields as a **TemplateFile** — the
same JSON schema accepted by the PDF Form Editor's "Importar plantilla" action.

**Typical workflow:**
1. `POST /api/pdf-fields` → discover fields (returns importable template)
2. Import the JSON into the editor, or use field names to build the `fields` payload
   for `POST /api/fill-pdf`

## Request

**Content-Type**: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File (binary) | Yes | PDF to inspect. Validated via `%PDF-` magic bytes. |
| `name` | string | No | Template name. Defaults to PDF filename without `.pdf` extension. |

## Response

### 200 — Success

Returns a `TemplateFile` object directly importable into the editor.

```json
{
  "schemaVersion": 1,
  "name": "contrato",
  "createdAt": "2026-05-26T12:00:00.000Z",
  "fields": [
    {
      "id": "field-1748260800000-1",
      "name": "fullname",
      "page": 1,
      "x": 71.0,
      "y": 634.5,
      "width": 241.0,
      "height": 15.0,
      "fontSize": 10,
      "fontFamily": "Helvetica",
      "value": ""
    },
    {
      "id": "field-1748260800000-2",
      "name": "startDate",
      "page": 1,
      "x": 71.0,
      "y": 580.0,
      "width": 129.0,
      "height": 15.0,
      "fontSize": 12,
      "fontFamily": "Helvetica",
      "value": ""
    }
  ]
}
```

| Field | Description |
|-------|-------------|
| `schemaVersion` | Always `1` |
| `name` | Template name (from `name` form field or PDF filename) |
| `createdAt` | ISO 8601 timestamp of extraction |
| `fields[].id` | Client-side ID (`field-{timestamp}-{index}`) for React keying |
| `fields[].name` | AcroForm field name (unique within the document) |
| `fields[].page` | 1-indexed page number where the field appears |
| `fields[].x` | X position in PDF points from bottom-left of the page |
| `fields[].y` | Y position in PDF points from bottom-left of the page |
| `fields[].width` | Field width in PDF points |
| `fields[].height` | Field height in PDF points |
| `fields[].fontSize` | Font size in points (6–72). Fields with auto-size (DA=0) default to `12` |
| `fields[].fontFamily` | `"Helvetica"` \| `"TimesRoman"` \| `"Courier"`. Unknown/embedded fonts → `"Helvetica"` |
| `fields[].value` | Always `""` (fields are empty on extraction) |

Returns `fields: []` if the PDF has no AcroForm text fields.

### Error responses

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "MISSING_FILE" }` | `file` field absent from the request |
| 400 | `{ "error": "INVALID_PDF" }` | File does not start with `%PDF-` magic bytes |
| 500 | `{ "error": "PROCESSING_ERROR" }` | Unexpected error (encrypted PDF, corrupted file, etc.) |

## Examples

### curl

```bash
curl -X POST http://localhost:3000/api/pdf-fields \
  -F "file=@contrato.pdf" \
  -F "name=Contrato de trabajo"
```

### fetch

```javascript
const formData = new FormData();
formData.append('file', pdfFile);
formData.append('name', 'Contrato de trabajo'); // optional

const res = await fetch('/api/pdf-fields', { method: 'POST', body: formData });
if (!res.ok) throw new Error((await res.json()).error);

const template = await res.json();
// template: { schemaVersion: 1, name, createdAt, fields: FormField[] }

// Option A — import directly into editor via "Importar plantilla"
const blob = new Blob([JSON.stringify(template)], { type: 'application/json' });
// … hand blob to the editor's ImportModal

// Option B — use field names for POST /api/fill-pdf
const fillValues = Object.fromEntries(
  template.fields.map(f => [f.name, getUserInput(f.name)])
);
```

### Workflow: inspect → fill

```javascript
// 1. Discover fields
const inspect = new FormData();
inspect.append('file', pdfFile);
const templateRes = await fetch('/api/pdf-fields', { method: 'POST', body: inspect });
const { fields } = await templateRes.json();

// 2. Build values map from field names
const values = Object.fromEntries(fields.map(f => [f.name, getUserInput(f.name)]));

// 3. Fill PDF
const fill = new FormData();
fill.append('file', pdfFile);
fill.append('fields', JSON.stringify(values));
const filledRes = await fetch('/api/fill-pdf', { method: 'POST', body: fill });
const filledPdf = await filledRes.blob();
```

## Notes

- Only AcroForm **text fields** (`TextField`) are returned. Checkboxes, radio buttons and
  select fields are excluded (out of scope for v1).
- Fields are deduplicated by name — if a field spans multiple pages via multiple widgets,
  only the first widget is returned.
- Coordinates (`x`, `y`) use PDF user-space (bottom-left origin), matching the editor's
  coordinate system exactly.
- `fontSize` is clamped to the editor's valid range (6–72). PDFs with `0` (auto-size DA)
  return `12` as the default.
- `fontFamily` mapping: `Helv`/`Helvetica` → `"Helvetica"`, `TiRo`/`Times*` → `"TimesRoman"`,
  `Cour`/`Courier*` → `"Courier"`. Unknown/embedded fonts → `"Helvetica"`.
- Maximum PDF size: 4 MB (Next.js Route Handler default).
- The endpoint is stateless and requires no authentication.
