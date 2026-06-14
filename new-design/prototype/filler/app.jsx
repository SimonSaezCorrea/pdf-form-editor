/* ─── app.jsx — Filler prototype (v2, enhanced) ─────────────────────
   Aplicado:
     1. Click sobre campo del PDF → enfoca su input
     2. Tipo de campo respeta schema (text / number / date / email / tel / checkbox / signature)
     3. Auto-scroll del PDF al campo activo
     4. Required + validación visual (asterisco + error + scroll a primero faltante)
     5. Progress por sección (mini barras por bloque)
     6. "Saltar al siguiente vacío" (Enter en input lleno + botón footer)
     7. Autoguardado en localStorage + pill "Guardado · hace 5 s"
     8. Sección colapsable (auto al completar)
     9. Footer sticky con CTA principal
    10. Vista final (toggle): oculta highlights y outlines del overlay
    11. Reset / Limpiar todo (banner de confirmación)
   ────────────────────────────────────────────────────────────────── */

const { useState, useEffect, useRef, useMemo, useCallback } = React;
const LS_KEY = 'pdf-filler-draft-v1';

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "formDensity":     "comfy",
  "formLayout":      "single",
  "overlayStyle":    "white",
  "highlightCurrent":true,
  "showFieldNames":  false,
  "preFill":         "partial"
}/*EDITMODE-END*/;

/* Field schema — type + required + placeholder/unit per field */
const FIELDS = [
  { id: 'f1', name: 'arrendador_nombre',   label: 'Arrendador · Nombre completo',  group: 'Arrendador',   type: 'text',   required: true,  x: 48,  y: 196, w: 252, h: 22, page: 1 },
  { id: 'f2', name: 'arrendador_rut',      label: 'Arrendador · R.U.T.',           group: 'Arrendador',   type: 'text',   required: true,  x: 328, y: 196, w: 236, h: 22, page: 1, placeholder: '12.345.678-9' },
  { id: 'f3', name: 'arrendatario_nombre', label: 'Arrendatario · Nombre completo',group: 'Arrendatario', type: 'text',   required: true,  x: 48,  y: 306, w: 252, h: 22, page: 1 },
  { id: 'f4', name: 'arrendatario_email',  label: 'Arrendatario · Correo',         group: 'Arrendatario', type: 'email',  required: true,  x: 328, y: 306, w: 236, h: 22, page: 1, placeholder: 'nombre@dominio.cl' },
  { id: 'f5', name: 'arrendatario_tel',    label: 'Arrendatario · Teléfono',       group: 'Arrendatario', type: 'tel',    required: false, x: 48,  y: 366, w: 252, h: 22, page: 1, placeholder: '+56 9 1234 5678' },
  { id: 'f6', name: 'arrendatario_dir',    label: 'Arrendatario · Dirección',      group: 'Arrendatario', type: 'text',   required: false, x: 328, y: 366, w: 236, h: 22, page: 1 },
  { id: 'f7', name: 'renta_monto',         label: 'Renta · Monto (CLP)',           group: 'Renta',        type: 'number', required: true,  x: 48,  y: 596, w: 252, h: 22, page: 1, placeholder: '850000', unit: 'CLP' },
  { id: 'f8', name: 'renta_dia_pago',      label: 'Renta · Día de pago',           group: 'Renta',        type: 'date',   required: true,  x: 328, y: 596, w: 236, h: 22, page: 1 },
];

const GROUPS = ['Arrendador', 'Arrendatario', 'Renta'];

const PRE_FILL = {
  arrendador_nombre:   'María Soledad Castro',
  arrendador_rut:      '12.345.678-9',
  arrendatario_nombre: 'Diego Ramírez Vega',
  arrendatario_email:  'diego.ramirez@example.cl',
};

/* ── helpers ─────────────────────────────────────────────── */
const isFilled = (v) => typeof v === 'string' ? v.trim().length > 0
                       : typeof v === 'boolean' ? v
                       : v != null && String(v).length > 0;

const formatNumber = (n) => {
  if (n == null || n === '') return '';
  const num = Number(String(n).replace(/[.,]/g, m => m === ',' ? '.' : ''));
  if (Number.isNaN(num)) return n;
  return num.toLocaleString('es-CL');
};

const formatDate = (s) => {
  if (!s) return '';
  // s is "YYYY-MM-DD" → "DD/MM/YYYY"
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
};

const safeScroll = (el, container, padding = 24) => {
  if (!el || !container) return;
  const elRect = el.getBoundingClientRect();
  const cRect = container.getBoundingClientRect();
  if (elRect.top < cRect.top + padding) {
    container.scrollTop -= (cRect.top + padding - elRect.top);
  } else if (elRect.bottom > cRect.bottom - padding) {
    container.scrollTop += (elRect.bottom - (cRect.bottom - padding));
  }
};

const relTime = (ms) => {
  if (!ms) return null;
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 5)   return 'recién';
  if (s < 60)  return `hace ${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `hace ${m} min`;
  return `hace ${Math.floor(m / 60)} h`;
};

/* ───────────────────────────────────────────────────────────
   MockPdf
   ─────────────────────────────────────────────────────────── */
const MockPdf = () => (
  <div className="mock-pdf" style={{ background: '#ffffff' }}>
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
);

/* ───────────────────────────────────────────────────────────
   TopNav
   ─────────────────────────────────────────────────────────── */
const TopNav = ({ filename, theme, onToggleTheme, onReset }) => (
  <header className="app-header">
    <div className="header-top">
      <h1>
        <button className="title-btn">PDF Form Editor</button>
      </h1>
      <nav className="mode-nav">
        <button className="mode-btn-back" onClick={onReset}>← Cambiar PDF</button>
      </nav>
      <span className="filename" title={filename}>{filename}</span>
      <div className="header-top-actions">
        <IconButton variant="navbar"
                    label={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                    onClick={onToggleTheme}
                    icon={<Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />} />
      </div>
    </div>
  </header>
);

/* ───────────────────────────────────────────────────────────
   FieldInput — switches on field.type
   ─────────────────────────────────────────────────────────── */
const FieldInput = React.forwardRef(function FieldInput({
  field, value, error, isCurrent, onChange, onFocus, onEnter,
}, ref) {
  const cls = `field-input ${isCurrent ? 'field-input--focus' : ''} ${error ? 'field-input--error' : ''}`;
  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEnter(); }
  };
  const shared = {
    id: `fld-${field.id}`,
    ref,
    className: cls,
    value: value || '',
    placeholder: field.placeholder || `Valor para "${field.name}"`,
    onChange: (e) => onChange(field.name, e.target.value),
    onFocus: () => onFocus(field.id),
    onKeyDown: handleKey,
  };

  switch (field.type) {
    case 'number':
      return (
        <div style={{ position: 'relative' }}>
          <input {...shared} type="number" inputMode="decimal" />
          {field.unit && <span className="field-unit">{field.unit}</span>}
        </div>
      );
    case 'date':
      return <input {...shared} type="date" />;
    case 'email':
      return <input {...shared} type="email" autoComplete="email" />;
    case 'tel':
      return <input {...shared} type="tel" autoComplete="tel" />;
    case 'checkbox':
      return (
        <label className="prop-checkbox" style={{ margin: '4px 0' }}>
          <input ref={ref}
                 type="checkbox"
                 checked={value === 'true' || value === true}
                 onFocus={() => onFocus(field.id)}
                 onChange={(e) => onChange(field.name, e.target.checked ? 'true' : '')} />
          Marcar como aceptado
        </label>
      );
    case 'signature':
      return (
        <button ref={ref}
                className="btn btn--secondary"
                style={{ width: '100%', justifyContent: 'center' }}
                onFocus={() => onFocus(field.id)}
                onClick={() => onChange(field.name, value === 'firmado' ? '' : 'firmado')}>
          {value === 'firmado' ? '✓ Firmado · click para deshacer' : 'Click para firmar'}
        </button>
      );
    default:
      return <input {...shared} type="text" />;
  }
});

/* ───────────────────────────────────────────────────────────
   FormPanel — header + sections + footer
   ─────────────────────────────────────────────────────────── */
const FormPanel = ({
  values, errors, focusedId, onFocus, onChange,
  onSubmit, generating, onJumpToNextEmpty, onReset, onToggleFinal, finalPreview,
  lastSaved, density, jumpedId, inputRefs, collapsed, onToggleCollapse,
}) => {
  const completedTotal = FIELDS.filter(f => isFilled(values[f.name])).length;
  const total = FIELDS.length;
  const requiredMissing = FIELDS.filter(f => f.required && !isFilled(values[f.name])).length;

  /* per-group stats */
  const groupStats = GROUPS.map(g => {
    const inGroup = FIELDS.filter(f => f.group === g);
    const done = inGroup.filter(f => isFilled(values[f.name])).length;
    return { group: g, done, total: inGroup.length, fields: inGroup };
  });

  return (
    <aside className={`filler-form-panel ${density === 'compact' ? 'compact' : ''}`}>
      <div className="filler-form-header">
        <h2>
          {total} campos detectados
          <span className="save-pill" title={lastSaved ? new Date(lastSaved).toLocaleString() : ''}>
            <span className="dot-live" />
            {lastSaved ? `Guardado ${relTime(lastSaved)}` : 'Sin guardar'}
          </span>
        </h2>

        <div style={{ display: 'flex', alignItems:'center', gap: 8, fontSize: 11, color: 'var(--fg-2)' }}>
          <span>{completedTotal}/{total} completos</span>
          {requiredMissing > 0 && (
            <span style={{ color: 'var(--color-danger)' }}>· {requiredMissing} requerido{requiredMissing===1?'':'s'} faltante{requiredMissing===1?'':'s'}</span>
          )}
          <div className="header-actions">
            <Tooltip content={finalPreview ? 'Modo edición' : 'Vista final'}>
              <IconButton size="sm" label="Vista final"
                          onClick={onToggleFinal}
                          icon={<span style={{ fontSize: 12 }}>{finalPreview ? '◉' : '○'}</span>} />
            </Tooltip>
            <Tooltip content="Limpiar todo">
              <IconButton size="sm" label="Reset"
                          onClick={onReset}
                          icon={<Icon name="trash" size={12} />} />
            </Tooltip>
          </div>
        </div>

        {/* per-section progress */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {groupStats.map(g => {
            const pct = (g.done / g.total) * 100;
            const complete = g.done === g.total;
            const isCol = collapsed.has(g.group);
            return (
              <div key={g.group}
                   className={`section-row ${isCol ? 'collapsed' : ''}`}
                   onClick={() => onToggleCollapse(g.group)}>
                <div className="section-row__head">
                  <span className="chev">▾</span>
                  <span className="name">{g.group}</span>
                  {complete && <span className="section-check">✓</span>}
                  <span className="count">{g.done}/{g.total}</span>
                </div>
                <div className="section-row__bar"><div style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={`filler-form-fields-v ${density === 'compact' ? 'compact' : ''}`}>
        {GROUPS.map(g => {
          const inGroup = FIELDS.filter(f => f.group === g);
          if (inGroup.length === 0) return null;
          const isCol = collapsed.has(g);
          const done = inGroup.filter(f => isFilled(values[f.name])).length;
          const complete = done === inGroup.length;
          const missing = inGroup.filter(f => f.required && !isFilled(values[f.name])).length;
          return (
            <div className="filler-section" key={g}>
              <button
                className={`filler-section__head ${isCol ? 'collapsed' : ''} ${complete ? 'is-complete' : ''}`}
                onClick={() => onToggleCollapse(g)}
                aria-expanded={!isCol}
              >
                <span className="chev">▾</span>
                <span className="name">{g}</span>
                <span className="meta">
                  {done}/{inGroup.length}
                  {missing > 0 && <span className="warn"> · {missing} faltante{missing === 1 ? '' : 's'}</span>}
                  {complete && <span className="check"> ✓</span>}
                </span>
              </button>
              {!isCol && (
                <div className="filler-section__body">
                  {inGroup.map(f => {
                    const filled = isFilled(values[f.name]);
                    const isCurrent = f.id === focusedId;
                    const hasError = errors.has(f.id);
                    const isJumped = jumpedId === f.id;
                    return (
                      <div className={`filler-field ${isCurrent ? 'is-current' : ''} ${isJumped ? 'jump-highlight' : ''}`} key={f.id}>
                        <label className="field-label-form" htmlFor={`fld-${f.id}`}>
                          {f.label}
                          {f.required ? <span className="req">*</span>
                                      : <span className="opt">(opcional)</span>}
                        </label>
                        <FieldInput
                          ref={(el) => { if (el) inputRefs.current[f.id] = el; else delete inputRefs.current[f.id]; }}
                          field={f}
                          value={values[f.name]}
                          error={hasError}
                          isCurrent={isCurrent}
                          onChange={onChange}
                          onFocus={onFocus}
                          onEnter={() => onJumpToNextEmpty(f.id)}
                        />
                        {filled && !hasError && f.type !== 'checkbox' && f.type !== 'signature' && (
                          <span className="filler-field-status">✓</span>
                        )}
                        {hasError && (
                          <span className="filler-field-status error">!</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="filler-form-footer">
        <button className="next-empty"
                onClick={() => onJumpToNextEmpty(focusedId)}
                title="Saltar al siguiente campo vacío">
          ↓ Siguiente vacío <kbd>Enter</kbd>
        </button>
        <Button variant="primary"
                onClick={onSubmit}
                disabled={generating}
                loading={generating}
                icon={!generating ? <Icon name="download" size={14} /> : null}>
          {generating ? 'Generando…' : 'Generar PDF'}
        </Button>
      </div>
    </aside>
  );
};

/* ───────────────────────────────────────────────────────────
   PreviewPanel — PDF + live overlay + click-to-focus + auto-scroll
   ─────────────────────────────────────────────────────────── */
const PreviewPanel = ({
  values, focusedId, zoom, onZoomIn, onZoomOut,
  overlayStyle, highlightCurrent, showFieldNames,
  finalPreview, onToggleFinal,
  onFieldClick, scrollRef,
}) => {
  const overlayClass =
    overlayStyle === 'bare'    ? 'fill-text--bare'    :
    overlayStyle === 'outline' ? 'fill-text--outline' :
                                 'fill-text--white';
  const focused = FIELDS.find(f => f.id === focusedId);

  /* per-field formatted display value */
  const display = (f) => {
    const v = values[f.name];
    if (!v) return '';
    if (f.type === 'number') return formatNumber(v) + (f.unit ? ' ' + f.unit : '');
    if (f.type === 'date')   return formatDate(v);
    if (f.type === 'checkbox')  return v === 'true' || v === true ? '☑' : '';
    if (f.type === 'signature') return v === 'firmado' ? '✍ ' + (values.arrendatario_nombre || 'Firmado') : '';
    return v;
  };

  return (
    <main className="filler-pdf-panel" style={{ flexDirection: 'column', padding: 0 }}>
      <div className="filler-pdf-toolbar">
        <span>Previsualización</span>
        <span style={{ color: 'var(--fg-3)' }}>· se actualiza en vivo</span>
        <button className={`toggle-pill ${finalPreview ? 'on' : ''}`}
                onClick={onToggleFinal}
                title="Mostrar como en el PDF final, sin guías ni outlines">
          {finalPreview ? '◉' : '○'} Vista final
        </button>
        <div className="right">
          <IconButton size="sm" label="Alejar"
                      icon={<Icon name="minus" size={14} />}
                      onClick={onZoomOut} disabled={zoom <= 0.25} />
          <span className="zoom-label" style={{ minWidth: 40, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <IconButton size="sm" label="Acercar"
                      icon={<Icon name="plus" size={14} />}
                      onClick={onZoomIn} disabled={zoom >= 3} />
        </div>
      </div>
      <div ref={scrollRef}
           className={finalPreview ? 'final-preview' : ''}
           style={{
        flex: 1, overflow: 'auto', padding: 'var(--space-4)',
        display: 'flex', justifyContent: 'center',
      }}>
        <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', width: 612, height: 792 }}>
          <div className="pdf-page-stage" style={{ background: '#ffffff' }}>
            <MockPdf />

            {/* current-field highlight */}
            {!finalPreview && highlightCurrent && focused && (
              <div className="fill-highlight"
                   style={{ left: focused.x - 2, top: focused.y - 2,
                            width: focused.w + 4, height: focused.h + 4 }} />
            )}

            {/* field name hints */}
            {!finalPreview && showFieldNames && FIELDS.map(f => (
              <span key={'hint-' + f.id} className="fill-pdf-field-hint"
                    style={{ left: f.x, top: f.y - 14 }}>{f.name}</span>
            ))}

            {/* live overlay text per field */}
            {FIELDS.map(f => {
              const d = display(f);
              if (!d) return null;
              return (
                <span key={f.id} className={overlayClass}
                      data-field-id={f.id}
                      style={{ left: f.x + 2, top: f.y, width: f.w - 4, height: f.h }}>
                  {d}
                </span>
              );
            })}

            {/* click targets — invisible boxes over each field */}
            {!finalPreview && FIELDS.map(f => (
              <button key={'click-' + f.id} className="pdf-field-target"
                      data-field-id={f.id}
                      style={{ left: f.x, top: f.y, width: f.w, height: f.h, border:'none', background:'transparent', padding: 0 }}
                      onClick={() => onFieldClick(f.id)}
                      title={f.label} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
};

/* ───────────────────────────────────────────────────────────
   Root
   ─────────────────────────────────────────────────────────── */
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const [theme, setTheme] = useState('dark');
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);

  /* values — initialized from localStorage or pre-fill */
  const initialValues = useMemo(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
        if (saved && saved.values) return saved.values;
      } catch {}
    }
    if (t.preFill === 'empty')  return {};
    if (t.preFill === 'full')   return FIELDS.reduce((acc, f) => ({ ...acc, [f.name]: PRE_FILL[f.name] || (f.type === 'date' ? '2026-05-15' : f.type === 'number' ? '850000' : f.label.split(' · ')[1]) }), {});
    return { ...PRE_FILL };
  }, []);

  const [values, setValues] = useState(initialValues);
  const [focusedId, setFocusedId] = useState('f5');
  const [zoom, setZoom] = useState(0.78);
  const [generating, setGenerating] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [banner, setBanner] = useState(null);
  const [toast, setToast] = useState(null);
  const [errors, setErrors] = useState(new Set());
  const [jumpedId, setJumpedId] = useState(null);
  const [lastSaved, setLastSaved] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      return s?.ts || null;
    } catch { return null; }
  });
  const [resetConfirm, setResetConfirm] = useState(false);
  const [finalPreview, setFinalPreview] = useState(false);
  const [collapsed, setCollapsed] = useState(new Set());

  const inputRefs = useRef({});
  const formScrollRef = useRef(null);
  const previewScrollRef = useRef(null);

  /* re-init when pre-fill tweak changes (only if no saved draft) */
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
        if (saved && saved.values) return;
      } catch {}
    }
    if (t.preFill === 'empty')  setValues({});
    else if (t.preFill === 'full')
      setValues(FIELDS.reduce((acc, f) => ({ ...acc, [f.name]: PRE_FILL[f.name] || (f.type === 'date' ? '2026-05-15' : f.type === 'number' ? '850000' : f.label.split(' · ')[1]) }), {}));
    else setValues({ ...PRE_FILL });
  }, [t.preFill]);

  const flash = (msg) => {
    setToast(msg);
    clearTimeout(flash._t);
    flash._t = setTimeout(() => setToast(null), 1800);
  };

  /* autoSave on values change */
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify({ values, ts: Date.now() }));
        setLastSaved(Date.now());
      } catch {}
    }, 400);
    return () => clearTimeout(id);
  }, [values]);

  /* relTime ticker (refresh every 10 s) */
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(x => x + 1), 10000);
    return () => clearInterval(id);
  }, []);

  /* auto-scroll input + preview to focused field */
  useEffect(() => {
    if (!focusedId) return;
    /* form input */
    const inputEl = inputRefs.current[focusedId];
    if (inputEl && formScrollRef.current) {
      safeScroll(inputEl, formScrollRef.current, 24);
    }
    /* PDF preview — scroll so field is visible */
    const f = FIELDS.find(x => x.id === focusedId);
    if (f && previewScrollRef.current) {
      const container = previewScrollRef.current;
      const fieldVisualTop = f.y * zoom;
      const target = fieldVisualTop - 100;
      const desired = Math.max(0, target);
      if (Math.abs(container.scrollTop - desired) > 30) {
        container.scrollTo({ top: desired, behavior: 'smooth' });
      }
    }
  }, [focusedId, zoom]);

  /* auto-collapse a section when it becomes complete (once) */
  const prevGroupDoneRef = useRef({});
  useEffect(() => {
    const next = {};
    GROUPS.forEach(g => {
      const inG = FIELDS.filter(f => f.group === g);
      next[g] = inG.every(f => isFilled(values[f.name]));
    });
    GROUPS.forEach(g => {
      if (next[g] && !prevGroupDoneRef.current[g]) {
        // section just completed — auto-collapse
        setCollapsed(prev => new Set(prev).add(g));
      }
      // user un-completes a section → auto-expand
      if (!next[g] && prevGroupDoneRef.current[g]) {
        setCollapsed(prev => { const n = new Set(prev); n.delete(g); return n; });
      }
    });
    prevGroupDoneRef.current = next;
  }, [values]);

  /* find next empty field after the given fieldId (wraps around) */
  const findNextEmpty = (afterId) => {
    const startIdx = FIELDS.findIndex(f => f.id === afterId);
    const order = [...FIELDS.slice(startIdx + 1), ...FIELDS.slice(0, Math.max(0, startIdx + 1))];
    return order.find(f => !isFilled(values[f.name]));
  };

  const jumpToNextEmpty = (fromId) => {
    const next = findNextEmpty(fromId);
    if (!next) {
      flash('¡Todos los campos están completos!');
      return;
    }
    // expand its section if collapsed
    if (collapsed.has(next.group)) {
      setCollapsed(prev => { const n = new Set(prev); n.delete(next.group); return n; });
    }
    setFocusedId(next.id);
    setJumpedId(next.id);
    setTimeout(() => setJumpedId(null), 1000);
    // focus the input shortly after render
    setTimeout(() => {
      const el = inputRefs.current[next.id];
      el?.focus();
    }, 100);
  };

  const onFieldClick = (id) => {
    setFocusedId(id);
    const f = FIELDS.find(x => x.id === id);
    if (f && collapsed.has(f.group)) {
      setCollapsed(prev => { const n = new Set(prev); n.delete(f.group); return n; });
    }
    setTimeout(() => {
      const el = inputRefs.current[id];
      el?.focus();
    }, 100);
  };

  const handleSubmit = () => {
    const missing = FIELDS.filter(f => f.required && !isFilled(values[f.name]));
    if (missing.length) {
      const ids = new Set(missing.map(f => f.id));
      setErrors(ids);
      // expand any collapsed sections containing missing fields
      const groupsWithMissing = new Set(missing.map(f => f.group));
      setCollapsed(prev => {
        const n = new Set(prev);
        groupsWithMissing.forEach(g => n.delete(g));
        return n;
      });
      // scroll to first missing
      const first = missing[0];
      setFocusedId(first.id);
      setJumpedId(first.id);
      setTimeout(() => {
        const el = inputRefs.current[first.id];
        el?.focus();
        setJumpedId(null);
      }, 150);
      setBanner({ kind: 'warning',
                  text: `Faltan ${missing.length} campo${missing.length === 1 ? '' : 's'} obligatorio${missing.length === 1 ? '' : 's'}. Te llevamos al primero.` });
      setTimeout(() => setBanner(null), 3500);
      return;
    }
    setErrors(new Set());
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setBanner({ kind: 'success', text: 'PDF generado correctamente · contrato-arriendo-relleno.pdf' });
      flash('Descarga iniciada');
      setTimeout(() => setBanner(null), 4000);
    }, 900);
  };

  const handleResetConfirm = () => {
    setValues({});
    setErrors(new Set());
    setCollapsed(new Set());
    setResetConfirm(false);
    try { localStorage.removeItem(LS_KEY); } catch {}
    setLastSaved(null);
    flash('Todos los valores fueron limpiados');
  };

  const handleChange = (name, value) => {
    setValues(v => ({ ...v, [name]: value }));
    // clear error for this field if it now has content
    setErrors(prev => {
      const f = FIELDS.find(x => x.name === name);
      if (!f || !prev.has(f.id)) return prev;
      if (isFilled(value)) {
        const n = new Set(prev); n.delete(f.id); return n;
      }
      return prev;
    });
  };

  const toggleCollapse = (group) =>
    setCollapsed(prev => {
      const n = new Set(prev);
      if (n.has(group)) n.delete(group); else n.add(group);
      return n;
    });

  return (
    <div className="app">
      <TopNav
        filename="contrato-arriendo.pdf"
        theme={theme}
        onToggleTheme={() => setTheme(th => th === 'dark' ? 'light' : 'dark')}
        onReset={() => flash('Volver a inicio')}
      />

      {banner && (
        <div className={`filler-banner ${banner.kind}`}>
          <span className="dot-tag">{banner.kind === 'success' ? '✓' : '!'}</span>
          <span>{banner.text}</span>
        </div>
      )}

      {resetConfirm && (
        <div className="reset-confirm">
          <strong>¿Limpiar todos los valores?</strong>
          <span>Se borrarán los {Object.keys(values).filter(k => isFilled(values[k])).length} campos completados y el borrador guardado.</span>
          <div className="actions">
            <Button variant="ghost"   size="sm" onClick={() => setResetConfirm(false)}>Cancelar</Button>
            <Button variant="danger"  size="sm" onClick={handleResetConfirm}>Sí, limpiar todo</Button>
          </div>
        </div>
      )}

      <div className="filler-body">
        <div ref={formScrollRef} style={{ display: 'contents' }}>
          <FormPanel
            values={values}
            errors={errors}
            focusedId={focusedId}
            onFocus={setFocusedId}
            onChange={handleChange}
            onSubmit={handleSubmit}
            generating={generating}
            onJumpToNextEmpty={jumpToNextEmpty}
            onReset={() => setResetConfirm(true)}
            onToggleFinal={() => setFinalPreview(v => !v)}
            finalPreview={finalPreview}
            lastSaved={lastSaved}
            density={t.formDensity}
            jumpedId={jumpedId}
            inputRefs={inputRefs}
            collapsed={collapsed}
            onToggleCollapse={toggleCollapse}
          />
        </div>
        <PreviewPanel
          values={values}
          focusedId={focusedId}
          zoom={zoom}
          onZoomIn={()  => setZoom(z => Math.min(3,    Math.round((z + 0.1) * 100) / 100))}
          onZoomOut={() => setZoom(z => Math.max(0.25, Math.round((z - 0.1) * 100) / 100))}
          overlayStyle={t.overlayStyle}
          highlightCurrent={t.highlightCurrent}
          showFieldNames={t.showFieldNames}
          finalPreview={finalPreview}
          onToggleFinal={() => setFinalPreview(v => !v)}
          onFieldClick={onFieldClick}
          scrollRef={previewScrollRef}
        />
      </div>

      <button className="shortcuts-fab"
              onClick={() => setShowShortcuts(v => !v)}
              aria-label="Atajos">?</button>
      <ShortcutsPanel visible={showShortcuts} onClose={() => setShowShortcuts(false)} />

      {toast && <div className="toast">{toast}</div>}

      <TweaksPanel>
        <TweakSection label="Formulario" />
        <TweakRadio label="Densidad" value={t.formDensity}
                    options={['compact', 'comfy']}
                    onChange={(v) => setTweak('formDensity', v)} />
        <TweakRadio label="Datos iniciales" value={t.preFill}
                    options={['empty', 'partial', 'full']}
                    onChange={(v) => setTweak('preFill', v)} />

        <TweakSection label="Overlay PDF" />
        <TweakRadio label="Estilo overlay" value={t.overlayStyle}
                    options={['white', 'bare', 'outline']}
                    onChange={(v) => setTweak('overlayStyle', v)} />
        <TweakToggle label="Destacar campo activo" value={t.highlightCurrent}
                     onChange={(v) => setTweak('highlightCurrent', v)} />
        <TweakToggle label="Mostrar nombres" value={t.showFieldNames}
                     onChange={(v) => setTweak('showFieldNames', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
