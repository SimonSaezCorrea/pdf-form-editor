# Implementation Plan: 009-precision-ux-fixes

**Branch**: `009-precision-ux-fixes` | **Date**: 2026-04-11
**Spec**: [spec.md](spec.md)

## Summary

Cinco correcciones independientes de bugs y usabilidad en el editor de campos PDF:
1. Botón ✕ recortado → cambiar `overflow: hidden → visible` en `.draggable-field`.
2. Coordenadas decimales → eliminar `Math.round()` en PropertiesPanel, step a 0.5.
3. Google Fonts → crear `fonts.ts`, añadir `displayFont?` a FormField, lazy loading.
4. Scroll page navigation → `onScroll` handler en `viewer-area` ref en App.tsx.
5. Ctrl+Scroll zoom → listener `wheel` nativo no-pasivo en `viewerAreaRef`.

---

## Technical Context

**Language/Version**: TypeScript 5.7 + React 18
**Primary Dependencies**: Next.js 15 (App Router), @dnd-kit/core, pdfjs-dist, pdf-lib
**Storage**: N/A (session-only state per Principio III)
**Testing**: Vitest + @testing-library/react
**Target Platform**: Web browser (Vercel / local next dev)
**Project Type**: Web application
**Performance Goals**: Lazy font loading — carga inicial no se incrementa
**Constraints**: Sin nuevas dependencias npm. Google Fonts vía CDN.
**Scale/Scope**: 6 archivos modificados, 2 archivos nuevos.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Check | Estado |
|-----------|-------|--------|
| I. Client/Server Separation | Cambios client-side; `isValidField` en route.ts acepta `displayFont?` | ✅ |
| II. Shared-Types Contract | `displayFont?: string` añadido a `FormField` en `shared.ts` | ✅ |
| III. Session-Only State | Sin nueva persistencia — `displayFont` en estado de sesión | ✅ |
| IV. AcroForm Standard Output | `displayFont` NO usada en pdf-lib; PDF export sigue con `field.font: FontFamily` | ✅ |
| V. TypeScript Strict | Todos los tipos explícitos | ✅ |
| VI. YAGNI | `loadGoogleFont()` — una función, múltiples call sites | ✅ |
| VII. Test Discipline | Sin funciones puras nuevas con lógica testeable independiente | ✅ |
| XI. CSS per Component | Cambio de una propiedad en módulo CSS existente | ✅ |
| XIV. Feature Architecture | `fonts.ts` en `src/features/pdf/config/` | ✅ |
| XXIV. Coordinate Decimal Precision | Fix directo de violación: eliminar Math.round, step 0.5 | ✅ |
| XXV. Canvas Zoom via Ctrl+Scroll | Implementación directa del principio | ✅ |
| XXVI. Scroll-Based Page Navigation | Implementación directa del principio | ✅ |
| XXVII. Google Fonts as Typography Source | Implementación directa del principio | ✅ |

**Resultado**: Sin violaciones. Gates pasan.

---

## Project Structure

### Documentation (this feature)

```text
specs/009-precision-ux-fixes/
├── plan.md         ← este archivo
├── spec.md
├── research.md
├── data-model.md
├── quickstart.md
└── checklists/
    └── requirements.md
```

### Source Code — archivos afectados

```text
src/
├── types/
│   └── shared.ts                                    # +displayFont?: string en FormField
├── features/
│   ├── pdf/
│   │   └── config/                                  # NUEVA subcarpeta
│   │       └── fonts.ts                             # NUEVO — FONT_CATALOG, FontEntry, loadGoogleFont
│   └── fields/
│       └── components/
│           ├── FieldOverlay/
│           │   ├── DraggableField.tsx               # +displayFont en fontFamily inline style
│           │   └── DraggableField.module.css        # overflow: hidden -> visible
│           └── PropertiesPanel/
│               └── PropertiesPanel.tsx              # step 0.5, sin Math.round, selector fonts
└── app/
    ├── api/
    │   └── generate-pdf/
    │       └── route.ts                             # isValidField acepta displayFont?
    └── App.tsx                                      # viewerAreaRef, onScroll, useEffect wheel
```

**Structure Decision**: Single Next.js project. Sin nuevos archivos de test.

---

## Complexity Tracking

> Sin violaciones de constitución.

---

## Phase 1: Setup

- [x] T001 Branch `009-precision-ux-fixes` creado y spec.md escrito
- [x] T002 research.md completado
- [x] T003 data-model.md y quickstart.md generados

---

## Phase 2: BF-009-01 — Botón ✕ sin recorte

**Goal**: `.draggable-field` deja de recortar el botón de eliminar.

**Archivo**: `src/features/fields/components/FieldOverlay/DraggableField.module.css`

- [ ] T004 [BF1] Cambiar `overflow: hidden` → `overflow: visible` en `.draggable-field`
- [ ] T005 [BF1] Verificar visualmente (quickstart.md Validación 1)

**Checkpoint**: Campo en borde superior/izquierdo → botón ✕ completamente visible.

---

## Phase 3: BF-009-02 — Coordenadas Decimales

**Goal**: PropertiesPanel acepta y muestra floats con step 0.5.

**Archivo**: `src/features/fields/components/PropertiesPanel/PropertiesPanel.tsx`

- [ ] T006 [BF2] En los 4 inputs (x, y, width, height):
  - Cambiar `step={1}` → `step={0.5}`
  - Reemplazar `String(Math.round(field.x))` → `String(parseFloat(field.x.toFixed(2)))`
  - Aplicar mismo patrón a y, width, height
- [ ] T007 [BF2] Verificar con quickstart.md Validación 2

**Checkpoint**: Drag → panel muestra decimales. Input x=110.5 → campo en 110.5.

---

## Phase 4: FR-009-03 — Google Fonts

**Goal**: Selector con ≥20 fuentes agrupadas, lazy loading desde Google Fonts API.

- [ ] T008 [P] [GF] Crear `src/features/pdf/config/fonts.ts`:
  - Interface `FontEntry { name, googleFamily, category, pdfFallback }`
  - Type `FontCategory`
  - Constante `FONT_CATALOG: FontEntry[]` con 20 fuentes (ver data-model.md)
  - Función `getFontsByCategory(category): FontEntry[]`
  - Función `loadGoogleFont(googleFamily: string): void` — inyecta `<link>` si no existe

- [ ] T009 [P] [GF] Añadir `displayFont?: string` a `FormField` en `src/types/shared.ts`

- [ ] T010 [GF] Actualizar `isValidField` en `src/app/api/generate-pdf/route.ts`
  (depende T009): aceptar `displayFont === undefined`

- [ ] T011 [GF] Actualizar `PropertiesPanel.tsx` (depende T008, T009):
  - Selector de `displayFont` con `<optgroup>` por categoría
  - `onChange` llama `loadGoogleFont()` + `onUpdate({ displayFont })`
  - Aplica a single-field y multi-selection

- [ ] T012 [P] [GF] Actualizar `DraggableField.tsx` (depende T009):
  - `fontFamily: field.displayFont ?? field.font`

- [ ] T013 [GF] Verificar con quickstart.md Validación 3 (depende T011, T012)

**Checkpoint**: ≥20 fuentes en 5 grupos. Montserrat → texto cambia. 1 petición por
fuente nueva, 0 en reselección.

---

## Phase 5: FR-009-04 — Scroll Page Navigation

**Goal**: Scroll continuo al límite inferior/superior cambia de página.

**Archivo**: `src/App.tsx`

- [ ] T014 [SPN] Añadir `viewerAreaRef = useRef<HTMLElement>(null)`
- [ ] T015 [SPN] Asignar `ref={viewerAreaRef}` al `<main className={styles['viewer-area']}>`
- [ ] T016 [SPN] Implementar `handleViewerScroll`:
  ```
  const el = e.currentTarget;
  if (pdfRenderer.totalPages <= 1) return;
  if (el.scrollTop === 0 && pdfRenderer.currentPage > 1) {
    pdfRenderer.setCurrentPage(pdfRenderer.currentPage - 1);
    requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
  } else if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1
             && pdfRenderer.currentPage < pdfRenderer.totalPages) {
    pdfRenderer.setCurrentPage(pdfRenderer.currentPage + 1);
    requestAnimationFrame(() => { el.scrollTop = 0; });
  }
  ```
- [ ] T017 [SPN] Añadir `onScroll={handleViewerScroll}` al `<main>`
- [ ] T018 [SPN] Verificar con quickstart.md Validación 4

**Checkpoint**: PDF 2+ páginas. Scroll al fondo → avanza. Scroll al tope → retrocede.
PDF 1 página → sin cambio.

---

## Phase 6: FR-009-05 — Ctrl+Scroll Zoom

**Goal**: Ctrl+Scroll interceptado; canvas hace zoom; navegador no.

**Archivo**: `src/App.tsx` (usa `viewerAreaRef` de Phase 5)

- [ ] T019 [CSZ] Añadir `useEffect` (depende T014, T015):
  ```typescript
  useEffect(() => {
    const el = viewerAreaRef.current;
    if (!el || !pdfBytes) return;
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      e.deltaY < 0 ? zoomIn() : zoomOut();
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [pdfBytes, zoomIn, zoomOut]);
  ```
  Nota: envolver `zoomIn`/`zoomOut` con `useCallback` si no están memoizadas.
- [ ] T020 [CSZ] Verificar con quickstart.md Validación 5

**Checkpoint**: Ctrl+Scroll canvas → zoom cambia, navegador no zooma.

---

## Phase 7: Validación Final

- [ ] T021 `npm run typecheck` — sin errores
- [ ] T022 `npm test` — sin regresiones
- [ ] T023 `npm run build` — build exitoso
- [ ] T024 quickstart.md completo — todas las validaciones pasan
- [ ] T025 Verificar modo oscuro en áreas afectadas

---

## Dependencies & Execution Order

- **Phases 2, 3, 5**: Independientes entre sí — pueden ejecutarse en paralelo.
- **Phase 4**: T008 y T009 en paralelo; T010/T011/T012 dependen de T009.
- **Phase 6**: Depende de Phase 5 (comparte `viewerAreaRef`).
- **Phase 7**: Depende de todas las fases.
