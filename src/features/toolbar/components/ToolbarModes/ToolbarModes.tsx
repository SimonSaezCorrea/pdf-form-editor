'use client';

import type { InteractionMode } from '@/hooks/useInteractionMode';
import { Button, Tooltip } from '@/components/ui';
import styles from './ToolbarModes.module.css';

interface ModeButton {
  mode: InteractionMode;
  label: string;
  key: string;
}

const MODES: ModeButton[] = [
  { mode: 'select', label: 'Seleccionar', key: 'S' },
  { mode: 'insert', label: 'Insertar', key: 'I' },
  { mode: 'move', label: 'Mover', key: 'M' },
];

interface ToolbarModesProps {
  mode: InteractionMode;
  onModeChange: (m: InteractionMode) => void;
}

export function ToolbarModes({ mode, onModeChange }: ToolbarModesProps) {
  return (
    <div className={styles['toolbar-modes']}>
      {MODES.map((btn) => (
        <Tooltip key={btn.mode} content={`${btn.label} · ${btn.key}`} position="bottom">
          <Button
            variant="ghost"
            size="sm"
            className={[styles['mode-btn'], mode === btn.mode ? styles.active : ''].filter(Boolean).join(' ')}
            onClick={() => onModeChange(btn.mode)}
          >
            {btn.label}
          </Button>
        </Tooltip>
      ))}
    </div>
  );
}
