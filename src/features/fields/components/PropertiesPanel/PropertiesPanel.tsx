'use client';

import type { FormField } from '@/types/shared';
import { FONT_CATALOG, FONT_CATEGORIES, loadFont, getFontByName } from '@/features/pdf/config/fonts';
import { Button, Input } from '@/components/ui';
import styles from './PropertiesPanel.module.css';

interface PropertiesPanelProps {
  fields: FormField[];
  selectedFieldId: string | null;
  selectionIds: ReadonlySet<string>;
  onUpdate: (id: string, partial: Partial<Omit<FormField, 'id'>>) => void;
  onUpdateFields: (ids: string[], partial: Partial<Omit<FormField, 'id'>>) => void;
  onDelete: (id: string) => void;
}

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

    const firstDisplayFont = selected[0]?.displayFont ?? '';
    const mixedFont = selected.some((f) => (f.displayFont ?? '') !== firstDisplayFont);
    const sharedDisplayFont = mixedFont ? '' : firstDisplayFont;

    const firstSize = selected[0]?.fontSize;
    const mixedSize = selected.some((f) => f.fontSize !== firstSize);
    const sharedSize = mixedSize ? '' : String(firstSize ?? '');

    const handleSizeChange = (raw: string) => {
      const n = Number(raw);
      if (!raw || Number.isNaN(n) || n < 6) return;
      onUpdateFields(ids, { fontSize: n });
    };

    return (
      <div className={styles['properties-panel']}>
        <h3>Propiedades ({selectionIds.size} campos)</h3>

        <div className={styles['prop-group']}>
          <label htmlFor="multi-font" className={styles['prop-label']}>Fuente</label>
          <select
            id="multi-font"
            value={sharedDisplayFont}
            onChange={(e) => {
              const name = e.target.value;
              const entry = getFontByName(name);
              if (!entry) return;
              loadFont(entry.name, entry.ttfFilename);
              onUpdateFields(ids, { displayFont: name, fontFamily: entry.pdfFallback });
            }}
            className={styles['prop-select']}
          >
            {mixedFont && <option value="">—</option>}
            {FONT_CATEGORIES.map((cat) => (
              <optgroup key={cat} label={cat}>
                {FONT_CATALOG.filter((f) => f.category === cat).map((f) => (
                  <option key={f.name} value={f.name}>{f.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

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
          value={field.x.toFixed(2)}
          min={0}
          step={0.5}
          onChange={(e) => update('x', Number(e.target.value))}
          className={styles['prop-group']}
        />
        <Input
          id="prop-y"
          label="Y (pt)"
          type="number"
          value={field.y.toFixed(2)}
          min={0}
          step={0.5}
          onChange={(e) => update('y', Number(e.target.value))}
          className={styles['prop-group']}
        />
      </div>

      <div className={styles['prop-row']}>
        <Input
          id="prop-w"
          label="Width (pt)"
          type="number"
          value={field.width.toFixed(2)}
          min={20}
          step={0.5}
          onChange={(e) => update('width', Number(e.target.value))}
          className={styles['prop-group']}
        />
        <Input
          id="prop-h"
          label="Height (pt)"
          type="number"
          value={field.height.toFixed(2)}
          min={10}
          step={0.5}
          onChange={(e) => update('height', Number(e.target.value))}
          className={styles['prop-group']}
        />
      </div>

      <div className={styles['prop-group']}>
        <label htmlFor="prop-font" className={styles['prop-label']}>Fuente</label>
        <select
          id="prop-font"
          value={field.displayFont ?? ''}
          onChange={(e) => {
            const name = e.target.value;
            const entry = getFontByName(name);
            if (!entry) return;
            loadFont(entry.name, entry.ttfFilename);
            update('displayFont', name);
            update('fontFamily', entry.pdfFallback);
          }}
          className={styles['prop-select']}
        >
          <option value="">Sin fuente personalizada</option>
          {FONT_CATEGORIES.map((cat) => (
            <optgroup key={cat} label={cat}>
              {FONT_CATALOG.filter((f) => f.category === cat).map((f) => (
                <option key={f.name} value={f.name}>{f.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

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

      <label className={styles['prop-checkbox']}>
        <input
          type="checkbox"
          checked={field.showBorder ?? false}
          onChange={(e) => update('showBorder', e.target.checked)}
        />
        Mostrar borde en PDF
      </label>

      <label className={styles['prop-checkbox']}>
        <input
          type="checkbox"
          checked={field.autoFitFont ?? false}
          onChange={(e) => update('autoFitFont', e.target.checked)}
        />
        Ajustar fuente al contenido
      </label>

      <label className={styles['prop-checkbox']}>
        <input
          type="checkbox"
          checked={field.multiline ?? false}
          onChange={(e) => update('multiline', e.target.checked)}
        />
        Texto multi-línea
      </label>

      <Button
        variant="danger"
        onClick={() => onDelete(field.id)}
      >
        Delete Field
      </Button>
    </div>
  );
}
