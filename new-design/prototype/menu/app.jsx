/* ─── app.jsx — Menu / Welcome prototype ──────────────────────────
   Initial landing screen of PDF Form Editor. Faithful to the source:
   two-row navbar with mode tabs + theme toggle, a big drop-zone in
   the center. Adds an opt-in "Plantillas recientes" grid as Tweak
   so we can show both empty-state and warm-state variations.
   ────────────────────────────────────────────────────────────────── */

const { useState, useEffect, useRef } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "activeMode":     "editor",
  "dropzoneState":  "idle",
  "showRecent":     true,
  "background":     "vignette",
  "dropzoneSize":   "comfy",
  "cardStyle":      "outlined",
  "showLogo":       false
}/*EDITMODE-END*/;

const RECENT_TEMPLATES = [
  { name: 'contrato-arriendo.pdf', fields: 12, pages: 2, lastEdit: 'hace 4 horas',  badge: 'Editor' },
  { name: 'declaracion-jurada.pdf', fields: 6, pages: 1, lastEdit: 'ayer',          badge: 'Plantilla' },
  { name: 'orden-de-compra.pdf',    fields: 9, pages: 1, lastEdit: 'hace 2 días',   badge: 'Editor' },
  { name: 'finiquito-laboral.pdf', fields: 18, pages: 3, lastEdit: 'la semana pasada' },
];

/* ── Top navbar (single row — no canvas toolbar on menu) ────────── */
const TopNav = ({
  activeMode, onModeChange, theme, onToggleTheme, showLogo,
}) => (
  <header className="app-header">
    <div className="header-top">
      <h1>
        <button className="title-btn">
          {showLogo && (
            <span style={{
              display: 'inline-flex', alignItems:'center', justifyContent:'center',
              width: 22, height: 22, borderRadius: 5,
              background: 'linear-gradient(135deg, #07575B 0%, #66A5AD 100%)',
              color: '#fff', fontWeight: 700, fontSize: 13,
              marginRight: 8,
            }}>P</span>
          )}
          PDF Form Editor
        </button>
      </h1>

      <nav className="mode-nav" aria-label="Modo de la aplicación">
        <button
          className={`mode-btn ${activeMode === 'editor' ? 'mode-btn--active' : ''}`}
          onClick={() => onModeChange('editor')}
        >Editor de plantilla</button>
        <button
          className={`mode-btn ${activeMode === 'filler' ? 'mode-btn--active' : ''}`}
          onClick={() => onModeChange('filler')}
        >Rellenar PDF</button>
      </nav>

      <div className="header-top-actions">
        <IconButton
          variant="navbar"
          label={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          onClick={onToggleTheme}
          icon={<Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />}
        />
      </div>
    </div>
  </header>
);

/* ── Dropzone ─────────────────────────────────────────────────── */
const Dropzone = ({ mode, state, size, onPick }) => {
  const copy = mode === 'editor' ? {
    eyebrow: 'Editor de plantilla',
    title:   'Crea un nuevo formulario',
    desc:    'Importa un PDF y añade campos de formulario interactivos sobre él.',
    cta:     'Seleccionar PDF',
  } : {
    eyebrow: 'Rellenar PDF',
    title:   'Completa un formulario existente',
    desc:    'Sube un PDF con campos AcroForm para rellenarlos de forma interactiva.',
    cta:     'Seleccionar PDF',
  };

  if (state === 'loading') {
    return (
      <div className={`dropzone ${size === 'compact' ? 'compact' : ''}`}>
        <div className="dropzone__spinner" aria-hidden="true" />
        <div className="dropzone__title">Analizando campos del PDF…</div>
        <div className="dropzone__desc">Detectando estructura AcroForm en {copy.eyebrow.toLowerCase()}.</div>
      </div>
    );
  }

  return (
    <label
      className={[
        'dropzone',
        size === 'compact' ? 'compact' : '',
        state === 'hover'    ? 'is-hover'    : '',
        state === 'dragging' ? 'is-dragging' : '',
      ].filter(Boolean).join(' ')}
      onClick={onPick}
    >
      <Icon name="document" size={56} className="dropzone__icon" />
      <div className="dropzone__title">{copy.title}</div>
      <div className="dropzone__desc">{copy.desc}</div>
      <div className="dropzone__cta">
        <Button variant="primary" size="md" icon={<Icon name="upload" size={14} />}>
          {copy.cta}
        </Button>
        <span className="dropzone__hint">o arrastra un archivo aquí</span>
      </div>
      <div className="quick-row">
        <span>PDF</span>
        <span className="dot" />
        <span>hasta 50 MB</span>
        <span className="dot" />
        <span>se procesa localmente</span>
      </div>
    </label>
  );
};

/* ── Template card ────────────────────────────────────────────── */
const TemplateCard = ({ tpl, style }) => (
  <div className={`template-card style-${style}`} onClick={() => {}}>
    {tpl.badge && <span className="pill">{tpl.badge}</span>}
    <div className="thumb">
      <div className="thumb-lines">
        <div className="ln title" />
        <div className="ln med" />
        <div className="ln short" />
        <div className="ln field-line" />
        <div className="ln med" />
        <div className="ln field-line" />
        <div className="ln short" />
        <div className="ln" />
      </div>
    </div>
    <div className="meta">
      <span className="name" title={tpl.name}>{tpl.name}</span>
      <span className="info">{tpl.fields} campos · {tpl.pages} p. · {tpl.lastEdit}</span>
    </div>
  </div>
);

/* ── Root ─────────────────────────────────────────────────────── */
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const [theme, setTheme] = useState('dark');
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);

  const [toast, setToast] = useState(null);
  const flash = (msg) => {
    setToast(msg);
    clearTimeout(flash._t);
    flash._t = setTimeout(() => setToast(null), 1800);
  };

  return (
    <div className="app">
      <TopNav
        activeMode={t.activeMode}
        onModeChange={(m) => setTweak('activeMode', m)}
        theme={theme}
        onToggleTheme={() => setTheme(th => th === 'dark' ? 'light' : 'dark')}
        showLogo={t.showLogo}
      />

      <div className={`menu-stage ${t.background === 'flat' ? 'bg-flat' : t.background === 'vignette' ? 'bg-vignette' : ''}`}>
        <div className="menu-hero">
          <span className="menu-eyebrow">PDF Form Editor</span>
          <h1 className="menu-headline">
            {t.activeMode === 'editor'
              ? 'Coloca campos de formulario sobre cualquier PDF.'
              : 'Rellena cualquier formulario PDF, sin imprimirlo.'}
          </h1>
          <p className="menu-subhead">
            {t.activeMode === 'editor'
              ? 'Importa un PDF, dibuja los campos donde los necesites y exporta el archivo listo para firmar.'
              : 'Sube un PDF con campos AcroForm, complétalos con vista previa en vivo y descarga el resultado.'}
          </p>
        </div>

        <Dropzone
          mode={t.activeMode}
          state={t.dropzoneState}
          size={t.dropzoneSize}
          onPick={() => flash('Selector de archivos abierto')}
        />

        {t.showRecent && (
          <section className="recent-section">
            <div className="recent-header">
              <h2>Plantillas recientes</h2>
              <a onClick={() => flash('Abrir todas las plantillas')}>Ver todas →</a>
            </div>
            <div className="recent-grid">
              {RECENT_TEMPLATES.map((tpl) => (
                <TemplateCard key={tpl.name} tpl={tpl} style={t.cardStyle} />
              ))}
            </div>
          </section>
        )}

        <div className="menu-footer">
          <span>Atajos:</span>
          <span><kbd className="kbd">⌘O</kbd> abrir</span>
          <span><kbd className="kbd">?</kbd> atajos</span>
          <span><kbd className="kbd">T</kbd> cambiar tema</span>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}

      <TweaksPanel>
        <TweakSection label="Estado" />
        <TweakRadio label="Modo activo" value={t.activeMode}
                    options={['editor', 'filler']}
                    onChange={(v) => setTweak('activeMode', v)} />
        <TweakRadio label="Dropzone" value={t.dropzoneState}
                    options={['idle', 'hover', 'dragging', 'loading']}
                    onChange={(v) => setTweak('dropzoneState', v)} />

        <TweakSection label="Layout" />
        <TweakToggle label="Plantillas recientes" value={t.showRecent}
                     onChange={(v) => setTweak('showRecent', v)} />
        <TweakRadio label="Tamaño dropzone" value={t.dropzoneSize}
                    options={['compact', 'comfy']}
                    onChange={(v) => setTweak('dropzoneSize', v)} />
        <TweakRadio label="Estilo card" value={t.cardStyle}
                    options={['flat', 'outlined', 'elev']}
                    onChange={(v) => setTweak('cardStyle', v)} />

        <TweakSection label="Fondo & marca" />
        <TweakRadio label="Fondo" value={t.background}
                    options={['flat', 'vignette']}
                    onChange={(v) => setTweak('background', v)} />
        <TweakToggle label="Mostrar logo mark" value={t.showLogo}
                     onChange={(v) => setTweak('showLogo', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
