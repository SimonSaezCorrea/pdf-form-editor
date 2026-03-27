import type { FormField, FontFamily } from 'pdf-form-editor-shared';

interface PropertiesPanelProps {
  fields: FormField[];
  selectedFieldId: string | null;
  selectionIds: ReadonlySet<string>;
  onUpdate: (id: string, partial: Partial<Omit<FormField, 'id'>>) => void;
  onUpdateFields: (ids: string[], partial: Partial<Omit<FormField, 'id'>>) => void;
  onDelete: (id: string) => void;
}

const FONT_OPTIONS: { value: FontFamily; label: string }[] = [
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'TimesRoman', label: 'Times Roman' },
  { value: 'Courier', label: 'Courier' },
];

export function PropertiesPanel({
  fields,
  selectedFieldId,
  selectionIds,
  onUpdate,
  onUpdateFields,
  onDelete,
}: PropertiesPanelProps) {
  // Multi-selection mode: 2+ fields selected
  if (selectionIds.size > 1) {
    const selected = fields.filter((f) => selectionIds.has(f.id));
    const ids = selected.map((f) => f.id);

    const firstFont = selected[0]?.fontFamily;
    const mixedFont = selected.some((f) => f.fontFamily !== firstFont);
    const sharedFont: FontFamily | '' = mixedFont ? '' : (firstFont ?? '');

    const firstSize = selected[0]?.fontSize;
    const mixedSize = selected.some((f) => f.fontSize !== firstSize);
    const sharedSize = mixedSize ? '' : String(firstSize ?? '');

    const handleFontChange = (value: FontFamily) => {
      onUpdateFields(ids, { fontFamily: value });
    };

    const handleSizeChange = (raw: string) => {
      const n = Number(raw);
      if (!raw || isNaN(n) || n < 6) return;
      onUpdateFields(ids, { fontSize: n });
    };

    return (
      <div className="properties-panel">
        <h3>Propiedades ({selectionIds.size} campos)</h3>

        <div className="prop-group">
          <label htmlFor="multi-font">Fuente</label>
          <select
            id="multi-font"
            value={sharedFont}
            onChange={(e) => handleFontChange(e.target.value as FontFamily)}
          >
            {mixedFont && (
              <option value="" disabled>
                —
              </option>
            )}
            {FONT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="prop-group">
          <label htmlFor="multi-size">Tamaño de fuente (pt)</label>
          <input
            id="multi-size"
            type="number"
            value={sharedSize}
            placeholder={mixedSize ? '—' : undefined}
            min={6}
            max={72}
            step={1}
            onChange={(e) => handleSizeChange(e.target.value)}
          />
        </div>
      </div>
    );
  }

  // No selection
  const field = selectedFieldId ? fields.find((f) => f.id === selectedFieldId) : null;

  if (!field) {
    return (
      <div className="properties-panel">
        <h3>Properties</h3>
        <p className="no-selection">
          No field selected.
          <br />
          Click on the PDF to add a new field.
        </p>
      </div>
    );
  }

  const hasDuplicate = fields.some(
    (f) => f.id !== field.id && f.name === field.name,
  );

  const update = <K extends keyof Omit<FormField, 'id'>>(key: K, value: FormField[K]) =>
    onUpdate(field.id, { [key]: value } as Partial<Omit<FormField, 'id'>>);

  return (
    <div className="properties-panel">
      <h3>Field Properties</h3>

      <div className="prop-group">
        <label htmlFor="prop-name">Name / ID</label>
        <input
          id="prop-name"
          type="text"
          value={field.name}
          onChange={(e) => update('name', e.target.value)}
        />
        {hasDuplicate && (
          <p className="warning-msg">⚠ Duplicate name — must be unique</p>
        )}
      </div>

      <div className="prop-row">
        <div className="prop-group">
          <label htmlFor="prop-x">X (pt)</label>
          <input
            id="prop-x"
            type="number"
            value={Math.round(field.x)}
            min={0}
            step={1}
            onChange={(e) => update('x', Number(e.target.value))}
          />
        </div>
        <div className="prop-group">
          <label htmlFor="prop-y">Y (pt)</label>
          <input
            id="prop-y"
            type="number"
            value={Math.round(field.y)}
            min={0}
            step={1}
            onChange={(e) => update('y', Number(e.target.value))}
          />
        </div>
      </div>

      <div className="prop-row">
        <div className="prop-group">
          <label htmlFor="prop-w">Width (pt)</label>
          <input
            id="prop-w"
            type="number"
            value={Math.round(field.width)}
            min={20}
            step={1}
            onChange={(e) => update('width', Number(e.target.value))}
          />
        </div>
        <div className="prop-group">
          <label htmlFor="prop-h">Height (pt)</label>
          <input
            id="prop-h"
            type="number"
            value={Math.round(field.height)}
            min={10}
            step={1}
            onChange={(e) => update('height', Number(e.target.value))}
          />
        </div>
      </div>

      <div className="prop-group">
        <label htmlFor="prop-font">Font</label>
        <select
          id="prop-font"
          value={field.fontFamily}
          onChange={(e) => update('fontFamily', e.target.value as FontFamily)}
        >
          {FONT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="prop-group">
        <label htmlFor="prop-size">Font Size (pt)</label>
        <input
          id="prop-size"
          type="number"
          value={field.fontSize}
          min={6}
          max={72}
          step={1}
          onChange={(e) => update('fontSize', Number(e.target.value))}
        />
      </div>

      <div className="prop-group">
        <label htmlFor="prop-value">Valor predeterminado</label>
        <input
          id="prop-value"
          type="text"
          value={field.value ?? ''}
          placeholder="Texto que aparecerá en el PDF…"
          onChange={(e) => update('value', e.target.value)}
        />
      </div>

      <button
        className="btn btn-danger"
        onClick={() => onDelete(field.id)}
      >
        Delete Field
      </button>
    </div>
  );
}
