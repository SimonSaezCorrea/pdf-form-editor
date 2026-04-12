# Feature Specification: PDF Filler Mode — Formulario Dinámico y API Pública

**Feature Branch**: `010-pdf-filler-mode`  
**Created**: 2026-04-12  
**Status**: Draft  
**Input**: User description: "Nueva feature: modo rellenador de PDF con formulario dinámico y API pública."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Rellenar un PDF visualmente con formulario dinámico (Priority: P1)

Un usuario sube un PDF que contiene campos AcroForm (por ejemplo, un contrato con campos
"fullname", "petname", "startDate"). La aplicación detecta automáticamente todos los
campos presentes y muestra un formulario dinámico con un input por cada campo. El usuario
completa los valores, hace clic en "Generar PDF" y descarga el PDF con los datos
insertados y los campos aplanados (no editables).

**Why this priority**: Es el flujo completo de valor de la feature. Sin él, el modo
rellenador no existe. Todo lo demás es infraestructura de soporte.

**Independent Test**: Subir un PDF con al menos 3 campos AcroForm conocidos → el
formulario muestra exactamente esos campos → completar valores → descargar → abrir en
visor PDF y confirmar que los valores aparecen y los campos son estáticos.

**Acceptance Scenarios**:

1. **Given** el usuario está en el Modo Rellenador y no ha subido ningún PDF,
   **When** sube un PDF con campos AcroForm,
   **Then** la vista cambia a un layout de dos paneles: previsualización del PDF a la
   izquierda y formulario dinámico con un input por cada campo a la derecha.

2. **Given** el formulario dinámico está visible,
   **When** el usuario completa algunos campos y deja otros vacíos,
   **Then** al hacer clic en "Generar PDF" solo los campos con valor se envían al
   endpoint; los campos vacíos no se incluyen.

3. **Given** el usuario hace clic en "Generar PDF",
   **When** el endpoint responde con éxito (200),
   **Then** el navegador descarga automáticamente el PDF rellenado con nombre
   "filled.pdf".

4. **Given** el PDF rellenado descargado,
   **When** se abre en cualquier visor de PDF estándar,
   **Then** los campos muestran los valores ingresados y no son editables
   (campos aplanados).

---

### User Story 2 — API pública POST /api/fill-pdf para integración externa (Priority: P1)

Un desarrollador externo (por ejemplo, el equipo que mantiene el servicio `fillContract`)
necesita rellenar PDFs con campos AcroForm de forma programática, sin pasar por la
interfaz visual. Envía el PDF y un JSON de campos vía `multipart/form-data` al endpoint
`POST /api/fill-pdf` y recibe el PDF rellenado y aplanado como respuesta binaria.

**Why this priority**: El caso de uso programático fue el detonante de la feature. La
interfaz visual y el endpoint comparten la misma lógica de negocio; implementar el
endpoint primero habilita ambos.

**Independent Test**: Ejecutar el comando curl de ejemplo del README con un PDF real que
contenga campos AcroForm → recibir 200 con PDF binario → abrir el PDF y confirmar valores
y aplanado.

**Acceptance Scenarios**:

1. **Given** un PDF con campos AcroForm y un JSON válido de campos,
   **When** se envía `POST /api/fill-pdf` con `file` y `fields` como
   `multipart/form-data`,
   **Then** la respuesta es 200 con `Content-Type: application/pdf` y el PDF rellenado
   y aplanado en el cuerpo.

2. **Given** un JSON con un campo que no existe en el PDF (por ejemplo `"nonexistent": "value"`),
   **When** se envía `POST /api/fill-pdf`,
   **Then** la respuesta es 400 con `{ "error": "FIELD_NOT_FOUND", "field": "nonexistent" }`.

3. **Given** un archivo que no es un PDF válido,
   **When** se envía `POST /api/fill-pdf`,
   **Then** la respuesta es 400 con `{ "error": "INVALID_PDF" }`.

4. **Given** un `fields` que no es JSON válido (por ejemplo `fields=notjson`),
   **When** se envía `POST /api/fill-pdf`,
   **Then** la respuesta es 400 con `{ "error": "INVALID_FIELDS" }`.

5. **Given** el endpoint recibe una petición válida,
   **When** ocurre un error interno inesperado durante el procesamiento,
   **Then** la respuesta es 500 con `{ "error": "PROCESSING_ERROR" }`.

---

### User Story 3 — Navegación entre modos Editor y Rellenador (Priority: P2)

Un usuario que está diseñando una plantilla PDF en el Modo Editor quiere cambiar al
Modo Rellenador para probar cómo se vería el PDF con datos reales. Hace clic en
"Rellenar PDF" en el navbar y la vista cambia completamente sin recargar la página.

**Why this priority**: La navegación es infraestructura de presentación. Los modos
pueden existir como vistas separadas sin un navbar refinado; se puede navegar por URL
mientras se desarrolla.

**Independent Test**: Con la aplicación cargada en cualquier estado, hacer clic en
"Rellenar PDF" → la vista muestra la pantalla de carga de PDF del modo rellenador.
Hacer clic en "Editor de plantilla" → vuelve al editor. Ambas transiciones ocurren
sin recarga de página y sin perder el estado del modo original.

**Acceptance Scenarios**:

1. **Given** la aplicación cargada en cualquier estado,
   **When** el usuario hace clic en "Rellenar PDF" en el navbar,
   **Then** la vista completa cambia al Modo Rellenador de forma instantánea, sin
   recarga de página.

2. **Given** el usuario está en el Modo Rellenador,
   **When** hace clic en "Editor de plantilla",
   **Then** la vista vuelve al Modo Editor con el estado previo preservado
   (PDF cargado, campos existentes intactos).

3. **Given** el navbar con ambas opciones visibles,
   **When** se observa la UI,
   **Then** el modo activo se distingue visualmente del modo inactivo (por ejemplo,
   mediante un indicador, subrayado, o diferencia de color).

---

### User Story 4 — PDF sin campos AcroForm: mensaje informativo (Priority: P2)

Un usuario sube un PDF que no tiene campos AcroForm (por ejemplo, un documento escaneado
o un PDF de texto plano). La aplicación detecta la ausencia de campos y muestra un
mensaje claro en lugar de un formulario vacío que podría confundir al usuario.

**Why this priority**: Mejora la experiencia pero no bloquea el valor principal. Un
formulario vacío es confuso; un mensaje claro es la diferencia entre UX aceptable y
buena UX.

**Independent Test**: Subir un PDF sin campos AcroForm → la aplicación muestra el
mensaje informativo en lugar del formulario dinámico → el botón "Generar PDF" no
aparece o está deshabilitado.

**Acceptance Scenarios**:

1. **Given** el usuario sube un PDF sin campos AcroForm,
   **When** la detección de campos termina,
   **Then** se muestra un mensaje informativo (por ejemplo: "Este PDF no contiene
   campos rellenables") en lugar del formulario dinámico.

2. **Given** el mensaje informativo está visible,
   **When** el usuario observa la interfaz,
   **Then** el botón "Generar PDF" no está disponible (ausente o deshabilitado).

---

### Edge Cases

- ¿Qué ocurre si el PDF está encriptado o protegido con contraseña? → Mostrar error
  descriptivo; no mostrar formulario vacío.
- ¿Qué ocurre si el PDF tiene más de 50 campos? → El formulario debe ser desplazable
  (scroll); no hay límite artificial de campos mostrados.
- ¿Qué ocurre si el valor de un campo supera el ancho del campo en el PDF? → El
  endpoint aplica el texto tal como se recibe; el recorte visual es responsabilidad
  del visor PDF.
- ¿Qué ocurre si se envían campos vacíos al endpoint? → El endpoint acepta un objeto
  `fields` vacío `{}` y devuelve el PDF original aplanado sin modificaciones de campo.
- ¿Qué ocurre si el `fields` JSON contiene solo campos vacíos? → El cliente filtra
  los campos vacíos antes de enviar; el endpoint recibe `{}`.
- ¿Qué ocurre si el archivo enviado al endpoint no tiene extensión `.pdf` pero es un
  PDF válido internamente? → Se valida el contenido binario (cabecera `%PDF-`), no la
  extensión.

---

## Requirements *(mandatory)*

### Functional Requirements

**Navegación**

- **FR-001**: La aplicación DEBE mostrar en el navbar principal dos opciones de modo:
  "Editor de plantilla" y "Rellenar PDF".
- **FR-002**: El cambio de modo DEBE ocurrir de forma instantánea sin recargar la
  página completa (navegación client-side).
- **FR-003**: El modo activo DEBE estar visualmente diferenciado del modo inactivo en
  el navbar en todo momento.

**Modo Rellenador — estado inicial**

- **FR-004**: Al entrar al Modo Rellenador el usuario DEBE ver una pantalla para subir
  un PDF (drag-and-drop o selector de archivo).
- **FR-005**: El PDF subido DEBE ser analizado automáticamente para detectar todos sus
  campos AcroForm (nombre, tipo texto/checkbox, página).

**Modo Rellenador — vista de dos paneles**

- **FR-006**: Tras subir un PDF con campos, la vista DEBE cambiar a un layout de dos
  paneles: previsualización a la izquierda y formulario dinámico a la derecha.
- **FR-007**: El panel izquierdo DEBE renderizar el PDF completo y permitir navegar
  entre páginas si el documento tiene más de una.
- **FR-008**: El formulario dinámico DEBE generar exactamente un input de texto por
  cada campo AcroForm detectado, con el nombre del campo como label.
- **FR-009**: Los campos vacíos del formulario NO DEBEN incluirse en el objeto `fields`
  enviado al endpoint — solo se envían campos con valor no vacío.
- **FR-010**: Al hacer clic en "Generar PDF" el navegador DEBE descargar
  automáticamente el PDF rellenado y aplanado.

**Modo Rellenador — PDF sin campos**

- **FR-011**: Si el PDF no contiene campos AcroForm, la aplicación DEBE mostrar un
  mensaje informativo y NO DEBE mostrar formulario dinámico ni botón "Generar PDF".

**API pública**

- **FR-012**: El endpoint `POST /api/fill-pdf` DEBE aceptar `multipart/form-data` con
  los parámetros `file` (PDF binario) y `fields` (JSON string de pares campo→valor).
- **FR-013**: El endpoint DEBE devolver el PDF rellenado y aplanado con
  `Content-Type: application/pdf` y `Content-Disposition: attachment; filename="filled.pdf"`.
- **FR-014**: El endpoint DEBE validar que `file` sea un PDF válido (cabecera `%PDF-`);
  en caso contrario devolver 400 con `{ "error": "INVALID_PDF" }`.
- **FR-015**: El endpoint DEBE validar que `fields` sea un JSON válido; en caso
  contrario devolver 400 con `{ "error": "INVALID_FIELDS" }`.
- **FR-016**: El endpoint DEBE verificar que cada campo del JSON exista en el PDF; si
  alguno no existe devolver 400 con `{ "error": "FIELD_NOT_FOUND", "field": "<name>" }`.
- **FR-017**: Para errores internos inesperados el endpoint DEBE devolver 500 con
  `{ "error": "PROCESSING_ERROR" }`.
- **FR-018**: El endpoint DEBE aplicar `form.flatten()` antes de serializar y devolver
  el PDF (Principio XXXI de la constitución).
- **FR-019**: El archivo `src/app/api/fill-pdf/README.md` DEBE existir con ejemplos
  funcionales de uso en curl, fetch y axios.

**Compatibilidad**

- **FR-020**: Todos los componentes del Modo Rellenador DEBEN soportar modo oscuro
  usando los tokens de color de `src/styles/tokens.css` (Principio XXIII).

### Key Entities

- **AcroFormField**: campo detectado en el PDF — nombre (`string`), tipo
  (`'text' | 'checkbox' | 'other'`), página (`number`). Usado solo en cliente; no
  cruza la frontera HTTP en esta feature.
- **FillRequest**: cuerpo de la petición al endpoint — `file: File`, `fields: Record<string, string>`.
  Los campos vacíos son excluidos antes del envío.
- **FillResponse (éxito)**: blob binario PDF (`application/pdf`).
- **FillResponse (error)**: `{ error: string, field?: string }` con el código HTTP
  correspondiente.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede subir un PDF con campos AcroForm, completar el
  formulario y descargar el PDF rellenado en menos de 30 segundos en condiciones
  normales de red.
- **SC-002**: El formulario dinámico generado contiene exactamente el mismo número de
  campos que los detectados en el PDF — ni más ni menos.
- **SC-003**: El PDF descargado supera la validación "campos aplanados": ningún campo
  AcroForm interactivo está presente en el documento de salida.
- **SC-004**: El endpoint `POST /api/fill-pdf` responde correctamente (código y cuerpo
  esperados) a los cinco escenarios de aceptación de US2 en el 100% de los casos.
- **SC-005**: El endpoint es consumible directamente con los tres ejemplos del README
  (curl, fetch, axios) sin modificaciones adicionales.
- **SC-006**: El cambio de modo Editor ↔ Rellenador ocurre en menos de 200 ms
  (transición perceptivamente instantánea para el usuario).
- **SC-007**: El Modo Rellenador es visualmente consistente con el Modo Editor en
  modo oscuro: sin colores hardcodeados, sin áreas sin tema.

---

## Assumptions

- El Modo Rellenador solo soporta campos de tipo **texto** (AcroForm `TextField`) en
  v1. Checkboxes, radio buttons y listas desplegables quedan fuera de alcance.
- Los campos del formulario dinámico se muestran en el orden en que el PDF los declara
  internamente (orden de creación en AcroForm), no ordenados por posición visual en
  el PDF.
- El estado del formulario rellenador es **efímero**: al cambiar de modo o subir otro
  PDF, el estado se resetea. No hay persistencia del formulario entre sesiones.
- El endpoint no requiere autenticación ni rate limiting en v1 (herramienta de uso
  interno/trusted network — Principio VIII de la constitución).
- La detección de campos AcroForm se realiza en el cliente usando `pdfjs-dist`
  (misma librería ya presente en el proyecto). No se introduce una nueva dependencia
  para esta funcionalidad.
- El tamaño máximo de PDF soportado es el límite por defecto de Next.js para el body
  de una API Route (4 MB). PDFs más grandes requieren configuración adicional fuera
  del alcance de esta feature.
- El Modo Rellenador vive bajo `src/features/filler/` como feature independiente,
  con su propio store (`useFillerStore`) y sin importar nada de `src/features/fields/`
  o `src/features/templates/` (Principio XXIX de la constitución).
