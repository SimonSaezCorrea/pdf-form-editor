'use client';

/** Returns true if the current platform uses Cmd (⌘) instead of Ctrl. */
export function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /mac/i.test(navigator.platform) || /mac os/i.test(navigator.userAgent);
}

/** Returns '⌘' on Mac, 'Ctrl' elsewhere. */
export function modKey(): string {
  return isMac() ? '⌘' : 'Ctrl';
}

/** Formats a shortcut string for the current platform.
 *  e.g. modShortcut('Z') → '⌘Z' on Mac, 'Ctrl+Z' on Windows */
export function modShortcut(key: string): string {
  return isMac() ? `⌘${key}` : `Ctrl+${key}`;
}
