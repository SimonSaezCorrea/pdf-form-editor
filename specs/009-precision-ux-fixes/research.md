# Research: Bugfixes y Mejoras de Precisión y Usabilidad

**Branch**: `009-precision-ux-fixes` | **Date**: 2026-04-11

---

## BF-009-01 — Botón Eliminar Recortado

### Hallazgo

**Causa raíz confirmada**: `.draggable-field` tiene `overflow: hidden` en
`src/features/fields/components/FieldOverlay/DraggableField.module.css` (línea ~9).
El `.field-delete-btn` usa `position: absolute; top: -8px; right: -8px` para
posicionarse 8 px fuera del borde superior-derecho del campo. Con `overflow: hidden`,
ese 8 px queda recortado.

**Decision**: Cambiar `overflow: hidden → overflow: visible` en `.draggable-field`.

**Rationale**: El `overflow: hidden` no cumple ningún rol funcional crítico en el
campo — el contenido del campo (texto de placeholder) no necesita ser cortado, y
el borde visible se controla con `border` + `border-radius`, no con overflow.
Cambiar a `visible` resuelve el clipping sin efectos secundarios.

**Alternatives considered**:
- Mover el botón fuera del `.draggable-field` al DOM del `.field-overlay`: Requiere
  refactorizar el event flow (stopPropagation), más cambios para mismo resultado.
- Usar `clip-path` en lugar de `overflow: hidden`: No aplica, el campo no usa clip-path.

---

## BF-009-02 — Coordenadas Decimales

### Hallazgo

**Estado actual**:
- `useFieldStore.updateField()` almacena floats sin redondear ✅
- Drag end en `PdfViewer.tsx` produce floats (via `canvasToPdf`) sin redondear ✅
- `useFieldResize.ts` produce floats sin redondear ✅
- `PropertiesPanel.tsx` aplica `Math.round()` en el `value` de los 4 inputs (x, y,
  width, height) → muestra enteros al usuario ❌
- `step=1` en los 4 inputs → el spinner de flechas avanza de 1 en 1 ❌

**Decision**: Eliminar `Math.round()` del valor de los inputs; cambiar `step` de `1`
a `0.5`; cambiar el display a `String(parseFloat(val.toFixed(2)))`.

**Rationale**: El store ya conserva floats. La única corrección necesaria es en la
capa de presentación (PropertiesPanel). Ningún cambio en useFieldStore, PdfViewer,
useFieldResize ni coordinates.ts.

**Alternatives considered**:
- Redondear en `canvasToPdf()` o `updateField()`: Contrario a la Constitución
  Principio XXIV. Descartado.

---

## FR-009-03 — Google Fonts Expandido

### Hallazgo

**Estado actual**:
- `FontFamily` en `shared.ts` = `'Helvetica' | 'TimesRoman' | 'Courier'` (3 fuentes)
- `FONT_OPTIONS` hardcodeado en `PropertiesPanel.tsx` (líneas 16-20)
- No existe `src/features/pdf/config/fonts.ts`
- El selector usa el `<Select>` nativo de `src/components/ui/Select/Select.tsx`

**Conflicto con Principio IV (Constitution)**: "Supported fonts are limited to PDF
standard fonts: Helvetica, TimesRoman, Courier. No custom font embedding." — Los
campos PDF exportados sólo pueden usar estas 3 fuentes. Las Google Fonts son para
**visualización en canvas únicamente**.

**Decision**: 
1. `FontFamily` en `shared.ts` permanece con las 3 fuentes estándar PDF (no cambia).
2. Se añade `displayFont?: string` a `FormField` en `shared.ts` para la fuente visual
   del canvas (Google Font). Es opcional; si no está, el canvas usa el `font` estándar.
3. Se crea `src/features/pdf/config/fonts.ts` con ≥20 entradas de Google Fonts
   organizadas por categoría.
4. `PropertiesPanel` reemplaza el `<Select>` de `FONT_OPTIONS` por un nuevo selector
   que muestra Google Fonts; cada categoría es un `<optgroup>`.
5. Al seleccionar una Google Font, se inyecta dinámicamente un `<link>` a Google Fonts
   API (lazy loading) si aún no existe en el DOM.
6. `DraggableField` aplica `fontFamily: field.displayFont ?? field.font` via inline
   style en el texto de preview del campo.
7. La exportación PDF sigue usando `field.font: FontFamily` (Helvetica/TimesRoman/Courier).

**Rationale**: Separar "fuente visual" de "fuente PDF" preserva la Constitución sin
sacrificar la experiencia de diseño. El usuario ve el texto del campo en la tipografía
deseada; el PDF exportado usa la fuente estándar más cercana ya configurada.

**Lazy loading mechanism**: Antes de aplicar una Google Font, verificar si ya existe
un `<link>` con `href` que incluya el nombre de la fuente. Si no existe, crear e
inyectar el `<link>` en `document.head`.

**Alternatives considered**:
- Ampliar `FontFamily` para incluir todas las Google Fonts: Rompería Principio IV
  (las nuevas fuentes no son embeddables en AcroForm). Descartado.
- Usar `document.fonts.load()` API: Más complejo, mismo resultado. `<link>` dinámico
  es el patrón más simple y ampliamente compatible.

---

## FR-009-04 — Cambio de Página por Scroll

### Hallazgo

**Estado actual**:
- El scroll container es `<main className={styles['viewer-area']}>` en `App.tsx`
  (línea ~316). Tiene `overflow: auto` en `App.module.css`.
- `viewer-area` **no tiene ref ni onScroll handler**.
- `pdfRenderer.setCurrentPage`, `pdfRenderer.currentPage` y `pdfRenderer.totalPages`
  están disponibles en `App.tsx` desde `usePdfRenderer`.
- No existe ningún scroll handler en el canvas feature.

**Decision**: Añadir `viewerAreaRef = useRef<HTMLElement>(null)` en `App.tsx`;
asignarlo al `<main className={styles['viewer-area']}>` div; añadir `onScroll`
handler en el `<main>` que comprueba los límites:
- `el.scrollTop === 0 && currentPage > 1` → `setCurrentPage(currentPage - 1)`,
  luego scroll al final: `el.scrollTop = el.scrollHeight`
- `el.scrollTop + el.clientHeight >= el.scrollHeight - 1 && currentPage < totalPages`
  → `setCurrentPage(currentPage + 1)`, luego scroll al inicio: `el.scrollTop = 0`

**Rationale**: El scroll container vive en App.tsx donde también viven `currentPage`
y `setCurrentPage` (a través de `pdfRenderer`). Poner el handler ahí evita prop
drilling. La comprobación `>= scrollHeight - 1` tolera subpíxel rendering.

**Guard contra PDF de una página**: La condición incluye `totalPages > 1`.

**Alternatives considered**:
- Implementarlo en `PdfViewer.tsx` pasando callbacks: Requiere más props. El container
  no es propiedad de PdfViewer — es App.tsx.
- `useEffect` con `addEventListener('scroll')`: Funciona igual; `onScroll` en JSX es
  más idiomático para React.

---

## FR-009-05 — Ctrl+Scroll para Zoom del Canvas

### Hallazgo

**Estado actual**:
- `zoom` state, `ZOOM_STEPS`, `zoomIn()`, `zoomOut()` están en `App.tsx`.
- **No existe ningún wheel listener** en todo el codebase.
- El scroll container es `viewer-area` en `App.tsx` (mismo que FR-009-04).
- React añade listeners `wheel` como pasivos por defecto → `preventDefault()` no
  funciona desde `onWheel` JSX. **DEBE usarse `addEventListener` nativo con
  `{ passive: false }`**.

**Decision**: Añadir un `useEffect` en `App.tsx` que, cuando `pdfBytes` existe,
adjunte un listener `wheel` nativo sobre `viewerAreaRef.current` con
`{ passive: false }`. El handler:
```
if (e.ctrlKey) {
  e.preventDefault();
  e.deltaY < 0 ? zoomIn() : zoomOut();
}
```
El listener se limpia al desmontar con `removeEventListener`.

**Rationale**: El mismo `viewerAreaRef` que se usa para el scroll handler (FR-009-04)
sirve aquí. `{ passive: false }` es obligatorio para que `preventDefault()` funcione
(los listeners pasivos no pueden cancelar eventos). Ubicar en App.tsx da acceso directo
a `zoomIn`/`zoomOut` sin prop drilling.

**Alternatives considered**:
- `onWheel` prop en JSX: React registra wheel listeners como pasivos en React 17+.
  `preventDefault()` no tiene efecto. Descartado.
- Implementar en PdfViewer con callbacks de zoom: Requiere pasar `zoomIn`/`zoomOut`
  como props. Mayor acoplamiento innecesario.
