/* ─── app.jsx ──────────────────────────────────────────────────────
   Root component. Owns app-level state (theme, mode, file, fields,
   selection, modals) and renders the appropriate screen.
   ────────────────────────────────────────────────────────────────── */

const { useState: appUseState, useEffect: appUseEffect } = React;

/* Initial field positions tuned to the mock contract PDF (612 × 792). */
const SEED_FIELDS = [
  { id: 'f1', page: 1, name: 'arrendador_nombre',  x: 48,  y: 196, width: 252, height: 22, fontSize: 11, font: 'Helvetica', value: '' },
  { id: 'f2', page: 1, name: 'arrendador_rut',     x: 328, y: 196, width: 236, height: 22, fontSize: 11, font: 'Helvetica', value: '' },
  { id: 'f3', page: 1, name: 'arrendatario_nombre',x: 48,  y: 306, width: 252, height: 22, fontSize: 11, font: 'Helvetica', value: '' },
  { id: 'f4', page: 1, name: 'arrendatario_email', x: 328, y: 306, width: 236, height: 22, fontSize: 11, font: 'Helvetica', value: '' },
  { id: 'f5', page: 1, name: 'arrendatario_tel',   x: 48,  y: 366, width: 252, height: 22, fontSize: 11, font: 'Helvetica', value: '' },
  { id: 'f6', page: 1, name: 'arrendatario_dir',   x: 328, y: 366, width: 236, height: 22, fontSize: 11, font: 'Helvetica', value: '' },
  { id: 'f7', page: 1, name: 'renta_monto',        x: 48,  y: 596, width: 252, height: 22, fontSize: 11, font: 'Helvetica', value: '' },
  { id: 'f8', page: 1, name: 'renta_dia_pago',     x: 328, y: 596, width: 236, height: 22, fontSize: 11, font: 'Helvetica', value: '' },
];

const FILLER_SEED_VALUES = {
  arrendador_nombre:   'María Soledad Castro',
  arrendador_rut:      '12.345.678-9',
  arrendatario_nombre: 'Diego Ramírez Vega',
  arrendatario_email:  'diego.ramirez@example.cl',
};

function App() {
  /* theme — dark default, matches product behavior */
  const [theme, setTheme] = appUseState('dark');
  appUseEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  /* app mode + file */
  const [appMode, setAppMode] = appUseState('editor');
  const [hasFile, setHasFile] = appUseState(false);
  const [filename, setFilename] = appUseState('');

  /* editor state */
  const [fields, setFields] = appUseState([]);
  const [selectedId, setSelectedId] = appUseState(null);
  const [mode, setMode] = appUseState('select');
  const [zoom, setZoom] = appUseState(0.78);
  const [currentPage, setCurrentPage] = appUseState(1);
  const [thumbnailsVisible, setThumbnailsVisible] = appUseState(true);
  const [showShortcuts, setShowShortcuts] = appUseState(false);
  const [showExportModal, setShowExportModal] = appUseState(false);
  const [showImportModal, setShowImportModal] = appUseState(false);
  const [toast, setToast] = appUseState(null);

  /* filler state */
  const [fillerValues, setFillerValues] = appUseState(FILLER_SEED_VALUES);
  const [generating, setGenerating] = appUseState(false);

  const flash = (msg) => {
    setToast(msg);
    clearTimeout(flash._t);
    flash._t = setTimeout(() => setToast(null), 2000);
  };

  const loadSample = () => {
    setHasFile(true);
    setFilename(appMode === 'editor' ? 'contrato-arriendo.pdf' : 'contrato-arriendo-form.pdf');
    setFields(SEED_FIELDS);
    setSelectedId('f4');   // pre-select something interesting
  };

  const handleBack = () => {
    setHasFile(false);
    setFilename('');
    setFields([]);
    setSelectedId(null);
  };

  const updateField = (id, partial) => {
    setFields(fs => fs.map(f => f.id === id ? { ...f, ...partial } : f));
  };
  const deleteField = (id) => {
    setFields(fs => fs.filter(f => f.id !== id));
    setSelectedId(null);
  };

  const handleExportPdf = () => {
    flash('PDF exportado · contrato-arriendo-relleno.pdf');
  };

  const exportJson = JSON.stringify({
    name: 'contrato-arriendo',
    version: 1,
    fields: fields.map(({ id, ...rest }) => rest),
  }, null, 2);

  return (
    <div className="app">
      <AppHeader
        appMode={appMode}
        onModeChange={setAppMode}
        hasFile={hasFile}
        filename={filename}
        onBack={handleBack}
        showEditorToolbar={appMode === 'editor' && hasFile}
        mode={mode}
        onSetMode={setMode}
        zoom={zoom}
        onZoomIn={()  => setZoom(z => Math.min(3,    Math.round((z + 0.1) * 100) / 100))}
        onZoomOut={() => setZoom(z => Math.max(0.25, Math.round((z - 0.1) * 100) / 100))}
        thumbnailsVisible={thumbnailsVisible}
        onToggleThumbnails={() => setThumbnailsVisible(v => !v)}
        theme={theme}
        onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        onOpenImport={() => setShowImportModal(true)}
        onOpenExport={() => setShowExportModal(true)}
        onExportPdf={handleExportPdf}
      />

      {!hasFile ? (
        <UploadScreen
          variant={appMode}
          onLoadSample={loadSample}
        />
      ) : appMode === 'editor' ? (
        <EditorScreen
          fields={fields}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onUpdate={updateField}
          onDelete={deleteField}
          zoom={zoom}
          thumbnailsVisible={thumbnailsVisible}
          currentPage={currentPage}
          onPageSelect={setCurrentPage}
        />
      ) : (
        <FillerScreen
          fields={fields}
          values={fillerValues}
          onValueChange={(name, value) => setFillerValues(v => ({ ...v, [name]: value }))}
          zoom={zoom}
          generating={generating}
          onSubmit={() => {
            setGenerating(true);
            setTimeout(() => {
              setGenerating(false);
              flash('PDF generado · contrato-arriendo-relleno.pdf');
            }, 900);
          }}
        />
      )}

      {hasFile && (
        <>
          <button className="shortcuts-fab"
                  onClick={() => setShowShortcuts(v => !v)}
                  aria-label="Atajos de teclado" title="Atajos de teclado">?</button>
          <ShortcutsPanel visible={showShortcuts} onClose={() => setShowShortcuts(false)} />
        </>
      )}

      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Exportar plantilla"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowExportModal(false)}>Cerrar</Button>
            <Button variant="secondary" onClick={() => flash('JSON copiado al portapapeles')}>Copiar</Button>
            <Button variant="primary"   onClick={() => flash('plantilla.json descargada')}
                    icon={<Icon name="download" size={14} />}>Descargar JSON</Button>
          </>
        }
      >
        <pre>{exportJson}</pre>
      </Modal>

      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Importar plantilla"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowImportModal(false)}>Cancelar</Button>
            <Button variant="primary"
                    onClick={() => { setShowImportModal(false); flash('Plantilla importada · 8 campos'); }}>
              Importar y reemplazar
            </Button>
          </>
        }
      >
        <p style={{fontSize: 13, color: 'var(--fg-2)', marginBottom: 12}}>
          Pega aquí el contenido del archivo <code style={{fontFamily:'var(--font-family-mono)'}}>plantilla.json</code> o
          arrastra el archivo a esta ventana.
        </p>
        <textarea className="field-input"
                  rows="6"
                  placeholder='{"name": "plantilla", "fields": [...] }'
                  style={{fontFamily:'var(--font-family-mono)', resize:'vertical'}} />
      </Modal>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
