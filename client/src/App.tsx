import { useState, useCallback, useEffect } from 'react';
import { PdfUploader } from './components/PdfUploader/PdfUploader';
import { PdfViewer } from './components/PdfViewer/PdfViewer';
import { FieldList } from './components/FieldList/FieldList';
import { PropertiesPanel } from './components/PropertiesPanel/PropertiesPanel';
import { ThumbnailStrip } from './components/ThumbnailStrip/ThumbnailStrip';
import { usePdfRenderer } from './hooks/usePdfRenderer';
import { useFieldStore } from './hooks/useFieldStore';
import { exportPdf } from './utils/export';

const RENDER_SCALE = 1.5;

export default function App() {
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [pdfFilename, setPdfFilename] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const pdfRenderer = usePdfRenderer(pdfBytes, RENDER_SCALE);
  const store = useFieldStore();

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
      // store.fields contains all fields across all pages — server routes each to its page
      await exportPdf(pdfBytes, store.fields);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDuplicate = useCallback(
    (id: string) => {
      // offset +10 canvas px in X (right), -10 canvas px in Y (down on screen = negative PDF Y)
      store.duplicateField(id, 10 / pdfRenderer.renderScale, -(10 / pdfRenderer.renderScale));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store.duplicateField, pdfRenderer.renderScale],
  );

  // Keyboard navigation: ArrowLeft/ArrowRight navigate pages; Ctrl+D duplicates selected field
  useEffect(() => {
    if (!pdfBytes) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft' && pdfRenderer.currentPage > 1) {
        pdfRenderer.setCurrentPage(pdfRenderer.currentPage - 1);
      } else if (e.key === 'ArrowRight' && pdfRenderer.currentPage < pdfRenderer.totalPages) {
        pdfRenderer.setCurrentPage(pdfRenderer.currentPage + 1);
      } else if ((e.key === 'd' || e.key === 'D') && (e.ctrlKey || e.metaKey) && store.selectedFieldId) {
        e.preventDefault();
        handleDuplicate(store.selectedFieldId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    pdfBytes,
    pdfRenderer.currentPage,
    pdfRenderer.totalPages,
    pdfRenderer.setCurrentPage,
    store.selectedFieldId,
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
          <div className="header-actions">
            <span className="filename" title={pdfFilename}>
              {pdfFilename}
            </span>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setPdfBytes(null);
                setPdfFilename('');
                store.resetFields();
                setExportError(null);
              }}
            >
              Change PDF
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
              {isExporting ? 'Exporting…' : 'Export PDF'}
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
              onSelect={store.selectField}
            />
            <PropertiesPanel
              fields={store.fields}
              selectedFieldId={store.selectedFieldId}
              onUpdate={store.updateField}
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
                selectedFieldId={store.selectedFieldId}
                onFieldAdd={store.addField}
                onFieldUpdate={store.updateField}
                onFieldSelect={store.selectField}
                onFieldDelete={store.deleteField}
                onFieldDuplicate={handleDuplicate}
              />
            )}
          </main>
        </div>
      )}
    </div>
  );
}
