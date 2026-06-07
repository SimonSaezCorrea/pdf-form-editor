'use client';

import { useEffect } from 'react';
import { Input } from '@/components/ui/Input/Input';
import { Kbd } from '@/components/ui/Kbd/Kbd';
import { SignaturePad } from '../SignaturePad/SignaturePad';
import type { AcroFormField } from '../../types';
import { orderGroups } from '../../config/groups';
import styles from './DynamicForm.module.css';

interface FieldControlProps {
  field: AcroFormField;
  value: string;
  hasError: boolean;
  generating: boolean;
  onValueChange: (name: string, value: string) => void;
}

/** Renders the correct input control for a field based on its type. */
function FieldControl({ field, value, hasError, generating, onValueChange }: Readonly<FieldControlProps>) {
  const id = `filler-field-${field.name}`;

  if (field.type === 'checkbox') {
    const isFilled = !!value;
    return (
      <label className={styles['checkbox-control']}>
        <input
          id={id}
          type="checkbox"
          checked={isFilled}
          disabled={generating}
          onChange={(e) => onValueChange(field.name, e.target.checked ? '✓' : '')}
        />
        <span>{isFilled ? 'Marcado' : 'Sin marcar'}</span>
      </label>
    );
  }

  if (field.type === 'signature') {
    return (
      <SignaturePad
        value={value}
        rect={field.rect}
        disabled={generating}
        onChange={(dataUrl) => onValueChange(field.name, dataUrl)}
      />
    );
  }

  if (field.type === 'text' && field.multiline) {
    return (
      <textarea
        id={id}
        className={styles['multiline-input']}
        value={value}
        rows={4}
        disabled={generating}
        placeholder="Escribe aquí… (Enter para salto de línea)"
        onChange={(e) => onValueChange(field.name, e.target.value)}
      />
    );
  }

  const inputType = field.type === 'number' || field.type === 'date' ? field.type : 'text';
  return (
    <Input
      id={id}
      type={inputType}
      value={value}
      onChange={(e) => onValueChange(field.name, e.target.value)}
      placeholder={field.type === 'number' ? 'Solo números…' : 'Escribe aquí…'}
      disabled={generating}
      error={hasError ? 'Campo requerido' : undefined}
    />
  );
}

function relTime(ts: number): string {
  const secs = Math.round((Date.now() - ts) / 1000);
  if (secs < 60) return 'hace un momento';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `hace ${mins} min`;
  return `hace ${Math.floor(mins / 60)}h`;
}

function fieldStatus(isFilled: boolean, hasError: boolean): string {
  if (isFilled) return '✓';
  if (hasError) return '!';
  return '';
}

interface DynamicFormProps {
  fields: AcroFormField[];
  values: Record<string, string>;
  onValueChange: (name: string, value: string) => void;
  generating: boolean;
  collapsed: Set<string>;
  lastSaved: number | null;
  resetConfirm: boolean;
  errors: Set<string>;
  jumpedId: string | null;
  onToggleCollapse: (group: string) => void;
  onJumpToNextEmpty: (fromId: string | null) => void;
  onCancelReset: () => void;
  onConfirmReset: () => void;
  onImportMetadata: () => void;
}

export function DynamicForm({
  fields,
  values,
  onValueChange,
  generating,
  collapsed,
  lastSaved,
  resetConfirm,
  errors,
  jumpedId,
  onToggleCollapse,
  onJumpToNextEmpty,
  onCancelReset,
  onConfirmReset,
  onImportMetadata,
}: Readonly<DynamicFormProps>) {
  // Group fields — orden lógico explícito (GROUP_ORDER), no orden de aparición
  const groupNames = orderGroups([...new Set(fields.map((f) => f.group ?? 'General'))]);
  const fieldsByGroup: Record<string, AcroFormField[]> = {};
  for (const g of groupNames) {
    fieldsByGroup[g] = fields.filter((f) => (f.group ?? 'General') === g);
  }

  // Focus jumped field
  useEffect(() => {
    if (!jumpedId) return;
    const timer = setTimeout(() => {
      document.getElementById(`filler-field-${jumpedId}`)?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [jumpedId]);

  // Find currently focused field id for "jump to next empty"
  const lastFilledField = [...fields].reverse().find((f) => !!values[f.name]);

  const hasErrors = errors.size > 0;
  const filledCount = fields.filter((f) => !!values[f.name]).length;
  const totalRequired = fields.filter((f) => f.required).length;
  const filledRequired = fields.filter((f) => f.required && !!values[f.name]).length;
  const allRequiredFilled = filledRequired === totalRequired;

  return (
    <div className={styles['dynamic-form']}>
      {/* Header: autosave pill */}
      <div className={styles['form-header']}>
        <span className={styles['save-pill']}>
          <span className={styles['dot-live']} />
          {lastSaved ? relTime(lastSaved) : 'Sin guardar'}
        </span>
        <span className={styles['fill-progress']}>
          {filledCount}/{fields.length} campos
        </span>
        <button
          type="button"
          className={styles['import-meta-btn']}
          onClick={onImportMetadata}
          title="Importar categorías desde plantilla JSON"
        >
          Importar categorías
        </button>
      </div>

      {/* Reset confirmation banner */}
      {resetConfirm && (
        <div className={styles['filler-banner']}>
          <span>¿Limpiar todos los valores?</span>
          <div className={styles['banner-actions']}>
            <button type="button" className={styles['banner-btn']} onClick={onCancelReset}>
              Cancelar
            </button>
            <button type="button" className={[styles['banner-btn'], styles['banner-btn--danger']].join(' ')} onClick={onConfirmReset}>
              Sí, limpiar
            </button>
          </div>
        </div>
      )}

      {/* Validation error banner */}
      {hasErrors && (
        <div className={[styles['filler-banner'], styles['filler-banner--warning']].join(' ')}>
          {errors.size} campo{errors.size > 1 ? 's' : ''} requerido{errors.size > 1 ? 's' : ''} sin completar
        </div>
      )}

      {/* Success banner */}
      {!hasErrors && allRequiredFilled && filledCount > 0 && (
        <div className={[styles['filler-banner'], styles['filler-banner--success']].join(' ')}>
          Todos los campos requeridos completos ✓
        </div>
      )}

      {/* Grouped sections */}
      <div className={styles['form-fields']}>
        {groupNames.map((group) => {
          const groupFields = fieldsByGroup[group];
          const filled = groupFields.filter((f) => !!values[f.name]).length;
          const total = groupFields.length;
          const missingRequired = groupFields.filter((f) => f.required && !values[f.name]).length;
          const allFilled = filled === total;
          const isCollapsed = collapsed.has(group);
          const pct = total > 0 ? (filled / total) * 100 : 0;

          return (
            <div key={group} className={styles['filler-section']}>
              <button
                type="button"
                className={[styles['filler-section__head'], isCollapsed ? styles['collapsed'] : ''].filter(Boolean).join(' ')}
                onClick={() => onToggleCollapse(group)}
              >
                <span className={[styles['filler-section__chevron'], isCollapsed ? '' : styles['filler-section__chevron--open']].filter(Boolean).join(' ')}>▸</span>
                <span className={styles['section-name']}>{group}</span>
                <span className={styles['section-count']}>{filled}/{total}</span>
                {allFilled && <span className={styles['section-done']}>✓</span>}
                {missingRequired > 0 && (
                  <span className={styles['section-missing']}>
                    {missingRequired} faltante{missingRequired > 1 ? 's' : ''}
                  </span>
                )}
              </button>
              <div className={styles['section-progress']}>
                <div
                  className={styles['section-progress__fill']}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {!isCollapsed && (
                <div className={styles['filler-section__body']}>
                  {groupFields.map((field) => {
                    const value = values[field.name] ?? '';
                    const hasError = errors.has(field.name);
                    const isFilled = !!value;
                    return (
                      <div
                        key={field.name}
                        className={[
                          styles['filler-field'],
                          hasError ? styles['filler-field--error'] : '',
                        ].filter(Boolean).join(' ')}
                      >
                        <label
                          htmlFor={`filler-field-${field.name}`}
                          className={styles['field-label']}
                        >
                          {field.name}
                          {field.required ? (
                            <span className={styles['required-mark']}> *</span>
                          ) : (
                            <span className={styles['optional-mark']}> (opcional)</span>
                          )}
                        </label>
                        <div className={styles['field-input-row']}>
                          <FieldControl
                            field={field}
                            value={value}
                            hasError={hasError}
                            generating={generating}
                            onValueChange={onValueChange}
                          />
                          <span className={styles['filler-field-status']}>
                            {fieldStatus(isFilled, hasError)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer: jump to next empty (Generar PDF vive en la barra superior) */}
      <div className={styles['form-footer']}>
        <button
          type="button"
          className={styles['next-empty']}
          onClick={() => onJumpToNextEmpty(lastFilledField?.name ?? null)}
          disabled={generating}
        >
          ↓ Siguiente vacío <Kbd>Enter</Kbd>
        </button>
      </div>
    </div>
  );
}
