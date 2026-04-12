# Quickstart: Validación Manual de 010-pdf-filler-mode

**Branch**: `010-pdf-filler-mode` | **Date**: 2026-04-12

## Setup

```bash
cd n:/progra/Pawer/pdf-form-editor
git checkout 010-pdf-filler-mode
npm install   # sin dependencias nuevas
npm run dev   # http://localhost:3000
```

Preparar un **PDF de prueba con campos AcroForm** (ej: un PDF exportado desde el
modo Editor con al menos 3 campos: "fullname", "petname", "startDate").
También preparar un **PDF sin campos AcroForm** (cualquier PDF de texto plano o
escaneado).

---

## Validación 1 — Navegación entre modos

1. Abrir `http://localhost:3000`.
2. **Verificar**: El navbar muestra dos opciones: "Editor de plantilla" y
   "Rellenar PDF".
3. **Verificar**: "Editor de plantilla" está visualmente activo (ej: subrayado,
   color diferente, fondo distinto).
4. Hacer clic en "Rellenar PDF".
5. **Verificar**: La vista cambia al Modo Rellenador instantáneamente — sin
   recarga de página (la URL no cambia o cambia sin reload).
6. **Verificar**: "Rellenar PDF" está ahora visualmente activo en el navbar.
7. Volver al Editor con "Editor de plantilla".
8. **Verificar**: El editor muestra el mismo estado previo (PDF cargado si había
   uno, campos existentes intactos).

---

## Validación 2 — Upload de PDF con campos AcroForm

1. Estar en el Modo Rellenador (navbar → "Rellenar PDF").
2. **Verificar**: Se muestra una pantalla de upload (drag-and-drop o botón).
3. Subir el PDF de prueba con campos AcroForm.
4. **Verificar**: La vista cambia a un layout de **dos paneles**:
   - Panel izquierdo: previsualización del PDF renderizado.
   - Panel derecho: formulario con un input de texto por cada campo.
5. **Verificar**: El número de inputs en el formulario coincide exactamente con
   el número de campos AcroForm del PDF (ni más ni menos).
6. **Verificar**: Cada input tiene como label el nombre del campo (ej:
   "fullname", "petname", "startDate").

---

## Validación 3 — Generar PDF rellenado

1. Estar en el layout dos paneles con el PDF de prueba cargado.
2. Rellenar algunos inputs y dejar al menos uno vacío:
   - "fullname" → "Juan Pérez"
   - "petname" → "Firulais"
   - "startDate" → (dejar vacío)
3. Hacer clic en "Generar PDF".
4. **Verificar**: El navegador descarga automáticamente un archivo llamado
   `filled.pdf`.
5. Abrir `filled.pdf` en cualquier visor de PDF (Adobe, Foxit, Preview, etc.).
6. **Verificar**: El campo "fullname" muestra "Juan Pérez".
7. **Verificar**: El campo "petname" muestra "Firulais".
8. **Verificar**: El campo "startDate" está vacío (no se envió — correcto).
9. **Verificar**: Los campos son **no editables** en el visor (aplanan fue
   aplicado — no hay widget interactivo, solo texto estático).

---

## Validación 4 — PDF sin campos AcroForm

1. Estar en el Modo Rellenador.
2. Subir el PDF sin campos AcroForm.
3. **Verificar**: La aplicación NO muestra el layout de dos paneles ni un
   formulario vacío.
4. **Verificar**: Se muestra un mensaje informativo (ej: "Este PDF no contiene
   campos rellenables").
5. **Verificar**: El botón "Generar PDF" **no aparece** o está **deshabilitado**.

---

## Validación 5 — API POST /api/fill-pdf (curl)

> Requiere tener `curl` disponible y el servidor corriendo en `localhost:3000`.

### Caso 1: Éxito

```bash
curl -X POST http://localhost:3000/api/fill-pdf \
  -F "file=@/ruta/a/contrato.pdf" \
  -F 'fields={"fullname":"Juan Pérez","petname":"Firulais"}' \
  --output filled.pdf
```

**Verificar**: El comando devuelve 200 y descarga `filled.pdf` con los valores.

### Caso 2: PDF inválido

```bash
curl -X POST http://localhost:3000/api/fill-pdf \
  -F "file=@/ruta/a/archivo.txt" \
  -F 'fields={}' \
  -w "\nHTTP status: %{http_code}\n"
```

**Verificar**: Respuesta 400 con `{"error":"INVALID_PDF"}`.

### Caso 3: JSON inválido

```bash
curl -X POST http://localhost:3000/api/fill-pdf \
  -F "file=@/ruta/a/contrato.pdf" \
  -F 'fields=notjson' \
  -w "\nHTTP status: %{http_code}\n"
```

**Verificar**: Respuesta 400 con `{"error":"INVALID_FIELDS"}`.

### Caso 4: Campo inexistente

```bash
curl -X POST http://localhost:3000/api/fill-pdf \
  -F "file=@/ruta/a/contrato.pdf" \
  -F 'fields={"fieldThatDoesNotExist":"value"}' \
  -w "\nHTTP status: %{http_code}\n"
```

**Verificar**: Respuesta 400 con `{"error":"FIELD_NOT_FOUND","field":"fieldThatDoesNotExist"}`.

### Caso 5: Fields vacío (aplana sin rellenar)

```bash
curl -X POST http://localhost:3000/api/fill-pdf \
  -F "file=@/ruta/a/contrato.pdf" \
  -F 'fields={}' \
  --output aplanado.pdf
```

**Verificar**: Respuesta 200, `aplanado.pdf` tiene el PDF original con campos aplanados.

---

## Validación 6 — Modo oscuro

1. Activar modo oscuro (botón de luna en la toolbar o configuración del SO).
2. Navegar al Modo Rellenador.
3. **Verificar**: La pantalla de upload usa los tokens de color del modo oscuro
   (no hay zonas blancas o con color hardcodeado que no cambie con el tema).
4. Subir un PDF con campos.
5. **Verificar**: El formulario dinámico (labels, inputs, botón) usa los tokens
   de modo oscuro. Los inputs muestran `var(--color-input-bg)` oscuro.
6. **Verificar**: El panel izquierdo (previsualización PDF) no presenta fondo
   blanco fuera del canvas del PDF.

---

## Test suite

```bash
npm test          # Vitest — tests de detección de campos + integración API
npm run typecheck # TypeScript strict — sin errores
npm run build     # Next.js build — sin warnings
```

### Tests esperados

| Test | Archivo |
|------|---------|
| `useFieldDetection` — detecta campos correctamente en PDF con 3 campos | `tests/unit/filler/` |
| `useFieldDetection` — devuelve array vacío para PDF sin campos | `tests/unit/filler/` |
| `POST /api/fill-pdf` — 200 con PDF válido y campos existentes | `tests/integration/fill-pdf/` |
| `POST /api/fill-pdf` — 400 INVALID_PDF con archivo no-PDF | `tests/integration/fill-pdf/` |
| `POST /api/fill-pdf` — 400 INVALID_FIELDS con JSON inválido | `tests/integration/fill-pdf/` |
| `POST /api/fill-pdf` — 400 FIELD_NOT_FOUND con campo inexistente | `tests/integration/fill-pdf/` |
| `POST /api/fill-pdf` — 200 con fields={} (aplanar sin rellenar) | `tests/integration/fill-pdf/` |
