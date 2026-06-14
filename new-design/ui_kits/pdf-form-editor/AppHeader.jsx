/* ─── AppHeader.jsx ─────────────────────────────────────────────────
   Two-row navbar: branding + mode + actions / canvas toolbar.
   ─────────────────────────────────────────────────────────────────── */

const AppHeader = ({
  appMode, onModeChange,
  hasFile, filename, onBack,
  showEditorToolbar, mode, onSetMode,
  zoom, onZoomIn, onZoomOut,
  thumbnailsVisible, onToggleThumbnails,
  theme, onToggleTheme,
  onOpenImport, onOpenExport, onExportPdf,
}) => {
  return (
    <header className="app-header">
      <div className="header-top">
        <h1>
          <button className="title-btn" onClick={onBack} title="Volver al inicio">
            PDF Form Editor
          </button>
        </h1>

        <nav className="mode-nav" aria-label="Modo de la aplicación">
          {hasFile ? (
            <button className="mode-btn-back" onClick={onBack}>← Cambiar PDF</button>
          ) : (
            <>
              <button
                className={`mode-btn ${appMode === 'editor' ? 'mode-btn--active' : ''}`}
                onClick={() => onModeChange('editor')}
                aria-pressed={appMode === 'editor'}
              >Editor de plantilla</button>
              <button
                className={`mode-btn ${appMode === 'filler' ? 'mode-btn--active' : ''}`}
                onClick={() => onModeChange('filler')}
                aria-pressed={appMode === 'filler'}
              >Rellenar PDF</button>
            </>
          )}
        </nav>

        {hasFile && filename && (
          <span className="filename" title={filename}>{filename}</span>
        )}

        <div className="header-top-actions">
          {appMode === 'editor' && hasFile && (
            <>
              <Button variant="navbar" size="sm" onClick={onOpenImport}>Importar</Button>
              <Button variant="navbar" size="sm" onClick={onOpenExport}>Exportar</Button>
              <Button variant="primary" size="sm" onClick={onExportPdf}>Exportar PDF</Button>
            </>
          )}
          <IconButton
            variant="navbar"
            label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            onClick={onToggleTheme}
            icon={<Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />}
          />
        </div>
      </div>

      {showEditorToolbar && (
        <div className="header-toolbar">
          <div />
          <div className="header-toolbar-center">
            <div className="toolbar-modes">
              {[
                { id: 'select', label: 'Seleccionar', key: 'S' },
                { id: 'insert', label: 'Insertar',    key: 'I' },
                { id: 'move',   label: 'Mover',       key: 'M' },
              ].map((m) => (
                <Tooltip key={m.id} content={`${m.label} · ${m.key}`}>
                  <button
                    className={`mode-btn-tb ${mode === m.id ? 'active' : ''}`}
                    onClick={() => onSetMode(m.id)}
                  >{m.label}</button>
                </Tooltip>
              ))}
            </div>
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
      )}
    </header>
  );
};

window.AppHeader = AppHeader;
