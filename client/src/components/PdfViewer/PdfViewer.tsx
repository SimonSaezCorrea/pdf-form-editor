import { useRef, useState, useCallback } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDndMonitor,
  type DragEndEvent,
} from '@dnd-kit/core';
import type { FormField } from 'pdf-form-editor-shared';
import type { PdfRenderer } from '../../hooks/usePdfRenderer';
import type { InteractionMode } from '../../hooks/useInteractionMode';
import { useRubberBand } from '../../hooks/useRubberBand';
import { DraggableField } from '../FieldOverlay/DraggableField';
import { PageNavigator } from '../PageNavigator/PageNavigator';
import { canvasToPdf, pdfToCanvas } from '../../utils/coordinates';

interface PdfViewerProps {
  pdfRenderer: PdfRenderer;
  /** Fields on the current page */
  fields: FormField[];
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

export function PdfViewer({
  pdfRenderer,
  fields,
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
  const overlayRef = useRef<HTMLDivElement>(null);
  const { canvasRef, totalPages, currentPage, setCurrentPage, pageDimensions, renderScale, isLoading } =
    pdfRenderer;

  const [groupDragDelta, setGroupDragDelta] = useState<{ activeId: string; x: number; y: number } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const rubberBand = useRubberBand({
    fields,
    pageDimensions,
    renderScale,
    onSelectionComplete: onSetSelection,
  });

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Ignore clicks that originated on a draggable field
    if ((e.target as HTMLElement).closest('[data-field-id]')) return;
    if (!pageDimensions || !overlayRef.current) return;

    if (mode === 'insert') {
      const rect = overlayRef.current.getBoundingClientRect();
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;
      onFieldAdd(currentPage, canvasX, canvasY, pageDimensions.height, renderScale);
    } else if (mode === 'select') {
      // If rubber band just completed, the click is the tail of that drag — don't clear
      if (rubberBand.consumeJustSelected()) return;
      onFieldClearSelection();
    }
    // move: no action on empty click
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    if (!pageDimensions) return;

    const fieldId = active.id as string;
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;

    // Group move: if the dragged field is in the selection and multiple are selected
    if (selectionIds.has(fieldId) && selectionIds.size > 1) {
      const updates: Array<{ id: string; partial: Partial<Omit<FormField, 'id'>> }> = [];

      for (const id of selectionIds) {
        const f = fields.find((ff) => ff.id === id);
        if (!f) continue;

        const canvasPos = pdfToCanvas(f.x, f.y, f.width, f.height, renderScale, pageDimensions.height);
        const newCanvasX = Math.max(0, canvasPos.left + delta.x);
        const newCanvasY = Math.max(0, canvasPos.top + delta.y);
        const updated = canvasToPdf(newCanvasX, newCanvasY, canvasPos.width, canvasPos.height, renderScale, pageDimensions.height);
        updates.push({ id, partial: { x: updated.x, y: updated.y } });
      }

      // Apply each field update individually (updateFields only supports same partial for all)
      for (const { id, partial } of updates) {
        onFieldUpdate(id, partial);
      }
      return;
    }

    // Single field move (also covers: dragging non-selected field in select/move mode)
    if (!selectionIds.has(fieldId)) {
      // In select mode, dragging a non-selected field: select it first
      if (mode === 'select') {
        onFieldSelectSingle(fieldId);
      }
      // In move mode, don't change selection
    }

    const canvasPos = pdfToCanvas(
      field.x,
      field.y,
      field.width,
      field.height,
      renderScale,
      pageDimensions.height,
    );
    const newCanvasX = Math.max(0, canvasPos.left + delta.x);
    const newCanvasY = Math.max(0, canvasPos.top + delta.y);
    const updated = canvasToPdf(
      newCanvasX,
      newCanvasY,
      canvasPos.width,
      canvasPos.height,
      renderScale,
      pageDimensions.height,
    );
    onFieldUpdate(fieldId, { x: updated.x, y: updated.y });
  };

  const canvasWidth = pageDimensions
    ? Math.round(pageDimensions.width * renderScale)
    : undefined;
  const canvasHeight = pageDimensions
    ? Math.round(pageDimensions.height * renderScale)
    : undefined;

  const isSingleSelection = selectionIds.size === 1;

  const handleGroupDragMove = useCallback((activeId: string, delta: { x: number; y: number }) => {
    if (selectionIds.has(activeId) && selectionIds.size > 1) {
      setGroupDragDelta({ activeId, x: delta.x, y: delta.y });
    }
  }, [selectionIds]);

  const handleGroupDragEnd = useCallback(() => {
    setGroupDragDelta(null);
  }, []);

  return (
    <div className="pdf-viewer">
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <DragStateTracker onMove={handleGroupDragMove} onEnd={handleGroupDragEnd} />
        <div
          className="pdf-canvas-container"
          style={{ width: canvasWidth, height: canvasHeight }}
        >
          <canvas ref={canvasRef as React.RefObject<HTMLCanvasElement>} />
          {isLoading && <div className="loading-overlay">Rendering…</div>}
          {/* Field overlay — mode-aware click and drag behaviour */}
          <div
            ref={overlayRef}
            className="field-overlay"
            onClick={handleOverlayClick}
            onPointerDown={mode === 'select' ? rubberBand.onOverlayPointerDown : undefined}
          >
            {rubberBand.isDrawing && (
              <div className="rubber-band-rect" style={rubberBand.rubberBandStyle} />
            )}
            {fields.map((field) => (
              <DraggableField
                key={field.id}
                field={field}
                pdfPageHeight={pageDimensions?.height ?? 792}
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

      <PageNavigator
        currentPage={currentPage}
        totalPages={totalPages}
        onPrev={() => setCurrentPage(currentPage - 1)}
        onNext={() => setCurrentPage(currentPage + 1)}
      />
    </div>
  );
}

/** Internal component — must be rendered inside DndContext to use useDndMonitor */
function DragStateTracker({
  onMove,
  onEnd,
}: {
  onMove: (activeId: string, delta: { x: number; y: number }) => void;
  onEnd: () => void;
}) {
  useDndMonitor({
    onDragMove(event) {
      onMove(event.active.id as string, event.delta);
    },
    onDragEnd: onEnd,
    onDragCancel: onEnd,
  });
  return null;
}
