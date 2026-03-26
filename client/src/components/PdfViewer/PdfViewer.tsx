import { useRef } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import type { FormField } from 'pdf-form-editor-shared';
import type { PdfRenderer } from '../../hooks/usePdfRenderer';
import { DraggableField } from '../FieldOverlay/DraggableField';
import { canvasToPdf, pdfToCanvas } from '../../utils/coordinates';

interface PdfViewerProps {
  pdfRenderer: PdfRenderer;
  /** Fields on the current page */
  fields: FormField[];
  selectedFieldId: string | null;
  onFieldAdd: (
    pageNum: number,
    canvasX: number,
    canvasY: number,
    pdfPageHeight: number,
    renderScale: number,
  ) => void;
  onFieldUpdate: (id: string, partial: Partial<Omit<FormField, 'id'>>) => void;
  onFieldSelect: (id: string | null) => void;
  onFieldDelete: (id: string) => void;
}

export function PdfViewer({
  pdfRenderer,
  fields,
  selectedFieldId,
  onFieldAdd,
  onFieldUpdate,
  onFieldSelect,
  onFieldDelete,
}: PdfViewerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const { canvasRef, totalPages, currentPage, setCurrentPage, pageDimensions, renderScale, isLoading } =
    pdfRenderer;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Ignore clicks that started on a draggable field
    if ((e.target as HTMLElement).closest('[data-field-id]')) return;
    if (!pageDimensions || !overlayRef.current) return;

    const rect = overlayRef.current.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    onFieldAdd(currentPage, canvasX, canvasY, pageDimensions.height, renderScale);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    if (!pageDimensions) return;

    const fieldId = active.id as string;
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;

    // Current canvas position of the field
    const canvasPos = pdfToCanvas(
      field.x,
      field.y,
      field.width,
      field.height,
      renderScale,
      pageDimensions.height,
    );

    // Apply drag delta
    const newCanvasX = Math.max(0, canvasPos.left + delta.x);
    const newCanvasY = Math.max(0, canvasPos.top + delta.y);

    // Convert back to PDF coordinates
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

  return (
    <div className="pdf-viewer">
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div
          className="pdf-canvas-container"
          style={{ width: canvasWidth, height: canvasHeight }}
        >
          <canvas ref={canvasRef} />
          {isLoading && <div className="loading-overlay">Rendering…</div>}
          {/* Field overlay — click to create, drag to reposition */}
          <div
            ref={overlayRef}
            className="field-overlay"
            onClick={handleOverlayClick}
          >
            {fields.map((field) => (
              <DraggableField
                key={field.id}
                field={field}
                pdfPageHeight={pageDimensions?.height ?? 792}
                renderScale={renderScale}
                isSelected={field.id === selectedFieldId}
                onSelect={onFieldSelect}
                onDelete={onFieldDelete}
              />
            ))}
          </div>
        </div>
      </DndContext>

      {/* Page navigation */}
      {totalPages > 1 && (
        <div className="page-nav">
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            ← Prev
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
