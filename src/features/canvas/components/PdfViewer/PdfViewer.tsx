'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDndMonitor,
  type DragEndEvent,
  type DragMoveEvent,
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
import { FieldContextMenu } from '@/features/fields/components/FieldContextMenu/FieldContextMenu';
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
  onFieldBringToFront?: (id: string) => void;
  onFieldSendToBack?: (id: string) => void;
  onFieldToggleLock?: (id: string) => void;
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
  onFieldBringToFront?: (id: string) => void;
  onFieldSendToBack?: (id: string) => void;
  onFieldToggleLock?: (id: string) => void;
  onContextMenuRequest: (fieldId: string, x: number, y: number) => void;
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
  onFieldBringToFront,
  onFieldSendToBack,
  onFieldToggleLock,
  onContextMenuRequest,
}: PageSectionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [groupDragDelta, setGroupDragDelta] = useState<{ activeId: string; x: number; y: number } | null>(null);
  const [snapState, setSnapState] = useState<{ dragPdfY: number | null; activeBaseline: number | null }>({
    dragPdfY: null,
    activeBaseline: null,
  });
  const [snapGuides, setSnapGuides] = useState<SnapGuides>({ v: [], h: [] });

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
    setSnapGuides({ v: [], h: [] });
  }, []);

  const handleGuideMove = useCallback((activeId: string, delta: { x: number; y: number }) => {
    // Only compute snap guides for single-field drags
    if (selectionIds.size > 1 && selectionIds.has(activeId)) return;
    const field = fields.find((f) => f.id === activeId);
    if (!field) return;
    const canvasPos = pdfToCanvas(field.x, field.y, field.width, field.height, renderScale, pageDimensions.height);
    const drag: DragRect = {
      x: canvasPos.left + delta.x,
      y: canvasPos.top + delta.y,
      w: canvasPos.width,
      h: canvasPos.height,
    };
    const guides = computeSnapGuides(activeId, drag, fields, renderScale, pageDimensions.height);
    setSnapGuides(guides);
  }, [fields, selectionIds, renderScale, pageDimensions.height]);

  return (
    <div
      id={`pdf-page-${pageNum}`}
      className={styles['page-section']}
      onPointerDown={mode === 'select' ? (e) => rubberBand.onOuterPointerDown(e, overlayRef.current) : undefined}
    >
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <DragStateTracker onMove={handleGroupDragMove} onSnapMove={handleSnapMove} onEnd={handleGroupDragEnd} onGuideMove={handleGuideMove} />
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
            {snapGuides.v.map((x, i) => (
              <div
                key={`sg-v-${i}`}
                style={{
                  position: 'absolute',
                  left: x,
                  top: 0,
                  width: 1,
                  height: '100%',
                  background: '#ec4899',
                  pointerEvents: 'none',
                }}
              />
            ))}
            {snapGuides.h.map((y, i) => (
              <div
                key={`sg-h-${i}`}
                style={{
                  position: 'absolute',
                  top: y,
                  left: 0,
                  height: 1,
                  width: '100%',
                  background: '#ec4899',
                  pointerEvents: 'none',
                }}
              />
            ))}
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
                onBringToFront={onFieldBringToFront}
                onSendToBack={onFieldSendToBack}
                onToggleLock={onFieldToggleLock}
                onContextMenuRequest={onContextMenuRequest}
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
  onFieldBringToFront,
  onFieldSendToBack,
  onFieldToggleLock,
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

  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; fieldId: string } | null>(null);

  const handleContextMenuRequest = useCallback(
    (fieldId: string, x: number, y: number) => setCtxMenu({ fieldId, x, y }),
    [],
  );

  const ctxField = ctxMenu ? allFields.find((f) => f.id === ctxMenu.fieldId) : null;

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
            onFieldBringToFront={onFieldBringToFront}
            onFieldSendToBack={onFieldSendToBack}
            onFieldToggleLock={onFieldToggleLock}
            onContextMenuRequest={handleContextMenuRequest}
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
      {ctxMenu && ctxField && (() => {
        const inSelection = selectionIds.has(ctxMenu.fieldId) && selectionIds.size > 1;
        const ids = inSelection ? [...selectionIds] : [ctxMenu.fieldId];
        const close = () => setCtxMenu(null);
        return (
          <FieldContextMenu
            x={ctxMenu.x}
            y={ctxMenu.y}
            isLocked={ctxField.locked ?? false}
            onClose={close}
            onDuplicate={() => { ids.forEach((id) => onFieldDuplicate(id)); close(); }}
            onCopyProps={close}
            onBringToFront={() => { ids.forEach((id) => onFieldBringToFront?.(id)); close(); }}
            onSendToBack={() => { ids.forEach((id) => onFieldSendToBack?.(id)); close(); }}
            onToggleLock={() => { ids.forEach((id) => onFieldToggleLock?.(id)); close(); }}
            onDelete={() => { ids.forEach((id) => onFieldDelete(id)); close(); }}
          />
        );
      })()}
    </div>
  );
}

/** Internal component — must be rendered inside DndContext to use useDndMonitor */
function DragStateTracker({
  onMove,
  onSnapMove,
  onEnd,
  onGuideMove,
}: {
  onMove: (activeId: string, delta: { x: number; y: number }) => void;
  onSnapMove: (activeId: string, delta: { x: number; y: number }) => void;
  onEnd: () => void;
  onGuideMove?: (activeId: string, delta: { x: number; y: number }) => void;
}) {
  useDndMonitor({
    onDragMove(event: DragMoveEvent) {
      const activeId = event.active.id as string;
      onMove(activeId, event.delta);
      onSnapMove(activeId, event.delta);
      onGuideMove?.(activeId, event.delta);
    },
    onDragEnd: onEnd,
    onDragCancel: onEnd,
  });
  return null;
}

// ---------------------------------------------------------------------------
// Snap guide computation — exported for unit tests (T077)
// ---------------------------------------------------------------------------

export interface SnapGuides {
  /** Canvas-pixel X positions for vertical guide lines */
  v: number[];
  /** Canvas-pixel Y positions for horizontal guide lines */
  h: number[];
}

/** Geometry of the actively-dragged field in canvas pixels. */
export interface DragRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const SNAP_THRESHOLD_PX = 4;

/** Returns the subset of `candidates` that are within threshold of any axis in `active`. */
function matchingAxes(candidates: number[], active: number[]): number[] {
  return candidates.filter((c) => active.some((a) => Math.abs(a - c) <= SNAP_THRESHOLD_PX));
}

/**
 * Compute alignment snap guide lines for the actively-dragged field.
 *
 * For each non-active field, 3 X-axes and 3 Y-axes are derived in canvas
 * space (left/center/right and top/center/bottom).  If the corresponding
 * axis of the dragged field is within SNAP_THRESHOLD_PX of a candidate
 * axis, that axis is emitted as a guide line.
 *
 * @param activeId      - id of the field being dragged
 * @param drag          - candidate canvas rect of the active field
 * @param allFields     - all fields on the current page (including active)
 * @param renderScale   - canvas px / PDF pt
 * @param pdfPageHeight - page height in PDF points
 */
export function computeSnapGuides(
  activeId: string,
  drag: DragRect,
  allFields: FormField[],
  renderScale: number,
  pdfPageHeight: number,
): SnapGuides {
  const activeXAxes = [drag.x, drag.x + drag.w / 2, drag.x + drag.w];
  const activeYAxes = [drag.y, drag.y + drag.h / 2, drag.y + drag.h];

  const vSet = new Set<number>();
  const hSet = new Set<number>();

  for (const field of allFields) {
    if (field.id === activeId) continue;

    const pos = pdfToCanvas(field.x, field.y, field.width, field.height, renderScale, pdfPageHeight);

    const candidateX = [pos.left, pos.left + pos.width / 2, pos.left + pos.width];
    const candidateY = [pos.top, pos.top + pos.height / 2, pos.top + pos.height];

    for (const x of matchingAxes(candidateX, activeXAxes)) vSet.add(x);
    for (const y of matchingAxes(candidateY, activeYAxes)) hSet.add(y);
  }

  return { v: Array.from(vSet), h: Array.from(hSet) };
}
