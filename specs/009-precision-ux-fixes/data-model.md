# Data Model: Bugfixes y Mejoras de Precisión y Usabilidad

**Branch**: `009-precision-ux-fixes` | **Date**: 2026-04-11

---

## Cambios a entidades existentes

### FormField (`src/types/shared.ts`)

Campo nuevo opcional:

```
displayFont?: string   // Google Font name para canvas preview (ej: "Montserrat")
                       // Si ausente, el canvas usa field.font (FontFamily estándar)
                       // NO se usa en la exportación AcroForm PDF
```

Campos sin cambio:
```
font: FontFamily       // Sigue siendo 'Helvetica' | 'TimesRoman' | 'Courier'
                       // Usado exclusivamente para exportación PDF (pdf-lib)
x: number              // Float; ya era float — sin cambio de tipo
y: number              // Float; ya era float — sin cambio de tipo
width: number          // Float; ya era float — sin cambio de tipo
height: number         // Float; ya era float — sin cambio de tipo
```

**Retrocompatibilidad**: `displayFont` es opcional. Templates y PDFs existentes que
no incluyen este campo siguen siendo válidos — el canvas aplica fallback a `font`.

---

## Entidades nuevas

### FontEntry (`src/features/pdf/config/fonts.ts`)

```typescript
interface FontEntry {
  name: string;          // Display name (ej: "Montserrat")
  googleFamily: string;  // Nombre exacto en Google Fonts API (ej: "Montserrat")
  category: FontCategory;
  pdfFallback: FontFamily; // Fuente AcroForm más cercana para exportación
}

type FontCategory = 'sans-serif' | 'serif' | 'monospace' | 'display' | 'handwriting';
```

### FONT_CATALOG (constante en `fonts.ts`)

Array de `FontEntry[]` con ≥20 fuentes:

| name | googleFamily | category | pdfFallback |
|------|-------------|----------|-------------|
| Roboto | Roboto | sans-serif | Helvetica |
| Open Sans | Open Sans | sans-serif | Helvetica |
| Lato | Lato | sans-serif | Helvetica |
| Montserrat | Montserrat | sans-serif | Helvetica |
| Nunito | Nunito | sans-serif | Helvetica |
| Inter | Inter | sans-serif | Helvetica |
| Poppins | Poppins | sans-serif | Helvetica |
| Merriweather | Merriweather | serif | TimesRoman |
| Playfair Display | Playfair Display | serif | TimesRoman |
| Lora | Lora | serif | TimesRoman |
| PT Serif | PT Serif | serif | TimesRoman |
| Roboto Mono | Roboto Mono | monospace | Courier |
| Source Code Pro | Source Code Pro | monospace | Courier |
| JetBrains Mono | JetBrains Mono | monospace | Courier |
| Oswald | Oswald | display | Helvetica |
| Raleway | Raleway | display | Helvetica |
| Ubuntu | Ubuntu | display | Helvetica |
| Dancing Script | Dancing Script | handwriting | TimesRoman |
| Pacifico | Pacifico | handwriting | TimesRoman |
| Caveat | Caveat | handwriting | TimesRoman |

**Total**: 20 fuentes (7 sans-serif + 4 serif + 3 monospace + 3 display + 3 handwriting)

### Funciones auxiliares (exportadas desde `fonts.ts`)

```typescript
// Devuelve todas las fuentes de una categoría
getFontsByCategory(category: FontCategory): FontEntry[]

// Dado un displayFont name, retorna el FontFamily para PDF export
getDisplayFontByName(name: string): FontEntry | undefined

// Inyecta <link> de Google Fonts si no existe ya en el DOM
loadGoogleFont(googleFamily: string): void
```

---

## Estado de componentes afectados (sin nuevas entidades)

### PropertiesPanel

- **Antes**: `FONT_OPTIONS = ['Helvetica', 'TimesRoman', 'Courier']` hardcodeado; 
  inputs x/y/width/height con `step=1` y `Math.round()` en value.
- **Después**: Selector de `displayFont` con `<optgroup>` por categoría usando
  `FONT_CATALOG`; inputs con `step=0.5` y valor float formateado a 2 decimales.

### DraggableField

- **Antes**: Aplica `fontFamily` basado en `field.font` (mapeado desde FontFamily).
- **Después**: Aplica `fontFamily: field.displayFont ?? field.font` en el texto preview.

### App.tsx

- **Añadido**: `viewerAreaRef = useRef<HTMLElement>(null)` para los dos nuevos listeners.
- **Añadido**: `onScroll` handler en `<main className={viewer-area}>`.
- **Añadido**: `useEffect` con `addEventListener('wheel', ..., { passive: false })`.

### DraggableField.module.css

- **Cambiado**: `.draggable-field { overflow: hidden → overflow: visible }`.

---

## Validaciones

- `isValidField` en `src/app/api/generate-pdf/route.ts`: `displayFont` es opcional →
  DEBE aceptar `displayFont === undefined` (misma regla que `value?: string`).
- `parseTemplateFile` en `templateSchema.ts`: templates exportados pueden incluir
  `displayFont`; el parser DEBE tolerarlo como campo desconocido (pasa el spread).
