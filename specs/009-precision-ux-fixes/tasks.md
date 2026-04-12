---
description: "Task list for 009-precision-ux-fixes"
---

# Tasks: Bugfixes y Mejoras de Precisión y Usabilidad

**Input**: Design documents from `/specs/009-precision-ux-fixes/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ quickstart.md ✅

**Tests**: No test tasks — fixes are CSS/event/display-layer changes with no new pure functions.
  Exception: `npm run typecheck` + `npm test` (regression guard) included in Polish phase.

**Organization**: 5 user stories (2×P1, 3×P2). US1 and US2 are fully independent.
  US3, US4, US5 are independent of US1/US2 but US5 shares `viewerAreaRef` with US4.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US5 maps to spec.md user stories
- All paths are relative to repo root `n:/progra/Pawer/pdf-form-editor/`

---

## Phase 1: Setup

**Purpose**: Verify all design artifacts are in place before implementation.

- [x] T001 Confirm branch `009-precision-ux-fixes` is active and all spec artifacts exist:
  `specs/009-precision-ux-fixes/{spec.md, plan.md, research.md, data-model.md, quickstart.md}`

---

## Phase 2: Foundational

> No blocking prerequisites shared across all stories.
> US5 depends on the `viewerAreaRef` introduced in US4 (Phase 7) — implement US4 before US5.

---

## Phase 3: User Story 1 — Botón ✕ sin recorte (Priority: P1) 🎯 MVP

**Goal**: El botón eliminar se muestra completo en cualquier posición del campo en el canvas.

**Independent Test**: Insertar campo en el borde superior del PDF → pasar cursor → botón ✕
  completamente visible y clickeable (quickstart.md Validación 1).

### Implementación US1

- [x] T002 [P] [US1] En `src/features/fields/components/FieldOverlay/DraggableField.module.css`:
  cambiar `overflow: hidden` → `overflow: visible` en la regla `.draggable-field`

- [ ] T003 [US1] Verificar manualmente con quickstart.md Validación 1:
  campo en borde superior-izquierdo → ✕ visible y funcional

**Checkpoint**: US1 completo y testeable independientemente.

---

## Phase 4: User Story 2 — Coordenadas Decimales (Priority: P1) 🎯 MVP

**Goal**: PropertiesPanel muestra y acepta coordenadas flotantes con step 0.5.

**Independent Test**: Arrastrar campo → x/y en panel muestran decimales. Ingresar
  x=110.5 → campo en 110.5. Arrow key → incrementa 0.5 (quickstart.md Validación 2).

### Implementación US2

- [x] T004 [P] [US2] En `src/features/fields/components/PropertiesPanel/PropertiesPanel.tsx`,
  para los 4 inputs (x, y, width, height):
  - Cambiar `step={1}` → `step={0.5}` en cada input
  - Reemplazar `String(Math.round(field.x))` → `String(parseFloat(field.x.toFixed(2)))`
  - Aplicar mismo patrón a `field.y`, `field.width`, `field.height`
  (Nota: buscar las líneas ~128, ~138, ~151, ~161 según research.md)

- [ ] T005 [US2] Verificar manualmente con quickstart.md Validación 2:
  decimales en panel tras drag; step 0.5 con flechas de teclado

**Checkpoint**: US2 completo y testeable independientemente.

---

## Phase 5: User Story 3 — Google Fonts Expandido (Priority: P2)

**Goal**: Selector con ≥20 fuentes en 5 categorías, lazy loading desde Google Fonts API.

**Independent Test**: Selector muestra ≥20 fuentes en grupos. Seleccionar Montserrat →
  texto del campo cambia. Network tab: 1 petición la primera vez, 0 en reselección
  (quickstart.md Validación 3).

### Implementación US3

- [x] T006 [P] [US3] Crear `src/features/pdf/config/fonts.ts` con:
  - `type FontCategory = 'sans-serif' | 'serif' | 'monospace' | 'display' | 'handwriting'`
  - `interface FontEntry { name: string; googleFamily: string; category: FontCategory; pdfFallback: 'Helvetica' | 'TimesRoman' | 'Courier' }`
  - Constante `FONT_CATALOG: FontEntry[]` con las 20 fuentes de data-model.md
    (Roboto, Open Sans, Lato, Montserrat, Nunito, Inter, Poppins, Merriweather,
    Playfair Display, Lora, PT Serif, Roboto Mono, Source Code Pro, JetBrains Mono,
    Oswald, Raleway, Ubuntu, Dancing Script, Pacifico, Caveat)
  - Función `getFontsByCategory(cat: FontCategory): FontEntry[]`
  - Función `loadGoogleFont(googleFamily: string): void` que inserta
    `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=...&display=swap">`
    en `document.head` si no existe ya un `<link>` con ese family en el href

- [x] T007 [P] [US3] En `src/types/shared.ts`: añadir `displayFont?: string` a la
  interface `FormField` (campo opcional — retrocompatible con campos existentes)

- [x] T008 [US3] En `src/app/api/generate-pdf/route.ts`: actualizar `isValidField` para
  aceptar `displayFont === undefined` (igual que `value?: string` — el campo es opcional)
  (depende T007)

- [x] T009 [US3] En `src/features/fields/components/PropertiesPanel/PropertiesPanel.tsx`:
  - Eliminar el array `FONT_OPTIONS` (Helvetica/TimesRoman/Courier) y su `<Select>`
  - Importar `FONT_CATALOG`, `getFontsByCategory`, `loadGoogleFont` desde
    `@/features/pdf/config/fonts`
  - Añadir selector de `displayFont` usando `<select>` nativo con `<optgroup>` por
    cada categoría de `FontCategory`, con opción vacía "Sin fuente personalizada"
  - `onChange`: llamar `loadGoogleFont(entry.googleFamily)` y luego
    `onUpdate(field.id, { displayFont: entry.name })`
  - Aplicar a single-field (línea ~174) y multi-selection (líneas ~49-52)
  - Mostrar la opción seleccionada usando `field.displayFont`
  (depende T006, T007)

- [x] T010 [P] [US3] En `src/features/fields/components/FieldOverlay/DraggableField.tsx`:
  cambiar el `fontFamily` inline del texto de preview a
  `field.displayFont ?? field.font`
  (depende T007)

- [ ] T011 [US3] Verificar manualmente con quickstart.md Validación 3:
  ≥20 fuentes en 5 grupos; lazy load en primera selección; sin nueva petición en reselección
  (depende T009, T010)

**Checkpoint**: US3 completo. Exportar PDF — campo muestra Helvetica/estándar; canvas
  muestra la Google Font seleccionada.

---

## Phase 6: User Story 4 — Scroll Page Navigation (Priority: P2)

**Goal**: Scroll continuo al límite inferior/superior del viewer cambia de página.

**Independent Test**: PDF 2+ páginas. Scroll hasta el fondo → avanza a página siguiente.
  Scroll hasta el tope → retrocede a página anterior. PDF 1 página → sin cambio
  (quickstart.md Validación 4).

### Implementación US4

- [x] T012 [US4] En `src/App.tsx`:
  - Añadir `import { useRef } from 'react'` si no existe ya
  - Declarar `const viewerAreaRef = useRef<HTMLElement>(null)` junto a los otros hooks
  - Asignar `ref={viewerAreaRef as React.RefObject<HTMLElement>}` al
    `<main className={styles['viewer-area']}>` (línea ~316)

- [x] T013 [US4] En `src/App.tsx`, añadir `handleViewerScroll` callback y conectarlo:
  ```typescript
  const handleViewerScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    const el = e.currentTarget;
    if (pdfRenderer.totalPages <= 1) return;
    if (el.scrollTop === 0 && pdfRenderer.currentPage > 1) {
      pdfRenderer.setCurrentPage(pdfRenderer.currentPage - 1);
      requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
    } else if (
      el.scrollTop + el.clientHeight >= el.scrollHeight - 1 &&
      pdfRenderer.currentPage < pdfRenderer.totalPages
    ) {
      pdfRenderer.setCurrentPage(pdfRenderer.currentPage + 1);
      requestAnimationFrame(() => { el.scrollTop = 0; });
    }
  }, [pdfRenderer]);
  ```
  Añadir `onScroll={handleViewerScroll}` al `<main className={styles['viewer-area']}>`
  (depende T012)

- [ ] T014 [US4] Verificar manualmente con quickstart.md Validación 4

**Checkpoint**: US4 completo y testeable independientemente.

---

## Phase 7: User Story 5 — Ctrl+Scroll Zoom (Priority: P2)

**Goal**: Ctrl+Scroll sobre el canvas hace zoom del canvas; el navegador no zooma.

**Independent Test**: Ctrl+Scroll sobre canvas → barra de zoom cambia, página del
  navegador no zooma. Ctrl+Scroll fuera del canvas → navegador zooma normalmente
  (quickstart.md Validación 5).

**Prerequisito**: T012 (viewerAreaRef) debe estar completo.

### Implementación US5

- [x] T015 [US5] En `src/App.tsx`, añadir `useEffect` para Ctrl+Scroll
  (depende T012 — usa `viewerAreaRef`):
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
  Si `zoomIn`/`zoomOut` no están memoizadas, envolverlas en `useCallback` para evitar
  re-registro del listener en cada render.

- [ ] T016 [US5] Verificar manualmente con quickstart.md Validación 5

**Checkpoint**: US5 completo. Ctrl+Scroll canvas → zoom. Navegador sin zoom.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T017 `npm run typecheck` — TypeScript strict sin errores
  (`displayFont?: string` tipado, `FontEntry` interfaces, `handleViewerScroll` callback)

- [x] T018 `npm test` — suite Vitest existente sin regresiones
  (ningún test existente debería romperse con los cambios de overflow/step/fonts)

- [x] T019 `npm run build` — Next.js build exitoso sin warnings

- [ ] T020 Recorrer quickstart.md completo — validaciones 1 a 5 pasan

- [x] T021 [P] Verificar modo oscuro en áreas afectadas:
  - Selector de Google Fonts en PropertiesPanel usa tokens de color (no hardcoded)
  - DraggableField con `displayFont` sigue respetando el `background-color: #fff !important`
    del `.field-bg` (Constitución XXIII)

---

## Phase 9: User Story 6 — Embedding de Fuentes TTF en PDF Exportado (Priority: P2)

**Goal**: El PDF exportado usa la fuente Google real cuando el campo tiene `displayFont`.
El visor PDF muestra Montserrat/Roboto/etc. en lugar de Helvetica.

**Independent Test**: Campo con `displayFont: "Montserrat"` → exportar PDF → abrir en
  Adobe Acrobat/Preview → el campo se renderiza en Montserrat (quickstart.md Validación 6).

**Prerequisito manual**: Los 20 archivos TTF deben estar en `public/fonts/` antes de T024.
  Ver sección de descarga en quickstart.md (Validación 6).

### Preparación US6 (manual — requiere descarga)

- [ ] T022 [P] [US6] Añadir `ttfFilename: string` a `FontEntry` en
  `src/features/pdf/config/fonts.ts` y mapear los 20 filenames:
  ```
  roboto-regular.ttf, open-sans-regular.ttf, lato-regular.ttf,
  montserrat-regular.ttf, nunito-regular.ttf, inter-regular.ttf,
  poppins-regular.ttf, merriweather-regular.ttf, playfair-display-regular.ttf,
  lora-regular.ttf, pt-serif-regular.ttf, roboto-mono-regular.ttf,
  source-code-pro-regular.ttf, jetbrains-mono-regular.ttf, oswald-regular.ttf,
  raleway-regular.ttf, ubuntu-regular.ttf, dancing-script-regular.ttf,
  pacifico-regular.ttf, caveat-regular.ttf
  ```

- [x] T023 [US6] **MANUAL**: Descargar los 20 archivos TTF y colocarlos en `public/fonts/`
  con los nombres exactos listados en T022.
  (Ver quickstart.md Validación 6 para instrucciones de descarga)

### Implementación US6

- [ ] T024 [US6] En `src/app/api/generate-pdf/pdfService.ts`, actualizar `generatePdf`:
  - Importar `path` y `fs` (Node.js built-ins)
  - Importar `FONT_CATALOG` desde `@/features/pdf/config/fonts`
  - En la sección de deduplicación de fuentes, separar campos con/sin `displayFont`
  - Para campos con `displayFont`: leer el TTF con
    `fs.readFileSync(path.join(process.cwd(), 'public', 'fonts', entry.ttfFilename))`
    y embeber con `pdfDoc.embedFont(fontBytes)`
  - Si el TTF no existe, lanzar `Error(\`Font asset not found: \${entry.ttfFilename}\`)`
  - Los campos sin `displayFont` siguen usando `StandardFonts` como hasta ahora
  - Deduplicar por `displayFont` igual que se deduplica por `fontFamily` hoy
  (depende T022, T023)

- [ ] T025 [US6] Verificar que `isValidField` en `src/app/api/generate-pdf/route.ts`
  no requiere cambios (el campo `displayFont?: string` ya es aceptado)

- [ ] T026 [US6] Verificar manualmente con quickstart.md Validación 6:
  campo con Montserrat → exportar → abrir en visor → fuente real visible
  (depende T024, T023)

### Polish US6

- [ ] T027 `npm run typecheck` — sin errores tras cambios en pdfService.ts y fonts.ts

- [ ] T028 `npm run build` — build exitoso con los 20 TTF en public/fonts/

**Checkpoint**: US6 completo. PDF exportado muestra fuente real. Campos sin fuente
  custom no se ven afectados.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias — inmediato.
- **US1 (Phase 3)**: Sin dependencias — puede empezar inmediatamente. **[P con US2, US3, US4]**
- **US2 (Phase 4)**: Sin dependencias — puede empezar inmediatamente. **[P con US1, US3, US4]**
- **US3 (Phase 5)**: Sin dependencias externas.
  - T006 y T007 en paralelo → T008, T009, T010 dependen de T007 → T011 cierra
- **US4 (Phase 6)**: Sin dependencias externas. **[P con US1, US2, US3]**
- **US5 (Phase 7)**: Depende de T012 (viewerAreaRef de US4). No puede empezar antes.
- **Polish (Phase 8)**: Depende de todas las fases anteriores.

### User Story Dependencies

- **US1**: Independiente. Empieza inmediatamente.
- **US2**: Independiente. Empieza inmediatamente.
- **US3**: Independiente. T006 y T007 en paralelo; T008/T009/T010 tras T007.
- **US4**: Independiente. Implementar antes que US5.
- **US5**: Depende de US4 (T012 — `viewerAreaRef`).

### Parallel Opportunities

- T002 (US1), T004 (US2), T006 (US3), T007 (US3), T012 (US4) — todos en archivos distintos,
  pueden ejecutarse en paralelo desde el inicio.
- T010 (DraggableField.tsx) es paralelo a T009 (PropertiesPanel.tsx) — ambos dependen
  sólo de T007.

---

## Parallel Example: US3 (Google Fonts)

```bash
# Lanzar en paralelo desde el inicio de US3:
Task: "Crear src/features/pdf/config/fonts.ts con FONT_CATALOG y loadGoogleFont"
Task: "Añadir displayFont?: string a FormField en src/types/shared.ts"

# Una vez T007 completo:
Task: "Actualizar isValidField en src/app/api/generate-pdf/route.ts"
Task: "Actualizar PropertiesPanel.tsx con selector Google Fonts"
Task: "Actualizar DraggableField.tsx con displayFont ?? font"
```

---

## Implementation Strategy

### MVP First (US1 + US2 únicamente)

1. Completar Phase 1: Setup check
2. Completar Phase 3: US1 (T002, T003) — 1 línea CSS
3. Completar Phase 4: US2 (T004, T005) — cambios en 4 inputs
4. **STOP y VALIDAR**: Botón ✕ visible + coordenadas decimales funcionan
5. MVP listo — entregar si el resto puede esperar

### Entrega Incremental

1. US1 + US2 (MVP) → deploy/demo
2. US3 (Google Fonts) → añade valor tipográfico → deploy/demo
3. US4 (Scroll nav) → mejora flujo multipágina → deploy/demo
4. US5 (Ctrl+Scroll) → zoom nativo → deploy/demo (requiere US4 previo)
5. Polish → typecheck + build + validación final

### Estrategia de Equipo

Con múltiples desarrolladores desde Phase 2:
- Dev A: US1 (T002-T003) — 30 min
- Dev B: US2 (T004-T005) — 30 min
- Dev C: US3 (T006-T011) — 90 min
- Dev D: US4+US5 (T012-T016) — 60 min (secuencial entre sí, paralelo con los demás)

---

## Notes

- [P] = archivos distintos, sin dependencias entre sí
- T002 y T004 son el par de cambios más pequeño — ideal para empezar
- `loadGoogleFont` en T006 debe ser idempotente: verificar si el `<link>` ya existe
  antes de inyectarlo (comprobar `href` que contenga el nombre de la fuente)
- `useCallback` en `handleViewerScroll` (T013) y `zoomIn`/`zoomOut` (T015) evita
  re-registro de listeners en cada render
- `requestAnimationFrame` en T013 es necesario — `setCurrentPage` es async y el
  ajuste de `scrollTop` debe esperar al re-render
- El `{ passive: false }` en T015 es OBLIGATORIO — React 17+ registra `onWheel` como
  pasivo y `preventDefault()` no tendría efecto desde JSX
