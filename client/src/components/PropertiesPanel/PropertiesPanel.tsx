import type { FormField, FontFamily } from 'pdf-form-editor-shared';

interface PropertiesPanelProps {
  fields: FormField[];
  selectedFieldId: string | null;
  onUpdate: (id: string, partial: Partial<Omit<FormField, 'id'>>) => void;
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
  onUpdate,
  onDelete,
}: PropertiesPanelProps) {
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

      <button
        className="btn btn-danger"
        onClick={() => onDelete(field.id)}
      >
        Delete Field
      </button>
    </div>
  );
}
