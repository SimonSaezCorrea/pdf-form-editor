/* ─── EditorScreen.jsx ───────────────────────────────────────────────
   Three-pane editor: ThumbnailStrip | Sidebar (FieldList) | Canvas | Properties.
   ───────────────────────────────────────────────────────────────────── */

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

const DraggableField = ({ field, selected, onSelect }) => (
  <div
    className={`field ${selected ? 'field--selected' : ''}`}
    style={{
      left: field.x, top: field.y,
      width: field.width, height: field.height,
    }}
    onClick={(e) => { e.stopPropagation(); onSelect(field.id); }}
  >
    <span className={`field__label ${field.value ? 'field__label--has-value' : ''}`}
          style={field.value ? { fontFamily: "'Times New Roman', serif", fontSize: '12px' } : null}>
      {field.value || field.name}
    </span>
    {selected && HANDLES.map(h => (
      <span key={h} className={`field__handle field__handle--${h}`} />
    ))}
  </div>
);

const ThumbnailStrip = ({ currentPage, onSelect }) => (
  <div className="thumbnail-strip" aria-label="Miniaturas de páginas">
    {[1, 2].map(n => (
      <button
        key={n}
        className={`thumb ${n === currentPage ? 'active' : ''}`}
        onClick={() => onSelect(n)}
        aria-pressed={n === currentPage}
      >
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

const FieldList = ({ fields, selectedId, onSelect }) => (
  <aside className="sidebar">
    <h3>Fields ({fields.length})</h3>
    <div className="field-list">
      {fields.length === 0 ? (
        <p className="field-list-empty">Click on the PDF to add fields.</p>
      ) : (
        fields.map((f) => (
          <div
            key={f.id}
            className={`field-list-item ${f.id === selectedId ? 'selected' : ''}`}
            onClick={() => onSelect(f.id)}
          >
            <span className="name" title={f.name}>{f.name}</span>
            <span className="page">p.{f.page}</span>
          </div>
        ))
      )}
    </div>
  </aside>
);

const PropertiesPanel = ({ field, fields, onUpdate, onDelete }) => {
  if (!field) {
    return (
      <aside className="properties-panel">
        <h3>Properties</h3>
        <p className="no-selection">
          No field selected.<br />
          Click on the PDF to add a new field.
        </p>
      </aside>
    );
  }
  const hasDup = fields.some(f => f.id !== field.id && f.name === field.name);
  const update = (k, v) => onUpdate(field.id, { [k]: v });
  return (
    <aside className="properties-panel">
      <h3>Field Properties</h3>

      <Input id="prop-name" label="Name / ID" type="text"
             value={field.name}
             error={hasDup ? '⚠ Duplicate name — must be unique' : undefined}
             onChange={(e) => update('name', e.target.value)} />

      <div className="prop-row">
        <Input id="prop-x" label="X (pt)" type="number" value={field.x.toFixed(2)}
               onChange={(e) => update('x', Number(e.target.value))} />
        <Input id="prop-y" label="Y (pt)" type="number" value={field.y.toFixed(2)}
               onChange={(e) => update('y', Number(e.target.value))} />
      </div>
      <div className="prop-row">
        <Input id="prop-w" label="Width" type="number" value={field.width.toFixed(2)}
               onChange={(e) => update('width', Number(e.target.value))} />
        <Input id="prop-h" label="Height" type="number" value={field.height.toFixed(2)}
               onChange={(e) => update('height', Number(e.target.value))} />
      </div>

      <Select id="prop-font" label="Fuente"
              value={field.font || 'Helvetica'}
              onChange={(e) => update('font', e.target.value)}
              options={[
                { value: 'Helvetica', label: 'Helvetica' },
                { value: 'Times-Roman', label: 'Times Roman' },
                { value: 'Courier', label: 'Courier' },
              ]} />

      <Input id="prop-size" label="Font Size (pt)" type="number"
             value={String(field.fontSize)}
             onChange={(e) => update('fontSize', Number(e.target.value))} />

      <Input id="prop-value" label="Valor predeterminado" type="text"
             value={field.value || ''}
             placeholder="Texto que aparecerá en el PDF…"
             onChange={(e) => update('value', e.target.value)} />

      <label className="prop-checkbox">
        <input type="checkbox" checked={field.showBorder || false}
               onChange={(e) => update('showBorder', e.target.checked)} />
        Mostrar borde en PDF
      </label>
      <label className="prop-checkbox">
        <input type="checkbox" checked={field.autoFitFont || false}
               onChange={(e) => update('autoFitFont', e.target.checked)} />
        Ajustar fuente al contenido
      </label>
      <label className="prop-checkbox">
        <input type="checkbox" checked={field.multiline || false}
               onChange={(e) => update('multiline', e.target.checked)} />
        Texto multi-línea
      </label>

      <Button variant="danger" onClick={() => onDelete(field.id)} icon={<Icon name="trash" size={14}/>}>
        Delete Field
      </Button>
    </aside>
  );
};

const EditorScreen = ({
  fields, selectedId, onSelect, onUpdate, onDelete,
  zoom, thumbnailsVisible, currentPage, onPageSelect,
}) => (
  <div className="editor-layout">
    {thumbnailsVisible && (
      <ThumbnailStrip currentPage={currentPage} onSelect={onPageSelect} />
    )}
    <FieldList fields={fields} selectedId={selectedId} onSelect={onSelect} />
    <main className="viewer-area" onClick={() => onSelect(null)}>
      <MockPdfPage zoom={zoom}>
        {fields.map(f => (
          <DraggableField key={f.id} field={f}
                          selected={f.id === selectedId}
                          onSelect={onSelect} />
        ))}
      </MockPdfPage>
    </main>
    <PropertiesPanel
      field={fields.find(f => f.id === selectedId)}
      fields={fields}
      onUpdate={onUpdate}
      onDelete={onDelete}
    />
  </div>
);

window.EditorScreen = EditorScreen;
