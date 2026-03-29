'use client';

import type { FormField, FontFamily } from '@/types/shared';
import { Button, Input, Select } from '@/components/ui';
import styles from './PropertiesPanel.module.css';

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

    const handleSizeChange = (raw: string) => {
      const n = Number(raw);
      if (!raw || Number.isNaN(n) || n < 6) return;
      onUpdateFields(ids, { fontSize: n });
    };

    const fontOptions = [
      ...(mixedFont ? [{ value: '', label: '—' }] : []),
      ...FONT_OPTIONS,
    ];

    return (
      <div className={styles['properties-panel']}>
        <h3>Propiedades ({selectionIds.size} campos)</h3>

        <Select
          id="multi-font"
          label="Fuente"
          value={sharedFont}
          onChange={(e) => {
            const val = e.target.value;
            if (val) onUpdateFields(ids, { fontFamily: val as FontFamily });
          }}
          options={fontOptions}
          className={styles['prop-group']}
        />

        <Input
          id="multi-size"
          label="Tamaño de fuente (pt)"
          type="number"
          value={sharedSize}
          placeholder={mixedSize ? '—' : undefined}
          min={6}
          max={72}
          step={1}
          onChange={(e) => handleSizeChange(e.target.value)}
          className={styles['prop-group']}
        />
      </div>
    );
  }

  // No selection
  const field = selectedFieldId ? fields.find((f) => f.id === selectedFieldId) : null;

  if (!field) {
    return (
      <div className={styles['properties-panel']}>
        <h3>Properties</h3>
        <p className={styles['no-selection']}>
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
    <div className={styles['properties-panel']}>
      <h3>Field Properties</h3>

      <Input
        id="prop-name"
        label="Name / ID"
        type="text"
        value={field.name}
        onChange={(e) => update('name', e.target.value)}
        error={hasDuplicate ? '⚠ Duplicate name — must be unique' : undefined}
        className={styles['prop-group']}
      />

      <div className={styles['prop-row']}>
        <Input
          id="prop-x"
          label="X (pt)"
          type="number"
          value={String(Math.round(field.x))}
          min={0}
          step={1}
          onChange={(e) => update('x', Number(e.target.value))}
          className={styles['prop-group']}
        />
        <Input
          id="prop-y"
          label="Y (pt)"
          type="number"
          value={String(Math.round(field.y))}
          min={0}
          step={1}
          onChange={(e) => update('y', Number(e.target.value))}
          className={styles['prop-group']}
        />
      </div>

      <div className={styles['prop-row']}>
        <Input
          id="prop-w"
          label="Width (pt)"
          type="number"
          value={String(Math.round(field.width))}
          min={20}
          step={1}
          onChange={(e) => update('width', Number(e.target.value))}
          className={styles['prop-group']}
        />
        <Input
          id="prop-h"
          label="Height (pt)"
          type="number"
          value={String(Math.round(field.height))}
          min={10}
          step={1}
          onChange={(e) => update('height', Number(e.target.value))}
          className={styles['prop-group']}
        />
      </div>

      <Select
        id="prop-font"
        label="Font"
        value={field.fontFamily}
        onChange={(e) => update('fontFamily', e.target.value as FontFamily)}
        options={FONT_OPTIONS}
        className={styles['prop-group']}
      />

      <Input
        id="prop-size"
        label="Font Size (pt)"
        type="number"
        value={String(field.fontSize)}
        min={6}
        max={72}
        step={1}
        onChange={(e) => update('fontSize', Number(e.target.value))}
        className={styles['prop-group']}
      />

      <Input
        id="prop-value"
        label="Valor predeterminado"
        type="text"
        value={field.value ?? ''}
        placeholder="Texto que aparecerá en el PDF…"
        onChange={(e) => update('value', e.target.value)}
        className={styles['prop-group']}
      />

      <Button
        variant="danger"
        onClick={() => onDelete(field.id)}
      >
        Delete Field
      </Button>
    </div>
  );
}
