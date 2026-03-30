'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { PdfUploader } from '@/features/pdf/components/PdfUploader/PdfUploader';
import { PdfViewer } from '@/features/canvas/components/PdfViewer/PdfViewer';
import { FieldList } from '@/features/fields/components/FieldList/FieldList';
import { PropertiesPanel } from '@/features/fields/components/PropertiesPanel/PropertiesPanel';
import { ThumbnailStrip } from '@/features/canvas/components/ThumbnailStrip/ThumbnailStrip';
import { ToolbarModes } from '@/features/toolbar/components/ToolbarModes/ToolbarModes';
import { ShortcutsPanel } from '@/features/toolbar/components/ShortcutsPanel/ShortcutsPanel';
import { ExportModal } from '@/features/templates/components/ImportExportModal/ExportModal';
import { ImportModal } from '@/features/templates/components/ImportExportModal/ImportModal';
import { usePdfRenderer } from '@/features/canvas/hooks/usePdfRenderer';
import { useFieldStore } from '@/hooks/useFieldStore';
import { useInteractionMode } from '@/hooks/useInteractionMode';
import { extractFieldsFromPdf } from '@/features/pdf/utils/extractFields';
import { exportPdf } from '@/features/pdf/utils/export';
import type { FormField } from '@/types/shared';
import { canvasToPdf } from '@/features/pdf/utils/coordinates';
import { Button, IconButton } from '@/components/ui';
import { ThemeToggle } from '@/features/toolbar/components/ThemeToggle/ThemeToggle';
import styles from './App.module.css';

const BASE_SCALE = 1.5;
const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function App() {
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [pdfFilename, setPdfFilename] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [clipboard, setClipboard] = useState<FormField[]>([]);
  const [zoom, setZoom] = useState(1);
  const [thumbnailsVisible, setThumbnailsVisible] = useState(true);
  const mousePosRef = useRef({ clientX: 0, clientY: 0 });

  const pdfRenderer = usePdfRenderer(pdfBytes, BASE_SCALE * zoom);

  const zoomOut = () => {
    const idx = ZOOM_STEPS.indexOf(zoom);
    if (idx > 0) setZoom(ZOOM_STEPS[idx - 1]);
  };
  const zoomIn = () => {
    const idx = ZOOM_STEPS.indexOf(zoom);
    if (idx < ZOOM_STEPS.length - 1) setZoom(ZOOM_STEPS[idx + 1]);
  };
  const store = useFieldStore();
  const { mode, setMode } = useInteractionMode();

  const hasDuplicateNames = (() => {
    const names = store.fields.map((f) => f.name);
    return names.length !== new Set(names).size;
  })();

  const canExport =
    !!pdfBytes &&
    store.fields.length > 0 &&
    !hasDuplicateNames &&
    !isExporting &&
    !pdfRenderer.isLoading;

  let exportButtonTitle: string | undefined;
  if (store.fields.length === 0) exportButtonTitle = 'Add at least one field before exporting';
  else if (hasDuplicateNames) exportButtonTitle = 'Fix duplicate field names before exporting';

  const handlePdfLoaded = useCallback(
    (bytes: ArrayBuffer, filename: string) => {
      setPdfBytes(bytes);
      setPdfFilename(filename);
      store.resetFields();
      setExportError(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store.resetFields],
  );

  const handleExport = async () => {
    if (!pdfBytes || !canExport) return;
    setIsExporting(true);
    setExportError(null);
    try {
      await exportPdf(pdfBytes, store.fields, pdfFilename);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  // When a PDF with existing AcroForm fields is loaded, extract and show them on canvas
  useEffect(() => {
    if (!pdfRenderer.pdfDoc) return;
    let cancelled = false;
    extractFieldsFromPdf(pdfRenderer.pdfDoc).then((extracted) => {
      if (!cancelled && extracted.length > 0) {
        store.loadTemplateFields(extracted, 'replace');
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfRenderer.pdfDoc]);

  const handleDuplicate = useCallback(
    (id: string) => {
      store.duplicateField(id, 10 / pdfRenderer.renderScale, -(10 / pdfRenderer.renderScale));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store.duplicateField, pdfRenderer.renderScale],
  );

  // Track mouse position for paste-at-cursor
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { clientX: e.clientX, clientY: e.clientY };
    };
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!pdfBytes) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Page navigation (no modifier)
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === 'ArrowLeft' && pdfRenderer.currentPage > 1) {
          pdfRenderer.setCurrentPage(pdfRenderer.currentPage - 1);
          return;
        }
        if (e.key === 'ArrowRight' && pdfRenderer.currentPage < pdfRenderer.totalPages) {
          pdfRenderer.setCurrentPage(pdfRenderer.currentPage + 1);
          return;
        }
        if (e.key === 'Escape') {
          store.clearSelection();
          return;
        }
        if ((e.key === 'Delete' || e.key === 'Backspace') && store.selectionIds.size > 0) {
          e.preventDefault();
          for (const id of store.selectionIds) {
            store.deleteField(id);
          }
          return;
        }
      }

      // Ctrl / Meta shortcuts
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          store.selectAll(pdfRenderer.currentPage);
        } else if ((e.key === 'd' || e.key === 'D') && store.selectedFieldId) {
          e.preventDefault();
          handleDuplicate(store.selectedFieldId);
        } else if (e.key === 'c' || e.key === 'C') {
          if (store.selectionIds.size > 0) {
            e.preventDefault();
            const copied = store.fields.filter((f) => store.selectionIds.has(f.id));
            setClipboard(copied);
          }
        } else if (e.key === 'v' || e.key === 'V') {
          if (clipboard.length > 0 && pdfRenderer.pageDimensions) {
            e.preventDefault();
            const overlayEl = document.querySelector('[data-role="field-overlay"]') as HTMLElement | null;
            if (overlayEl) {
              const rect = overlayEl.getBoundingClientRect();
              const canvasX = mousePosRef.current.clientX - rect.left;
              const canvasY = mousePosRef.current.clientY - rect.top;
              if (canvasX >= 0 && canvasY >= 0 && canvasX <= rect.width && canvasY <= rect.height) {
                const target = canvasToPdf(canvasX, canvasY, 0, 0, pdfRenderer.renderScale, pdfRenderer.pageDimensions.height);
                const minX = Math.min(...clipboard.map((f) => f.x));
                const maxY = Math.max(...clipboard.map((f) => f.y + f.height));
                const offsetX = target.x - minX;
                const offsetY = target.y - maxY;
                const pasted = clipboard.map((f) => ({
                  ...f,
                  page: pdfRenderer.currentPage,
                  x: Math.max(0, f.x + offsetX),
                  y: Math.max(0, f.y + offsetY),
                }));
                store.loadTemplateFields(pasted, 'append');
                return;
              }
            }
            const offset = 10 / pdfRenderer.renderScale;
            const pasted = clipboard.map((f) => ({
              ...f,
              page: pdfRenderer.currentPage,
              x: f.x + offset,
              y: Math.max(0, f.y - offset),
            }));
            store.loadTemplateFields(pasted, 'append');
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    pdfBytes,
    clipboard,
    pdfRenderer.currentPage,
    pdfRenderer.totalPages,
    pdfRenderer.renderScale,
    pdfRenderer.setCurrentPage,
    store.selectedFieldId,
    store.selectionIds,
    store.fields,
    store.selectAll,
    store.clearSelection,
    store.deleteField,
    store.duplicateField,
    handleDuplicate,
  ]);

  const currentPageFields = store.fields.filter(
    (f) => f.page === pdfRenderer.currentPage,
  );

  const hasThumbnails = !!pdfRenderer.pdfDoc && pdfRenderer.totalPages > 1;

  return (
    <div className={styles.app}>
      <header className={styles['app-header']}>
        {/* Row 1: branding + file operations */}
        <div className={styles['header-top']}>
          <h1>PDF Form Editor</h1>
          {pdfBytes && (
            <span className={styles.filename} title={pdfFilename}>{pdfFilename}</span>
          )}
          <div className={styles['header-top-actions']}>
            {pdfBytes && (
              <>
                <Button variant="navbar" onClick={() => setShowImportModal(true)}>Importar</Button>
                <Button variant="navbar" onClick={() => setShowExportModal(true)}>Exportar</Button>
                <Button
                  variant="navbar"
                  onClick={handleExport}
                  disabled={!canExport}
                  loading={isExporting}
                  title={exportButtonTitle}
                >
                  {isExporting ? 'Exportando…' : 'Exportar PDF'}
                </Button>
              </>
            )}
            <ThemeToggle />
          </div>
        </div>

        {/* Row 2: canvas toolbar */}
        {pdfBytes && (
          <div className={styles['header-toolbar']}>
            <div />
            <div className={styles['header-toolbar-center']}>
              <ToolbarModes mode={mode} onModeChange={setMode} />
              <div className={styles['zoom-controls']}>
                <IconButton icon="−" label="Alejar" onClick={zoomOut} disabled={zoom === ZOOM_STEPS[0]} />
                <span className={styles['zoom-label']}>{Math.round(zoom * 100)}%</span>
                <IconButton icon="+" label="Acercar" onClick={zoomIn} disabled={zoom === ZOOM_STEPS.at(-1)} />
              </div>
            </div>
            <div className={styles['header-toolbar-actions']}>
              {hasThumbnails && (
                <Button variant="navbar" onClick={() => setThumbnailsVisible((v) => !v)}>
                  {thumbnailsVisible ? 'Ocultar páginas' : 'Ver páginas'}
                </Button>
              )}
              <Button
                variant="navbar"
                onClick={() => {
                  setPdfBytes(null);
                  setPdfFilename('');
                  store.resetFields();
                  setExportError(null);
                }}
              >
                Cambiar PDF
              </Button>
            </div>
          </div>
        )}
      </header>

      {exportError && <div className={styles['error-banner']}>Export failed: {exportError}</div>}

      {!pdfBytes ? (
        <div className={styles['upload-area']}>
          <PdfUploader onPdfLoaded={handlePdfLoaded} />
        </div>
      ) : (
        <div className={styles['editor-layout']}>
          {hasThumbnails && (
            <ThumbnailStrip
              pdfDoc={pdfRenderer.pdfDoc!}
              totalPages={pdfRenderer.totalPages}
              currentPage={pdfRenderer.currentPage}
              onPageSelect={pdfRenderer.setCurrentPage}
              hidden={!thumbnailsVisible}
            />
          )}

          <aside className={styles.sidebar}>
            <FieldList
              fields={store.fields}
              selectedFieldId={store.selectedFieldId}
              onSelect={store.selectSingle}
            />
          </aside>

          <main className={styles['viewer-area']}>
            {pdfRenderer.error ? (
              <p className={styles['error-msg']}>{pdfRenderer.error}</p>
            ) : (
              <PdfViewer
                pdfRenderer={pdfRenderer}
                fields={currentPageFields}
                selectionIds={store.selectionIds}
                mode={mode}
                onFieldAdd={store.addField}
                onFieldUpdate={store.updateField}
                onFieldsUpdate={store.updateFields}
                onFieldSelectSingle={store.selectSingle}
                onFieldClearSelection={store.clearSelection}
                onToggleSelect={store.toggleSelect}
                onSetSelection={store.setSelection}
                onFieldDelete={store.deleteField}
                onFieldDuplicate={handleDuplicate}
              />
            )}
          </main>

          <aside className={styles['properties-panel']}>
            <PropertiesPanel
              fields={store.fields}
              selectedFieldId={store.selectedFieldId}
              selectionIds={store.selectionIds}
              onUpdate={store.updateField}
              onUpdateFields={store.updateFields}
              onDelete={store.deleteField}
            />
          </aside>
        </div>
      )}
      <IconButton
        icon="?"
        label="Atajos de teclado"
        onClick={() => setShowShortcuts((v) => !v)}
        className={styles['shortcuts-fab']}
      />
      <ShortcutsPanel visible={showShortcuts} onClose={() => setShowShortcuts(false)} />

      {showExportModal && (
        <ExportModal fields={store.fields} onClose={() => setShowExportModal(false)} />
      )}

      {showImportModal && (
        <ImportModal
          existingFieldCount={store.fields.length}
          onImport={store.loadTemplateFields}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </div>
  );
}
