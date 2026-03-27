import { useState, useCallback, useEffect, useRef } from 'react';
import { PdfUploader } from './components/PdfUploader/PdfUploader';
import { PdfViewer } from './components/PdfViewer/PdfViewer';
import { FieldList } from './components/FieldList/FieldList';
import { PropertiesPanel } from './components/PropertiesPanel/PropertiesPanel';
import { ThumbnailStrip } from './components/ThumbnailStrip/ThumbnailStrip';
import { ToolbarModes } from './components/ToolbarModes/ToolbarModes';
import { ShortcutsPanel } from './components/ShortcutsPanel/ShortcutsPanel';
import { ExportModal } from './components/ImportExportModal/ExportModal';
import { ImportModal } from './components/ImportExportModal/ImportModal';
import { usePdfRenderer } from './hooks/usePdfRenderer';
import { useFieldStore } from './hooks/useFieldStore';
import { useInteractionMode } from './hooks/useInteractionMode';
import { extractFieldsFromPdf } from './utils/extractFields';
import { exportPdf } from './utils/export';
import type { FormField } from 'pdf-form-editor-shared';
import { canvasToPdf } from './utils/coordinates';

const RENDER_SCALE = 1.5;

export default function App() {
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [pdfFilename, setPdfFilename] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [clipboard, setClipboard] = useState<FormField[]>([]);
  const mousePosRef = useRef({ clientX: 0, clientY: 0 });

  const pdfRenderer = usePdfRenderer(pdfBytes, RENDER_SCALE);
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
      await exportPdf(pdfBytes, store.fields);
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
        // Esc: clear selection (mode switch to select is handled in useInteractionMode)
        if (e.key === 'Escape') {
          store.clearSelection();
          return;
        }
        // Delete / Backspace: delete all selected fields
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
            const overlayEl = document.querySelector('.field-overlay') as HTMLElement | null;
            if (overlayEl) {
              const rect = overlayEl.getBoundingClientRect();
              const canvasX = mousePosRef.current.clientX - rect.left;
              const canvasY = mousePosRef.current.clientY - rect.top;
              // Only paste at mouse if cursor is over the overlay
              if (canvasX >= 0 && canvasY >= 0 && canvasX <= rect.width && canvasY <= rect.height) {
                // Convert mouse canvas pos to PDF coords (top-left anchor point)
                const target = canvasToPdf(canvasX, canvasY, 0, 0, pdfRenderer.renderScale, pdfRenderer.pageDimensions.height);
                // Compute top-left of clipboard bounding box in PDF coords
                const minX = Math.min(...clipboard.map((f) => f.x));
                const maxY = Math.max(...clipboard.map((f) => f.y + f.height));
                const offsetX = target.x - minX;
                const offsetY = target.y - maxY;
                const pasted = clipboard.map((f) => ({
                  ...f,
                  x: Math.max(0, f.x + offsetX),
                  y: Math.max(0, f.y + offsetY),
                }));
                store.loadTemplateFields(pasted, 'append');
                return;
              }
            }
            // Fallback: paste with fixed offset if mouse is outside overlay
            const offset = 10 / pdfRenderer.renderScale;
            const pasted = clipboard.map((f) => ({
              ...f,
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

  // Fields on the currently visible page
  const currentPageFields = store.fields.filter(
    (f) => f.page === pdfRenderer.currentPage,
  );

  const showThumbnails = !!pdfRenderer.pdfDoc && pdfRenderer.totalPages > 1;

  return (
    <div className="app">
      <header className="app-header">
        <h1>PDF Form Editor</h1>
        {pdfBytes && (
          <div className="header-toolbar-center">
            <ToolbarModes mode={mode} onModeChange={setMode} />
          </div>
        )}
        {pdfBytes && (
          <div className="header-actions">
            <span className="filename" title={pdfFilename}>
              {pdfFilename}
            </span>
            <button
              className="btn btn-secondary"
              onClick={() => setShowImportModal(true)}
            >
              Importar
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setShowExportModal(true)}
            >
              Exportar
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setPdfBytes(null);
                setPdfFilename('');
                store.resetFields();
                setExportError(null);
              }}
            >
              Cambiar PDF
            </button>
            <button
              className="btn btn-primary"
              onClick={handleExport}
              disabled={!canExport}
              title={
                store.fields.length === 0
                  ? 'Add at least one field before exporting'
                  : hasDuplicateNames
                    ? 'Fix duplicate field names before exporting'
                    : undefined
              }
            >
              {isExporting ? 'Exportando…' : 'Exportar PDF'}
            </button>
          </div>
        )}
      </header>

      {exportError && <div className="error-banner">Export failed: {exportError}</div>}

      {!pdfBytes ? (
        <div className="upload-area">
          <PdfUploader onPdfLoaded={handlePdfLoaded} />
        </div>
      ) : (
        <div className="editor-layout">
          <aside className="sidebar">
            <FieldList
              fields={store.fields}
              selectedFieldId={store.selectedFieldId}
              onSelect={store.selectSingle}
            />
            <PropertiesPanel
              fields={store.fields}
              selectedFieldId={store.selectedFieldId}
              selectionIds={store.selectionIds}
              onUpdate={store.updateField}
              onUpdateFields={store.updateFields}
              onDelete={store.deleteField}
            />
          </aside>

          {showThumbnails && (
            <ThumbnailStrip
              pdfDoc={pdfRenderer.pdfDoc!}
              totalPages={pdfRenderer.totalPages}
              currentPage={pdfRenderer.currentPage}
              onPageSelect={pdfRenderer.setCurrentPage}
            />
          )}

          <main className="viewer-area">
            {pdfRenderer.error ? (
              <p className="error-msg">{pdfRenderer.error}</p>
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
        </div>
      )}
      <button
        className="shortcuts-fab"
        onClick={() => setShowShortcuts((v) => !v)}
        title="Atajos de teclado"
        aria-label="Atajos de teclado"
      >
        ?
      </button>
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
