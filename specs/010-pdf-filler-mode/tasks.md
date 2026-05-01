# Tasks: PDF Filler Mode — Formulario Dinámico y API Pública

**Input**: Design documents from `specs/010-pdf-filler-mode/`
**Branch**: `010-pdf-filler-mode`
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

**User Stories**:
- US1 (P1): Rellenar un PDF visualmente con formulario dinámico
- US2 (P1): API pública `POST /api/fill-pdf` para integración externa
- US3 (P2): Navegación entre modos Editor y Rellenador
- US4 (P2): PDF sin campos AcroForm — mensaje informativo

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story this task belongs to (US1–US4)
- **[P] + [Story]**: Both apply

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffolding mínimo que ambas US1 y US2 necesitan.

- [x] T001 Create `src/features/filler/types.ts` with `interface AcroFormField { name: string; type: 'text'; page: number }` and `export type FillerStatus = 'idle' | 'loading' | 'ready' | 'no-fields' | 'generating' | 'error'`
- [x] T002 [P] Create `src/features/filler/index.ts` as empty barrel (will be updated in T021)

**Checkpoint**: Estructura base de `src/features/filler/` en su lugar.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No hay dependencias cruzadas entre US1 y US2 — ambas pueden avanzar desde Phase 1.

> ℹ️ No hay tareas fundacionales bloqueantes. Las fases US1 y US2 son independientes entre sí y pueden implementarse en paralelo.

---

## Phase 3: User Story 2 — API pública POST /api/fill-pdf (Priority: P1) 🎯 MVP

**Goal**: Endpoint completamente funcional y consumible vía curl/fetch/axios. Testeable sin ninguna UI.

**Independent Test**: `curl -X POST http://localhost:3000/api/fill-pdf -F "file=@contrato.pdf" -F 'fields={"fullname":"Juan Pérez"}' --output filled.pdf` → descarga `filled.pdf` con campos rellenados y aplanados.

### Tests para US2

- [x] T003 [P] [US2] Create `tests/integration/fill-pdf/route.test.ts` with 5 tests (write first, verify they fail):
  - Test 1: POST PDF válido + campos existentes → 200, Content-Type `application/pdf`
  - Test 2: archivo no-PDF como `file` → 400 `{ error: 'INVALID_PDF' }`
  - Test 3: `fields=notjson` → 400 `{ error: 'INVALID_FIELDS' }`
  - Test 4: campo inexistente en JSON → 400 `{ error: 'FIELD_NOT_FOUND', field: 'nonexistent' }`
  - Test 5: `fields={}` → 200, PDF original aplanado

### Implementación de US2

- [x] T004 [P] [US2] Create `src/app/api/fill-pdf/fillService.ts`:
  - `class FieldNotFoundError extends Error { constructor(public readonly field: string) }`
  - `function isPdf(bytes: Uint8Array): boolean` — verifica bytes `0x25 0x50 0x44 0x46` (`%PDF`)
  - `async function fillPdf(fileBytes: Uint8Array, fields: Record<string, string>): Promise<Uint8Array>`:
    1. `PDFDocument.load(fileBytes)` — throw si falla (capturado como PROCESSING_ERROR)
    2. `form.getFields()` → `Set<string>` de nombres disponibles
    3. Para cada key en `fields`: si no está en el Set → `throw new FieldNotFoundError(key)`
    4. `form.getTextField(name).setText(value)` para cada campo
    5. `const helvetica = await pdfDoc.embedStandardFont(StandardFonts.Helvetica)`
    6. `form.updateFieldAppearances(helvetica)`
    7. `form.flatten()`
    8. `return pdfDoc.save()`

- [x] T005 [US2] Create `src/app/api/fill-pdf/route.ts` (depends T004):
  - `export async function POST(request: Request)`
  - `const formData = await request.formData()`
  - Get `file` (File) + `fields` (string); validar presencia
  - `new Uint8Array(await file.arrayBuffer())` → `isPdf()` → 400 INVALID_PDF
  - `JSON.parse(fieldsRaw)` en try/catch → 400 INVALID_FIELDS
  - `await fillPdf(bytes, fields)` → catch `FieldNotFoundError` → 400 FIELD_NOT_FOUND; catch general → 500 PROCESSING_ERROR
  - Respuesta 200: `new Response(result, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="filled.pdf"' } })`

- [x] T006 [P] [US2] Create `src/app/api/fill-pdf/README.md` with:
  - Descripción del endpoint
  - Tabla de parámetros (`file`, `fields`)
  - Tabla de respuestas (200, 400×3, 500) con cuerpos de error exactos
  - Ejemplo funcional curl, fetch y axios (copiados de `contracts/fill-pdf.md`)

**Checkpoint**: `npm test` — 5 tests de integración de US2 pasan. `curl` con PDF real → descarga `filled.pdf` aplanado.

---

## Phase 4: User Story 1 — Rellenar PDF visualmente (Priority: P1) 🎯 MVP

**Goal**: El usuario sube un PDF con campos AcroForm, ve un formulario dinámico, rellena valores y descarga el PDF generado.

**Independent Test**: Subir PDF con 3 campos AcroForm desde el Modo Rellenador → formulario muestra exactamente 3 inputs → completar valores → "Generar PDF" → descargar `filled.pdf` → abrir en visor → campos rellenados y no editables.

### Tests para US1

- [x] T007 [P] [US1] Create `tests/unit/filler/useFieldDetection.test.ts` (write first, verify fail):
  - Test 1: `detectAcroFormFields` con PDF de 3 campos → devuelve array con 3 entradas con nombres correctos
  - Test 2: `detectAcroFormFields` con PDF sin campos → devuelve `[]`
  - Test 3: Campo que aparece en 2 páginas → 1 entrada (deduplicación por `fieldName`)

### Implementación de US1

- [x] T008 [P] [US1] Create `src/features/filler/hooks/useFieldDetection.ts`:
  - Función exportada pura: `async function detectAcroFormFields(pdfDoc: PDFDocumentProxy): Promise<AcroFormField[]>`
    - Iterar páginas 1..`pdfDoc.numPages`
    - `await page.getAnnotations()` → filtrar `a.subtype === 'Widget' && a.fieldType === 'Tx'`
    - Deduplicar por `a.fieldName` usando `Set<string>` — registrar primera página
    - Devolver `AcroFormField[]` en orden de aparición
  - Hook: `function useFieldDetection(pdfBytes: Uint8Array | null): { fields: AcroFormField[], loading: boolean, error: string | null }`
    - `pdfjsLib.getDocument({ data: pdfBytes }).promise` → `detectAcroFormFields(doc)`
    - Reset al cambiar `pdfBytes`; cancelación via `cancelled` flag en cleanup del useEffect

- [x] T009 [US1] Create `src/features/filler/hooks/useFillerStore.ts` (depends T008):
  ```typescript
  function useFillerStore() {
    // useState: status, pdfBytes, pdfFile, fields, values, error
    // loadPdf(file: File): reads bytes, sets pdfBytes/pdfFile, triggers field detection
    //   → on fields found: status='ready'; on empty: status='no-fields'; on error: status='error'
    // setValue(name: string, value: string): updates values[name]
    // generatePdf(): Promise<void>
    //   → filter entries: Object.entries(values).filter(([,v]) => v !== '')
    //   → FormData con pdfFile + JSON.stringify(filteredFields)
    //   → fetch('/api/fill-pdf', { method: 'POST', body: formData })
    //   → 200: createObjectURL(blob) → <a>.click() → download
    //   → error: status='error' + error message
    // reset(): all state back to idle/null/empty
  }
  ```

- [x] T010 [P] [US1] Create `src/features/filler/components/FillerMode/FillerMode.tsx` and `FillerMode.module.css`:
  - Instancia `useFillerStore()`
  - Enruta por status:
    - `'idle' | 'loading' | 'error'` → render `<PdfUploadScreen>`
    - `'ready' | 'generating'` → render `<FillerLayout>`
    - `'no-fields'` → render mensaje informativo (US4 — ver T018)
  - `FillerMode.module.css`: `.filler-mode { display: flex; flex-direction: column; height: 100%; background: var(--color-surface) }`

- [x] T011 [P] [US1] Create `src/features/filler/components/PdfUploadScreen/PdfUploadScreen.tsx` and `PdfUploadScreen.module.css`:
  - Props: `onFileSelected(file: File): void`, `loading: boolean`, `error: string | null`
  - Reutiliza `<PdfUploader>` de `src/features/pdf/` con callback `onPdfLoaded` → llama `onFileSelected`
  - Muestra spinner/overlay cuando `loading === true`
  - Muestra alerta de error cuando `error !== null`
  - CSS: contenedor centrado, `background: var(--color-surface)`, texto `var(--color-text)`

- [x] T012 [US1] Create `src/features/filler/components/DynamicForm/DynamicForm.tsx` and `DynamicForm.module.css` (depends T009):
  - Props: `fields: AcroFormField[]`, `values: Record<string, string>`, `onValueChange(name, value): void`, `onSubmit(): void`, `generating: boolean`
  - Para cada `field`: `<label>` con `field.name` + `<Input>` de `src/components/ui/` con `value={values[field.name] ?? ''}` y `onChange`
  - Botón "Generar PDF" (`<Button>` de `src/components/ui/`): `disabled={generating}`, texto "Generando..." cuando `generating`
  - `overflow-y: auto` para PDFs con >50 campos
  - CSS: `var(--color-input-bg)` para inputs, `var(--color-text-muted)` para labels, `var(--color-text)` para valores

- [x] T013 [US1] Create `src/features/filler/components/FillerLayout/FillerLayout.tsx` and `FillerLayout.module.css` (depends T009, T012):
  - Props: recibe todo desde `useFillerStore()` pasado por FillerMode
  - Panel izquierdo: `<PdfViewer>` de `src/features/canvas/` con `pdfBytes={store.pdfBytes}`; incluye controles de página si multipage
  - Panel derecho: `<DynamicForm>` con props del store
  - Cabecera: botón "Subir otro PDF" que llama `store.reset()`
  - CSS: `display: flex; gap: var(--spacing-4)` — paneles `flex: 1`; panel izquierdo `min-width: 0`

- [x] T014 [US1] Update `src/features/filler/index.ts` barrel:
  ```typescript
  export { FillerMode } from './components/FillerMode/FillerMode';
  export type { AcroFormField } from './types';
  ```

**Checkpoint**: Abrir `http://localhost:3000` en modo rellenador → subir PDF con campos → formulario dinámico aparece → "Generar PDF" → `filled.pdf` descargado con valores y aplanado.

---

## Phase 5: User Story 4 — PDF sin campos AcroForm (Priority: P2)

**Goal**: El usuario sube un PDF sin campos y ve un mensaje informativo claro en lugar de un formulario vacío. Botón "Generar PDF" no disponible.

**Independent Test**: Subir PDF sin campos AcroForm → mensaje "Este PDF no contiene campos rellenables" visible → botón "Generar PDF" ausente/deshabilitado.

### Implementación de US4

- [x] T015 [US4] Add `'no-fields'` status branch to `src/features/filler/components/FillerMode/FillerMode.tsx` (depends T010):
  - Cuando `status === 'no-fields'`: render `<div className={styles['no-fields-msg']}>` con mensaje:
    "Este PDF no contiene campos rellenables. Sube un PDF con campos AcroForm."
  - Incluir botón "Subir otro PDF" que llama `store.reset()` → vuelve a `idle`
  - Sin botón "Generar PDF" ni formulario

- [x] T016 [US4] Add `.no-fields-msg` styles to `src/features/filler/components/FillerMode/FillerMode.module.css` (depends T015):
  - Centrado vertical y horizontal
  - `color: var(--color-text-muted)`, `background: var(--color-surface)`
  - Compatible dark mode (tokens únicamente)

**Checkpoint**: PDF sin campos → mensaje visible, sin formulario, sin botón generar. Botón "Subir otro PDF" regresa a pantalla de upload.

---

## Phase 6: User Story 3 — Navegación Editor ↔ Rellenador (Priority: P2)

**Goal**: Navbar con dos opciones de modo claramente diferenciadas. Cambio instantáneo sin recarga. Estado del editor preservado al volver.

**Independent Test**: Clic "Rellenar PDF" → vista cambia instantáneamente. Clic "Editor de plantilla" → editor restaurado con PDF y campos previos intactos. Modo activo visualmente distinguido.

### Implementación de US3

- [x] T017 [P] [US3] Add `AppMode` type and `mode` state to `src/App.tsx` (depends T014 — FillerMode exported):
  ```typescript
  type AppMode = 'editor' | 'filler';
  const [mode, setMode] = useState<AppMode>('editor');
  ```
  Import `FillerMode` from `@/features/filler`.

- [x] T018 [P] [US3] Add mode selector nav to navbar JSX in `src/App.tsx` (depends T017):
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

- [x] T019 [P] [US3] Add `.mode-nav`, `.mode-btn`, `.mode-btn--active` to `src/App.module.css` (depends T017):
  - `.mode-nav`: `display: flex; gap: var(--spacing-2); align-items: center`
  - `.mode-btn`: `background: transparent; border: none; color: var(--color-navbar-text, #fff); cursor: pointer; padding: var(--spacing-1) var(--spacing-3); border-radius: var(--radius-sm)`
  - `.mode-btn--active`: `border-bottom: 2px solid var(--color-accent); font-weight: 600`
  - Hover state: `background: var(--color-primary-hover, rgba(255,255,255,0.1))`
  - Sin colores hex hardcodeados — todo vía tokens

- [x] T020 [US3] Add conditional body rendering to `src/App.tsx` (depends T017, T018):
  ```tsx
  {mode === 'filler' ? (
    <FillerMode />
  ) : (
    /* existing editor layout — unchanged */
  )}
  ```
  El editor layout existente permanece intacto; `pdfBytes`, `useFieldStore`, `usePdfRenderer` están en App.tsx y no se ven afectados por el cambio de modo.

**Checkpoint**: Clic "Rellenar PDF" → FillerMode visible, "Rellenar PDF" subrayado/activo. Clic "Editor de plantilla" → editor con estado previo intacto, "Editor de plantilla" activo.

---

## Phase 7: Polish & Validación Final

**Purpose**: Calidad transversal — typecheck, tests, build, dark mode, validación manual completa.

- [x] T021 [P] Run `npm run typecheck` — resolve all TypeScript errors in new files; verify `src/app/api/fill-pdf/route.ts`, `fillService.ts`, and all filler components have no type errors
- [ ] T022 Run `npm test` — verify all pre-existing tests still pass AND new unit/integration tests pass (useFieldDetection × 3, fill-pdf route × 5)
- [ ] T023 Run `npm run build` — confirm Next.js production build completes without errors or warnings
- [ ] T024 Run quickstart.md validation 1 (navegación modos) — manual verification
- [ ] T025 Run quickstart.md validation 2 (upload PDF con campos) — manual verification
- [ ] T026 Run quickstart.md validation 3 (generar PDF rellenado) — manual verification
- [ ] T027 Run quickstart.md validation 4 (PDF sin campos) — manual verification
- [ ] T028 Run quickstart.md validation 5 (API curl — 5 casos) — manual verification
- [ ] T029 Run quickstart.md validation 6 (dark mode en todos los componentes nuevos) — manual verification

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias — empezar inmediatamente.
- **US2 (Phase 3)**: Depende de Phase 1. **Completamente independiente de US1.** Testeable solo con curl.
- **US1 (Phase 4)**: Depende de Phase 1. Independiente de US2 para la build; necesita US2 funcionando para el test E2E de "Generar PDF".
- **US4 (Phase 5)**: Depende de T010 (FillerMode.tsx creado).
- **US3 (Phase 6)**: Depende de T014 (FillerMode exportado en index.ts).
- **Polish (Phase 7)**: Depende de todas las fases anteriores.

### User Story Dependencies

| Story | Depende de | Bloquea |
|-------|-----------|---------|
| US2 (Phase 3) | Setup | Nada (independiente) |
| US1 (Phase 4) | Setup | US3, US4 |
| US4 (Phase 5) | US1 T010 | US3 (no — US3 solo necesita FillerMode exportado) |
| US3 (Phase 6) | US1 T014 | — |

### Within Each Phase

- US2: T003 (tests) y T004 (fillService) en paralelo → T005 depende de T004 → T006 es independiente
- US1: T007 (tests) y T008 (detection hook) en paralelo → T009 depende de T008 → T010 y T011 en paralelo → T012 y T013 dependen de T009

---

## Parallel Example: US2 (API)

```
Parallel start:
  Task T003: tests/integration/fill-pdf/route.test.ts (5 tests, TDD)
  Task T004: src/app/api/fill-pdf/fillService.ts
  Task T006: src/app/api/fill-pdf/README.md

Sequential after T004:
  Task T005: src/app/api/fill-pdf/route.ts  (depends fillService)
```

## Parallel Example: US1 (Visual Form)

```
Parallel start:
  Task T007: tests/unit/filler/useFieldDetection.test.ts (TDD)
  Task T008: src/features/filler/hooks/useFieldDetection.ts
  Task T010: src/features/filler/components/FillerMode/ (shell)
  Task T011: src/features/filler/components/PdfUploadScreen/

Sequential after T008:
  Task T009: src/features/filler/hooks/useFillerStore.ts

Sequential after T009:
  Task T012: src/features/filler/components/DynamicForm/
  Task T013: src/features/filler/components/FillerLayout/

Sequential after T013:
  Task T014: src/features/filler/index.ts (barrel update)
```

---

## Implementation Strategy

### MVP First — US2 + US1 completo (ambos P1)

1. Phase 1: Setup (T001–T002)
2. Phase 3: US2 API (T003–T006) → **Validar con curl**
3. Phase 4: US1 Visual (T007–T014) → **Validar E2E en browser**
4. **STOP y DEMO**: Las dos P1 user stories están completas. El modo rellenador funciona.

### Incremental Delivery

1. Setup + US2 → endpoint funcional → integrable con sistemas externos (curl)
2. + US1 → UI visual completa → relleno en browser
3. + US4 → mensaje para PDFs sin campos (UX mejorada)
4. + US3 → navegación entre modos (producto completo)
5. + Polish → calidad lista para merge

### Solo US2 como prueba de concepto

Solo implementar Phases 1 + 3 (T001–T006). El endpoint queda publicado y consumible programáticamente. La UI se implementa después.

---

## Notes

- **Total de tareas**: 29 (T001–T029)
- **US2**: T003–T006 (4 tareas de implementación + 1 test)
- **US1**: T007–T014 (7 tareas de implementación + 1 test)
- **US4**: T015–T016 (2 tareas — extensión de FillerMode)
- **US3**: T017–T020 (4 tareas — App.tsx wiring)
- **Polish**: T021–T029 (9 validaciones)
- Todas las tareas con [P] son ejecutables en paralelo dentro de su fase
- Commits sugeridos: tras cada checkpoint (fin de fase US)
- Modo oscuro: validar en T029 — cada componente nuevo usa exclusivamente tokens de `tokens.css`
