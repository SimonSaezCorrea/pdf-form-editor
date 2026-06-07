'use client';

import { forwardRef, useImperativeHandle, useEffect, useState, useCallback, useRef } from 'react';
import { useFillerStore } from '../../hooks/useFillerStore';
import { PdfUploadScreen } from '../PdfUploadScreen/PdfUploadScreen';
import { FillerLayout } from '../FillerLayout/FillerLayout';
import { Button } from '@/components/ui/Button/Button';
import styles from './FillerMode.module.css';

const AUTOSAVE_KEY = 'pdf-filler-autosave';
const AUTOSAVE_DELAY_MS = 400;

function parseGroupMap(jsonText: string): Record<string, string> | null {
  try {
    const data = JSON.parse(jsonText);
    const map: Record<string, string> = {};
    // v2: { groups: [{ name, fields: [{ name }] }] }
    if (Array.isArray(data.groups)) {
      for (const g of data.groups) {
        if (typeof g.name !== 'string' || !Array.isArray(g.fields)) continue;
        for (const f of g.fields) {
          if (typeof f.name === 'string') map[f.name] = g.name;
        }
      }
    }
    // v1: { fields: [{ name, group }] }
    if (Array.isArray(data.fields)) {
      for (const f of data.fields) {
        if (typeof f.name === 'string' && typeof f.group === 'string') {
          map[f.name] = f.group;
        }
      }
    }
    return Object.keys(map).length > 0 ? map : null;
  } catch {
    return null;
  }
}

export interface FillerModeHandle {
  reset: () => void;
}

interface FillerModeProps {
  onHasFileChange?: (hasFile: boolean) => void;
  onFilenameChange?: (filename: string) => void;
}

export const FillerMode = forwardRef<FillerModeHandle, FillerModeProps>(
  function FillerMode({ onHasFileChange, onFilenameChange }, ref) {
    const store = useFillerStore();

    // ── UI state (T065) ──────────────────────────────────────────────────────
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const [lastSaved, setLastSaved] = useState<number | null>(null);
    const [finalPreview, setFinalPreview] = useState(false);
    const [resetConfirm, setResetConfirm] = useState(false);
    const [errors, setErrors] = useState<Set<string>>(new Set());
    const [jumpedId, setJumpedId] = useState<string | null>(null);
    // ticker state to force re-render for relative time display

    // Expose reset() via ref
    useImperativeHandle(ref, () => ({
      reset: () => {
        store.reset();
        setCollapsed(new Set());
        setLastSaved(null);
        setFinalPreview(false);
        setResetConfirm(false);
        setErrors(new Set());
        setJumpedId(null);
      },
    }), [store]);

    // ── Handlers ─────────────────────────────────────────────────────────────
    const toggleCollapse = useCallback((group: string) => {
      setCollapsed((prev) => {
        const next = new Set(prev);
        if (next.has(group)) next.delete(group); else next.add(group);
        return next;
      });
    }, []);

    const toggleFinalPreview = useCallback(() => {
      setFinalPreview((v) => !v);
    }, []);

    const handleImportMetadata = useCallback(() => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        file.text().then((text) => {
          const groupMap = parseGroupMap(text);
          if (groupMap) void store.applyMetadata(groupMap);
        }).catch(() => {});
      };
      input.click();
    }, [store]);

    const handleChange = useCallback((name: string, value: string) => {
      store.setValue(name, value);
      setErrors((prev) => {
        if (!prev.has(name)) return prev;
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
    }, [store]);

    const jumpToNextEmpty = useCallback((fromId: string | null) => {
      const fields = store.fields;
      if (fields.length === 0) return;
      const idx = fromId ? fields.findIndex((f) => f.name === fromId) : -1;
      const remaining = [...fields.slice(idx + 1), ...fields.slice(0, idx + 1)];
      const nextEmpty = remaining.find((f) => !store.values[f.name]);
      if (nextEmpty) {
        setJumpedId(nextEmpty.name);
        // Expand the group if collapsed
        if (nextEmpty.group) {
          setCollapsed((prev) => {
            if (!prev.has(nextEmpty.group!)) return prev;
            const next = new Set(prev);
            next.delete(nextEmpty.group!);
            return next;
          });
        }
      }
    }, [store.fields, store.values]);

    const focusField = useCallback((name: string) => {
      const field = store.fields.find((f) => f.name === name);
      if (!field) return;
      setJumpedId(name);
      const group = field.group;
      if (group) {
        setCollapsed((prev) => {
          if (!prev.has(group)) return prev;
          const next = new Set(prev);
          next.delete(group);
          return next;
        });
      }
    }, [store.fields]);

    const handleResetConfirm = useCallback(() => {
      setResetConfirm(true);
    }, []);

    const cancelReset = useCallback(() => {
      setResetConfirm(false);
    }, []);

    const confirmReset = useCallback(() => {
      setResetConfirm(false);
      store.reset();
      setCollapsed(new Set());
      setLastSaved(null);
      setFinalPreview(false);
      setErrors(new Set());
      setJumpedId(null);
    }, [store]);

    // ── Auto-collapse: when all fields in a group are filled, collapse it ─────
    useEffect(() => {
      const fields = store.fields;
      if (fields.length === 0) return;
      const groupNames = [...new Set(fields.map((f) => f.group ?? 'General'))];
      for (const group of groupNames) {
        const groupFields = fields.filter((f) => (f.group ?? 'General') === group);
        const allFilled = groupFields.every((f) => !!store.values[f.name]);
        if (allFilled) {
          setCollapsed((prev) => {
            if (prev.has(group)) return prev;
            const next = new Set(prev);
            next.add(group);
            return next;
          });
        }
      }
    }, [store.values, store.fields]);

    // ── Autosave: 400ms debounce to localStorage ──────────────────────────────
    const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
      if (Object.keys(store.values).length === 0) return;
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(store.values));
          setLastSaved(Date.now());
        } catch {
          // localStorage may be unavailable in some environments
        }
      }, AUTOSAVE_DELAY_MS);
      return () => {
        if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      };
    }, [store.values]);


    // ── Parent notifications ──────────────────────────────────────────────────
    useEffect(() => {
      const hasFile = store.status === 'ready' ||
                      store.status === 'generating' ||
                      store.status === 'no-fields';
      onHasFileChange?.(hasFile);
    }, [store.status, onHasFileChange]);

    useEffect(() => {
      onFilenameChange?.(store.pdfFile?.name ?? '');
    }, [store.pdfFile, onFilenameChange]);

    // ── Render ────────────────────────────────────────────────────────────────
    if (store.status === 'idle' || store.status === 'loading' || store.status === 'error') {
      return (
        <PdfUploadScreen
          onFileSelected={store.handleFileSelected}
          loading={store.status === 'loading'}
          error={store.status === 'error' ? store.error : null}
        />
      );
    }

    if (store.status === 'no-fields') {
      return (
        <div className={styles['no-fields']}>
          <svg
            className={styles['no-fields-icon']}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h2 className={styles['no-fields-title']}>Sin campos rellenables</h2>
          <p className={styles['no-fields-desc']}>
            Este PDF no contiene campos AcroForm de texto. Solo se pueden rellenar PDFs con campos
            interactivos creados con un editor de formularios PDF.
          </p>
          <Button variant="primary" onClick={store.reset}>
            Subir otro PDF
          </Button>
        </div>
      );
    }

    return (
      <FillerLayout
        pdfBytes={store.pdfBytes!}
        fields={store.fields}
        values={store.values}
        generating={store.status === 'generating'}
        onValueChange={handleChange}
        onGeneratePdf={store.generatePdf}
        onReset={handleResetConfirm}
        collapsed={collapsed}
        lastSaved={lastSaved}
        finalPreview={finalPreview}
        resetConfirm={resetConfirm}
        errors={errors}
        jumpedId={jumpedId}
        onToggleCollapse={toggleCollapse}
        onToggleFinalPreview={toggleFinalPreview}
        onJumpToNextEmpty={jumpToNextEmpty}
        onFocusField={focusField}
        onCancelReset={cancelReset}
        onConfirmReset={confirmReset}
        onValidationError={setErrors}
        onImportMetadata={handleImportMetadata}
      />
    );
  },
);
