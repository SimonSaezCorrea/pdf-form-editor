# Feature Specification: Bugfixes y Mejoras de Precisión y Usabilidad

**Feature Branch**: `009-precision-ux-fixes`
**Created**: 2026-04-11
**Status**: Draft
**Input**: User description: "Bugfixes y mejoras de precisión y usabilidad en el editor de campos PDF."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Botón Eliminar Visible y Completo (Priority: P1)

Un editor está trabajando con campos posicionados cerca del borde superior o lateral del
PDF. Al pasar el cursor sobre un campo no seleccionado, el botón (✕) aparece completo —
sin recortes visuales, con toda su área clickeable accesible — independientemente de
la proximidad del campo al borde del canvas.

**Why this priority**: Es un bug que impide eliminar campos en posiciones comunes del
documento. Bloquea la operación básica de gestión de campos.

**Independent Test**: Colocar un campo en la esquina superior-izquierda del PDF y
verificar que el botón ✕ se ve y funciona al hacer hover.

**Acceptance Scenarios**:

1. **Given** un campo posicionado en el borde superior del PDF, **When** el usuario
   pasa el cursor sobre el campo (sin seleccionarlo), **Then** el botón ✕ aparece
   completamente visible y es clickeable.
2. **Given** un campo posicionado en el borde izquierdo del PDF, **When** el usuario
   pasa el cursor sobre el campo, **Then** el botón ✕ no queda recortado por el borde
   del contenedor.
3. **Given** cualquier posición del campo en el canvas, **When** el usuario hace click
   en el botón ✕, **Then** el campo se elimina correctamente.

---

### User Story 2 — Coordenadas y Tamaños con Precisión Decimal (Priority: P1)

Un editor necesita posicionar un campo exactamente sobre una línea del formulario PDF,
por ejemplo en x=110.5, y=631.25. Ingresa esos valores en el panel de propiedades y el
campo se mueve a esa posición precisa. Al arrastrar o redimensionar el campo, las
coordenadas resultantes también se muestran con decimales en el panel.

**Why this priority**: La precisión decimal es un requisito de la Constitución (Principio
XXIV) y afecta directamente la calidad del output PDF exportado.

**Independent Test**: Arrastrar un campo, verificar que x/y en el panel muestran
decimales; ingresar x=10.5 manualmente y confirmar que el campo se posiciona en esa
coordenada exacta.

**Acceptance Scenarios**:

1. **Given** el panel de propiedades con un campo seleccionado, **When** el usuario
   ingresa x=110.5 en el input, **Then** el campo se mueve a x=110.5 en coordenadas
   PDF y el input muestra "110.5".
2. **Given** un campo siendo arrastrado, **When** el usuario suelta el campo en una
   posición cualquiera, **Then** el panel muestra x e y con hasta 2 decimales.
3. **Given** los inputs de x, y, width y height, **When** el usuario usa las flechas
   del teclado sobre el input, **Then** el valor cambia en pasos de 0.5.
4. **Given** un campo siendo redimensionado con los handles, **When** el usuario suelta
   el handle, **Then** width y height se almacenan y muestran con decimales.

---

### User Story 3 — Selector de Fuentes Expandido con Google Fonts (Priority: P2)

Un editor abre el selector de fuentes para un campo y ve una lista organizada por
categoría con al menos 20 fuentes. Selecciona "Montserrat" (una fuente que antes no
estaba disponible) y la fuente se aplica al campo. La primera vez que selecciona esa
fuente, se carga desde Google Fonts; las veces siguientes se usa la versión ya cargada.

**Why this priority**: Amplía las opciones tipográficas sin impactar el rendimiento
inicial. Requisito de la Constitución (Principio XXVII).

**Independent Test**: Abrir el selector de fuentes y contar que aparecen ≥20 fuentes
agrupadas por categoría; seleccionar una fuente nueva y verificar que se carga y aplica.

**Acceptance Scenarios**:

1. **Given** el selector de fuentes en el panel de propiedades, **When** el usuario lo
   abre, **Then** aparecen ≥20 fuentes agrupadas en categorías: Sans-serif, Serif,
   Monospace, Display, Handwriting.
2. **Given** el selector con las 20+ fuentes, **When** el usuario selecciona una fuente
   por primera vez, **Then** la fuente se carga desde Google Fonts y se aplica al campo.
3. **Given** una fuente ya seleccionada previamente, **When** el usuario la selecciona
   de nuevo, **Then** se aplica instantáneamente (sin nueva petición de red).
4. **Given** el editor en modo oscuro, **When** el usuario abre el selector de fuentes,
   **Then** el selector respeta los tokens de color del modo oscuro.

---

### User Story 4 — Cambio de Página por Scroll Continuo (Priority: P2)

Un editor está visualizando la página 2 de un PDF de 5 páginas. Hace scroll hacia abajo
hasta llegar al final de la página. Al continuar el scroll más allá del límite inferior,
la vista cambia automáticamente a la página 3. Al hacer scroll hacia arriba desde el
inicio de la página 2, la vista vuelve a la página 1.

**Why this priority**: Mejora la fluidez de navegación en PDFs multipágina. Requisito
de la Constitución (Principio XXVI).

**Independent Test**: Cargar un PDF de 2+ páginas, hacer scroll hasta el final de la
página 1 y continuar; verificar que la vista avanza a la página 2.

**Acceptance Scenarios**:

1. **Given** un PDF multipágina con el scroll en el límite inferior de la página actual,
   **When** el usuario hace scroll hacia abajo, **Then** la vista avanza a la página
   siguiente y el scroll se posiciona en el inicio de esa página.
2. **Given** un PDF multipágina con el scroll en el límite superior de la página actual,
   **When** el usuario hace scroll hacia arriba, **Then** la vista retrocede a la página
   anterior y el scroll se posiciona al final de esa página.
3. **Given** el PDF en la última página con scroll al límite inferior, **When** el
   usuario hace scroll hacia abajo, **Then** no ocurre ningún cambio (ya está en la
   última página).
4. **Given** un PDF de una sola página, **When** el usuario hace scroll hasta el límite,
   **Then** el comportamiento de scroll es el estándar sin cambio de página.
5. **Given** el scroll en mitad de una página (con contenido visible arriba y abajo),
   **When** el usuario hace scroll normal, **Then** el scroll no cambia de página.

---

### User Story 5 — Zoom de Canvas con Ctrl+Scroll sin Afectar el Navegador (Priority: P2)

Un editor tiene el cursor sobre el canvas y usa Ctrl+Scroll hacia arriba para hacer
zoom. El canvas aumenta de tamaño (zoom in) y el navegador no aplica su propio zoom de
página. Al usar Ctrl+Scroll hacia abajo, el canvas hace zoom out. El zoom del canvas
opera con los mismos límites definidos (0.5x–2x en pasos discretos).

**Why this priority**: El comportamiento actual (zoom de página del navegador) es
incorrecto y lo sobrescribe. Requisito de la Constitución (Principio XXV).

**Independent Test**: Con un PDF cargado, hacer Ctrl+Scroll sobre el canvas y verificar
que el canvas hace zoom pero la página del navegador no.

**Acceptance Scenarios**:

1. **Given** el cursor sobre el canvas del PDF, **When** el usuario hace Ctrl+ScrollUp,
   **Then** el zoom del canvas aumenta un nivel y el navegador no aplica zoom de página.
2. **Given** el cursor sobre el canvas del PDF, **When** el usuario hace Ctrl+ScrollDown,
   **Then** el zoom del canvas disminuye un nivel y el navegador no aplica zoom de página.
3. **Given** el canvas en el zoom máximo, **When** el usuario hace Ctrl+ScrollUp,
   **Then** el zoom no supera el límite máximo definido.
4. **Given** el canvas en el zoom mínimo, **When** el usuario hace Ctrl+ScrollDown,
   **Then** el zoom no baja del límite mínimo definido.
5. **Given** el cursor fuera del canvas (ej: en el panel lateral), **When** el usuario
   hace Ctrl+Scroll, **Then** el comportamiento nativo del navegador no es bloqueado.

---

### User Story 6 — Fuentes Reales Embebidas en PDF Exportado (Priority: P2)

Un editor selecciona "Montserrat" para un campo y exporta el PDF. Al abrir el archivo
en cualquier visor (Adobe Acrobat, Preview, Chrome, Foxit), el campo muestra Montserrat
real — no Helvetica ni ninguna fuente de sustitución. La fuente está física y
permanentemente embebida dentro del PDF.

**Why this priority**: Sin embedding, la selección de fuente en el canvas es una promesa
falsa. El usuario ve Montserrat en el preview pero el PDF exportado usa Helvetica. Esta
historia completa la cadena canvas → PDF para la tipografía custom.

**Independent Test**: Seleccionar "Montserrat" en un campo, exportar PDF, abrir en Adobe
Reader o similar — el campo debe renderizarse en Montserrat.

**Acceptance Scenarios**:

1. **Given** un campo con `displayFont: "Montserrat"`, **When** el usuario exporta el
   PDF, **Then** el PDF contiene los bytes TTF de Montserrat embebidos y el campo se
   renderiza en Montserrat en cualquier visor conforme a PDF/AcroForm.
2. **Given** un PDF con 3 campos que usan Montserrat, **When** se exporta, **Then**
   el TTF de Montserrat se embebe una sola vez en el documento, no una por campo.
3. **Given** un campo sin `displayFont` (sin fuente custom seleccionada), **When** se
   exporta el PDF, **Then** se usa Helvetica/TimesRoman/Courier según `fontFamily`
   — el comportamiento anterior no cambia.
4. **Given** un PDF con campos que usan 2 fuentes distintas (ej: Montserrat + Roboto),
   **When** se exporta, **Then** ambos TTF se embeben en el PDF y cada campo se
   renderiza en su fuente correcta.
5. **Given** el visor interactivo del PDF con el campo relleno por el usuario, **When**
   el usuario escribe en el campo, **Then** el texto nuevo se renderiza en Montserrat
   (la fuente embebida está disponible para la appearance stream interactiva).

---

### Edge Cases

- ¿Qué ocurre si el campo tiene coordenadas con más de 2 decimales almacenadas
  internamente? El panel muestra hasta 2 decimales pero el store conserva el valor
  completo.
- ¿Qué ocurre si Google Fonts no está disponible (sin conexión)? El selector muestra
  las fuentes de la lista pero sin renderizar en su tipografía; la carga falla
  silenciosamente y se usa la fuente de fallback del sistema.
- ¿Qué pasa si el archivo TTF de una fuente no está en `public/fonts/`? La exportación
  lanza un error claro indicando qué fuente falta; no cae silenciosamente a Helvetica.
- ¿Los campos sin `displayFont` se ven afectados por el embedding? No — el código de
  embedding solo se activa cuando el campo tiene `displayFont !== undefined`.
- ¿Qué ocurre con el cambio de página por scroll cuando hay campos seleccionados?
  La selección se mantiene; la página cambia normalmente.
- ¿Ctrl+Scroll fuera del área del viewer? El evento no es interceptado por el canvas
  y el navegador aplica su comportamiento nativo.

---

## Requirements *(mandatory)*

### Functional Requirements

**BF-009-01 — Botón eliminar sin recorte**
- **FR-001**: El botón ✕ de eliminación DEBE renderizarse completamente visible sin ser
  recortado por el `overflow: hidden` o cualquier otro contenedor padre.
- **FR-002**: El área clickeable del botón ✕ DEBE ser accesible en su totalidad
  independientemente de la posición del campo en el canvas.

**BF-009-02 — Precisión decimal en coordenadas**
- **FR-003**: Los inputs `x`, `y`, `width` y `height` del PropertiesPanel DEBEN aceptar
  y mostrar valores flotantes con hasta 2 decimales.
- **FR-004**: El `step` de los cuatro inputs numéricos DEBE ser `0.5`.
- **FR-005**: El estado interno de `useFieldStore` DEBE almacenar coordenadas como
  `number` (float) sin redondear a enteros.
- **FR-006**: Las coordenadas resultantes de arrastrar (drag) o redimensionar (resize)
  un campo DEBEN almacenarse con precisión decimal completa.

**FR-009-03 — Google Fonts expandido**
- **FR-007**: El selector de fuentes DEBE mostrar ≥20 fuentes cubriendo las categorías:
  Sans-serif, Serif, Monospace, Display y Handwriting.
- **FR-008**: Las fuentes DEBEN cargarse desde Google Fonts API de forma lazy — solo
  cuando el usuario selecciona una fuente por primera vez.
- **FR-009**: La configuración de fuentes DEBE estar centralizada en un módulo único
  (`src/features/pdf/config/fonts.ts`); ningún componente puede hardcodear nombres
  de fuentes.
- **FR-010**: Las fuentes una vez cargadas DEBEN reutilizarse sin nueva petición de red.

**FR-009-04 — Cambio de página por scroll**
- **FR-011**: Al alcanzar el límite inferior del scroll del viewer con un PDF multipágina,
  scroll adicional hacia abajo DEBE avanzar a la página siguiente.
- **FR-012**: Al alcanzar el límite superior del scroll del viewer con un PDF multipágina,
  scroll adicional hacia arriba DEBE retroceder a la página anterior.
- **FR-013**: El cambio de página por scroll DEBE ocurrir SOLO cuando `scrollTop` es
  exactamente 0 (límite superior) o `scrollTop + clientHeight >= scrollHeight`
  (límite inferior).
- **FR-014**: El cambio de página por scroll NO DEBE aplicarse si el PDF tiene una
  sola página.
- **FR-015**: Este comportamiento DEBE estar implementado en `src/features/canvas/`.

**FR-009-05 — Ctrl+Scroll para zoom del canvas**
- **FR-016**: El contenedor del viewer DEBE registrar un listener `wheel` no-pasivo
  (`{ passive: false }`) que intercepte eventos con `ctrlKey === true`.
- **FR-017**: Al recibir un `wheel` con `ctrlKey`, el handler DEBE llamar
  `event.preventDefault()` para bloquear el zoom nativo del navegador.
- **FR-018**: Ctrl+ScrollUp DEBE incrementar el zoom del canvas al siguiente nivel
  discreto definido en Principio XX.
- **FR-019**: Ctrl+ScrollDown DEBE decrementar el zoom del canvas al nivel discreto
  anterior.
- **FR-020**: Ninguna otra feature DEBE registrar un handler `wheel+ctrlKey`
  independiente del sistema de zoom del canvas.

**FR-009-06 — Embedding de fuentes en PDF exportado**
- **FR-021**: Cuando un campo tiene `displayFont` definido, el API Route DEBE localizar
  el archivo `public/fonts/{slug}-regular.ttf` correspondiente y embeber sus bytes en
  el PDF con `pdfDoc.embedFont(fontBytes)`.
- **FR-022**: La deduplicación de fuentes DEBE aplicarse también a TTF custom — si
  varios campos usan la misma `displayFont`, el TTF se lee y embebe una sola vez.
- **FR-023**: Los archivos TTF DEBEN leerse desde el filesystem (`fs.readFileSync`)
  dentro del API Route; no se permiten fetch a URLs externas en runtime.
- **FR-024**: Si un TTF no está disponible en `public/fonts/`, la exportación DEBE
  lanzar un error descriptivo (no caer silenciosamente a Helvetica).
- **FR-025**: Los campos sin `displayFont` DEBEN continuar usando la lógica de
  `StandardFonts` actual, sin cambios en su comportamiento.

### Key Entities

- **FormField** (`src/types/shared.ts`): Entidad existente con `x`, `y`, `width`,
  `height` como `number` — sin cambios de tipo, pero los consumidores dejan de
  redondear.
- **FontConfig** (`src/features/pdf/config/fonts.ts`): Nueva entidad de configuración.
  Define `FontEntry { name, category, googleFontFamily }` y la lista completa de
  fuentes disponibles.
- **ZoomLevel** (`src/App.tsx`): Constantes `MIN_ZOOM`, `MAX_ZOOM`, `ZOOM_STEP` para
  zoom continuo de 25 % a 300 % en pasos de 10 %. Reemplaza el array discreto anterior.
- **FontAsset** (`public/fonts/`): Archivos `.ttf` estáticos nombrados
  `{font-slug}-regular.ttf` (ej: `montserrat-regular.ttf`). No son imports JS — se
  leen desde el filesystem en el API Route.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El botón ✕ es completamente visible y clickeable en el 100% de las
  posiciones posibles del campo en el canvas, incluyendo los 4 bordes.
- **SC-002**: Los inputs de coordenadas reflejan cambios de posición con granularidad
  de 0.5 unidades — el usuario puede ajustar posiciones en pasos de medio punto PDF.
- **SC-003**: El panel de fuentes ofrece ≥20 opciones organizadas en 5 categorías;
  el tiempo de carga inicial de la aplicación no aumenta porque las fuentes se cargan
  de forma lazy.
- **SC-004**: La navegación entre páginas por scroll es fluida — un scroll continuo
  hasta el límite cambia de página en menos de 100 ms sin saltos visuales.
- **SC-005**: Ctrl+Scroll sobre el canvas nunca activa el zoom nativo del navegador;
  el zoom del canvas responde en cada evento wheel interceptado.
- **SC-006**: Todos los cambios son compatibles con el modo oscuro y con la selección
  múltiple de campos.
- **SC-007**: El PDF exportado con una fuente custom muestra esa fuente en cualquier
  visor PDF conforme a la especificación AcroForm; no se observa Helvetica ni fuente
  de sustitución cuando el TTF está embebido.
- **SC-008**: El tamaño adicional del PDF exportado por fuente embebida no supera
  300 KB por TTF; una fuente usada por múltiples campos sólo aumenta el tamaño una vez.

---

## Assumptions

- El botón ✕ actual usa `position: absolute` dentro del campo; el fix implica cambiar
  el contexto de posicionamiento o usar `overflow: visible` en el contenedor.
- Las coordenadas `x`, `y`, `width`, `height` ya son de tipo `number` en `FormField`;
  el cambio es en la capa de presentación (inputs) y en evitar `Math.round()` en los
  handlers de drag/resize.
- Google Fonts se carga con `<link>` dinámico o la API `document.fonts.load()` al
  seleccionar; no requiere cambios en `layout.tsx` para la carga inicial.
- El listener `wheel` no-pasivo se registra con `useEffect` en el componente
  `PdfViewer` o en el hook `usePdfRenderer` sobre el ref del scroll container.
- El cambio de página por scroll comparte el `onScroll` handler existente del viewer;
  no requiere un nuevo contenedor DOM.
- Los cambios de coordenadas decimales no afectan la exportación PDF — `pdf-lib` acepta
  `number` float directamente en `setPosition`.
