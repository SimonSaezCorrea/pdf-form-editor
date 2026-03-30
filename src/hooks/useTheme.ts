'use client';

import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'pdf-editor-theme' as const;

function readStoredPreference(): Theme | null {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val === 'dark' || val === 'light') return val;
  } catch {
    // localStorage unavailable (private browsing, quota exceeded)
  }
  return null;
}

function getOsTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  // The anti-FOUC script already set dataset.theme; read it to stay in sync
  const attr = document.documentElement.dataset.theme;
  if (attr === 'dark' || attr === 'light') return attr;
  return getOsTheme();
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

function clearTheme() {
  delete document.documentElement.dataset.theme;
}

interface UseThemeReturn {
  theme: Theme;
  preference: Theme | null;
  setTheme: (t: Theme) => void;
  resetTheme: () => void;
}

export function useTheme(): UseThemeReturn {
  const [preference, setPreference] = useState<Theme | null>(null);
  const [theme, setThemeState] = useState<Theme>('light');

  // Initialise from DOM / localStorage on mount (client-only)
  useEffect(() => {
    const stored = readStoredPreference();
    const initial = getInitialTheme();
    setPreference(stored);
    setThemeState(initial);
  }, []);

  // OS change listener — only active when no manual preference is stored
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setPreference((pref) => {
        if (pref !== null) return pref; // manual pref takes precedence
        const next: Theme = e.matches ? 'dark' : 'light';
        setThemeState(next);
        applyTheme(next);
        return pref;
      });
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      // storage unavailable — still apply for this session
    }
    applyTheme(t);
    setPreference(t);
    setThemeState(t);
  }, []);

  const resetTheme = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    clearTheme();
    setPreference(null);
    const os = getOsTheme();
    setThemeState(os);
    if (os === 'dark') applyTheme('dark');
  }, []);

  return { theme, preference, setTheme, resetTheme };
}
