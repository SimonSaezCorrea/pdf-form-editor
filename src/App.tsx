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
import type { FormField, FieldTypeId } from '@/types/shared';
import { canvasToPdf } from '@/features/pdf/utils/coordinates';
import { Button, IconButton, Kbd, ConfirmDialog, NoDocScreen } from '@/components/ui';
import { modShortcut } from '@/hooks/useModKey';

const ICON_ARROW_LEFT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>`;
const ICON_ARROW_RIGHT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;
const ICON_DOWNLOAD = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;

function SvgIcon({ svg }: { svg: string }) {
  return <span style={{ display: 'inline-flex', width: '1em', height: '1em' }} dangerouslySetInnerHTML={{ __html: svg }} />;
}
import { getFieldTypeConfig } from '@/features/fields/config/fieldTypes';
import { ThemeToggle } from '@/features/toolbar/components/ThemeToggle/ThemeToggle';
import { useTheme } from '@/hooks/useTheme';
import { AlignBar } from '@/features/fields/components/AlignBar/AlignBar';
import { FillerMode } from '@/features/filler';
import type { FillerModeHandle } from '@/features/filler';
import styles from './App.module.css';

type AppMode = 'editor' | 'filler';
type View = 'main' | 'editor' | 'filler';

const pathToView = (path: string): View =>
  path === '/editor' ? 'editor' : path === '/filler' ? 'filler' : 'main';

const BASE_SCALE = 1.5;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3.0;
const ZOOM_STEP = 0.1;

export default function App() {
  const [view, setView] = useState<View>('main');
  const [appMode, setAppMode] = useState<AppMode>('editor');
  const [fillerHasFile, setFillerHasFile] = useState(false);
  const [fillerFilename, setFillerFilename] = useState('');
  const [fillerGenerating, setFillerGenerating] = useState(false);
  const fillerRef = useRef<FillerModeHandle>(null);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [pdfFilename, setPdfFilename] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showNewDocConfirm, setShowNewDocConfirm] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [clipboard, setClipboard] = useState<FormField[]>([]);
  const [propClipboard, setPropClipboard] = useState<Partial<FormField> | null>(null);
  const [zoom, setZoom] = useState(1);
  const [insertType, setInsertType] = useState<FieldTypeId>('text');
  const [thumbnailsVisible, setThumbnailsVisible] = useState(true);
  const mousePosRef = useRef({ clientX: 0, clientY: 0 });
  const viewerAreaRef = useRef<HTMLElement>(null);

  const pdfRenderer = usePdfRenderer(pdfBytes, BASE_SCALE * zoom);

  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(MIN_ZOOM, Math.round((z - ZOOM_STEP) * 100) / 100));
  }, []);
  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(MAX_ZOOM, Math.round((z + ZOOM_STEP) * 100) / 100));
  }, []);
  const store = useFieldStore();
  const { mode, setMode } = useInteractionMode();
  const { theme, toggle: toggleTheme } = useTheme();
  const showEditorToolbar = !!pdfBytes && view === 'editor';

  // URL ⇄ view: push a history entry on navigation so the browser Back button
  // returns to the previous view (e.g. /editor → /). Direct URLs are served by
  // the rewrites in next.config.ts.
  const navigate = useCallback((v: View) => {
    const path = v === 'main' ? '/' : `/${v}`;
    // Pass null state: Next 15 patches history.pushState for shallow routing and
    // chokes on a custom state object (TypeError in its popstate handler).
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
    setView(v);
  }, []);

  // Returning to main is a fresh start: drop the loaded PDF / filler data so the
  // landing (mode tabs + upload hero) shows instead of a stale workspace.
  const resetWorkspace = useCallback(() => {
    setPdfBytes(null);
    setPdfFilename('');
    setExportError(null);
    store.resetFields();
    fillerRef.current?.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.resetFields]);

  useEffect(() => {
    // Adopt the view (and matching mode) from the URL on mount and on Back/Forward.
    const sync = () => {
      const v = pathToView(window.location.pathname);
      setView(v);
      if (v === 'editor') setAppMode('editor');
      else if (v === 'filler') setAppMode('filler');
      else resetWorkspace();
      return v;
    };
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetWorkspace]);

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
      navigate('editor');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store.resetFields, navigate],
  );

  const openPdfPicker = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,application/pdf';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
        setExportError('Selecciona un archivo PDF válido.');
        return;
      }
      file.arrayBuffer().then((bytes) => handlePdfLoaded(bytes, file.name));
    };
    input.click();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handlePdfLoaded]);

  const handleNewDocument = useCallback(() => {
    if (store.isDirty) {
      setShowNewDocConfirm(true);
      return;
    }
    openPdfPicker();
  }, [store.isDirty, openPdfPicker]);

  const handleExport = async () => {
    if (!pdfBytes || !canExport) return;
    setIsExporting(true);
    setExportError(null);
    try {
      await exportPdf(pdfBytes, store.fields, pdfFilename);
      store.setDirty(false);
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

  // Track which page is most visible in cascade scroll view
  const handleViewerScroll = useCallback(() => {
    if (!pdfRenderer.totalPages || pdfRenderer.totalPages <= 1) return;
    const container = viewerAreaRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    let bestPage = pdfRenderer.currentPage;
    let bestOverlap = -1;
    for (let p = 1; p <= pdfRenderer.totalPages; p++) {
      const el = document.getElementById(`pdf-page-${p}`);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const overlap = Math.min(rect.bottom, containerRect.bottom) - Math.max(rect.top, containerRect.top);
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestPage = p;
      }
    }
    if (bestPage !== pdfRenderer.currentPage) pdfRenderer.setCurrentPage(bestPage);
  }, [pdfRenderer]);

  // Ctrl+Scroll canvas zoom — non-passive listener to allow preventDefault (Principle XXV)
  useEffect(() => {
    const el = viewerAreaRef.current;
    if (!el || !pdfBytes) return;
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      if (e.deltaY < 0) zoomIn(); else zoomOut();
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [pdfBytes, zoomIn, zoomOut]);

  // Track mouse position for paste-at-cursor
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { clientX: e.clientX, clientY: e.clientY };
    };
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, []);

  const TYPE_KEYS: Record<string, FieldTypeId> = { t: 'text', n: 'number', d: 'date', c: 'checkbox', f: 'signature' };

  const pasteFields = useCallback(() => {
    if (clipboard.length === 0 || !pdfRenderer.pageDimensions) return;
    const overlayEl = document.querySelector('[data-role="field-overlay"]') as HTMLElement | null;
    if (overlayEl) {
      const rect = overlayEl.getBoundingClientRect();
      const cx = mousePosRef.current.clientX - rect.left;
      const cy = mousePosRef.current.clientY - rect.top;
      if (cx >= 0 && cy >= 0 && cx <= rect.width && cy <= rect.height) {
        const target = canvasToPdf(cx, cy, 0, 0, pdfRenderer.renderScale, pdfRenderer.pageDimensions.height);
        const minX = Math.min(...clipboard.map((f) => f.x));
        const maxY = Math.max(...clipboard.map((f) => f.y + f.height));
        store.loadTemplateFields(
          clipboard.map((f) => ({ ...f, page: pdfRenderer.currentPage, x: Math.max(0, f.x + target.x - minX), y: Math.max(0, f.y + target.y - maxY) })),
          'append',
        );
        return;
      }
    }
    const off = 10 / pdfRenderer.renderScale;
    store.loadTemplateFields(
      clipboard.map((f) => ({ ...f, page: pdfRenderer.currentPage, x: f.x + off, y: Math.max(0, f.y - off) })),
      'append',
    );
  }, [clipboard, pdfRenderer.pageDimensions, pdfRenderer.renderScale, pdfRenderer.currentPage, store.loadTemplateFields]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!pdfBytes || view !== 'editor') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (showExportModal || showImportModal) return;
      if (e.ctrlKey || e.metaKey) {
        handleCtrlKey(e);
      } else if (!e.altKey) {
        handlePlainKey(e);
      }
    };

    const handlePlainKey = (e: KeyboardEvent) => {
      const typeKey = TYPE_KEYS[e.key.toLowerCase()];
      if (typeKey) { setInsertType(typeKey); setMode('insert'); return; }
      if (e.key === 'ArrowLeft' && pdfRenderer.currentPage > 1) {
        pdfRenderer.setCurrentPage(pdfRenderer.currentPage - 1);
      } else if (e.key === 'ArrowRight' && pdfRenderer.currentPage < pdfRenderer.totalPages) {
        pdfRenderer.setCurrentPage(pdfRenderer.currentPage + 1);
      } else if (e.key === 'Escape') {
        store.clearSelection();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && store.selectionIds.size > 0) {
        e.preventDefault();
        for (const id of store.selectionIds) store.deleteField(id);
      }
    };

    const handleCtrlKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'z' && e.shiftKey) { e.preventDefault(); store.redo(); }
      else if (k === 'z') { e.preventDefault(); store.undo(); }
      else if (k === 'a') { e.preventDefault(); store.selectAll(pdfRenderer.currentPage); }
      else if (k === 'd' && store.selectedFieldId) { e.preventDefault(); handleDuplicate(store.selectedFieldId); }
      else if (k === 'c' && e.shiftKey && store.selectionIds.size > 0) {
        e.preventDefault();
        const f = store.fields.find((x) => store.selectionIds.has(x.id));
        if (f) {
          const { group, fieldType, fontSize, fontFamily, displayFont, showBorder, autoFitFont, multiline, required } = f;
          setPropClipboard({ group, fieldType, fontSize, fontFamily, displayFont, showBorder, autoFitFont, multiline, required });
        }
      } else if (k === 'c' && store.selectionIds.size > 0) {
        e.preventDefault();
        setClipboard(store.fields.filter((f) => store.selectionIds.has(f.id)));
      } else if (k === 'v' && e.shiftKey && propClipboard && store.selectionIds.size > 0) {
        e.preventDefault();
        store.updateFields([...store.selectionIds], propClipboard);
      } else if (k === 'v' && clipboard.length > 0) {
        e.preventDefault();
        pasteFields();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    pdfBytes,
    view,
    clipboard,
    showExportModal,
    showImportModal,
    setInsertType,
    setMode,
    pasteFields,
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
    store.undo,
    store.redo,
    handleDuplicate,
  ]);

  const hasThumbnails = !!pdfRenderer.pdfDoc && pdfRenderer.totalPages > 1;

  return (
    <div className={styles.app}>
      <header className={styles['app-header']}>
        {/* Row 1: branding + mode selector + file operations */}
        <div className={styles['header-top']}>
          <h1>
            <button
              className={styles['title-btn']}
              onClick={() => { resetWorkspace(); navigate('main'); }}
              title="Volver al inicio"
            >
              PDF Form Editor
            </button>
          </h1>
          {/* Mode tabs: on the main landing only */}
          {view === 'main' && (
            <nav className={styles['mode-nav']} aria-label="Modo de la aplicación">
              <button
                className={`${styles['mode-btn']} ${appMode === 'editor' ? styles['mode-btn--active'] : ''}`}
                onClick={() => setAppMode('editor')}
                aria-pressed={appMode === 'editor'}
              >
                Editor de plantilla
              </button>
              <button
                className={`${styles['mode-btn']} ${appMode === 'filler' ? styles['mode-btn--active'] : ''}`}
                onClick={() => setAppMode('filler')}
                aria-pressed={appMode === 'filler'}
              >
                Rellenar PDF
              </button>
            </nav>
          )}
          {view !== 'main' && (pdfBytes || fillerHasFile) && (
            <span className={styles.filename} title={appMode === 'filler' ? fillerFilename : pdfFilename}>
              {appMode === 'filler' ? fillerFilename : pdfFilename}
            </span>
          )}
          <div className={styles['header-top-actions']}>
            {showEditorToolbar && (store.canUndo || store.canRedo || store.isDirty) && (
              <>
                {store.isDirty && <span className={styles['dirty-pill']}>sin guardar</span>}
                <IconButton icon={<SvgIcon svg={ICON_ARROW_LEFT} />} label={`Deshacer (${modShortcut('Z')})`} variant="navbar" onClick={store.undo} disabled={!store.canUndo} />
                <IconButton icon={<SvgIcon svg={ICON_ARROW_RIGHT} />} label={`Rehacer (${modShortcut('⇧Z')})`} variant="navbar" onClick={store.redo} disabled={!store.canRedo} />
              </>
            )}
            {pdfBytes && view === 'editor' && (
              <>
                <Button variant="navbar" onClick={handleNewDocument}>Cambiar PDF</Button>
                <Button variant="navbar" onClick={() => setShowImportModal(true)}>Importar</Button>
                <Button variant="navbar" onClick={() => setShowExportModal(true)}>Exportar</Button>
                <Button
                  variant="navbar-cta"
                  size="sm"
                  onClick={handleExport}
                  disabled={!canExport}
                  loading={isExporting}
                  title={exportButtonTitle}
                >
                  {isExporting ? 'Exportando…' : <><SvgIcon svg={ICON_DOWNLOAD} /> Exportar PDF</>}
                </Button>
              </>
            )}
            {appMode === 'filler' && fillerHasFile && (
              <>
                <Button variant="navbar" onClick={() => fillerRef.current?.changeDocument()}>Cambiar PDF</Button>
                <Button
                  variant="navbar-cta"
                  size="sm"
                  onClick={() => fillerRef.current?.generate()}
                  loading={fillerGenerating}
                >
                  {fillerGenerating ? 'Generando…' : <><SvgIcon svg={ICON_DOWNLOAD} /> Generar PDF</>}
                </Button>
              </>
            )}
            <ThemeToggle theme={theme} onToggleTheme={toggleTheme} />
          </div>
        </div>

        {/* Row 2: canvas toolbar + align bar */}
        {showEditorToolbar && (
          <>
          <div className={styles['header-toolbar']}>
            <div className={styles['header-toolbar-left']}>
              <ToolbarModes
                mode={mode}
                onModeChange={setMode}
                insertType={insertType}
                onInsertTypeChange={setInsertType}
                selectionCount={store.selectionIds.size}
              />
            </div>
            <div className={styles['zoom-controls']}>
              <IconButton icon="−" label="Alejar" onClick={zoomOut} disabled={zoom <= MIN_ZOOM} />
              <span className={styles['zoom-label']}>{Math.round(zoom * 100)}%</span>
              <IconButton icon="+" label="Acercar" onClick={zoomIn} disabled={zoom >= MAX_ZOOM} />
            </div>
            <div className={styles['header-toolbar-actions']}>
              {hasThumbnails && (
                <Button variant="navbar" onClick={() => setThumbnailsVisible((v) => !v)}>
                  {thumbnailsVisible ? 'Ocultar páginas' : 'Ver páginas'}
                </Button>
              )}
            </div>
          </div>
          {store.selectionIds.size >= 2 && (
            <AlignBar
              count={store.selectionIds.size}
              onAlign={store.alignSelected}
              onDistribute={store.distributeSelected}
            />
          )}
          </>
        )}
      </header>

      {exportError && <div className={styles['error-banner']}>Export failed: {exportError}</div>}

      {showEditorToolbar && mode === 'insert' && (
        <div className={styles['insert-banner']}>
          Modo Insertar · <strong>{getFieldTypeConfig(insertType).label}</strong> · arrastra sobre el PDF
          <span className={styles['insert-banner-esc']}>
            <Kbd>Esc</Kbd> para cancelar
          </span>
        </div>
      )}

      {appMode === 'filler' ? (
        <FillerMode
          ref={fillerRef}
          compactWhenEmpty={view === 'filler'}
          onHasFileChange={(has) => { setFillerHasFile(has); if (has) navigate('filler'); }}
          onFilenameChange={setFillerFilename}
          onGeneratingChange={setFillerGenerating}
        />
      ) : view === 'editor' && pdfBytes ? (
        <div className={styles['editor-layout']}>
          {hasThumbnails && (
            <ThumbnailStrip
              pdfDoc={pdfRenderer.pdfDoc!}
              totalPages={pdfRenderer.totalPages}
              currentPage={pdfRenderer.currentPage}
              onPageSelect={(page) => {
                pdfRenderer.setCurrentPage(page);
                requestAnimationFrame(() => {
                  document.getElementById(`pdf-page-${page}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
              }}
              hidden={!thumbnailsVisible}
            />
          )}

          <aside className={styles.sidebar}>
            <FieldList
              fields={store.fields}
              selectedFieldId={store.selectedFieldId}
              selectionIds={store.selectionIds}
              onSelect={store.selectSingle}
              onToggleSelect={store.toggleSelect}
              onDuplicate={(id) => store.duplicateField(id, 8, 8)}
              onCopyProps={(id) => {
                const f = store.fields.find((x) => x.id === id);
                if (!f) return;
                const { group, fieldType, fontSize, fontFamily, displayFont, showBorder, autoFitFont, multiline, required } = f;
                setPropClipboard({ group, fieldType, fontSize, fontFamily, displayFont, showBorder, autoFitFont, multiline, required });
              }}
              onBringToFront={store.bringToFront}
              onSendToBack={store.sendToBack}
              onToggleLock={store.toggleLock}
              onDelete={store.deleteField}
              onReorder={store.reorderFields}
            />
          </aside>

          <main
            ref={viewerAreaRef}
            className={styles['viewer-area']}
            onScroll={handleViewerScroll}
          >
            {store.fields.length === 0 && mode !== 'insert' && !pdfRenderer.isLoading && (
              <div className={styles['canvas-empty']}>
                <h3>Aún no hay campos</h3>
                <p>Presiona <Kbd>I</Kbd> para insertar, o usa la barra de modos.</p>
              </div>
            )}
            {pdfRenderer.error ? (
              <p className={styles['error-msg']}>{pdfRenderer.error}</p>
            ) : (
              <PdfViewer
                pdfRenderer={pdfRenderer}
                allFields={store.fields}
                selectionIds={store.selectionIds}
                mode={mode}
                onFieldAdd={(pg, cx, cy, ph, rs) => store.addField(pg, cx, cy, ph, rs, insertType)}
                onFieldUpdate={store.updateField}
                onFieldsUpdate={store.updateFields}
                onFieldSelectSingle={store.selectSingle}
                onFieldClearSelection={store.clearSelection}
                onToggleSelect={store.toggleSelect}
                onSetSelection={store.setSelection}
                onFieldDelete={store.deleteField}
                onFieldDuplicate={handleDuplicate}
                onFieldBringToFront={store.bringToFront}
                onFieldSendToBack={store.sendToBack}
                onFieldToggleLock={store.toggleLock}
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
      ) : view === 'editor' ? (
        <NoDocScreen
          eyebrow="Editor de plantilla"
          description="Carga un PDF para empezar a colocar campos de formulario. Arrástralo aquí o selecciónalo desde tu equipo."
          onFile={(file) => { void file.arrayBuffer().then((b) => handlePdfLoaded(b, file.name)); }}
        />
      ) : (
        <div className={styles['upload-area']}>
          <PdfUploader onPdfLoaded={handlePdfLoaded} appMode={appMode} />
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

      <ConfirmDialog
        isOpen={showNewDocConfirm}
        title="Cambiar de documento"
        message={'Tienes cambios sin guardar. Si cambias de documento se perderán los campos a menos que primero los exportes (Exportar PDF) o guardes la plantilla (Exportar → JSON).\n\n¿Cambiar de documento de todas formas?'}
        confirmLabel="Cambiar documento"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={() => { setShowNewDocConfirm(false); openPdfPicker(); }}
        onCancel={() => setShowNewDocConfirm(false)}
      />
    </div>
  );
}
