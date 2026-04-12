# Data Model: PDF Filler Mode

**Branch**: `010-pdf-filler-mode` | **Date**: 2026-04-12

---

## Nuevas entidades (cliente)

### AcroFormField (`src/features/filler/types.ts`)

Representa un campo AcroForm detectado en el PDF subido. Solo existe en el
cliente — nunca cruza la frontera HTTP.

```typescript
interface AcroFormField {
  name: string;     // Nombre del campo tal como aparece en el AcroForm del PDF
  type: 'text';     // v1: solo texto; futura: 'checkbox' | 'radio' | 'other'
  page: number;     // Número de página (1-indexed) donde aparece por primera vez
}
```

**Notas**:
- `type` es siempre `'text'` en v1 (spec Assumptions: solo TextFields).
- `page` es metadata para UI — no se usa en el request al endpoint.
- Los nombres de campo son únicos por PDF (restricción AcroForm).

---

### FillerState (`src/features/filler/hooks/useFillerStore.ts`)

Estado interno del modo rellenador. No se exporta como tipo público.

```typescript
type FillerStatus =
  | 'idle'        // Sin PDF cargado — muestra pantalla de upload
  | 'loading'     // Analizando campos del PDF (pdfjs getAnnotations)
  | 'ready'       // PDF con campos detectados — muestra layout dos paneles
  | 'no-fields'   // PDF sin campos AcroForm — muestra mensaje informativo
  | 'generating'  // Enviando request a /api/fill-pdf
  | 'error';      // Error en cualquier fase

interface FillerState {
  status: FillerStatus;
  pdfBytes: Uint8Array | null;      // Bytes del PDF subido (para PdfViewer)
  fields: AcroFormField[];          // Campos detectados (vacío si no hay)
  values: Record<string, string>;   // Valores del formulario (nombre → valor)
  error: string | null;             // Mensaje de error para mostrar al usuario
}
```

**Transiciones de estado**:
```
idle ──[upload PDF]──> loading
loading ──[fields found]──> ready
loading ──[no fields]──> no-fields
loading ──[error]──> error
ready ──[click Generar]──> generating
generating ──[200 OK]──> ready       (descarga auto, valores se mantienen)
generating ──[error]──> error        (con mensaje)
error ──[upload new PDF]──> loading
any ──[reset / mode switch]──> idle
```

---

### Tipos de la API (documentales — no se definen en shared.ts)

Los tipos de la API de `POST /api/fill-pdf` cruzan la frontera HTTP como
`multipart/form-data` y `application/pdf` — no como JSON tipado. No se añaden
a `src/types/shared.ts` porque:
1. La request es multipart (no JSON), imposible de tipar con una interfaz simple.
2. El cliente usa `FormData` y el servidor parsea `request.formData()`.
3. Añadir a `shared.ts` tipos que el servidor no importa directamente violaría
   el Principio II (solo tipos que cruzan la frontera HTTP en ambas direcciones).

Para referencia documental (ver también `contracts/fill-pdf.md`):

```typescript
// FillRequest (multipart/form-data — solo documental)
// file: File          → Uint8Array en servidor
// fields: string      → JSON.parse → Record<string, string>

// FillResponse Success (status 200)
// Content-Type: application/pdf
// Content-Disposition: attachment; filename="filled.pdf"
// Body: Uint8Array (PDF bytes)

// FillResponse Error (status 400 | 500)
// Content-Type: application/json
// Body: { error: string; field?: string }
```

---

## Entidades nuevas (servidor — API route)

### FieldNotFoundError (`src/app/api/fill-pdf/fillService.ts`)

Clase de error personalizada para distinguir "campo no existe en el PDF" de
otros errores internos. Permite que `route.ts` devuelva 400 en lugar de 500.

```typescript
class FieldNotFoundError extends Error {
  constructor(public readonly field: string) {
    super(`Field not found: ${field}`);
  }
}
```

---

## Entidades existentes — sin cambios

### FormField (`src/types/shared.ts`)

No se modifica. El modo rellenador no crea ni modifica `FormField`s del editor.
`AcroFormField` es un tipo distinto y más simple (solo nombre, tipo, página).

### `src/app/api/generate-pdf/route.ts`

No se modifica. El nuevo endpoint `POST /api/fill-pdf` es un archivo separado
en `src/app/api/fill-pdf/route.ts`.

---

## Nuevos archivos (resumen)

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `src/features/filler/types.ts` | Tipos | `AcroFormField`, re-exports |
| `src/features/filler/index.ts` | Barrel | Exports públicos de la feature |
| `src/features/filler/hooks/useFillerStore.ts` | Hook | Estado del modo rellenador |
| `src/features/filler/hooks/useFieldDetection.ts` | Hook | Detección de campos vía pdfjs |
| `src/features/filler/components/FillerMode/FillerMode.tsx` | Component | Root del modo rellenador |
| `src/features/filler/components/FillerMode/FillerMode.module.css` | CSS | Estilos de FillerMode |
| `src/features/filler/components/PdfUploadScreen/PdfUploadScreen.tsx` | Component | Pantalla de upload |
| `src/features/filler/components/PdfUploadScreen/PdfUploadScreen.module.css` | CSS | Estilos de PdfUploadScreen |
| `src/features/filler/components/FillerLayout/FillerLayout.tsx` | Component | Layout dos paneles |
| `src/features/filler/components/FillerLayout/FillerLayout.module.css` | CSS | Estilos de FillerLayout |
| `src/features/filler/components/DynamicForm/DynamicForm.tsx` | Component | Formulario dinámico |
| `src/features/filler/components/DynamicForm/DynamicForm.module.css` | CSS | Estilos de DynamicForm |
| `src/app/api/fill-pdf/route.ts` | API Route | `POST /api/fill-pdf` |
| `src/app/api/fill-pdf/fillService.ts` | Service | Lógica de relleno PDF |
| `src/app/api/fill-pdf/README.md` | Docs | Ejemplos curl/fetch/axios |

## Archivos existentes — modificados

| Archivo | Cambio |
|---------|--------|
| `src/App.tsx` | + `mode: AppMode` state; selector de modo en navbar |
| `src/App.module.css` | + estilos del modo selector en navbar |
