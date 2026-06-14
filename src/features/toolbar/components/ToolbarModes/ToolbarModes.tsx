'use client';

import type { InteractionMode } from '@/hooks/useInteractionMode';
import type { FieldTypeId } from '@/types/shared';
import { FIELD_TYPE_CONFIG } from '@/features/fields/config/fieldTypes';
import { Tooltip } from '@/components/ui';
import styles from './ToolbarModes.module.css';

interface ModeButton {
  mode: InteractionMode;
  label: string;
  key: string;
}

const MODES: ModeButton[] = [
  { mode: 'select', label: 'Seleccionar', key: 'S' },
  { mode: 'move',   label: 'Mover',       key: 'M' },
];

interface ToolbarModesProps {
  mode: InteractionMode;
  onModeChange: (m: InteractionMode) => void;
  insertType?: FieldTypeId;
  onInsertTypeChange?: (t: FieldTypeId) => void;
  selectionCount?: number;
}

export function ToolbarModes({
  mode,
  onModeChange,
  insertType,
  onInsertTypeChange,
  selectionCount,
}: Readonly<ToolbarModesProps>) {
  return (
    <div className={styles['toolbar-modes']}>
      {MODES.map((btn) => (
        <Tooltip key={btn.mode} content={`${btn.label} · ${btn.key}`} position="bottom">
          <button
            className={[styles['mode-btn'], mode === btn.mode ? styles.active : ''].filter(Boolean).join(' ')}
            onClick={() => onModeChange(btn.mode)}
          >
            {btn.label}
            {btn.mode === 'select' && selectionCount != null && selectionCount > 0 ? (
              <span className={styles['mode-count']}>{selectionCount}</span>
            ) : (
              <span className={styles['mode-key']}>{btn.key}</span>
            )}
          </button>
        </Tooltip>
      ))}

      {onInsertTypeChange && (
        <>
          <span className={styles.separator} aria-hidden="true" />
          <span className={[styles['insertar-label'], mode === 'insert' ? styles['insertar-label--active'] : ''].filter(Boolean).join(' ')} aria-hidden="true">
            INSERTAR
          </span>
          <fieldset className={styles['type-chips']}>
            <legend className={styles['type-chips-legend']}>Tipo de campo</legend>
            {FIELD_TYPE_CONFIG.map((t) => (
              <Tooltip key={t.id} content={`${t.label} · ${t.short}`} position="bottom">
                <button
                  type="button"
                  className={[
                    styles['type-chip'],
                    mode === 'insert' && insertType === t.id ? styles['type-chip--active'] : '',
                  ].filter(Boolean).join(' ')}
                  style={{ '--chip-color': t.color } as React.CSSProperties}
                  onClick={() => {
                    onInsertTypeChange(t.id);
                    if (mode !== 'insert') onModeChange('insert');
                  }}
                  aria-pressed={mode === 'insert' && insertType === t.id}
                >
                  <span className={styles['type-chip-badge']}>{t.short}</span>
                  {t.label}
                </button>
              </Tooltip>
            ))}
          </fieldset>
        </>
      )}
    </div>
  );
}
