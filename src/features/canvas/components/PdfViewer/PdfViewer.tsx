'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDndMonitor,
  type DragEndEvent,
} from '@dnd-kit/core';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import type { FormField } from '@/types/shared';
import type { PdfRenderer, PageDimensions } from '@/features/canvas/hooks/usePdfRenderer';
import type { InteractionMode } from '@/hooks/useInteractionMode';
import { useRubberBand } from '@/features/canvas/hooks/useRubberBand';
import { useTextBaselines } from '@/features/canvas/hooks/useTextBaselines';
import { useSnapToBaseline } from '@/features/canvas/hooks/useSnapToBaseline';
import { DraggableField } from '@/features/fields/components/FieldOverlay/DraggableField';
import { BaselineGuides } from '@/features/fields/components/FieldOverlay/BaselineGuides';
import { PageNavigator } from '@/features/fields/components/PageNavigator/PageNavigator';
import { canvasToPdf, pdfToCanvas } from '@/features/pdf/utils/coordinates';
import styles from './PdfViewer.module.css';

interface PdfViewerProps {
  pdfRenderer: PdfRenderer;
  /** All fields across all pages */
  allFields: FormField[];
  selectionIds: ReadonlySet<string>;
  mode: InteractionMode;
  onFieldAdd: (
    pageNum: number,
    canvasX: number,
    canvasY: number,
    pdfPageHeight: number,
    renderScale: number,
  ) => void;
  onFieldUpdate: (id: string, partial: Partial<Omit<FormField, 'id'>>) => void;
  onFieldsUpdate: (ids: string[], partial: Partial<Omit<FormField, 'id'>>) => void;
  onFieldSelectSingle: (id: string) => void;
  onFieldClearSelection: () => void;
  onToggleSelect: (id: string) => void;
  onSetSelection: (ids: string[]) => void;
  onFieldDelete: (id: string) => void;
  onFieldDuplicate: (id: string) => void;
}

interface PageSectionProps {
  pageNum: number;
  pdfDoc: PDFDocumentProxy;
  pageDimensions: PageDimensions;
  renderScale: number;
  fields: FormField[];
  selectionIds: ReadonlySet<string>;
  mode: InteractionMode;
  onFieldAdd: (pageNum: number, canvasX: number, canvasY: number, pdfPageHeight: number, renderScale: number) => void;
  onFieldUpdate: (id: string, partial: Partial<Omit<FormField, 'id'>>) => void;
  onFieldSelectSingle: (id: string) => void;
  onFieldClearSelection: () => void;
  onToggleSelect: (id: string) => void;
  onSetSelection: (ids: string[]) => void;
  onFieldDelete: (id: string) => void;
  onFieldDuplicate: (id: string) => void;
}

function PageSection({
  pageNum,
  pdfDoc,
  pageDimensions,
  renderScale,
  fields,
  selectionIds,
  mode,
  onFieldAdd,
  onFieldUpdate,
  onFieldSelectSingle,
  onFieldClearSelection,
  onToggleSelect,
  onSetSelection,
  onFieldDelete,
  onFieldDuplicate,
}: PageSectionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [groupDragDelta, setGroupDragDelta] = useState<{ activeId: string; x: number; y: number } | null>(null);
  const [snapState, setSnapState] = useState<{ dragPdfY: number | null; activeBaseline: number | null }>({
    dragPdfY: null,
    activeBaseline: null,
  });

  const { baselines } = useTextBaselines(pdfDoc, pageNum);
  const computeSnap = useSnapToBaseline(baselines, renderScale);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const rubberBand = useRubberBand({
    fields,
    pageDimensions,
    renderScale,
    onSelectionComplete: onSetSelection,
  });

  // Render this page to its canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    let cancelled = false;
    let renderTask: RenderTask | null = null;
    setIsLoading(true);

    const render = async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        if (cancelled) return;
        const viewport = page.getViewport({ scale: renderScale });
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        // annotationMode: 2 = ENABLE_FORMS — hides native widget annotations
        // (form fields) from the canvas so only our interactive overlay shows
        renderTask = page.render({ canvasContext: ctx, viewport, annotationMode: 2 });
        await renderTask.promise;
      } catch (err: unknown) {
        if ((err as { name?: string }).name === 'RenderingCancelledException') return;
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    render();
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdfDoc, pageNum, renderScale]);

  const canvasWidth = Math.round(pageDimensions.width * renderScale);
  const canvasHeight = Math.round(pageDimensions.height * renderScale);
  const isSingleSelection = selectionIds.size === 1;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-field-id]')) return;
    if (!overlayRef.current) return;

    if (mode === 'insert') {
      const rect = overlayRef.current.getBoundingClientRect();
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;
      onFieldAdd(pageNum, canvasX, canvasY, pageDimensions.height, renderScale);
    } else if (mode === 'select') {
      if (rubberBand.consumeJustSelected()) return;
      onFieldClearSelection();
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const fieldId = active.id as string;
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;

    if (selectionIds.has(fieldId) && selectionIds.size > 1) {
      const primaryCanvasPos = pdfToCanvas(field.x, field.y, field.width, field.height, renderScale, pageDimensions.height);
      const primaryNewCanvasY = Math.max(0, primaryCanvasPos.top + delta.y);
      const primaryUpdated = canvasToPdf(Math.max(0, primaryCanvasPos.left + delta.x), primaryNewCanvasY, primaryCanvasPos.width, primaryCanvasPos.height, renderScale, pageDimensions.height);
      const snapResult = computeSnap(primaryUpdated.y, field.height, field.fontSize);
      const snapDeltaY = snapResult.snappedPdfY - primaryUpdated.y;

      for (const id of selectionIds) {
        const f = fields.find((ff) => ff.id === id);
        if (!f) continue;
        const canvasPos = pdfToCanvas(f.x, f.y, f.width, f.height, renderScale, pageDimensions.height);
        const newCanvasX = Math.max(0, canvasPos.left + delta.x);
        const newCanvasY = Math.max(0, canvasPos.top + delta.y);
        const updated = canvasToPdf(newCanvasX, newCanvasY, canvasPos.width, canvasPos.height, renderScale, pageDimensions.height);
        onFieldUpdate(id, { x: updated.x, y: updated.y + snapDeltaY });
      }
      setSnapState({ dragPdfY: null, activeBaseline: null });
      return;
    }

    if (!selectionIds.has(fieldId) && mode === 'select') {
      onFieldSelectSingle(fieldId);
    }

    const canvasPos = pdfToCanvas(field.x, field.y, field.width, field.height, renderScale, pageDimensions.height);
    const newCanvasX = Math.max(0, canvasPos.left + delta.x);
    const newCanvasY = Math.max(0, canvasPos.top + delta.y);
    const updated = canvasToPdf(newCanvasX, newCanvasY, canvasPos.width, canvasPos.height, renderScale, pageDimensions.height);
    const snapResult = computeSnap(updated.y, field.height, field.fontSize);
    onFieldUpdate(fieldId, { x: updated.x, y: snapResult.snappedPdfY });
    setSnapState({ dragPdfY: null, activeBaseline: null });
  };

  const handleGroupDragMove = useCallback((activeId: string, delta: { x: number; y: number }) => {
    if (selectionIds.has(activeId) && selectionIds.size > 1) {
      setGroupDragDelta({ activeId, x: delta.x, y: delta.y });
    }
  }, [selectionIds]);

  const handleSnapMove = useCallback((activeId: string, delta: { x: number; y: number }) => {
    const field = fields.find((f) => f.id === activeId);
    if (!field) return;
    const canvasPos = pdfToCanvas(field.x, field.y, field.width, field.height, renderScale, pageDimensions.height);
    const newCanvasY = Math.max(0, canvasPos.top + delta.y);
    const candidatePdfY = pageDimensions.height - newCanvasY / renderScale - field.height;
    const result = computeSnap(candidatePdfY, field.height, field.fontSize);
    setSnapState({ dragPdfY: result.snappedPdfY, activeBaseline: result.activeBaseline });
  }, [fields, pageDimensions, renderScale, computeSnap]);

  const handleGroupDragEnd = useCallback(() => {
    setGroupDragDelta(null);
  }, []);

  return (
    <div id={`pdf-page-${pageNum}`} className={styles['page-section']}>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <DragStateTracker onMove={handleGroupDragMove} onSnapMove={handleSnapMove} onEnd={handleGroupDragEnd} />
        <div
          className={styles['pdf-canvas-container']}
          style={{ width: canvasWidth, height: canvasHeight }}
        >
          <canvas ref={canvasRef} />
          {isLoading && <div className={styles['loading-overlay']}>Rendering…</div>}
          <div
            ref={overlayRef}
            className={styles['field-overlay']}
            data-role="field-overlay"
            data-mode={mode}
            onClick={handleOverlayClick}
            onPointerDown={mode === 'select' ? rubberBand.onOverlayPointerDown : undefined}
          >
            {rubberBand.isDrawing && (
              <div className={styles['rubber-band-rect']} style={rubberBand.rubberBandStyle} />
            )}
            <BaselineGuides
              baselines={baselines}
              activeBaseline={snapState.activeBaseline}
              renderScale={renderScale}
              pageHeight={pageDimensions.height}
              dragPdfY={snapState.dragPdfY}
            />
            {fields.map((field) => (
              <DraggableField
                key={field.id}
                field={field}
                pdfPageHeight={pageDimensions.height}
                renderScale={renderScale}
                isSelected={selectionIds.has(field.id)}
                isSingleSelection={isSingleSelection}
                mode={mode}
                groupDragDelta={groupDragDelta}
                onSelectSingle={onFieldSelectSingle}
                onToggleSelect={onToggleSelect}
                onDelete={onFieldDelete}
                onDuplicate={() => onFieldDuplicate(field.id)}
                onUpdate={onFieldUpdate}
              />
            ))}
          </div>
        </div>
      </DndContext>
    </div>
  );
}

export function PdfViewer({
  pdfRenderer,
  allFields,
  selectionIds,
  mode,
  onFieldAdd,
  onFieldUpdate,
  onFieldsUpdate,
  onFieldSelectSingle,
  onFieldClearSelection,
  onToggleSelect,
  onSetSelection,
  onFieldDelete,
  onFieldDuplicate,
}: PdfViewerProps) {
  const { pdfDoc, totalPages, currentPage, setCurrentPage, pageDimensionsMap, renderScale, isLoading } =
    pdfRenderer;

  const scrollToPage = useCallback(
    (pageNum: number) => {
      setCurrentPage(pageNum);
      document.getElementById(`pdf-page-${pageNum}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },
    [setCurrentPage],
  );

  const dimensionsReady = Object.keys(pageDimensionsMap).length === totalPages && totalPages > 0;

  if (!pdfDoc || !dimensionsReady) {
    return <div className={styles['pdf-viewer']}>{isLoading && <p>Cargando…</p>}</div>;
  }

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className={styles['pdf-viewer']}>
      {pageNums.map((pageNum) => {
        const pageDimensions = pageDimensionsMap[pageNum];
        if (!pageDimensions) return null;
        return (
          <PageSection
            key={pageNum}
            pageNum={pageNum}
            pdfDoc={pdfDoc}
            pageDimensions={pageDimensions}
            renderScale={renderScale}
            fields={allFields.filter((f) => f.page === pageNum)}
            selectionIds={selectionIds}
            mode={mode}
            onFieldAdd={onFieldAdd}
            onFieldUpdate={onFieldUpdate}
            onFieldSelectSingle={onFieldSelectSingle}
            onFieldClearSelection={onFieldClearSelection}
            onToggleSelect={onToggleSelect}
            onSetSelection={onSetSelection}
            onFieldDelete={onFieldDelete}
            onFieldDuplicate={onFieldDuplicate}
          />
        );
      })}
      {totalPages > 1 && (
        <PageNavigator
          currentPage={currentPage}
          totalPages={totalPages}
          onPrev={() => scrollToPage(currentPage - 1)}
          onNext={() => scrollToPage(currentPage + 1)}
        />
      )}
    </div>
  );
}

/** Internal component — must be rendered inside DndContext to use useDndMonitor */
function DragStateTracker({
  onMove,
  onSnapMove,
  onEnd,
}: {
  onMove: (activeId: string, delta: { x: number; y: number }) => void;
  onSnapMove: (activeId: string, delta: { x: number; y: number }) => void;
  onEnd: () => void;
}) {
  useDndMonitor({
    onDragMove(event) {
      onMove(event.active.id as string, event.delta);
      onSnapMove(event.active.id as string, event.delta);
    },
    onDragEnd: onEnd,
    onDragCancel: onEnd,
  });
  return null;
}
