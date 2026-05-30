'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { modShortcut } from '@/hooks/useModKey';
import styles from './FieldContextMenu.module.css';

export interface FieldContextMenuProps {
  x: number;
  y: number;
  isLocked: boolean;
  onClose: () => void;
  onDuplicate: () => void;
  onCopyProps: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
}

export function FieldContextMenu({
  x, y, isLocked,
  onClose, onDuplicate, onCopyProps,
  onBringToFront, onSendToBack, onToggleLock, onDelete,
}: FieldContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const act = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
    onClose();
  };

  return createPortal(
    <div
      ref={ref}
      className={styles['menu']}
      style={{ left: x, top: y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button className={styles['item']} onClick={act(onDuplicate)}>
        <span>Duplicar</span>
        <span className={styles['hint']}>{modShortcut('D')}</span>
      </button>
      <button className={styles['item']} onClick={act(onCopyProps)}>
        <span>Copiar propiedades</span>
        <span className={styles['hint']}>{modShortcut('⇧C')}</span>
      </button>
      <hr className={styles['sep']} />
      <button className={styles['item']} onClick={act(onBringToFront)}>Traer al frente</button>
      <button className={styles['item']} onClick={act(onSendToBack)}>Enviar al fondo</button>
      <hr className={styles['sep']} />
      <button className={styles['item']} onClick={act(onToggleLock)}>
        {isLocked ? 'Desbloquear campo' : 'Bloquear campo'}
      </button>
      <hr className={styles['sep']} />
      <button className={[styles['item'], styles['item--danger']].join(' ')} onClick={act(onDelete)}>
        <span>Eliminar</span>
        <span className={styles['hint']}>Del</span>
      </button>
    </div>,
    document.body,
  );
}
