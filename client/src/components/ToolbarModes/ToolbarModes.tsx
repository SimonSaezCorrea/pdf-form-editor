import type { InteractionMode } from '../../hooks/useInteractionMode';

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
    <div className="toolbar-modes">
      {MODES.map((btn) => (
        <button
          key={btn.mode}
          className={`mode-btn${mode === btn.mode ? ' active' : ''}`}
          onClick={() => onModeChange(btn.mode)}
          title={`${btn.label} (${btn.key})`}
        >
          {btn.label}
          <span className="mode-key">{btn.key}</span>
        </button>
      ))}
    </div>
  );
}
