# Contract: POST /api/fill-pdf

**Feature**: `010-pdf-filler-mode`  
**Endpoint**: `POST /api/fill-pdf`  
**Auth**: None (Principio VIII — herramienta de uso interno/trusted network)  
**Content-Type Request**: `multipart/form-data`

---

## Request

### Parameters (multipart/form-data)

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `file` | File (binary) | Sí | El archivo PDF con campos AcroForm. Validado vía cabecera binaria `%PDF-`. |
| `fields` | string (JSON) | Sí | JSON string con los campos a rellenar. Formato: `{"fieldName": "value", ...}`. Puede ser `{}` para aplanadar sin rellenar. |

### Ejemplo de request (multipart body)
```
--boundary
Content-Disposition: form-data; name="file"; filename="contrato.pdf"
Content-Type: application/pdf

<bytes del PDF>
--boundary
Content-Disposition: form-data; name="fields"

{"fullname":"Juan Pérez","petname":"Firulais","startDate":"2026-04-12"}
--boundary--
```

---

## Responses

### 200 OK — PDF rellenado y aplanado

```
Content-Type: application/pdf
Content-Disposition: attachment; filename="filled.pdf"

<bytes del PDF rellenado y aplanado>
```

El PDF de respuesta:
- Tiene los valores de `fields` escritos en los campos correspondientes.
- Ha sido procesado con `form.flatten()` — campos interactivos convertidos a
  contenido estático no editable.
- Si `fields` era `{}`, devuelve el PDF original aplanado sin valores.

---

### 400 — INVALID_PDF

```json
{ "error": "INVALID_PDF" }
```

**Condición**: El archivo enviado como `file` no comienza con la cabecera `%PDF-`,
o el campo `file` está ausente en el body.

---

### 400 — INVALID_FIELDS

```json
{ "error": "INVALID_FIELDS" }
```

**Condición**: El campo `fields` está ausente, no es un string, o su contenido no
es JSON válido (error de `JSON.parse`).

---

### 400 — FIELD_NOT_FOUND

```json
{ "error": "FIELD_NOT_FOUND", "field": "nonexistent" }
```

**Condición**: Uno o más campos del JSON de `fields` no existen como campos
AcroForm en el PDF enviado. El campo `field` indica el primer nombre que no se
encontró.

**Nota**: La validación se realiza antes de escribir cualquier valor — la respuesta
es atómica (o todos los campos son válidos, o se devuelve error sin modificar el PDF).

---

### 500 — PROCESSING_ERROR

```json
{ "error": "PROCESSING_ERROR" }
```

**Condición**: Error interno inesperado durante la carga, modificación, o
serialización del PDF (ej: PDF encriptado, corrupción, error de pdf-lib).

---

## Pipeline interno

```
request.formData()
  → validate file (isPdf check)           → 400 INVALID_PDF
  → parse fields JSON                     → 400 INVALID_FIELDS
  → PDFDocument.load(fileBytes)
  → validate field names exist            → 400 FIELD_NOT_FOUND
  → field.setText(value) para cada campo
  → form.updateFieldAppearances(helvetica)
  → form.flatten()                        (Principio XXXI)
  → pdfDoc.save()
  → Response (200, application/pdf)       → 500 PROCESSING_ERROR si falla
```

---

## Ejemplos de uso

### curl
```bash
curl -X POST http://localhost:3000/api/fill-pdf \
  -F "file=@contrato.pdf" \
  -F 'fields={"fullname":"Juan Pérez","petname":"Firulais"}'
```

### fetch (browser / Node.js)
```javascript
const formData = new FormData();
formData.append('file', pdfBlob, 'contrato.pdf');
formData.append('fields', JSON.stringify({
  fullname: 'Juan Pérez',
  petname: 'Firulais',
  startDate: '2026-04-12'
}));

const res = await fetch('/api/fill-pdf', { method: 'POST', body: formData });
if (!res.ok) {
  const err = await res.json();
  throw new Error(err.error);
}
const pdfBlob = await res.blob();
const url = URL.createObjectURL(pdfBlob);
```

### axios
```javascript
import axios from 'axios';

const formData = new FormData();
formData.append('file', pdfFile); // File object del input
formData.append('fields', JSON.stringify({ fullname: 'Juan Pérez' }));

const res = await axios.post('/api/fill-pdf', formData, {
  responseType: 'blob',
});
const url = URL.createObjectURL(res.data);
```

---

## Restricciones v1

- Solo campos de tipo `TextField` (AcroForm `Tx`) son rellenables. Checkboxes,
  radio buttons y listas desplegables se ignoran silenciosamente si se envía un
  campo que coincide con su nombre.
- Tamaño máximo del PDF: 4 MB (límite por defecto de Next.js Route Handlers).
- PDFs encriptados o con contraseña de usuario devuelven 500 `PROCESSING_ERROR`.
- El endpoint no autentica ni limita por IP (Principio VIII).
