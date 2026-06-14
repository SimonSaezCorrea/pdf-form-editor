'use client';

import type { AlignKind, DistributeAxis } from '@/hooks/useFieldStore';
import styles from './AlignBar.module.css';

interface AlignBarProps {
  count: number;
  onAlign: (kind: AlignKind) => void;
  onDistribute: (axis: DistributeAxis) => void;
}

const ALIGN_BTNS: { kind: AlignKind; label: string; icon: string }[] = [
  { kind: 'left',     label: 'Alinear a la izquierda', icon: '⬤▸' },
  { kind: 'center-h', label: 'Centrar horizontalmente', icon: '◈' },
  { kind: 'right',    label: 'Alinear a la derecha',   icon: '◂⬤' },
  { kind: 'top',      label: 'Alinear arriba',         icon: '⬤▾' },
  { kind: 'center-v', label: 'Centrar verticalmente',  icon: '◉' },
  { kind: 'bottom',   label: 'Alinear abajo',          icon: '▴⬤' },
];

export function AlignBar({ count, onAlign, onDistribute }: Readonly<AlignBarProps>) {
  const canDistribute = count >= 3;

  return (
    <div className={styles['align-bar']} role="toolbar" aria-label="Alineación">
      <span className={styles['align-count']}>{count} campos</span>
      <span className={styles['align-sep']} />
      {ALIGN_BTNS.map((btn) => (
        <button
          key={btn.kind}
          type="button"
          className={styles['align-btn']}
          title={btn.label}
          onClick={() => onAlign(btn.kind)}
          aria-label={btn.label}
        >
          {btn.icon}
        </button>
      ))}
      <span className={styles['align-sep']} />
      <button
        type="button"
        className={styles['align-btn']}
        title={canDistribute ? 'Distribuir horizontalmente' : 'Selecciona al menos 3 campos'}
        disabled={!canDistribute}
        onClick={() => onDistribute('h')}
        aria-label="Distribuir horizontalmente"
      >
        ⇔
      </button>
      <button
        type="button"
        className={styles['align-btn']}
        title={canDistribute ? 'Distribuir verticalmente' : 'Selecciona al menos 3 campos'}
        disabled={!canDistribute}
        onClick={() => onDistribute('v')}
        aria-label="Distribuir verticalmente"
      >
        ⇕
      </button>
    </div>
  );
}
