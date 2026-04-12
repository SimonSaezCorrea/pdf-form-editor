# Implementation Plan: 010-pdf-filler-mode

**Branch**: `010-pdf-filler-mode` | **Date**: 2026-04-12
**Spec**: [spec.md](spec.md)

## Summary

Nuevo modo de operación "Rellenador" que permite subir un PDF con campos AcroForm,
detectarlos automáticamente en el cliente (pdfjs-dist), presentar un formulario
dinámico por campo, y generar un PDF rellenado y aplanado via `POST /api/fill-pdf`.
El endpoint es público, stateless, y también sirve para integración programática
externa (curl, fetch, axios). Navegación navbar entre Editor ↔ Rellenador sin
recarga de página.

---

## Technical Context

**Language/Version**: TypeScript 5.7 + React 18  
**Primary Dependencies**: Next.js 15 (App Router), pdfjs-dist (client), pdf-lib (API route)  
**Storage**: N/A — estado efímero en FillerMode (session only, Principio III)  
**Testing**: Vitest + @testing-library/react (unit) + fetch nativo (integración)  
**Target Platform**: Web browser (Vercel / local next dev)  
**Project Type**: Web application (Next.js fullstack, Principio IX)  
**Performance Goals**: Detección de campos < 2s para PDFs hasta 4 MB; UI transition < 200ms  
**Constraints**: Sin nuevas dependencias npm. Tamaño máximo de PDF: 4 MB (límite Next.js por defecto).  
**Scale/Scope**: ~12 archivos nuevos, 2 archivos modificados (App.tsx, App.module.css).

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Check | Estado |
|-----------|-------|--------|
| I. Client/Server Separation | Detección de campos: pdfjs en cliente; relleno PDF: pdf-lib en API route `src/app/api/fill-pdf/route.ts` | ✅ |
| II. Shared-Types Contract | No hay nuevos tipos en `shared.ts` — `AcroFormField` es client-only; FillRequest/Response cruzan como multipart/blob | ✅ |
| III. Session-Only State | `useFillerStore` es `useState` local en `FillerMode`; se resetea al desmontar | ✅ |
| VI. YAGNI | `useFillerStore` usa `useState` (no Zustand); `PdfUploader` y `PdfViewer` reutilizados sin duplicación | ✅ |
| VII. Test Discipline | `useFieldDetection` (lógica pura de detección) → unit tests; `POST /api/fill-pdf` → 5 integration tests (US2 acceptance scenarios) | ✅ |
| VIII. No Authentication | Endpoint sin auth — herramienta internal/trusted (Principio VIII) | ✅ |
| X. API Routes as Backend | `src/app/api/fill-pdf/route.ts`; pdf-lib solo en API route | ✅ |
| XI. CSS per Component | Cada componente nuevo tiene su `.module.css` colocado | ✅ |
| XII. Design Tokens | Todos los estilos referencian tokens de `tokens.css` | ✅ |
| XIII. Reusable Base Components | Reutiliza `<PdfUploader>` de `src/features/pdf/` y `<PdfViewer>` de `src/features/canvas/` | ✅ |
| XIV. Feature Architecture | `src/features/filler/` — feature self-contained | ✅ |
| XXIII. Mandatory Dark Mode | Todos los componentes nuevos usan tokens CSS; sin colores hardcodeados | ✅ |
| XXIX. Dos Modos de Operación | `src/features/filler/` independiente; sin imports desde `fields/` ni `templates/`; comparte `PdfViewer` y `usePdfRenderer` | ✅ |
| XXX. API Pública fill-pdf | Implementación directa del principio: `POST /api/fill-pdf` + `README.md` | ✅ |
| XXXI. Aplanado de Formularios | `fillService.ts`: orden `setText → updateFieldAppearances → flatten → save` | ✅ |

**Resultado**: Sin violaciones. Gates pasan.

---

## Project Structure

### Documentation (this feature)

```text
specs/010-pdf-filler-mode/
├── plan.md              ← este archivo
├── spec.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── fill-pdf.md
└── checklists/
    └── requirements.md
```

### Source Code — archivos nuevos y modificados

```text
src/
├── features/
│   └── filler/                                     # NUEVA feature
│       ├── index.ts                                # barrel
│       ├── types.ts                                # AcroFormField interface
│       ├── hooks/
│       │   ├── useFillerStore.ts                   # estado del modo rellenador
│       │   └── useFieldDetection.ts                # detección pdfjs → AcroFormField[]
│       └── components/
│           ├── FillerMode/
│           │   ├── FillerMode.tsx                  # root: decide pantalla según status
│           │   └── FillerMode.module.css
│           ├── PdfUploadScreen/
│           │   ├── PdfUploadScreen.tsx             # pantalla inicial (reutiliza PdfUploader)
│           │   └── PdfUploadScreen.module.css
│           ├── FillerLayout/
│           │   ├── FillerLayout.tsx                # dos paneles: PdfViewer + DynamicForm
│           │   └── FillerLayout.module.css
│           └── DynamicForm/
│               ├── DynamicForm.tsx                 # form con inputs + botón Generar PDF
│               └── DynamicForm.module.css
└── app/
    └── api/
        └── fill-pdf/                               # NUEVO endpoint
            ├── route.ts                            # POST handler, validaciones, respuestas
            ├── fillService.ts                      # fillPdf(), FieldNotFoundError
            └── README.md                           # ejemplos curl/fetch/axios (FR-019)

# Modificados:
src/App.tsx                   # + mode: AppMode state; navbar con selector de modo
src/App.module.css            # + estilos del modo selector (active indicator)

# Tests nuevos:
tests/unit/filler/
└── useFieldDetection.test.ts
tests/integration/fill-pdf/
└── route.test.ts
```

**Structure Decision**: Single Next.js project. La feature `filler/` es autónoma.
Los tests nuevos siguen la estructura `tests/unit/` y `tests/integration/` existentes.

---

## Complexity Tracking

> Sin violaciones de constitución.

---

## Phase 0: Setup

- [x] T001 Branch `010-pdf-filler-mode` creado
- [x] T002 `research.md` completado
- [x] T003 `data-model.md`, `contracts/fill-pdf.md` y `quickstart.md` generados

---

## Phase 1: API endpoint POST /api/fill-pdf

**Goal**: Endpoint completamente funcional y testeable independientemente de la UI.

**Archivos**: `src/app/api/fill-pdf/route.ts`, `fillService.ts`, `README.md`

- [ ] T004 Crear `src/app/api/fill-pdf/fillService.ts`:
  - `class FieldNotFoundError extends Error { field: string }`
  - `function isPdf(bytes: Uint8Array): boolean` — verifica cabecera `%PDF-`
  - `async function fillPdf(fileBytes: Uint8Array, fields: Record<string, string>): Promise<Uint8Array>`:
    1. `PDFDocument.load(fileBytes)` → envolver en try/catch → `PROCESSING_ERROR`
    2. `form.getFields()` → construir `Set<string>` de nombres disponibles
    3. Para cada key de `fields`: verificar existencia → throw `FieldNotFoundError` si falta
    4. `form.getTextField(name).setText(value)` para cada campo no vacío
    5. `const helvetica = await pdfDoc.embedStandardFont(StandardFonts.Helvetica)`
    6. `form.updateFieldAppearances(helvetica)`
    7. `form.flatten()`
    8. `return pdfDoc.save()`

- [ ] T005 Crear `src/app/api/fill-pdf/route.ts`:
  - `export async function POST(request: Request)`
  - `request.formData()` → get `file` y `fields`
  - Validar `file` con `isPdf()` → 400 `INVALID_PDF`
  - Parsear `fields` con `JSON.parse()` en try/catch → 400 `INVALID_FIELDS`
  - Llamar `fillPdf()` → catch `FieldNotFoundError` → 400 `FIELD_NOT_FOUND`
  - Catch general → 500 `PROCESSING_ERROR`
  - Respuesta 200: `new Response(pdfBytes, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="filled.pdf"' } })`

- [ ] T006 Crear `src/app/api/fill-pdf/README.md` con:
  - Descripción del endpoint
  - Tabla de parámetros (file, fields)
  - Tabla de respuestas (200, 400×3, 500)
  - Ejemplos funcionales de curl, fetch y axios (FR-019)

- [ ] T007 Crear `tests/integration/fill-pdf/route.test.ts`:
  - Test 1: PDF válido + campos válidos → 200, Content-Type application/pdf
  - Test 2: Archivo no-PDF → 400, `{ error: 'INVALID_PDF' }`
  - Test 3: JSON inválido en fields → 400, `{ error: 'INVALID_FIELDS' }`
  - Test 4: Campo inexistente → 400, `{ error: 'FIELD_NOT_FOUND', field: '...' }`
  - Test 5: fields={} → 200, PDF aplanado

- [ ] T008 `npm run typecheck` + `npm test` — Phase 1 limpia

**Checkpoint**: `curl` con PDF de prueba → descarga `filled.pdf` con valores y aplanado.

---

## Phase 2: Detección de campos en el cliente (pdfjs)

**Goal**: Hook que dado `Uint8Array` de un PDF devuelve `AcroFormField[]`.

**Archivos**: `src/features/filler/types.ts`, `src/features/filler/hooks/useFieldDetection.ts`

- [ ] T009 Crear `src/features/filler/types.ts`:
  ```typescript
  export interface AcroFormField {
    name: string;
    type: 'text';
    page: number;
  }
  ```

- [ ] T010 Crear `src/features/filler/hooks/useFieldDetection.ts`:
  - Función pura `detectAcroFormFields(pdfDoc: PDFDocumentProxy): Promise<AcroFormField[]>`:
    - Iterar páginas 1..numPages con `pdfDoc.getPage(n)`
    - Por cada página: `await page.getAnnotations()`
    - Filtrar `a.subtype === 'Widget' && a.fieldType === 'Tx'`
    - Deduplicar por `fieldName` usando `Set<string>`
    - Devolver array de `AcroFormField` (preservar orden del primer encuentro)
  - Hook `useFieldDetection`: acepta `pdfBytes: Uint8Array | null`, carga con
    `pdfjsLib.getDocument()`, llama `detectAcroFormFields`, devuelve
    `{ fields: AcroFormField[], loading: boolean, error: string | null }`

- [ ] T011 Crear `tests/unit/filler/useFieldDetection.test.ts`:
  - Test: `detectAcroFormFields` con PDF de 3 campos → devuelve 3 entradas
  - Test: `detectAcroFormFields` con PDF sin campos → devuelve `[]`
  - Test: Deduplicación de campo que aparece en 2 páginas → 1 entrada

**Checkpoint**: `npm test` — tests de detección de campos pasan.

---

## Phase 3: Store del Modo Rellenador

**Goal**: Hook con estado completo del rellenador — listo para conectar a la UI.

**Archivo**: `src/features/filler/hooks/useFillerStore.ts`

- [ ] T012 Crear `src/features/filler/hooks/useFillerStore.ts`:
  ```typescript
  // Estados: 'idle' | 'loading' | 'ready' | 'no-fields' | 'generating' | 'error'
  function useFillerStore() {
    // useState para: status, pdfBytes, pdfFile, fields, values, error
    // loadPdf(file: File): void  — lee bytes, inicia detección, actualiza status
    // setValue(name, value): void — actualiza values[name]
    // generatePdf(): Promise<void> — POST /api/fill-pdf, descarga automática
    // reset(): void — vuelve a idle
  }
  ```
  - `generatePdf()`: filtra `values` excluyendo strings vacías (FR-009);
    usa `FormData` + `fetch('/api/fill-pdf')`; en 200, crea `<a>` con
    `URL.createObjectURL(blob)` y hace clic programático para descargar.

**Checkpoint**: Hook funciona en aislamiento con `renderHook`.

---

## Phase 4: Componentes UI del Modo Rellenador

**Goal**: UI completa del modo rellenador, dark-mode compatible desde el inicio.

**Nota**: Todos los colores DEBEN usar tokens de `tokens.css`. Sin hex hardcodeados.

### FillerMode.tsx (root — T013)

- [ ] T013 Crear `src/features/filler/components/FillerMode/`:
  - `FillerMode.tsx`: instancia `useFillerStore()`, enruta por status:
    - `idle | loading | error` → `<PdfUploadScreen>`
    - `ready` → `<FillerLayout>`
    - `no-fields` → mensaje inline + botón para subir otro PDF
  - `FillerMode.module.css`: layout full-height

### PdfUploadScreen.tsx (T014)

- [ ] T014 Crear `src/features/filler/components/PdfUploadScreen/`:
  - Reutiliza `<PdfUploader>` de `src/features/pdf/` — callback `onPdfLoaded`
    llama `store.loadPdf(file)`
  - Muestra spinner durante status `'loading'`
  - Muestra mensaje de error si status `'error'`
  - CSS: fondo `var(--color-surface)`, texto `var(--color-text)`

### FillerLayout.tsx (T015)

- [ ] T015 Crear `src/features/filler/components/FillerLayout/`:
  - Dos paneles flexbox side-by-side
  - **Panel izquierdo**: `<PdfViewer>` de `src/features/canvas/` con
    `pdfBytes={store.pdfBytes}` — navigation entre páginas si hay varias
  - **Panel derecho**: `<DynamicForm>` con los datos del store
  - Botón "Subir otro PDF" que llama `store.reset()` visible en la cabecera
  - CSS: `display: flex; gap: var(--spacing-4)` — paneles `flex: 1`

### DynamicForm.tsx (T016)

- [ ] T016 Crear `src/features/filler/components/DynamicForm/`:
  - Props: `fields: AcroFormField[]`, `values: Record<string, string>`,
    `onValueChange(name, value): void`, `onSubmit(): void`, `generating: boolean`
  - Un `<label>` + `<input type="text">` por campo (usando `<Input>` de
    `src/components/ui/`)
  - Botón "Generar PDF" (usando `<Button>` de `src/components/ui/`):
    - `disabled={generating}`
    - Texto: "Generando..." mientras `generating`
  - Formulario desplazable si hay >50 campos (CSS `overflow-y: auto`)
  - CSS: inputs `var(--color-input-bg)`, labels `var(--color-text-muted)`

- [ ] T017 Crear barrel `src/features/filler/index.ts`:
  ```typescript
  export { FillerMode } from './components/FillerMode/FillerMode';
  ```

**Checkpoint**: `<FillerMode />` funciona con PDF de prueba — formulario muestra
campos, Generar PDF descarga `filled.pdf`.

---

## Phase 5: Navegación en App.tsx

**Goal**: Navbar con dos modos, transición instantánea, estado del editor preservado.

**Archivos**: `src/App.tsx`, `src/App.module.css`

- [ ] T018 Añadir `type AppMode = 'editor' | 'filler'` y
  `const [mode, setMode] = useState<AppMode>('editor')` en `App.tsx`.

- [ ] T019 Añadir botones de modo al navbar en `App.tsx`:
  ```tsx
  <nav className={styles['mode-nav']}>
    <button
      className={`${styles['mode-btn']} ${mode === 'editor' ? styles['mode-btn--active'] : ''}`}
      onClick={() => setMode('editor')}
    >
      Editor de plantilla
    </button>
    <button
      className={`${styles['mode-btn']} ${mode === 'filler' ? styles['mode-btn--active'] : ''}`}
      onClick={() => setMode('filler')}
    >
      Rellenar PDF
    </button>
  </nav>
  ```

- [ ] T020 Añadir renderizado condicional en `App.tsx`:
  ```tsx
  {mode === 'filler' ? (
    <FillerMode />
  ) : (
    /* layout del editor existente — sin cambios */
  )}
  ```

- [ ] T021 Añadir estilos en `App.module.css`:
  - `.mode-nav`: flex row, gap, alineado en navbar
  - `.mode-btn`: sin borde, background `transparent`, color `var(--color-text)`
    (sobre navbar oscuro: `var(--color-navbar-fg, #fff)`)
  - `.mode-btn--active`: indicador visual — ej: `border-bottom: 2px solid var(--color-accent)`
    o `background: var(--color-primary)`; sin hardcodear colores

**Checkpoint**: Click "Rellenar PDF" → vista cambia. Click "Editor de plantilla" →
vuelve con estado previo intacto. Indicador visual correcto en ambos modos.

---

## Phase 6: Validación Final

- [ ] T022 `npm run typecheck` — sin errores TypeScript
- [ ] T023 `npm test` — sin regresiones en tests existentes; nuevos tests pasan
- [ ] T024 `npm run build` — build Next.js completo sin warnings
- [ ] T025 Validación manual completa (quickstart.md validaciones 1-6)
- [ ] T026 Verificar dark mode en todos los componentes nuevos

---

## Dependencies & Execution Order

- **Phase 1** (API): Independiente de la UI — puede implementarse y testearse
  antes de cualquier componente.
- **Phase 2** (detección): Independiente de Phase 1; necesaria para Phase 3.
- **Phase 3** (store): Depende de Phase 2 (`useFieldDetection`).
- **Phase 4** (UI): Depende de Phase 3 (store) y Phase 1 (endpoint).
- **Phase 5** (nav): Depende de Phase 4 (FillerMode exportado).
- **Phase 6** (validación): Depende de todas las fases.

**Orden recomendado**: Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6.
Phases 1 y 2 pueden desarrollarse en paralelo si hay dos sesiones disponibles.
