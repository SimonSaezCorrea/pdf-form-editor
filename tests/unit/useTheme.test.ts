import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// We test the hook logic by mocking browser globals
let storedTheme: string | null = null;
const localStorageMock = {
  getItem: vi.fn((key: string) => (key === 'pdf-editor-theme' ? storedTheme : null)),
  setItem: vi.fn((key: string, value: string) => { if (key === 'pdf-editor-theme') storedTheme = value; }),
  removeItem: vi.fn((key: string) => { if (key === 'pdf-editor-theme') storedTheme = null; }),
};

let osDark = false;
const matchMediaMock = vi.fn((query: string) => ({
  matches: query === '(prefers-color-scheme: dark)' ? osDark : false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}));

beforeEach(() => {
  storedTheme = null;
  osDark = false;
  Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
  Object.defineProperty(window, 'matchMedia', { value: matchMediaMock, writable: true });
  document.documentElement.removeAttribute('data-theme');
  vi.clearAllMocks();
  // Re-bind mocks to keep storedTheme in closure
  localStorageMock.getItem.mockImplementation((key: string) => (key === 'pdf-editor-theme' ? storedTheme : null));
  localStorageMock.setItem.mockImplementation((key: string, value: string) => { if (key === 'pdf-editor-theme') storedTheme = value; });
  localStorageMock.removeItem.mockImplementation((key: string) => { if (key === 'pdf-editor-theme') storedTheme = null; });
  matchMediaMock.mockImplementation((query: string) => ({
    matches: query === '(prefers-color-scheme: dark)' ? osDark : false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

describe('useTheme', () => {
  it('defaults to light when no stored preference and OS is light', async () => {
    const { useTheme } = await import('@/hooks/useTheme');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
    expect(result.current.preference).toBeNull();
  });

  it('returns dark when no stored preference and OS is dark', async () => {
    osDark = true;
    document.documentElement.dataset.theme = 'dark';
    const { useTheme } = await import('@/hooks/useTheme');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
    expect(result.current.preference).toBeNull();
  });

  it('returns stored preference regardless of OS', async () => {
    storedTheme = 'dark';
    osDark = false;
    document.documentElement.dataset.theme = 'dark';
    const { useTheme } = await import('@/hooks/useTheme');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
    expect(result.current.preference).toBe('dark');
  });

  it('setTheme updates localStorage and DOM attribute', async () => {
    const { useTheme } = await import('@/hooks/useTheme');
    const { result } = renderHook(() => useTheme());
    act(() => { result.current.setTheme('dark'); });
    expect(storedTheme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(result.current.theme).toBe('dark');
    expect(result.current.preference).toBe('dark');
  });

  it('setTheme to light updates localStorage and DOM attribute', async () => {
    storedTheme = 'dark';
    document.documentElement.dataset.theme = 'dark';
    const { useTheme } = await import('@/hooks/useTheme');
    const { result } = renderHook(() => useTheme());
    act(() => { result.current.setTheme('light'); });
    expect(storedTheme).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(result.current.theme).toBe('light');
  });

  it('resetTheme clears localStorage and preference', async () => {
    storedTheme = 'dark';
    document.documentElement.dataset.theme = 'dark';
    const { useTheme } = await import('@/hooks/useTheme');
    const { result } = renderHook(() => useTheme());
    act(() => { result.current.resetTheme(); });
    expect(storedTheme).toBeNull();
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(result.current.preference).toBeNull();
  });

  it('treats invalid stored value as no preference', async () => {
    storedTheme = 'blue'; // invalid
    const { useTheme } = await import('@/hooks/useTheme');
    const { result } = renderHook(() => useTheme());
    expect(result.current.preference).toBeNull();
    expect(result.current.theme).toBe('light');
  });

  it('handles localStorage throwing gracefully', async () => {
    localStorageMock.getItem.mockImplementation(() => { throw new Error('SecurityError'); });
    const { useTheme } = await import('@/hooks/useTheme');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
    expect(result.current.preference).toBeNull();
  });
});
