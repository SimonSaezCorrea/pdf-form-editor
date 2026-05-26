# Research: PDF Filler Mode — Formulario Dinámico y API Pública

**Branch**: `010-pdf-filler-mode` | **Date**: 2026-04-12

---

## 1. Extracción de campos AcroForm en el cliente (pdfjs-dist)

### Hallazgo

**API disponible**: `PDFPageProxy.getAnnotations()` devuelve un array de objetos de
anotación para cada página. Los campos AcroForm aparecen como anotaciones con
`subtype === 'Widget'`. El tipo de campo se indica en `fieldType`:
- `'Tx'` → TextField (texto editable) — únicos en scope de v1
- `'Btn'` → Checkbox o radio button — fuera de scope
- `'Ch'` → Choice/Select — fuera de scope

Cada anotación incluye `fieldName: string` (nombre único del campo en el PDF),
`rect: [x1, y1, x2, y2]` (posición en PDF user-space, origen bottom-left), y
`defaultAppearanceData` (objeto con `fontSize`, `fontColor`, `fontName` — ver §9).

**Subtlety — duplicados por página**: En PDFs con múltiples páginas, el mismo
`fieldName` puede aparecer en anotaciones de varias páginas si el campo tiene
múltiples widgets (apariciones visuales). Para el formulario dinámico solo se
necesita una entrada por nombre lógico → deduplicar por `fieldName`.

**Decision**: Iterar todas las páginas con `getAnnotations()`, filtrar
`subtype === 'Widget' && fieldType === 'Tx'`, deduplicar por `fieldName` usando
un `Set<string>`. Almacenar primera página, `rect` y `fontSize` para uso en el
overlay de preview en vivo.

**Rationale**: Este es exactamente el mismo mecanismo que usa
`src/features/pdf/utils/extractFields.ts` (editor mode). La diferencia es que
la versión del rellenador necesita también `rect` y `fontSize` para renderizar
el overlay en vivo. Crear una nueva función liviana en `src/features/filler/`
en lugar de reutilizar `extractFields.ts` (que devuelve `FormField[]` con campos
del editor) evita acoplamiento con el feature de fields (Principio XXIX).

**Alternatives considered**:
- Reutilizar `extractFields.ts` directamente: Viola Principio XXIX (imports
  cruzados desde filler → fields). Descartado.
- Usar `pdfDoc.getFieldObjects()` (API más nueva de pdfjs): No disponible en
  todas las versiones de pdfjs-dist; `getAnnotations()` es la API estable
  documentada. Descartado por riesgo de compatibilidad.

---

## 2. Relleno de campos AcroForm en el servidor (pdf-lib)

### Hallazgo

**API disponible en pdf-lib para PDFs existentes**:
```typescript
const form = pdfDoc.getForm();
const field = form.getTextField('fieldName'); // throws si no existe
field.setText('value');
form.updateFieldAppearances(embeddedFont);
form.flatten();
const bytes = await pdfDoc.save();
```

**Validación de existencia**: `form.getFields()` devuelve todos los campos del
formulario. Construir un `Set<string>` con los nombres antes de iterar el JSON
de entrada es O(n) y permite reportar el primer campo faltante sin excepción.

**Fuente para updateFieldAppearances**: Embeber `StandardFonts.Helvetica` vía
`pdfDoc.embedStandardFont()`. Para v1 esto es suficiente — los valores de texto
quedan visibles en el PDF aplanado independientemente de la fuente original del
campo. Una mejora futura (fuera de scope v1) es respetar la DA (Default
Appearance) del campo original.

**Order of operations** (Principio XXXI):
1. `field.setText(value)` para cada campo
2. `form.updateFieldAppearances(helvetica)` — renderiza apariencias
3. `form.flatten()` — aplana a contenido estático
4. `pdfDoc.save()` — serializa

**Decision**: Implementar `fillService.ts` con la función
`fillPdf(fileBytes, fields)` que sigue el orden estricto del Principio XXXI.
Errores de campo faltante se convierten en `FieldNotFoundError` para que
`route.ts` los mapee a 400.

**Rationale**: pdf-lib ya está presente en el proyecto como dependencia del
endpoint `POST /api/generate-pdf`. No se añade ninguna dependencia nueva.
El manejo de errores con clase personalizada mantiene `route.ts` limpio y
testeable.

**Alternatives considered**:
- `form.getTextField(name)` con try/catch: Funciona pero no permite reportar
  cuál campo faltó sin parsear el mensaje de error. Usar `getFields()` + Set
  para pre-validación es más limpio.

---

## 3. Manejo de upload multipart/form-data en Next.js Route Handler

### Hallazgo

**API nativa de Next.js 15 (App Router)**:
```typescript
const formData = await request.formData();
const file = formData.get('file') as File | null;
const fieldsRaw = formData.get('fields') as string | null;
const bytes = new Uint8Array(await file.arrayBuffer());
```

`request.formData()` es API Web estándar disponible en Next.js 15 sin
configuración adicional. El límite de body por defecto en Next.js es **4 MB**
(configurado en `next.config.ts` como `serverActions.bodySizeLimit`; el límite
de Route Handlers hereda el default de Next.js).

**Nota sobre el límite**: El spec asume el límite por defecto de ~4 MB para v1.
No se modifica `next.config.ts`.

**Decision**: Usar `request.formData()` directamente en `route.ts`. No se añade
ningún middleware de parsing (busboy, formidable, etc.).

**Rationale**: La API nativa es suficiente para el caso de uso de v1. Añadir
una librería de parsing para lo que ya hace el runtime sería una violación del
Principio VI (YAGNI).

**Alternatives considered**:
- `multer` / `busboy` / `formidable`: Innecesario en Next.js 15 App Router donde
  `request.formData()` está disponible nativamente. Descartado.

---

## 4. Validación del archivo PDF (cabecera binaria)

### Hallazgo

Los archivos PDF comienzan con la secuencia de bytes `%PDF-` (hex:
`25 50 44 46 2D`). Verificar los primeros 5 bytes del archivo es la forma más
fiable de distinguir PDFs reales de archivos con extensión incorrecta o payloads
maliciosos.

**Decision**:
```typescript
function isPdf(bytes: Uint8Array): boolean {
  return bytes[0] === 0x25 && bytes[1] === 0x50 &&
         bytes[2] === 0x44 && bytes[3] === 0x46;
}
```
Verificar 4 bytes (`%PDF`) es suficiente; el quinto (`-`) es opcional ya que
algunos editores generan variantes válidas como `%PDF1.4`.

**Rationale**: La validación de extensión MIME no es suficiente (cualquier
archivo puede ser renombrado a `.pdf`). La cabecera binaria es el estándar
de detección de formato usado por herramientas como `file(1)`.

---

## 5. Integración de modo en App.tsx — preservación de estado

### Hallazgo

**Estado actual de App.tsx**:
- `pdfBytes: Uint8Array | null` — PDF del editor (estado propio de App.tsx)
- `usePdfRenderer(pdfBytes, ...)` — rendering del PDF editor
- `useFieldStore` — store global de campos del editor
- `useInteractionMode` — modo de interacción del canvas

Ninguno de estos estados pertenece al modo rellenador. Al añadir
`mode: 'editor' | 'filler'` a App.tsx, la solución más simple es renderizado
condicional:

```tsx
{mode === 'editor' ? <EditorLayout ... /> : <FillerMode />}
```

Con este patrón:
- Al cambiar a 'filler': `EditorLayout` se **desmonta** pero su estado sigue
  vivo en App.tsx (`pdfBytes`, `useFieldStore` global). La re-montada de
  `EditorLayout` al volver a 'editor' restaura la UI usando el estado que nunca
  se perdió.
- Al cambiar a 'editor': `FillerMode` se desmonta y su estado efímero se pierde
  (comportamiento correcto según la spec — Assumptions: "El estado del formulario
  rellenador es efímero").

**Decision**: `mode: AppMode` state en App.tsx (`useState('editor')`). Navbar
muestra ambas opciones. `FillerMode` es un componente independiente montado solo
cuando `mode === 'filler'`. Toda la lógica del rellenador vive en ese árbol.

**Rationale**: No requiere cambios en `useFieldStore`, `usePdfRenderer` ni
ningún hook global existente. El estado del editor persiste porque vive en
App.tsx, que nunca se desmonta. El estado del rellenador es local al componente
`FillerMode`, que se resetea al desmontarse.

**Alternatives considered**:
- CSS `display:none` para mantener ambas vistas montadas: Preservaría el estado
  del rellenador al cambiar de modo, pero viola el spec (estado debe ser
  efímero). Además aumenta el footprint de memoria. Descartado.
- Zustand global para `useFillerStore`: Requeriría `reset()` explícito al
  cambiar de modo. `useState` local en `FillerMode` es suficiente y más simple
  (Principio VI YAGNI).

---

## 6. Reutilización de componentes de renderizado (Principio XXIX)

### Hallazgo

El Principio XXIX establece que ambos modos **deben compartir** `PdfViewer` y
`usePdfRenderer`. `PdfViewer` acepta `pdfBytes: Uint8Array | null` como prop y
gestiona su propio ciclo de vida de rendering. Es reusable directamente.

El componente `PdfUploader` en `src/features/pdf/` implementa drag-and-drop y
selector de archivo. No pertenece a `src/features/fields/` ni
`src/features/templates/`, por lo que importarlo desde `src/features/filler/`
no viola el Principio XXIX.

**Decision**:
- Panel izquierdo del rellenador: `<PdfViewer>` de `src/features/canvas/`.
  Proveer `pdfBytes` desde `useFillerStore`. Page navigation dentro del panel
  gestionada por `usePdfRenderer` local al componente `FillerLayout`.
- Pantalla de upload: Reutilizar `<PdfUploader>` de `src/features/pdf/`.
  Su callback `onPdfLoaded(bytes)` actualiza el store del rellenador.

**Rationale**: Reutilizar `PdfViewer` y `PdfUploader` evita duplicar código de
renderizado (>200 líneas) y de drag-and-drop. Cumple el Principio XXIX y YAGNI.

---

## 8. Preview en vivo — canvas overlay vs div overlay

### Hallazgo

**Problema con div overlay**: Un `<div>` con `position: absolute; inset: 0` sobre
el canvas tiene las mismas dimensiones CSS que el canvas. Los valores `left`, `top`,
`width`, `height` y `font-size` calculados en canvas pixels (e.g. `rect[0] * renderScale`)
NO coinciden con CSS pixels cuando el canvas está escalado por `max-width: 100%`.
Resultado: texto aparece en posición/tamaño incorrecto (más pequeño de lo esperado).

**Solución**: Segundo `<canvas>` con los mismos atributos `width`/`height` que el
canvas PDF, posicionado `absolute` dentro del mismo `.canvas-wrapper`. CSS aplica
`max-width: 100%` idénticamente a ambos canvases. Las posiciones dibujadas via
Canvas 2D API están en el mismo espacio de coordenadas — sin mismatch.

**Conversión de coordenadas PDF → canvas**:
- PDF usa origen bottom-left; canvas usa top-left → `canvasY = (pageHeight - rect[3]) * s`
- `canvasX = rect[0] * s`
- `canvasW = (rect[2] - rect[0]) * s`
- `canvasH = (rect[3] - rect[1]) * s`
- Donde `s = renderScale` (e.g. `1.5 * zoom`)

**Font size**:
- Si `field.fontSize > 0`: `field.fontSize * s` (PDF points → canvas pixels)
- Si `field.fontSize === 0` (auto-size): `canvasH * 0.80`

**Decision**: Canvas overlay dibujado en `useEffect` con deps `[values, fields,
currentPage, pageDimensions, renderScale]`. `ctx.clearRect` + re-draw en cada
cambio. Background `rgba(255,255,255,0.78)` para legibilidad sobre cualquier fondo PDF.

---

## 9. Font size en pdfjs v4 — defaultAppearanceData

### Hallazgo

**pdfjs-dist v4**: `annotation.defaultAppearance` (raw DA string) es `undefined`.
pdfjs v4 parsea el DA internamente y expone el objeto ya procesado:

```typescript
annotation.defaultAppearanceData = {
  fontSize: number,   // 0 si auto-size
  fontColor: Uint8ClampedArray(3),  // RGB
  fontName: string,   // e.g. "Helvetica"
}
```

**Problema con enfoque previo**: parsear la regex `/(\d+(?:\.\d+)?)\s+Tf/` sobre
`annotation.defaultAppearance` nunca funciona en pdfjs v4 porque ese campo es `undefined`.
El preview siempre usaba el fallback y mostraba tamaño incorrecto.

**Decision**: Usar `(annotation as any).defaultAppearanceData?.fontSize ?? 0` primero.
Mantener el fallback de regex en caso de PDFs cargados en versiones más antiguas de pdfjs.

**Rationale**: `defaultAppearanceData` ya está parseado y es el canal oficial en pdfjs v4.
La regex es un fallback defensivo de bajo costo.

---

## 10. ArrayBuffer detach en useFillerStore

### Hallazgo

`pdfjs.getDocument({ data: buffer })` transfiere el `ArrayBuffer` al worker via
`postMessage` con transferencia de ownership (Transferable). Esto **detacha** el buffer
del hilo principal — `buffer.byteLength === 0` después de la llamada.

Si `setPdfBytes(buffer)` se almacena ANTES y luego se transfiere a pdfjs, el estado
`pdfBytes` queda con un buffer detachado. Cuando `usePdfRenderer` intenta `pdfBytes.slice(0)`,
lanza `TypeError: Cannot perform ArrayBuffer.prototype.slice on a detached ArrayBuffer`.

**Decision**: `pdfjs.getDocument({ data: buffer.slice(0) })` — pasar una copia al worker.
El original `buffer` permanece válido en el estado del store.

**Rationale**: `buffer.slice(0)` es O(n) en tamaño del PDF — costo asumible para un
archivo de máximo 4 MB. Alternativa (pasar el original a pdfjs y almacenar una copia)
es equivalente en costo pero menos legible.

---

## 7. Estructura de `useFillerStore`

### Hallazgo

El store del rellenador necesita:
1. El `File` original (para su URL en `PdfViewer`)
2. Los campos detectados (`AcroFormField[]`)
3. Los valores del formulario (`Record<string, string>`)
4. Estado de carga (`idle | loading | ready | no-fields | generating | error`)

**Decision**: `useState` + callbacks en un custom hook `useFillerStore`. No se
necesita Zustand porque el store es local a `FillerMode` (un solo árbol de
componentes). Un `useReducer` con tipo union de acciones hace el estado más
predecible.

**Simplificación**: Para v1, `useState` directo con callbacks es suficiente.
La complejidad del estado no justifica un `useReducer` formal.

**Rationale**: Principio VI (YAGNI) — no usar Zustand si `useState` es suficiente.
Un hook personalizado aísla la lógica de estado y la hace testeable con
`renderHook`.
