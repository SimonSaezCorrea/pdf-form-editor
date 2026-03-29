'use client';

import { IconButton } from '@/components/ui';
import styles from './ShortcutsPanel.module.css';

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string[]; description: string }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Modos',
    shortcuts: [
      { keys: ['S'], description: 'Modo Seleccionar' },
      { keys: ['I'], description: 'Modo Insertar' },
      { keys: ['M'], description: 'Modo Mover' },
      { keys: ['Esc'], description: 'Volver a Seleccionar' },
    ],
  },
  {
    title: 'Selección',
    shortcuts: [
      { keys: ['Ctrl', 'A'], description: 'Seleccionar todos' },
      { keys: ['Shift', 'Clic'], description: 'Agregar/quitar de selección' },
      { keys: ['Esc'], description: 'Deseleccionar todo' },
    ],
  },
  {
    title: 'Campos',
    shortcuts: [
      { keys: ['Ctrl', 'D'], description: 'Duplicar campo seleccionado' },
      { keys: ['Ctrl', 'C'], description: 'Copiar campo(s)' },
      { keys: ['Ctrl', 'V'], description: 'Pegar campo(s)' },
      { keys: ['Del'], description: 'Eliminar campo(s) seleccionados' },
    ],
  },
  {
    title: 'Navegación',
    shortcuts: [
      { keys: ['←'], description: 'Página anterior' },
      { keys: ['→'], description: 'Página siguiente' },
    ],
  },
];

interface ShortcutsPanelProps {
  visible: boolean;
  onClose: () => void;
}

export function ShortcutsPanel({ visible, onClose }: ShortcutsPanelProps) {
  if (!visible) return null;

  return (
    <div className={styles['shortcuts-panel']}>
      <div className={styles['shortcuts-panel__header']}>
        <span>Atajos de teclado</span>
        <IconButton icon="✕" label="Cerrar atajos" onClick={onClose} size="sm" />
      </div>
      <div className={styles['shortcuts-panel__body']}>
        {SHORTCUT_GROUPS.map((group) => (
          <div key={group.title} className={styles['shortcuts-group']}>
            <h4 className={styles['shortcuts-group__title']}>{group.title}</h4>
            {group.shortcuts.map((s) => (
              <div key={s.description} className={styles['shortcut-row']}>
                <span className={styles['shortcut-desc']}>{s.description}</span>
                <span className={styles['shortcut-keys']}>
                  {s.keys.map((k, i) => (
                    <span key={i}>
                      <kbd className={styles['kbd']}>{k}</kbd>
                      {i < s.keys.length - 1 && <span className={styles['kbd-sep']}>+</span>}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
