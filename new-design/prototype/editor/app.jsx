/* ─── app.jsx — Enhanced editor prototype ─────────────────────────
   What's new vs the v1:
     ✚ Field-type palette (Texto · Número · Fecha · Checkbox · Firma)
     ✚ Undo / Redo (Cmd+Z / Cmd+Shift+Z) + visible buttons
     ✚ Empty-state overlay on the canvas
     ✚ "Modo Insertar · arrastra…" hint banner
     ✚ Shortcut keys embedded in mode buttons (S / M)
     ✚ Right-click context menu on fields (Duplicar / Eliminar / Bring to front…)
     ✚ Double-click a field on the canvas → inline rename
     ✚ Snap guides (magenta lines) when dragging near another field
     ✚ Field list grouped by page, with type icons
     ✚ Properties panel split into collapsible sections
     ✚ Status bar at the bottom
     ✚ Per-field-type colors (teal / orange / purple / green / pink)
   ────────────────────────────────────────────────────────────────── */

const { useState, useEffect, useRef, useCallback, useMemo } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "selectedAccent": "#dc2626",
  "gridOverlay":    "off",
  "sidebarDensity": "comfy",
  "labelStyle":     "inside"
}/*EDITMODE-END*/;

const FIELD_TYPES = [
  { id: 'text',      label: 'Texto',    short: 'T', color: '#66A5AD' },
  { id: 'number',    label: 'Número',   short: 'N', color: '#F4A261' },
  { id: 'date',      label: 'Fecha',    short: 'D', color: '#a78bfa' },
  { id: 'check',     label: 'Checkbox', short: 'C', color: '#22c55e' },
  { id: 'signature', label: 'Firma',    short: 'F', color: '#ec4899' },
];
const typeOf = (id) => FIELD_TYPES.find(t => t.id === id) || FIELD_TYPES[0];

const SEED_FIELDS = [
  { id: 'f1', page: 1, type: 'text',   group: 'Arrendador',   name: 'arrendador_nombre',   x: 48,  y: 196, width: 252, height: 22, fontSize: 11, font: 'Helvetica', value: '' },
  { id: 'f2', page: 1, type: 'text',   group: 'Arrendador',   name: 'arrendador_rut',      x: 328, y: 196, width: 236, height: 22, fontSize: 11, font: 'Helvetica', value: '' },
  { id: 'f3', page: 1, type: 'text',   group: 'Arrendatario', name: 'arrendatario_nombre', x: 48,  y: 306, width: 252, height: 22, fontSize: 11, font: 'Helvetica', value: '' },
  { id: 'f4', page: 1, type: 'text',   group: 'Arrendatario', name: 'arrendatario_email',  x: 328, y: 306, width: 236, height: 22, fontSize: 11, font: 'Helvetica', value: '' },
  { id: 'f5', page: 1, type: 'text',   group: 'Arrendatario', name: 'arrendatario_tel',    x: 48,  y: 366, width: 252, height: 22, fontSize: 11, font: 'Helvetica', value: '' },
  { id: 'f6', page: 1, type: 'text',   group: 'Arrendatario', name: 'arrendatario_dir',    x: 328, y: 366, width: 236, height: 22, fontSize: 11, font: 'Helvetica', value: '' },
  { id: 'f7', page: 1, type: 'number', group: 'Renta',        name: 'renta_monto',         x: 48,  y: 596, width: 252, height: 22, fontSize: 11, font: 'Helvetica', value: '' },
  { id: 'f8', page: 1, type: 'date',   group: 'Renta',        name: 'renta_dia_pago',      x: 328, y: 596, width: 236, height: 22, fontSize: 11, font: 'Helvetica', value: '' },
];

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

/* ───────────────────────────────────────────────────────────────
   Canvas
   ─────────────────────────────────────────────────────────────── */
const Canvas = ({
  fields, selectedIds, mode, insertType, tweaks,
  onSelect, onAddSelect, onClearSelection,
  onMoveSelected, onCreateField, onContext, onRename, onToggleLock, onDelete,
}) => {
  const stageRef = useRef(null);
  const [drawRect, setDrawRect] = useState(null);
  const [snapGuides, setSnapGuides] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const dragRef = useRef(null);

  /* compute snap guides while moving */
  const computeGuides = (activeId, x, y, w, h) => {
    const v = []; const horizontals = [];
    const others = fields.filter(f => f.id !== activeId);
    const targets = [
      { v: x,         tag: 'L'   },
      { v: x + w / 2, tag: 'CX'  },
      { v: x + w,     tag: 'R'   },
    ];
    const targetsY = [
      { v: y,         tag: 'T'   },
      { v: y + h / 2, tag: 'CY'  },
      { v: y + h,     tag: 'B'   },
    ];
    others.forEach(o => {
      [o.x, o.x + o.width / 2, o.x + o.width].forEach(ox => {
        targets.forEach(t => {
          if (Math.abs(t.v - ox) < 4) v.push(ox);
        });
      });
      [o.y, o.y + o.height / 2, o.y + o.height].forEach(oy => {
        targetsY.forEach(t => {
          if (Math.abs(t.v - oy) < 4) horizontals.push(oy);
        });
      });
    });
    return { v: [...new Set(v)], h: [...new Set(horizontals)] };
  };

  const onStageMouseDown = (e) => {
    if (e.target.closest('.field')) return;
    if (e.button !== 0) return;
    const stage = stageRef.current.getBoundingClientRect();
    const x0 = e.clientX - stage.left;
    const y0 = e.clientY - stage.top;

    if (mode === 'insert' && insertType) {
      setDrawRect({ x: x0, y: y0, w: 0, h: 0 });
      const onMove = (ev) => {
        const cx = ev.clientX - stage.left;
        const cy = ev.clientY - stage.top;
        setDrawRect({ x: Math.min(x0, cx), y: Math.min(y0, cy), w: Math.abs(cx - x0), h: Math.abs(cy - y0) });
      };
      const onUp = (ev) => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        const cx = ev.clientX - stage.left;
        const cy = ev.clientY - stage.top;
        const x = Math.min(x0, cx);
        const y = Math.min(y0, cy);
        const w = Math.abs(cx - x0);
        const h = Math.abs(cy - y0);
        if (w > 8 && h > 8) onCreateField(insertType, { x, y, width: w, height: h });
        else if (w < 4 && h < 4) onCreateField(insertType, { x: x0, y: y0, width: 140, height: 22 });
        setDrawRect(null);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    } else {
      onClearSelection();
    }
  };

  const onFieldMouseDown = (e, fieldId) => {
    e.stopPropagation();
    if (renamingId) return;
    if (mode === 'insert') return;
    if (e.button === 2) return;
    const field = fields.find(f => f.id === fieldId);
    if (e.shiftKey) { onAddSelect(fieldId); return; }
    if (!selectedIds.includes(fieldId)) onSelect(fieldId);
    if (field?.locked) return;

    const start = { x: e.clientX, y: e.clientY };
    const startField = { x: field.x, y: field.y };
    dragRef.current = { moved: false };

    const onMove = (ev) => {
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        dragRef.current.moved = true;
        onMoveSelected(dx, dy, fieldId);
        start.x = ev.clientX; start.y = ev.clientY;
        const live = fields.find(f => f.id === fieldId);
        if (live) {
          const g = computeGuides(fieldId,
            startField.x + dx, startField.y + dy, live.width, live.height);
          setSnapGuides(g);
        }
      }
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setSnapGuides(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div
      ref={stageRef}
      className="pdf-page-stage"
      style={{
        background: '#ffffff',
        backgroundImage: tweaks.gridOverlay !== 'off'
          ? `linear-gradient(to right, rgba(102,165,173,0.10) 1px, transparent 1px),
             linear-gradient(to bottom, rgba(102,165,173,0.10) 1px, transparent 1px)`
          : 'none',
        backgroundSize: tweaks.gridOverlay === '8'  ? '8px 8px'
                      : tweaks.gridOverlay === '16' ? '16px 16px'
                      : tweaks.gridOverlay === '24' ? '24px 24px' : 'auto',
        cursor: mode === 'insert' ? 'crosshair' : mode === 'move' ? 'grab' : 'default',
      }}
      onMouseDown={onStageMouseDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Mock PDF page content */}
      <div className="mock-pdf">
        <h1>Contrato de Arriendo Residencial</h1>
        <p>En la ciudad de Santiago, a la fecha indicada al pie de este documento,
           entre las partes a continuación individualizadas, se ha convenido el
           siguiente contrato de arriendo de inmueble urbano:</p>
        <div className="label">1. Arrendador</div>
        <div className="grid">
          <div><div className="label" style={{marginTop:0}}>Nombre completo</div><div className="underline"/></div>
          <div><div className="label" style={{marginTop:0}}>R.U.T.</div><div className="underline"/></div>
        </div>
        <div className="label">2. Arrendatario</div>
        <div className="grid">
          <div><div className="label" style={{marginTop:0}}>Nombre completo</div><div className="underline"/></div>
          <div><div className="label" style={{marginTop:0}}>Correo electrónico</div><div className="underline"/></div>
          <div><div className="label" style={{marginTop:0}}>Teléfono</div><div className="underline"/></div>
          <div><div className="label" style={{marginTop:0}}>Dirección actual</div><div className="underline"/></div>
        </div>
        <div className="label">3. Objeto del contrato</div>
        <p>El arrendador da en arriendo al arrendatario el inmueble ubicado en la
           dirección detallada a continuación, para uso exclusivo habitacional, con
           las condiciones acordadas por las partes:</p>
        <div className="underline"/>
        <div className="label">4. Renta mensual</div>
        <div className="grid">
          <div><div className="label" style={{marginTop:0}}>Monto (CLP)</div><div className="underline"/></div>
          <div><div className="label" style={{marginTop:0}}>Día de pago</div><div className="underline"/></div>
        </div>
        <div className="footer"><span>Contrato modelo · Página 1 de 2</span><span>v1.4</span></div>
      </div>

      {/* Empty state */}
      {fields.length === 0 && (
        <div className="canvas-empty">
          <div className="canvas-empty__card">
            <h3>Aún no hay campos</h3>
            <p>Elige un tipo de campo en la barra superior y arrastra sobre el PDF para crearlo.</p>
            <p style={{ fontSize: 11 }}>
              <kbd>I</kbd> para entrar a Insertar · <kbd>S</kbd> para volver a Seleccionar
            </p>
          </div>
        </div>
      )}

      {/* Insert hint banner */}
      {mode === 'insert' && insertType && (
        <div className="insert-banner">
          Modo Insertar · {typeOf(insertType).label}
          &nbsp;·&nbsp; arrastra sobre el PDF &nbsp; <kbd>Esc</kbd> para cancelar
        </div>
      )}

      {/* Fields */}
      {fields.map(f => {
        const sel  = selectedIds.includes(f.id);
        const tp   = typeOf(f.type);
        const accent = sel ? tweaks.selectedAccent : tp.color;
        return (
          <div
            key={f.id}
            className={`field ${sel ? 'field--selected' : ''} ${f.locked ? 'is-locked' : ''}`}
            style={{
              left: f.x, top: f.y, width: f.width, height: f.height,
              borderColor: accent,
              background: sel ? `${tweaks.selectedAccent}12` : `${tp.color}14`,
            }}
            onMouseDown={(e) => onFieldMouseDown(e, f.id)}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContext(e, f.id); }}
            onDoubleClick={(e) => { e.stopPropagation(); setRenamingId(f.id); }}
          >
            {renamingId === f.id ? (
              <input
                className="inline-rename"
                defaultValue={f.name}
                autoFocus
                onBlur={(e) => { onRename(f.id, e.target.value); setRenamingId(null); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter')  { onRename(f.id, e.target.value); setRenamingId(null); }
                  if (e.key === 'Escape') { setRenamingId(null); }
                }}
              />
            ) : (
              <>
                {tweaks.labelStyle === 'inside' && (
                  <span className="field__label" style={{ color: accent }}>{f.name}</span>
                )}
                {tweaks.labelStyle === 'above' && (
                  <span style={{
                    position: 'absolute', left: 0, top: -16,
                    fontSize: 10, fontFamily: 'var(--font-family-base)',
                    color: accent, whiteSpace: 'nowrap', pointerEvents: 'none',
                  }}>{f.name}</span>
                )}
                {sel && !f.locked && HANDLES.map(h => (
                  <span key={h}
                        className={`field__handle field__handle--${h}`}
                        style={{ borderColor: tweaks.selectedAccent }} />
                ))}
              </>
            )}
          </div>
        );
      })}

      {/* Snap guides */}
      {snapGuides && snapGuides.v.map((x, i) => (
        <div key={'sv'+i} className="snap-line vert"
             style={{ left: x, top: 0, bottom: 0 }} />
      ))}
      {snapGuides && snapGuides.h.map((y, i) => (
        <div key={'sh'+i} className="snap-line horiz"
             style={{ top: y, left: 0, right: 0 }} />
      ))}

      {/* Rubber-band rectangle while drawing a new field */}
      {drawRect && (
        <div style={{
          position: 'absolute',
          left: drawRect.x, top: drawRect.y,
          width: drawRect.w, height: drawRect.h,
          border: `1.5px dashed ${typeOf(insertType).color}`,
          background: `${typeOf(insertType).color}1a`,
          pointerEvents: 'none',
          zIndex: 20,
        }} />
      )}
    </div>
  );
};

/* ───────────────────────────────────────────────────────────────
   Sidebar — fields grouped by page, with type icons
   ─────────────────────────────────────────────────────────────── */
const Sidebar = ({ fields, selectedIds, onSelect, onToggleLock, onContext, onReorder, density }) => {
  const pages = [...new Set(fields.map(f => f.page))].sort((a, b) => a - b);
  const multi = pages.length > 1;
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  return (
    <aside className="sidebar"
           style={density === 'compact' ? { width: 200 } : undefined}>
      <h3>Fields ({fields.length})</h3>
      <div className="field-list">
        {fields.length === 0 ? (
          <p className="field-list-empty">Selecciona un tipo de campo y arrastra sobre el PDF.</p>
        ) : (
          pages.map(p => {
            const items = fields.filter(f => f.page === p);
            return (
              <div key={p}>
                {multi && (
                  <div className="field-group-head">
                    Página {p} <span className="count">{items.length}</span>
                  </div>
                )}
                {items.map(f => {
                  const tp = typeOf(f.type);
                  return (
                    <div
                      key={f.id}
                      draggable={!f.locked}
                      onDragStart={(e) => {
                        setDragId(f.id);
                        e.dataTransfer.effectAllowed = 'move';
                        try { e.dataTransfer.setData('text/plain', f.id); } catch {}
                      }}
                      onDragOver={(e) => {
                        if (!dragId || dragId === f.id) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        setOverId(f.id);
                      }}
                      onDragLeave={() => { if (overId === f.id) setOverId(null); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragId && dragId !== f.id) onReorder(dragId, f.id);
                        setDragId(null); setOverId(null);
                      }}
                      onDragEnd={() => { setDragId(null); setOverId(null); }}
                      className={`field-list-item ${selectedIds.includes(f.id) ? 'selected' : ''} ${f.locked ? 'is-locked' : ''} ${overId === f.id ? 'drag-over' : ''} ${dragId === f.id ? 'is-dragging' : ''}`}
                      style={density === 'compact' ? { padding: '4px 8px', fontSize: 11 } : null}
                      onClick={(e) => onSelect(f.id, e.shiftKey)}
                      onContextMenu={(e) => { e.preventDefault(); onContext(e, f.id); }}
                    >
                      <span className={`ftype-badge ftype-${f.type}`}>{tp.short}</span>
                      <div style={{ display:'flex', flexDirection:'column', flex: 1, minWidth: 0, gap: 1 }}>
                        <span className="name" title={f.name}>{f.name}</span>
                        {f.group && (
                          <span style={{
                            fontSize: 10, color: 'var(--fg-3)',
                            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                          }}>{f.group}</span>
                        )}
                      </div>
                      {!multi && <span className="page">p.{f.page}</span>}
                      <span className={`lock-icon ${f.locked ? 'is-locked' : ''}`}
                            onClick={(e) => { e.stopPropagation(); onToggleLock(f.id); }}
                            title={f.locked ? 'Desbloquear' : 'Bloquear'}>
                        <Icon name={f.locked ? 'lock' : 'unlock'} size={12} />
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};

/* ───────────────────────────────────────────────────────────────
   Properties Panel — collapsible sections
   ─────────────────────────────────────────────────────────────── */
const Section = ({ title, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`prop-section ${open ? '' : 'collapsed'}`}>
      <h4 className="prop-section__head" onClick={() => setOpen(o => !o)}>
        <span className="chev">▾</span>{title}
      </h4>
      <div className="prop-section__body">{children}</div>
    </div>
  );
};

const Properties = ({ fields, selectedIds, onUpdate, onUpdateMany, onDelete }) => {
  if (selectedIds.length === 0) {
    return (
      <aside className="properties-panel">
        <h3>Properties</h3>
        <p className="no-selection">
          No field selected.<br />
          Selecciona un campo en el PDF o en la lista para editar sus propiedades.
        </p>
      </aside>
    );
  }
  if (selectedIds.length > 1) {
    const selected = fields.filter(f => selectedIds.includes(f.id));
    const firstSize = selected[0].fontSize;
    const mixedSize = selected.some(f => f.fontSize !== firstSize);
    return (
      <aside className="properties-panel">
        <h3>Properties ({selectedIds.length} campos)</h3>
        <Section title="Categoría">
          <Input id="multi-group" label="Categoría (opcional)" type="text"
                 value={(() => {
                   const first = selected[0]?.group ?? '';
                   const mixed = selected.some(f => (f.group ?? '') !== first);
                   return mixed ? '' : first;
                 })()}
                 placeholder={selected.some(f => (f.group ?? '') !== (selected[0]?.group ?? '')) ? '— mezclado —' : 'Ej. Arrendador'}
                 onChange={(e) => onUpdateMany(selectedIds, { group: e.target.value })} />
        </Section>
        <Section title="Tipografía">
          <Input id="multi-size" label="Tamaño (pt)" type="number"
                 value={mixedSize ? '' : String(firstSize)}
                 placeholder={mixedSize ? '—' : undefined}
                 onChange={(e) => onUpdateMany(selectedIds, { fontSize: Number(e.target.value) })} />
          <Select id="multi-font" label="Fuente"
                  value={selected[0].font || 'Helvetica'}
                  onChange={(e) => onUpdateMany(selectedIds, { font: e.target.value })}
                  options={[
                    { value: 'Helvetica', label: 'Helvetica' },
                    { value: 'Times-Roman', label: 'Times Roman' },
                    { value: 'Courier', label: 'Courier' },
                  ]} />
        </Section>
        <Section title="Comportamiento">
          {[
            { key: 'required',    label: 'Rellenado obligatorio' },
            { key: 'showBorder',  label: 'Mostrar borde en PDF'  },
            { key: 'autoFitFont', label: 'Ajustar fuente al contenido' },
            { key: 'multiline',   label: 'Texto multi-línea'    },
          ].map(({ key, label }) => {
            const first = selected[0]?.[key] || false;
            const mixed = selected.some(f => (f[key] || false) !== first);
            return (
              <label className="prop-checkbox" key={key}>
                <input type="checkbox"
                       checked={!mixed && first}
                       ref={el => { if (el) el.indeterminate = mixed; }}
                       onChange={(e) => onUpdateMany(selectedIds, { [key]: e.target.checked })} />
                {label}
                {mixed && <span style={{ color: 'var(--fg-3)', fontSize: 10, marginLeft: 4 }}>(mezclado)</span>}
              </label>
            );
          })}
        </Section>
        <Button variant="danger" icon={<Icon name="trash" size={14} />}
                onClick={() => selectedIds.forEach(onDelete)}>
          Eliminar {selectedIds.length} campos
        </Button>
      </aside>
    );
  }
  const id = selectedIds[0];
  const field = fields.find(f => f.id === id);
  if (!field) return null;
  const hasDup = fields.some(f => f.id !== field.id && f.name === field.name);
  const u = (k, v) => onUpdate(id, { [k]: v });
  const tp = typeOf(field.type);

  return (
    <aside className="properties-panel">
      <h3 style={{ display:'flex', alignItems:'center', gap: 8 }}>
        <span className={`ftype-badge ftype-${field.type}`}>{tp.short}</span>
        {tp.label}
      </h3>

      <Section title="General">
        <Input id="prop-name" label="Name / ID" type="text"
               value={field.name}
               error={hasDup ? '⚠ Duplicate name — must be unique' : undefined}
               onChange={(e) => u('name', e.target.value)} />
        <Input id="prop-group" label="Categoría (opcional)" type="text"
               value={field.group || ''}
               placeholder="Ej. Arrendador, Datos del cliente…"
               hint="Agrupa campos en la vista de Rellenar"
               onChange={(e) => u('group', e.target.value)} />
        <Select id="prop-type" label="Tipo"
                value={field.type}
                onChange={(e) => u('type', e.target.value)}
                options={FIELD_TYPES.map(t => ({ value: t.id, label: t.label }))} />
        <Input id="prop-value" label="Valor predeterminado" type="text"
               value={field.value || ''}
               placeholder='Texto que aparecerá en el PDF…'
               onChange={(e) => u('value', e.target.value)} />
      </Section>

      <Section title="Posición y tamaño">
        <div className="prop-row">
          <Input id="prop-x" label="X (pt)" type="number" value={field.x.toFixed(1)}
                 onChange={(e) => u('x', Number(e.target.value))} />
          <Input id="prop-y" label="Y (pt)" type="number" value={field.y.toFixed(1)}
                 onChange={(e) => u('y', Number(e.target.value))} />
        </div>
        <div className="prop-row">
          <Input id="prop-w" label="Width" type="number" value={field.width.toFixed(1)}
                 onChange={(e) => u('width', Number(e.target.value))} />
          <Input id="prop-h" label="Height" type="number" value={field.height.toFixed(1)}
                 onChange={(e) => u('height', Number(e.target.value))} />
        </div>
      </Section>

      <Section title="Tipografía">
        <Select id="prop-font" label="Fuente"
                value={field.font || 'Helvetica'}
                onChange={(e) => u('font', e.target.value)}
                options={[
                  { value: 'Helvetica', label: 'Helvetica' },
                  { value: 'Times-Roman', label: 'Times Roman' },
                  { value: 'Courier', label: 'Courier' },
                ]} />
        <Input id="prop-size" label="Tamaño (pt)" type="number"
               value={String(field.fontSize)}
               onChange={(e) => u('fontSize', Number(e.target.value))} />
      </Section>

      <Section title="Comportamiento" defaultOpen={false}>
        <label className="prop-checkbox">
          <input type="checkbox" checked={field.required || false}
                 onChange={(e) => u('required', e.target.checked)} />
          Rellenado obligatorio
        </label>
        <label className="prop-checkbox">
          <input type="checkbox" checked={field.showBorder || false}
                 onChange={(e) => u('showBorder', e.target.checked)} />
          Mostrar borde en PDF
        </label>
        <label className="prop-checkbox">
          <input type="checkbox" checked={field.autoFitFont || false}
                 onChange={(e) => u('autoFitFont', e.target.checked)} />
          Ajustar fuente al contenido
        </label>
        <label className="prop-checkbox">
          <input type="checkbox" checked={field.multiline || false}
                 onChange={(e) => u('multiline', e.target.checked)} />
          Texto multi-línea
        </label>
      </Section>

      <Button variant="danger" icon={<Icon name="trash" size={14} />}
              onClick={() => onDelete(id)}>
        Eliminar campo
      </Button>
    </aside>
  );
};

/* ───────────────────────────────────────────────────────────────
   Alignment bar — shown when 2+ fields are selected
   ─────────────────────────────────────────────────────────────── */
const AlignBar = ({ count, onAlign, onDistribute }) => {
  const Btn = ({ act, title, children }) => (
    <Tooltip content={title}>
      <button className="align-btn" onClick={() => onAlign(act)} aria-label={title}>
        {children}
      </button>
    </Tooltip>
  );
  const DBtn = ({ act, title, children }) => (
    <Tooltip content={title}>
      <button className="align-btn" onClick={() => onDistribute(act)} aria-label={title}>
        {children}
      </button>
    </Tooltip>
  );
  return (
    <div className="align-bar">
      <span className="count">{count} seleccionados</span>
      <Btn act="left" title="Alinear a la izquierda">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="4" y1="4" x2="4" y2="20"/><rect x="6" y="6" width="10" height="4"/><rect x="6" y="14" width="14" height="4"/></svg>
      </Btn>
      <Btn act="center-h" title="Centrar horizontalmente">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="12" y1="4" x2="12" y2="20"/><rect x="7" y="6" width="10" height="4"/><rect x="5" y="14" width="14" height="4"/></svg>
      </Btn>
      <Btn act="right" title="Alinear a la derecha">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="20" y1="4" x2="20" y2="20"/><rect x="8" y="6" width="10" height="4"/><rect x="4" y="14" width="14" height="4"/></svg>
      </Btn>
      <span className="sep" />
      <Btn act="top" title="Alinear arriba">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="4" y1="4" x2="20" y2="4"/><rect x="6" y="6" width="4" height="10"/><rect x="14" y="6" width="4" height="14"/></svg>
      </Btn>
      <Btn act="center-v" title="Centrar verticalmente">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="4" y1="12" x2="20" y2="12"/><rect x="6" y="7" width="4" height="10"/><rect x="14" y="5" width="4" height="14"/></svg>
      </Btn>
      <Btn act="bottom" title="Alinear abajo">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="4" y1="20" x2="20" y2="20"/><rect x="6" y="8" width="4" height="10"/><rect x="14" y="4" width="4" height="14"/></svg>
      </Btn>
      <span className="sep" />
      <DBtn act="h" title="Distribuir horizontalmente">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="4" y1="4" x2="4" y2="20"/><line x1="20" y1="4" x2="20" y2="20"/><rect x="7" y="8" width="3" height="8"/><rect x="13" y="8" width="3" height="8"/></svg>
      </DBtn>
      <DBtn act="v" title="Distribuir verticalmente">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="4" y1="4" x2="20" y2="4"/><line x1="4" y1="20" x2="20" y2="20"/><rect x="8" y="7" width="8" height="3"/><rect x="8" y="13" width="8" height="3"/></svg>
      </DBtn>
    </div>
  );
};

/* ───────────────────────────────────────────────────────────────
   Insert dropdown — used in narrow viewports instead of chip strip
   ─────────────────────────────────────────────────────────────── */
const InsertDropdown = ({ mode, insertType, onPick }) => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onDown = () => setOpen(false);
    setTimeout(() => window.addEventListener('mousedown', onDown), 0);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);
  const active = mode === 'insert';
  const cur = active && insertType ? typeOf(insertType) : null;
  return (
    <div className="insert-dd" onMouseDown={(e) => e.stopPropagation()}>
      <button className={`insert-dd__btn ${active ? 'active' : ''}`}
              onClick={() => setOpen(o => !o)}>
        {cur ? `Insertar · ${cur.label}` : 'Insertar'} ▾
      </button>
      {open && (
        <div className="insert-dd__menu">
          {FIELD_TYPES.map(t => (
            <div key={t.id}
                 className={`insert-dd__item ${insertType === t.id ? 'active' : ''}`}
                 onClick={() => { onPick(t.id); setOpen(false); }}>
              <span className={`ftype-badge ftype-${t.id}`}>{t.short}</span>
              <span>{t.label}</span>
              <span className="key">{t.short}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ───────────────────────────────────────────────────────────────
   Toolbar (top, two rows)
   ─────────────────────────────────────────────────────────────── */
const Toolbar = ({
  filename, mode, insertType, onSetMode, onSetInsertType,
  zoom, onZoomIn, onZoomOut,
  thumbnailsVisible, onToggleThumbnails, theme, onToggleTheme,
  onImport, onExport, onExportPdf, fieldCount, dirty,
  canUndo, canRedo, onUndo, onRedo,
}) => (
  <header className="app-header">
    <div className="header-top">
      <h1>
        <button className="title-btn" title="Inicio">PDF Form Editor</button>
      </h1>
      <span className="filename" title={filename}>{filename}</span>
      {dirty && (
        <span style={{ fontSize: 11, color: 'var(--color-accent)',
                       background: 'rgba(244,162,97,0.12)',
                       padding: '1px 6px', borderRadius: 999 }}>sin guardar</span>
      )}
      <div className="header-top-actions">
        <div className="undo-cluster">
          <Tooltip content="Deshacer · ⌘Z">
            <IconButton variant="navbar" size="sm" label="Deshacer"
                        onClick={onUndo} disabled={!canUndo}
                        icon={<Icon name="arrowLeft" size={14} />} />
          </Tooltip>
          <Tooltip content="Rehacer · ⌘⇧Z">
            <IconButton variant="navbar" size="sm" label="Rehacer"
                        onClick={onRedo} disabled={!canRedo}
                        icon={<span style={{ display:'inline-block', transform:'scaleX(-1)' }}>
                                <Icon name="arrowLeft" size={14} />
                              </span>} />
          </Tooltip>
        </div>
        <Button variant="navbar" size="sm" onClick={onImport}>Importar</Button>
        <Button variant="navbar" size="sm" onClick={onExport}>Exportar</Button>
        <Button variant="primary" size="sm" icon={<Icon name="download" size={14}/>} onClick={onExportPdf}>
          Exportar PDF
        </Button>
        <IconButton variant="navbar"
                    label={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                    onClick={onToggleTheme}
                    icon={<Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />} />
      </div>
    </div>

    <div className="header-toolbar">
      <div style={{ display:'flex', alignItems:'center' }}>
        <div className="toolbar-modes">
          <button className={`mode-btn-tb ${mode === 'select' ? 'active' : ''}`}
                  onClick={() => onSetMode('select')}>
            Seleccionar <span className="key">S</span>
          </button>
          <button className={`mode-btn-tb ${mode === 'move' ? 'active' : ''}`}
                  onClick={() => onSetMode('move')}>
            Mover <span className="key">M</span>
          </button>
        </div>
        <div className="type-chips" role="group" aria-label="Tipos de campo">
          <span style={{ fontSize: 10, color:'rgba(255,255,255,0.5)', padding:'0 6px', textTransform:'uppercase', letterSpacing:'.05em' }}>Insertar</span>
          {FIELD_TYPES.map(t => (
            <Tooltip key={t.id} content={`${t.label} · ${t.short}`}>
              <button className={`type-chip ${(mode === 'insert' && insertType === t.id) ? 'active' : ''}`}
                      onClick={() => onSetInsertType(t.id)}>
                <span className="key">{t.short}</span>
                {t.label}
              </button>
            </Tooltip>
          ))}
        </div>
        <InsertDropdown mode={mode} insertType={insertType} onPick={onSetInsertType} />
      </div>
      <div className="header-toolbar-center">
        <div className="zoom-controls">
          <IconButton variant="navbar" size="sm" label="Alejar"
                      icon={<Icon name="minus" size={14} />}
                      onClick={onZoomOut} disabled={zoom <= 0.25} />
          <span className="zoom-label">{Math.round(zoom * 100)}%</span>
          <IconButton variant="navbar" size="sm" label="Acercar"
                      icon={<Icon name="plus" size={14} />}
                      onClick={onZoomIn} disabled={zoom >= 3} />
        </div>
      </div>
      <div className="header-toolbar-actions">
        <Button variant="navbar" size="sm" onClick={onToggleThumbnails}>
          {thumbnailsVisible ? 'Ocultar páginas' : 'Ver páginas'}
        </Button>
      </div>
    </div>
  </header>
);

/* ───────────────────────────────────────────────────────────────
   Thumbnails
   ─────────────────────────────────────────────────────────────── */
const Thumbs = ({ currentPage, onSelect }) => (
  <div className="thumbnail-strip">
    {[1, 2].map(n => (
      <button key={n}
              className={`thumb ${n === currentPage ? 'active' : ''}`}
              onClick={() => onSelect(n)}>
        <div className="thumb__page">
          <div className="thumb__page-lines">
            <span /><span /><span /><span /><span />
          </div>
        </div>
        <span className="thumb__label">{n}</span>
      </button>
    ))}
  </div>
);

/* ───────────────────────────────────────────────────────────────
   Status bar
   ─────────────────────────────────────────────────────────────── */
const StatusBar = ({ fields, selectedIds, currentPage, totalPages, mode, insertType }) => {
  const modeLabel = mode === 'insert' && insertType
    ? `Insertar · ${typeOf(insertType).label}`
    : mode === 'move' ? 'Mover' : 'Seleccionar';
  return (
    <div className="status-bar">
      <span className="pill">{modeLabel}</span>
      <span>{fields.length} campo{fields.length === 1 ? '' : 's'}</span>
      <span className="dot" />
      <span>{selectedIds.length} seleccionado{selectedIds.length === 1 ? '' : 's'}</span>
      <span className="dot" />
      <span>Página {currentPage} de {totalPages}</span>
      <div className="right">
        <span>612 × 792 pt</span>
        <span className="dot" />
        <span>A4 · vertical</span>
      </div>
    </div>
  );
};

/* ───────────────────────────────────────────────────────────────
   Context Menu
   ─────────────────────────────────────────────────────────────── */
const ContextMenu = ({ position, onClose, items }) => {
  useEffect(() => {
    const onDown = () => onClose();
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onDown);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onDown);
    };
  }, [onClose]);
  return (
    <div className="context-menu" style={{ left: position.x, top: position.y }}
         onMouseDown={(e) => e.stopPropagation()}>
      {items.map((it, i) => it.divider
        ? <div key={'d'+i} className="ctx-divider" />
        : (
          <div key={i}
               className={`ctx-item ${it.danger ? 'danger' : ''}`}
               onMouseDown={(e) => { e.stopPropagation(); it.onClick?.(); onClose(); }}>
            <span>{it.label}</span>
            {it.shortcut && <span className="ctx-shortcut">{it.shortcut}</span>}
          </div>
        )
      )}
    </div>
  );
};

/* ───────────────────────────────────────────────────────────────
   Root
   ─────────────────────────────────────────────────────────────── */
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [theme, setTheme] = useState('dark');
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);

  const [fields, setFields] = useState(SEED_FIELDS);
  const fieldsRef = useRef(fields);
  useEffect(() => { fieldsRef.current = fields; }, [fields]);

  const [selectedIds, setSelectedIds] = useState(['f4']);
  const [mode, setMode] = useState('select');
  const [insertType, setInsertType] = useState(null);
  const [zoom, setZoom] = useState(0.78);
  const [thumbnailsVisible, setThumbnailsVisible] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [toast, setToast] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);

  /* ── Undo / Redo ────────────────────────────────────────────── */
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const recordH = (prev) => {
    setUndoStack(u => [...u, prev].slice(-50));
    setRedoStack([]);
  };
  const undo = () => {
    setUndoStack(u => {
      if (!u.length) return u;
      const last = u[u.length - 1];
      setRedoStack(r => [fieldsRef.current, ...r].slice(0, 50));
      setFields(last);
      return u.slice(0, -1);
    });
  };
  const redo = () => {
    setRedoStack(r => {
      if (!r.length) return r;
      const next = r[0];
      setUndoStack(u => [...u, fieldsRef.current].slice(-50));
      setFields(next);
      return r.slice(1);
    });
  };

  const flash = (msg) => {
    setToast(msg);
    clearTimeout(flash._t);
    flash._t = setTimeout(() => setToast(null), 2000);
  };

  /* ── Field mutations (all record history) ──────────────────── */
  const selectOnly  = (id) => setSelectedIds(id ? [id] : []);
  const addSelect   = (id) =>
    setSelectedIds(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const clearSel    = () => setSelectedIds([]);

  const updateField = (id, partial) => {
    setFields(fs => { recordH(fs); return fs.map(f => f.id === id ? { ...f, ...partial } : f); });
    setDirty(true);
  };
  const updateMany = (ids, partial) => {
    setFields(fs => { recordH(fs); return fs.map(f => ids.includes(f.id) ? { ...f, ...partial } : f); });
    setDirty(true);
  };
  const deleteField = (id) => {
    setFields(fs => { recordH(fs); return fs.filter(f => f.id !== id); });
    setSelectedIds(s => s.filter(x => x !== id));
    setDirty(true);
  };
  const moveSelected = (dx, dy, primaryId) => {
    const ids = selectedIds.includes(primaryId) ? selectedIds : [primaryId];
    setFields(fs => fs.map(f =>
      ids.includes(f.id) ? { ...f, x: Math.max(0, f.x + dx), y: Math.max(0, f.y + dy) } : f
    ));
    setDirty(true);
  };
  const moveDragStart = useRef(false);
  // record a single history entry per drag op
  const wrapMove = (dx, dy, id) => {
    if (!moveDragStart.current) {
      recordH(fieldsRef.current);
      moveDragStart.current = true;
      setTimeout(() => { moveDragStart.current = false; }, 250);
    }
    moveSelected(dx, dy, id);
  };

  const createField = (typeId, { x, y, width, height }) => {
    const n = fields.length + 1;
    const newField = {
      id: 'f_' + Date.now().toString(36),
      page: currentPage, type: typeId,
      name: `${typeId}_${n}`,
      x, y, width, height,
      fontSize: 11, font: 'Helvetica', value: '',
    };
    setFields(fs => { recordH(fs); return [...fs, newField]; });
    setSelectedIds([newField.id]);
    setMode('select');
    setInsertType(null);
    setDirty(true);
  };

  const renameField = (id, name) => updateField(id, { name });
  const duplicateField = (id) => {
    const f = fields.find(x => x.id === id);
    if (!f) return;
    const copy = { ...f, id: 'f_' + Date.now().toString(36),
                   name: f.name + '_copy', x: f.x + 12, y: f.y + 12 };
    setFields(fs => { recordH(fs); return [...fs, copy]; });
    setSelectedIds([copy.id]);
    setDirty(true);
  };
  const bringToFront = (id) => {
    setFields(fs => {
      recordH(fs);
      const idx = fs.findIndex(x => x.id === id);
      if (idx < 0) return fs;
      const copy = fs.slice(); const [it] = copy.splice(idx, 1); copy.push(it);
      return copy;
    });
  };
  const sendToBack = (id) => {
    setFields(fs => {
      recordH(fs);
      const idx = fs.findIndex(x => x.id === id);
      if (idx < 0) return fs;
      const copy = fs.slice(); const [it] = copy.splice(idx, 1); copy.unshift(it);
      return copy;
    });
  };
  const toggleLock = (id) => {
    setFields(fs => {
      recordH(fs);
      return fs.map(f => f.id === id ? { ...f, locked: !f.locked } : f);
    });
    setDirty(true);
  };

  const reorderField = (sourceId, targetId) => {
    if (sourceId === targetId) return;
    setFields(fs => {
      recordH(fs);
      const src = fs.findIndex(f => f.id === sourceId);
      const tgt = fs.findIndex(f => f.id === targetId);
      if (src < 0 || tgt < 0) return fs;
      const next = fs.slice();
      const [item] = next.splice(src, 1);
      next.splice(tgt, 0, item);
      return next;
    });
    setDirty(true);
  };

  /* ── Alignment & distribution ----------------------------------- */
  const alignSelected = (kind) => {
    if (selectedIds.length < 2) return;
    setFields(fs => {
      recordH(fs);
      const sel = fs.filter(f => selectedIds.includes(f.id));
      const lefts   = sel.map(f => f.x);
      const rights  = sel.map(f => f.x + f.width);
      const tops    = sel.map(f => f.y);
      const bottoms = sel.map(f => f.y + f.height);
      const minL = Math.min(...lefts);
      const maxR = Math.max(...rights);
      const minT = Math.min(...tops);
      const maxB = Math.max(...bottoms);
      const cx = (minL + maxR) / 2;
      const cy = (minT + maxB) / 2;
      return fs.map(f => {
        if (!selectedIds.includes(f.id)) return f;
        if (f.locked) return f;
        switch (kind) {
          case 'left':     return { ...f, x: minL };
          case 'right':    return { ...f, x: maxR - f.width };
          case 'center-h': return { ...f, x: cx - f.width / 2 };
          case 'top':      return { ...f, y: minT };
          case 'bottom':   return { ...f, y: maxB - f.height };
          case 'center-v': return { ...f, y: cy - f.height / 2 };
          default: return f;
        }
      });
    });
    setDirty(true);
  };

  const distributeSelected = (axis) => {
    if (selectedIds.length < 3) {
      flash('Selecciona al menos 3 campos para distribuir');
      return;
    }
    setFields(fs => {
      recordH(fs);
      const sel = fs.filter(f => selectedIds.includes(f.id));
      if (axis === 'h') {
        const sorted = [...sel].sort((a, b) => a.x - b.x);
        const firstC = sorted[0].x + sorted[0].width / 2;
        const lastC  = sorted[sorted.length - 1].x + sorted[sorted.length - 1].width / 2;
        const span = lastC - firstC;
        const step = span / (sorted.length - 1);
        const targetCenters = new Map();
        sorted.forEach((f, i) => targetCenters.set(f.id, firstC + step * i));
        return fs.map(f => {
          if (!selectedIds.includes(f.id) || f.locked) return f;
          const c = targetCenters.get(f.id);
          return c == null ? f : { ...f, x: c - f.width / 2 };
        });
      } else {
        const sorted = [...sel].sort((a, b) => a.y - b.y);
        const firstC = sorted[0].y + sorted[0].height / 2;
        const lastC  = sorted[sorted.length - 1].y + sorted[sorted.length - 1].height / 2;
        const span = lastC - firstC;
        const step = span / (sorted.length - 1);
        const targetCenters = new Map();
        sorted.forEach((f, i) => targetCenters.set(f.id, firstC + step * i));
        return fs.map(f => {
          if (!selectedIds.includes(f.id) || f.locked) return f;
          const c = targetCenters.get(f.id);
          return c == null ? f : { ...f, y: c - f.height / 2 };
        });
      }
    });
    setDirty(true);
  };

  /* ── Narrow viewport detection ───────────────────── */
  const [isNarrow, setIsNarrow] = useState(() => window.innerWidth < 1180);
  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 1180);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* ── Mode + insert handling ────────────────────────────────── */
  const pickInsertType = (typeId) => {
    setMode('insert');
    setInsertType(typeId);
    setSelectedIds([]);
  };

  /* ── Keyboard shortcuts ────────────────────────────────────── */
  useEffect(() => {
    const onKey = (e) => {
      const inField = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (inField) return;
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          if (e.shiftKey) redo(); else undo();
          return;
        }
      }
      if (e.key === 'Escape') {
        if (mode === 'insert') { setMode('select'); setInsertType(null); }
        setSelectedIds([]);
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length) {
        e.preventDefault();
        selectedIds.forEach(deleteField);
        return;
      }
      if (e.key.toLowerCase() === 's') setMode('select');
      if (e.key.toLowerCase() === 'm') setMode('move');
      if (e.key.toLowerCase() === 'i' && mode !== 'insert') pickInsertType('text');
      const typeMatch = FIELD_TYPES.find(t => t.short.toLowerCase() === e.key.toLowerCase());
      if (typeMatch && (e.key === typeMatch.short || e.key === typeMatch.short.toLowerCase()) && !e.metaKey && !e.ctrlKey) {
        // only when no modifier — and skip 'S' (already mode select)
        if (typeMatch.short !== 'S' && typeMatch.short !== 'M') {
          pickInsertType(typeMatch.id);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, selectedIds, fields]);

  const onFieldContext = (e, id) => {
    if (!selectedIds.includes(id)) setSelectedIds([id]);
    setContextMenu({ x: e.clientX, y: e.clientY, id });
  };

  const ctxItems = contextMenu ? (() => {
    const f = fields.find(x => x.id === contextMenu.id);
    return [
      { label: 'Duplicar', shortcut: '⌘D', onClick: () => duplicateField(contextMenu.id) },
      { label: 'Copiar propiedades', shortcut: '⌘C', onClick: () => flash('Propiedades copiadas') },
      { divider: true },
      { label: 'Traer al frente', onClick: () => bringToFront(contextMenu.id) },
      { label: 'Enviar al fondo', onClick: () => sendToBack(contextMenu.id) },
      { divider: true },
      { label: f?.locked ? 'Desbloquear campo' : 'Bloquear campo',
        onClick: () => toggleLock(contextMenu.id) },
      { divider: true },
      { label: 'Eliminar', shortcut: 'Del', danger: true, onClick: () => deleteField(contextMenu.id) },
    ];
  })() : [];

  return (
    <div className={`app ${isNarrow ? 'is-narrow' : ''}`}>
      <Toolbar
        filename="contrato-arriendo.pdf"
        mode={mode} insertType={insertType}
        onSetMode={(m) => { setMode(m); if (m !== 'insert') setInsertType(null); }}
        onSetInsertType={pickInsertType}
        zoom={zoom}
        onZoomIn={()  => setZoom(z => Math.min(3,    Math.round((z + 0.1) * 100) / 100))}
        onZoomOut={() => setZoom(z => Math.max(0.25, Math.round((z - 0.1) * 100) / 100))}
        thumbnailsVisible={thumbnailsVisible}
        onToggleThumbnails={() => setThumbnailsVisible(v => !v)}
        theme={theme}
        onToggleTheme={() => setTheme(th => th === 'dark' ? 'light' : 'dark')}
        onImport={() => flash('Modal de importar — abrir aquí')}
        onExport={() => setShowExport(true)}
        onExportPdf={() => { flash('PDF exportado · contrato-arriendo.pdf'); setDirty(false); }}
        fieldCount={fields.length}
        dirty={dirty}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={undo}
        onRedo={redo}
      />

      <div className="editor-layout">
        {thumbnailsVisible && <Thumbs currentPage={currentPage} onSelect={setCurrentPage} />}
        <Sidebar fields={fields} selectedIds={selectedIds}
                 onSelect={(id, shift) => shift ? addSelect(id) : selectOnly(id)}
                 onToggleLock={toggleLock}
                 onContext={onFieldContext}
                 onReorder={reorderField}
                 density={t.sidebarDensity} />
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minWidth: 0 }}>
          <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg-canvas)',
                        display:'flex', justifyContent:'center', padding: 'var(--space-4)', position:'relative' }}>
            {selectedIds.length >= 2 && (
              <AlignBar count={selectedIds.length}
                        onAlign={alignSelected}
                        onDistribute={distributeSelected} />
            )}
            <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', width: 612, height: 792 }}>
              <Canvas
                fields={fields}
                selectedIds={selectedIds}
                mode={mode}
                insertType={insertType}
                tweaks={t}
                onSelect={selectOnly}
                onAddSelect={addSelect}
                onClearSelection={clearSel}
                onMoveSelected={(dx, dy, id) => wrapMove(dx / zoom, dy / zoom, id)}
                onCreateField={(typeId, dims) =>
                  createField(typeId, { x: dims.x / zoom, y: dims.y / zoom,
                                        width: dims.width / zoom, height: dims.height / zoom })
                }
                onContext={onFieldContext}
                onRename={renameField}
                onToggleLock={toggleLock}
                onDelete={deleteField}
              />
            </div>
          </div>
        </div>
        <Properties
          fields={fields}
          selectedIds={selectedIds}
          onUpdate={updateField}
          onUpdateMany={updateMany}
          onDelete={deleteField}
        />
      </div>

      <StatusBar
        fields={fields}
        selectedIds={selectedIds}
        currentPage={currentPage}
        totalPages={2}
        mode={mode}
        insertType={insertType}
      />

      <button className="shortcuts-fab"
              onClick={() => setShowShortcuts(v => !v)}
              aria-label="Atajos de teclado" title="Atajos de teclado">?</button>
      <ShortcutsPanel visible={showShortcuts} onClose={() => setShowShortcuts(false)} />

      {contextMenu && (
        <ContextMenu position={contextMenu}
                     items={ctxItems}
                     onClose={() => setContextMenu(null)} />
      )}

      <Modal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        title="Exportar plantilla"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowExport(false)}>Cerrar</Button>
            <Button variant="primary"
                    icon={<Icon name="download" size={14} />}
                    onClick={() => { setShowExport(false); flash('plantilla.json descargada'); }}>
              Descargar JSON
            </Button>
          </>
        }
      >
        <pre>{JSON.stringify({
          name: 'contrato-arriendo',
          version: 1,
          fields: fields.map(({ id, ...rest }) => rest),
        }, null, 2)}</pre>
      </Modal>

      {toast && <div className="toast">{toast}</div>}

      <TweaksPanel>
        <TweakSection label="Color" />
        <TweakColor label="Acento de selección" value={t.selectedAccent}
                    options={['#dc2626', '#F4A261', '#7bbdc5', '#ffffff']}
                    onChange={(v) => setTweak('selectedAccent', v)} />

        <TweakSection label="Canvas" />
        <TweakRadio label="Grid overlay" value={t.gridOverlay}
                    options={['off', '8', '16', '24']}
                    onChange={(v) => setTweak('gridOverlay', v)} />

        <TweakSection label="Layout" />
        <TweakRadio label="Densidad sidebar" value={t.sidebarDensity}
                    options={['compact', 'comfy']}
                    onChange={(v) => setTweak('sidebarDensity', v)} />
        <TweakRadio label="Etiqueta de campo" value={t.labelStyle}
                    options={['inside', 'above']}
                    onChange={(v) => setTweak('labelStyle', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
