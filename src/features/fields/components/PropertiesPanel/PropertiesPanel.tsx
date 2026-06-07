'use client';

import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  /** Optional control rendered at the right edge of the section header. */
  action?: React.ReactNode;
}

function Section({ title, open, onToggle, children, action }: Readonly<SectionProps>) {
  return (
    <div className={styles['prop-section']}>
      <div className={styles['prop-section__head-row']}>
        <button
          type="button"
          className={styles['prop-section__head']}
          onClick={onToggle}
          aria-expanded={open}
        >
          <span
            className={styles['prop-section__indicator']}
            dangerouslySetInnerHTML={{ __html: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>' }}
            style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
          />
          <span>{title}</span>
        </button>
        {action}
      </div>
      {open && <div className={styles['prop-section__body']}>{children}</div>}
    </div>
  );
}

const svgBase = {
  viewBox: '0 0 24 24',
  width: 16,
  height: 16,
  fill: 'none',
  stroke: 'currentColor',
  'aria-hidden': true,
} as const;

/** Asterisk — required field. */
const RequiredIcon = (
  <svg {...svgBase} strokeWidth={2.2} strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5.5" y1="8.5" x2="18.5" y2="15.5" />
    <line x1="18.5" y1="8.5" x2="5.5" y2="15.5" />
  </svg>
);

/** Stacked lines — multiline text. */
const MultilineIcon = (
  <svg {...svgBase} strokeWidth={2} strokeLinecap="round">
    <line x1="5" y1="8" x2="19" y2="8" />
    <line x1="5" y1="12" x2="19" y2="12" />
    <line x1="5" y1="16" x2="14" y2="16" />
  </svg>
);

/** Rectangle outline — visible PDF border. */
const BorderIcon = (
  <svg {...svgBase} strokeWidth={2}>
    <rect x="4.5" y="6" width="15" height="12" rx="1.5" />
  </svg>
);

interface ToggleBadgeProps {
  active: boolean;
  /** Partial state for multi-selection (some on, some off). */
  mixed?: boolean;
  tooltip: string;
  onClick: () => void;
  children: React.ReactNode;
}

/**
 * Square toggle button: neutral off, fluor on, partial when mixed.
 * The hover legend is rendered through a portal to <body> so the scrolling,
 * overflow-clipping properties panel can never cut it off.
 */
function ToggleBadge({ active, mixed, tooltip, onClick, children }: Readonly<ToggleBadgeProps>) {
  const ref = useRef<HTMLButtonElement>(null);
  const [tipPos, setTipPos] = useState<{ x: number; y: number } | null>(null);

  // Static placement: BELOW the button, right-aligned to its right edge so it
  // extends leftward — the panel sits at the screen's right edge, so there is
  // always room to the left and it never clips at the right border.
  const showTip = () => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setTipPos({ x: r.right, y: r.bottom + 6 });
  };
  const hideTip = () => setTipPos(null);

  return (
    <>
      <button
        ref={ref}
        type="button"
        className={[
          styles['toggle-badge'],
          active ? styles['toggle-badge--active'] : '',
          mixed ? styles['toggle-badge--mixed'] : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={onClick}
        onMouseEnter={showTip}
        onMouseLeave={hideTip}
        onFocus={showTip}
        onBlur={hideTip}
        aria-pressed={active}
        aria-label={tooltip}
      >
        {children}
      </button>
      {tipPos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className={styles['toggle-tooltip']}
            style={{ left: tipPos.x, top: tipPos.y }}
            role="tooltip"
          >
            {tooltip}
          </div>,
          document.body,
        )}
    </>
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
            type={allAutoFit ? 'text' : 'number'}
            value={allAutoFit ? 'Automático' : sharedSize}
            disabled={allAutoFit}
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
          <div className={styles['badge-row']}>
            <ToggleBadge
              active={allRequired} mixed={!allRequired && someRequired}
              tooltip="Rellenado obligatorio"
              onClick={() => onUpdateFields(ids, { required: !allRequired })}
            >{RequiredIcon}</ToggleBadge>
            <ToggleBadge
              active={allBorder} mixed={!allBorder && someBorder}
              tooltip="Mostrar borde en el PDF"
              onClick={() => onUpdateFields(ids, { showBorder: !allBorder })}
            >{BorderIcon}</ToggleBadge>
            <ToggleBadge
              active={allAutoFit} mixed={!allAutoFit && someAutoFit}
              tooltip="Ajuste automático de la fuente al contenido"
              onClick={() => onUpdateFields(ids, { autoFitFont: !allAutoFit })}
            >A</ToggleBadge>
            <ToggleBadge
              active={allMultiline} mixed={!allMultiline && someMultiline}
              tooltip="Texto multilínea"
              onClick={() => onUpdateFields(ids, { multiline: !allMultiline })}
            >{MultilineIcon}</ToggleBadge>
          </div>
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
        {/* Nombre/ID + obligatorio (toggle no bloquea el campo) */}
        <div className={styles['field-with-badge']}>
          <Input
            id="prop-name"
            label="Nombre / ID"
            type="text"
            value={field.name}
            onChange={(e) => update('name', e.target.value)}
            error={hasDuplicate ? '⚠ Nombre duplicado' : undefined}
            className={styles['prop-group']}
          />
          <ToggleBadge
            active={field.required ?? false}
            tooltip="Rellenado obligatorio"
            onClick={() => update('required', !(field.required ?? false))}
          >{RequiredIcon}</ToggleBadge>
        </div>
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
        {/* Valor predeterminado + multi-línea (solo para tipo Texto) */}
        <div className={styles['field-with-badge']}>
          <Input
            id="prop-value"
            label="Valor predeterminado"
            type={field.fieldType === 'number' || field.fieldType === 'date' ? field.fieldType : 'text'}
            value={field.value ?? ''}
            placeholder={field.fieldType === 'number' ? 'Solo números.' : 'Texto que aparecerá en el PDF.'}
            onChange={(e) => update('value', e.target.value)}
            className={styles['prop-group']}
          />
          {(field.fieldType ?? 'text') === 'text' && (
            <ToggleBadge
              active={field.multiline ?? false}
              tooltip="Texto multilínea"
              onClick={() => update('multiline', !(field.multiline ?? false))}
            >{MultilineIcon}</ToggleBadge>
          )}
        </div>
      </Section>

      <Section
        title="Posición y tamaño"
        open={!collapsed.has('position')}
        onToggle={() => toggle('position')}
        action={
          <ToggleBadge
            active={field.showBorder ?? false}
            tooltip="Mostrar borde en el PDF"
            onClick={() => update('showBorder', !(field.showBorder ?? false))}
          >{BorderIcon}</ToggleBadge>
        }
      >
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
        {/* Tamaño + ajuste automático. Mismo Input siempre montado (sin remontar → sin
            saltos): al activar auto-fit se deshabilita y muestra "Automático". */}
        <div className={styles['field-with-badge']}>
          <Input
            id="prop-size"
            label="Tamaño (pt)"
            type={field.autoFitFont ? 'text' : 'number'}
            value={field.autoFitFont ? 'Automático' : String(field.fontSize)}
            disabled={field.autoFitFont ?? false}
            min={6}
            max={72}
            step={1}
            onChange={(e) => update('fontSize', Number(e.target.value))}
            className={styles['prop-group']}
          />
          <ToggleBadge
            active={field.autoFitFont ?? false}
            tooltip="Ajuste automático de la fuente al contenido"
            onClick={() => update('autoFitFont', !(field.autoFitFont ?? false))}
          >A</ToggleBadge>
        </div>
      </Section>

      <div className={styles['prop-footer']}>
        <button type="button" className={styles['btn-delete']} onClick={() => onDelete(field.id)}>
          Eliminar campo
        </button>
      </div>
    </div>
  );
}
