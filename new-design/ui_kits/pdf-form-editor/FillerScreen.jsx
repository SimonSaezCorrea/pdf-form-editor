/* ─── FillerScreen.jsx ──────────────────────────────────────────────
   Two-pane filler: form panel (left) + PDF preview with live text overlay (right).
   ─────────────────────────────────────────────────────────────────── */

const FillerScreen = ({ fields, values, onValueChange, onSubmit, zoom, generating }) => (
  <div className="filler-layout">
    <div className="filler-body">
      <aside className="filler-form-panel">
        <div className="filler-form-fields">
          <div style={{fontSize: 12, color: 'var(--fg-2)', marginBottom: 4}}>
            {fields.length} campos detectados
          </div>
          {fields.map(f => (
            <Input
              key={f.id}
              id={`filler-${f.id}`}
              label={f.name}
              value={values[f.name] || ''}
              placeholder={`Valor para "${f.name}"`}
              onChange={(e) => onValueChange(f.name, e.target.value)}
            />
          ))}
        </div>
        <div className="filler-form-footer">
          <Button variant="primary" onClick={onSubmit}
                  loading={generating}
                  icon={<Icon name="download" size={14}/>}>
            {generating ? 'Generando…' : 'Generar PDF'}
          </Button>
        </div>
      </aside>

      <main className="filler-pdf-panel">
        <MockPdfPage zoom={zoom}>
          {fields.map(f => values[f.name] && (
            <span
              key={f.id}
              className="fill-text"
              style={{
                left: f.x + 2, top: f.y, width: f.width - 4, height: f.height,
              }}
            >{values[f.name]}</span>
          ))}
        </MockPdfPage>
      </main>
    </div>
  </div>
);

window.FillerScreen = FillerScreen;
