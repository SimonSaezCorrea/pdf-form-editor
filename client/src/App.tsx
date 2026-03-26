import { useState, useCallback } from 'react';
import { PdfUploader } from './components/PdfUploader/PdfUploader';
import { PdfViewer } from './components/PdfViewer/PdfViewer';
import { FieldList } from './components/FieldList/FieldList';
import { PropertiesPanel } from './components/PropertiesPanel/PropertiesPanel';
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
      await exportPdf(pdfBytes, store.fields);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  // Fields on the currently visible page
  const currentPageFields = store.fields.filter(
    (f) => f.page === pdfRenderer.currentPage,
  );

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
              />
            )}
          </main>
        </div>
      )}
    </div>
  );
}
