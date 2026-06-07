'use client';

import { forwardRef, useImperativeHandle, useEffect, useState, useCallback, useRef } from 'react';
import { useFillerStore } from '../../hooks/useFillerStore';
import { PdfUploadScreen } from '../PdfUploadScreen/PdfUploadScreen';
import { FillerLayout } from '../FillerLayout/FillerLayout';
import { Button } from '@/components/ui/Button/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog/ConfirmDialog';
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
  /** Open the file picker to swap the document (warns if data was entered). */
  changeDocument: () => void;
  /** Validate required fields and generate (download) the filled PDF. */
  generate: () => void;
}

interface FillerModeProps {
  onHasFileChange?: (hasFile: boolean) => void;
  onFilenameChange?: (filename: string) => void;
  onGeneratingChange?: (generating: boolean) => void;
}

export const FillerMode = forwardRef<FillerModeHandle, FillerModeProps>(
  function FillerMode({ onHasFileChange, onFilenameChange, onGeneratingChange }, ref) {
    const store = useFillerStore();

    // ── UI state (T065) ──────────────────────────────────────────────────────
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const [lastSaved, setLastSaved] = useState<number | null>(null);
    const [resetConfirm, setResetConfirm] = useState(false);
    const [errors, setErrors] = useState<Set<string>>(new Set());
    const [jumpedId, setJumpedId] = useState<string | null>(null);
    const [showChangeConfirm, setShowChangeConfirm] = useState(false);
    // ticker state to force re-render for relative time display

    const handleReset = useCallback(() => {
      store.reset();
      setCollapsed(new Set());
      setLastSaved(null);
      setResetConfirm(false);
      setErrors(new Set());
      setJumpedId(null);
    }, [store]);

    // ── Handlers ─────────────────────────────────────────────────────────────
    const toggleCollapse = useCallback((group: string) => {
      setCollapsed((prev) => {
        const next = new Set(prev);
        if (next.has(group)) next.delete(group); else next.add(group);
        return next;
      });
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

    // Cambiar de documento: abre el selector de archivos directamente. Si hay
    // datos rellenados, avisa (modal) de que se perderán si no se ha descargado el PDF.
    const openPdfPicker = useCallback(() => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,application/pdf';
      input.onchange = () => {
        const file = input.files?.[0];
        if (file) void store.handleFileSelected(file);
      };
      input.click();
    }, [store]);

    const handleChangeDocument = useCallback(() => {
      const hasValues = Object.values(store.values).some((v) => v !== '');
      if (hasValues) {
        setShowChangeConfirm(true);
        return;
      }
      openPdfPicker();
    }, [store.values, openPdfPicker]);

    // Validate required fields, then generate. Moved up from DynamicForm so the
    // "Generar PDF" button can live in the top navbar (App header).
    const handleGenerate = useCallback(() => {
      const missing = new Set(
        store.fields.filter((f) => f.required && !store.values[f.name]).map((f) => f.name),
      );
      if (missing.size > 0) {
        setErrors(missing);
        // Expand any collapsed group that contains a missing field
        setCollapsed((prev) => {
          const next = new Set(prev);
          for (const name of missing) {
            const f = store.fields.find((x) => x.name === name);
            next.delete(f?.group ?? 'General');
          }
          return next;
        });
        const firstMissing = store.fields.find((f) => missing.has(f.name));
        if (firstMissing) {
          setTimeout(() => {
            document.getElementById(`filler-field-${firstMissing.name}`)?.focus();
          }, 150);
        }
        return;
      }
      setErrors(new Set());
      void store.generatePdf();
    }, [store.fields, store.values, store.generatePdf]);

    // Expose actions to the App top navbar (Cambiar PDF / Generar PDF)
    useImperativeHandle(ref, () => ({
      reset: handleReset,
      changeDocument: handleChangeDocument,
      generate: handleGenerate,
    }), [handleReset, handleChangeDocument, handleGenerate]);

    // Report generating state so the top-navbar button can show its loading state
    useEffect(() => {
      onGeneratingChange?.(store.status === 'generating');
    }, [store.status, onGeneratingChange]);

    const cancelReset = useCallback(() => {
      setResetConfirm(false);
    }, []);

    const confirmReset = useCallback(() => {
      setResetConfirm(false);
      store.reset();
      setCollapsed(new Set());
      setLastSaved(null);
      setErrors(new Set());
      setJumpedId(null);
    }, [store]);

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
      <>
        <FillerLayout
          pdfBytes={store.pdfBytes!}
          fields={store.fields}
          values={store.values}
          generating={store.status === 'generating'}
          onValueChange={handleChange}
          collapsed={collapsed}
          lastSaved={lastSaved}
          resetConfirm={resetConfirm}
          errors={errors}
          jumpedId={jumpedId}
          onToggleCollapse={toggleCollapse}
          onJumpToNextEmpty={jumpToNextEmpty}
          onFocusField={focusField}
          onCancelReset={cancelReset}
          onConfirmReset={confirmReset}
          onImportMetadata={handleImportMetadata}
        />
        <ConfirmDialog
          isOpen={showChangeConfirm}
          title="Cambiar de documento"
          message={'Tienes datos rellenados sin descargar. Si cambias de documento se perderán a menos que primero generes (descargues) el PDF.\n\n¿Cambiar de documento de todas formas?'}
          confirmLabel="Cambiar documento"
          cancelLabel="Cancelar"
          variant="danger"
          onConfirm={() => { setShowChangeConfirm(false); openPdfPicker(); }}
          onCancel={() => setShowChangeConfirm(false)}
        />
      </>
    );
  },
);
