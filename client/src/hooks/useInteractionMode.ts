import { useState, useEffect, useCallback } from 'react';

export type InteractionMode = 'select' | 'insert' | 'move';

export interface InteractionModeState {
  mode: InteractionMode;
  setMode: (m: InteractionMode) => void;
}

const KEY_MODE_MAP: Record<string, InteractionMode> = {
  s: 'select',
  S: 'select',
  i: 'insert',
  I: 'insert',
  m: 'move',
  M: 'move',
};

export function useInteractionMode(): InteractionModeState {
  const [mode, setModeState] = useState<InteractionMode>('select');

  const setMode = useCallback((m: InteractionMode) => {
    setModeState(m);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      // Ignore if any modifier key is held (avoids conflicting with Ctrl+S, etc.)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'Escape') {
        setModeState('select');
        return;
      }

      const mapped = KEY_MODE_MAP[e.key];
      if (mapped) {
        setModeState(mapped);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { mode, setMode };
}
