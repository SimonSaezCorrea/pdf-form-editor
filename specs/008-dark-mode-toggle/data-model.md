# Data Model: Dark Mode with Manual Toggle

**Phase**: 1 — Design
**Feature**: 008-dark-mode-toggle
**Date**: 2026-03-28

---

## Entities

### Theme

The active visual mode applied to the application.

| Field | Type | Values | Notes |
|-------|------|--------|-------|
| `value` | `'light' \| 'dark'` | `'light'`, `'dark'` | Derived — never stored directly |

**Derivation rule**:
1. If `preference !== null` → `theme = preference`
2. Else if `matchMedia('(prefers-color-scheme: dark)').matches` → `theme = 'dark'`
3. Else → `theme = 'light'`

**Applied as**: `document.documentElement.dataset.theme = theme` (removes attribute when light, or keeps `'dark'`). The CSS `[data-theme="dark"]` selector activates dark tokens.

---

### ThemePreference

The user's explicit manual override, persisted between sessions.

| Field | Type | Values | Storage | Notes |
|-------|------|--------|---------|-------|
| `value` | `'light' \| 'dark' \| null` | `'light'`, `'dark'`, `null` | `localStorage['pdf-editor-theme']` | `null` means "follow OS" |

**Validation**:
- On read: if value is not `'light'` or `'dark'`, treat as `null` (corrupted → discard, FR-spec edge case).
- On write: only `'light'` or `'dark'` are accepted.
- On reset: `localStorage.removeItem('pdf-editor-theme')`.

**Lifecycle**:
```
Initial load        → read from localStorage
Toggle click        → write 'light' or 'dark' to localStorage
Reset (programmatic)→ remove from localStorage
Tab/session close   → persists in localStorage (survives reload)
localStorage error  → silently degrade to OS-only mode
```

---

### Anti-FOUC Script State (transient, not React state)

Runs once before first paint. No entity, but documents the transient DOM state:

| Moment | `dataset.theme` | Source |
|--------|----------------|--------|
| Before inline script | absent | — |
| After inline script, stored pref exists | `'dark'` or `'light'` | localStorage |
| After inline script, no pref, OS dark | `'dark'` | matchMedia |
| After inline script, no pref, OS light | absent (default) | — |

After React hydration, `useTheme()` reads this same attribute as its initial state, ensuring React state and DOM are in sync from the very first render.

---

## State Transitions

```
[No preference stored]
        │
        ▼
OS dark? ──yes──► theme='dark'
        │
        no
        │
        ▼
      theme='light'
        │
    User clicks toggle
        │
        ▼
[Preference stored: 'dark' or 'light']
  OS changes → ignored (manual pref takes precedence)
        │
    User resets (programmatic)
        │
        ▼
[No preference stored] (back to OS detection)
```

---

## localStorage Schema

```
Key:   'pdf-editor-theme'
Value: 'dark' | 'light'  (string literal — any other value treated as absent)
```

Constant defined once in `useTheme.ts`:
```ts
const STORAGE_KEY = 'pdf-editor-theme' as const;
```

No other file may reference this key directly (FR-009).
