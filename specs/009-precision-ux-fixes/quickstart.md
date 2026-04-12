# Quickstart: Validación Manual de 009-precision-ux-fixes

**Branch**: `009-precision-ux-fixes` | **Date**: 2026-04-11

## Setup

```bash
cd n:/progra/Pawer/pdf-form-editor
git checkout 009-precision-ux-fixes
npm install   # sin dependencias nuevas
npm run dev   # http://localhost:3000
```

Cargar el PDF de prueba: `Contrato_Colaboradores_L'Oréal_2026.pdf` (o cualquier PDF
con campos existentes).

---

## Validación 1 — Botón ✕ sin recorte

1. Insertar un campo cerca del **borde superior** del PDF (y ≈ 5-10 pt desde el top).
2. Pasar el cursor sobre el campo (sin seleccionarlo).
3. **Verificar**: El botón ✕ aparece completo en la esquina superior-derecha —
   sin que ninguna parte del círculo o el ícono quede cortada.
4. Hacer click en el ✕ → el campo se elimina.
5. Repetir con campo en esquina **superior-izquierda** y borde **izquierdo**.

---

## Validación 2 — Coordenadas decimales

1. Arrastrar un campo a cualquier posición.
2. **Verificar**: En el panel Properties, X e Y muestran valores con decimales
   (ej: `127.50`, `84.23`).
3. Borrar el valor de X e ingresar `110.5` → Enter.
4. **Verificar**: El campo se mueve a x=110.5 y el input muestra `110.5`.
5. Hacer click en el input de Y y presionar la flecha **▲** del teclado.
6. **Verificar**: El valor aumenta en `0.5` (ej: 84.23 → 84.73).
7. Redimensionar el campo con un handle.
8. **Verificar**: Width y Height en el panel muestran decimales.

---

## Validación 3 — Selector de fuentes expandido

1. Seleccionar un campo y abrir el selector de fuentes en Properties.
2. **Verificar**: La lista tiene ≥20 fuentes agrupadas en 5 categorías
   (Sans-serif, Serif, Monospace, Display, Handwriting).
3. Seleccionar **Montserrat** (primera vez).
4. **Verificar**: El texto del campo en el canvas cambia a Montserrat.
5. Abrir DevTools → Network → filtrar por "fonts.gstatic.com" o "fonts.googleapis.com".
6. **Verificar**: Se realizó una petición de carga de Montserrat al seleccionarla.
7. Seleccionar **Montserrat** de nuevo (segunda vez).
8. **Verificar**: No se realiza una nueva petición de red (ya cargada).
9. Exportar el PDF y abrirlo en un PDF reader.
10. **Verificar**: El campo muestra texto (en Helvetica o la fuente PDF de fallback).

---

## Validación 4 — Cambio de página por scroll

> Requiere PDF de 2+ páginas.

1. Cargar el PDF con el campo de prueba (tiene 4 páginas).
2. Hacer scroll lento hacia abajo hasta el **final de la página 1**.
3. **Verificar**: Al sobrepasar el límite inferior, el viewer avanza a la página 2
   y el scroll se posiciona en el inicio.
4. Hacer scroll hacia arriba hasta el **inicio de la página 2**.
5. **Verificar**: Al sobrepasar el límite superior, el viewer retrocede a la página 1
   y el scroll se posiciona al final.
6. Probar con un PDF de una sola página: scroll al límite → **no cambia de página**.

---

## Validación 5 — Ctrl+Scroll para zoom

1. Posicionar el cursor **dentro del canvas** del PDF.
2. Presionar **Ctrl** y hacer scroll hacia arriba.
3. **Verificar**: El canvas hace zoom in; el porcentaje de zoom aumenta en la toolbar.
4. **Verificar**: La página del **navegador NO** hace zoom (el texto fuera del canvas
   mantiene su tamaño).
5. Ctrl+Scroll hacia abajo → canvas hace zoom out.
6. Llevar el zoom al mínimo (0.5x) y hacer Ctrl+Scroll abajo → no pasa de 0.5x.
7. Llevar el zoom al máximo (2x) y hacer Ctrl+Scroll arriba → no pasa de 2x.
8. Mover el cursor **fuera del canvas** (ej: al panel lateral) y hacer Ctrl+Scroll
   → el navegador aplica su zoom nativo normalmente.

---

## Test suite

```bash
npm test          # Vitest — sin tests nuevos requeridos (cambios son UI/CSS/events)
npm run typecheck # TypeScript strict — debe pasar sin errores
npm run build     # Next.js build — debe completar sin warnings
```
