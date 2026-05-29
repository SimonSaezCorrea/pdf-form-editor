'use client';

import { useState } from 'react';
import type { FormField } from '@/types/shared';
import { FONT_CATALOG, FONT_CATEGORIES, loadFont, getFontByName } from '@/features/pdf/config/fonts';
import { FIELD_TYPE_CONFIG, getFieldTypeConfig } from '@/features/fields/config/fieldTypes';
import { Input } from '@/components/ui';
import styles from './PropertiesPanel.module.css';

interface PropertiesPanelProps {
  fields: FormField[];
  selectedFieldId: string | null;
  selectionIds: ReadonlySet<string>;
  onUpdate: (id: string, partial: Partial<Omit<FormField, 'id'>>) => void;
  onUpdateFields: (ids: string[], partial: Partial<Omit<FormField, 'id'>>) => void;
  onDelete: (id: string) => void;
}

interface SectionProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function Section({ title, open, onToggle, children }: Readonly<SectionProps>) {
  return (
    <div className={styles['prop-section']}>
      <button
        type="button"
        className={styles['prop-section__head']}
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className={styles['prop-section__indicator']}>{open ? '−' : '+'}</span>
        <span>{title}</span>
      </button>
      {open && <div className={styles['prop-section__body']}>{children}</div>}
    </div>
  );
}

export function PropertiesPanel({
  fields,
  selectedFieldId,
  selectionIds,
  onUpdate,
  onUpdateFields,
  onDelete,
}: Readonly<PropertiesPanelProps>) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(['comportamiento']));
  const [collapsedMulti, setCollapsedMulti] = useState<Set<string>>(new Set());

  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const toggleMulti = (k: string) =>
    setCollapsedMulti((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });

  // Multi-selection mode
  if (selectionIds.size > 1) {
    const selected = fields.filter((f) => selectionIds.has(f.id));
    const ids = selected.map((f) => f.id);
    const count = ids.length;

    // Categoría
    const firstGroup = selected[0]?.group ?? '';
    const mixedGroup = selected.some((f) => (f.group ?? '') !== firstGroup);

    // Tipografía
    const firstDisplayFont = selected[0]?.displayFont ?? '';
    const mixedFont = selected.some((f) => (f.displayFont ?? '') !== firstDisplayFont);
    const firstSize = selected[0]?.fontSize;
    const mixedSize = selected.some((f) => f.fontSize !== firstSize);
    const sharedSize = mixedSize ? '' : String(firstSize ?? '');

    // Comportamiento — tri-state: all true / all false / mixed (indeterminate)
    const allRequired  = selected.every((f) => f.required);
    const someRequired = selected.some((f) => f.required);
    const allBorder    = selected.every((f) => f.showBorder);
    const someBorder   = selected.some((f) => f.showBorder);
    const allAutoFit   = selected.every((f) => f.autoFitFont);
    const someAutoFit  = selected.some((f) => f.autoFitFont);
    const allMultiline = selected.every((f) => f.multiline);
    const someMultiline = selected.some((f) => f.multiline);

    return (
      <div className={styles['properties-panel']}>
        <div className={styles['panel-header']}>
          <span className={styles['panel-type-label']}>Propiedades ({count} campos)</span>
        </div>

        <Section title="Categoría" open={!collapsedMulti.has('cat')} onToggle={() => toggleMulti('cat')}>
          <Input
            id="multi-group"
            label="Categoría (opcional)"
            type="text"
            value={mixedGroup ? '' : firstGroup}
            placeholder={mixedGroup ? '—' : 'Ej: Arrendatario'}
            onChange={(e) => onUpdateFields(ids, { group: e.target.value || undefined })}
            className={styles['prop-group']}
          />
        </Section>

        <Section title="Tipografía" open={!collapsedMulti.has('typo')} onToggle={() => toggleMulti('typo')}>
          <Input
            id="multi-size"
            label="Tamaño (pt)"
            type="number"
            value={sharedSize}
            placeholder={mixedSize ? '—' : undefined}
            min={6} max={72} step={1}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (!e.target.value || Number.isNaN(n) || n < 6) return;
              onUpdateFields(ids, { fontSize: n });
            }}
            className={styles['prop-group']}
          />
          <div className={styles['prop-group']}>
            <label htmlFor="multi-font" className={styles['prop-label']}>Fuente</label>
            <select
              id="multi-font"
              value={mixedFont ? '' : firstDisplayFont}
              onChange={(e) => {
                const entry = getFontByName(e.target.value);
                if (!entry) return;
                loadFont(entry.name, entry.ttfFilename);
                onUpdateFields(ids, { displayFont: e.target.value, fontFamily: entry.pdfFallback });
              }}
              className={styles['prop-select']}
            >
              {mixedFont && <option value="">—</option>}
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
        </Section>

        <Section title="Comportamiento" open={!collapsedMulti.has('beh')} onToggle={() => toggleMulti('beh')}>
          {(
            [
              { key: 'required',    label: 'Rellenado obligatorio',     all: allRequired,  some: someRequired  },
              { key: 'showBorder',  label: 'Mostrar borde en PDF',      all: allBorder,    some: someBorder    },
              { key: 'autoFitFont', label: 'Ajustar fuente al contenido', all: allAutoFit, some: someAutoFit   },
              { key: 'multiline',   label: 'Texto multi-línea',         all: allMultiline, some: someMultiline },
            ] as const
          ).map(({ key, label, all, some }) => (
            <label key={key} className={styles['prop-checkbox']}>
              <input
                type="checkbox"
                checked={all}
                ref={(el) => { if (el) el.indeterminate = !all && some; }}
                onChange={(e) => onUpdateFields(ids, { [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
        </Section>

        <div className={styles['prop-footer']}>
          <button
            type="button"
            className={styles['btn-delete']}
            onClick={() => ids.forEach((id) => onDelete(id))}
          >
            🗑 Eliminar {count} campos
          </button>
        </div>
      </div>
    );
  }

  const field = selectedFieldId ? fields.find((f) => f.id === selectedFieldId) : null;

  if (!field) {
    return (
      <div className={styles['properties-panel']}>
        <h3>Propiedades</h3>
        <p className={styles['no-selection']}>
          Selecciona un campo para ver sus propiedades.
        </p>
      </div>
    );
  }

  const hasDuplicate = fields.some((f) => f.id !== field.id && f.name === field.name);
  const update = <K extends keyof Omit<FormField, 'id'>>(key: K, value: FormField[K]) =>
    onUpdate(field.id, { [key]: value } as Partial<Omit<FormField, 'id'>>);

  const typeConfig = getFieldTypeConfig(field.fieldType);

  return (
    <div className={styles['properties-panel']}>
      <div className={styles['panel-header']}>
        <span
          className={styles['panel-type-badge']}
          style={{ background: `${typeConfig.color}28`, color: typeConfig.color }}
        >
          {typeConfig.short}
        </span>
        <span className={styles['panel-type-label']}>{typeConfig.label}</span>
      </div>

      <Section title="General" open={!collapsed.has('general')} onToggle={() => toggle('general')}>
        <Input
          id="prop-name"
          label="Nombre / ID"
          type="text"
          value={field.name}
          onChange={(e) => update('name', e.target.value)}
          error={hasDuplicate ? '⚠ Nombre duplicado' : undefined}
          className={styles['prop-group']}
        />
        <div className={styles['prop-group']}>
          <Input
            id="prop-group"
            label="Categoría (opcional)"
            type="text"
            value={field.group ?? ''}
            placeholder="Ej: Arrendatario"
            onChange={(e) => update('group', e.target.value || undefined)}
          />
          <p className={styles['prop-hint']}>Agrupa campos en la vista de Rellenar</p>
        </div>
        <div className={styles['prop-group']}>
          <label htmlFor="prop-type" className={styles['prop-label']}>Tipo</label>
          <select
            id="prop-type"
            value={field.fieldType ?? 'text'}
            onChange={(e) => update('fieldType', e.target.value as FormField['fieldType'])}
            className={styles['prop-select']}
          >
            {FIELD_TYPE_CONFIG.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
        <Input
          id="prop-value"
          label="Valor predeterminado"
          type="text"
          value={field.value ?? ''}
          placeholder="Texto que aparecerá en el PDF."
          onChange={(e) => update('value', e.target.value)}
          className={styles['prop-group']}
        />
      </Section>

      <Section title="Posición y tamaño" open={!collapsed.has('position')} onToggle={() => toggle('position')}>
        <div className={styles['prop-row']}>
          <Input id="prop-x" label="X (pt)" type="number" value={field.x.toFixed(2)} min={0} step={0.5}
            onChange={(e) => update('x', Number(e.target.value))} className={styles['prop-group']} />
          <Input id="prop-y" label="Y (pt)" type="number" value={field.y.toFixed(2)} min={0} step={0.5}
            onChange={(e) => update('y', Number(e.target.value))} className={styles['prop-group']} />
        </div>
        <div className={styles['prop-row']}>
          <Input id="prop-w" label="Ancho (pt)" type="number" value={field.width.toFixed(2)} min={20} step={0.5}
            onChange={(e) => update('width', Number(e.target.value))} className={styles['prop-group']} />
          <Input id="prop-h" label="Alto (pt)" type="number" value={field.height.toFixed(2)} min={10} step={0.5}
            onChange={(e) => update('height', Number(e.target.value))} className={styles['prop-group']} />
        </div>
      </Section>

      <Section title="Tipografía" open={!collapsed.has('typography')} onToggle={() => toggle('typography')}>
        <div className={styles['prop-group']}>
          <label htmlFor="prop-font" className={styles['prop-label']}>Fuente</label>
          <select
            id="prop-font"
            value={field.displayFont ?? ''}
            onChange={(e) => {
              const entry = getFontByName(e.target.value);
              if (!entry) return;
              loadFont(entry.name, entry.ttfFilename);
              update('displayFont', e.target.value);
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
          label="Tamaño (pt)"
          type="number"
          value={String(field.fontSize)}
          min={6}
          max={72}
          step={1}
          onChange={(e) => update('fontSize', Number(e.target.value))}
          className={styles['prop-group']}
        />
      </Section>

      <Section title="Comportamiento" open={!collapsed.has('comportamiento')} onToggle={() => toggle('comportamiento')}>
        <label className={styles['prop-checkbox']}>
          <input type="checkbox" checked={field.required ?? false}
            onChange={(e) => update('required', e.target.checked)} />
          Rellenado obligatorio
        </label>
        <label className={styles['prop-checkbox']}>
          <input type="checkbox" checked={field.showBorder ?? false}
            onChange={(e) => update('showBorder', e.target.checked)} />
          Mostrar borde en PDF
        </label>
        <label className={styles['prop-checkbox']}>
          <input type="checkbox" checked={field.autoFitFont ?? false}
            onChange={(e) => update('autoFitFont', e.target.checked)} />
          Ajustar fuente al contenido
        </label>
        <label className={styles['prop-checkbox']}>
          <input type="checkbox" checked={field.multiline ?? false}
            onChange={(e) => update('multiline', e.target.checked)} />
          Texto multi-línea
        </label>
      </Section>

      <div className={styles['prop-footer']}>
        <button type="button" className={styles['btn-delete']} onClick={() => onDelete(field.id)}>
          Eliminar campo
        </button>
      </div>
    </div>
  );
}
