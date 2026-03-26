import type { FormField } from 'pdf-form-editor-shared';

interface FieldListProps {
  fields: FormField[];
  selectedFieldId: string | null;
  onSelect: (id: string) => void;
}

export function FieldList({ fields, selectedFieldId, onSelect }: FieldListProps) {
  return (
    <div className="field-list">
      <h3>Fields ({fields.length})</h3>
      {fields.length === 0 ? (
        <p className="field-list-empty">Click on the PDF to add fields.</p>
      ) : (
        fields.map((field) => (
          <div
            key={field.id}
            className={`field-list-item${field.id === selectedFieldId ? ' selected' : ''}`}
            onClick={() => onSelect(field.id)}
          >
            <span className="item-name" title={field.name}>
              {field.name}
            </span>
            <span className="item-page">p.{field.page}</span>
          </div>
        ))
      )}
    </div>
  );
}
