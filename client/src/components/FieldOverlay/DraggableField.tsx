import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { FormField } from 'pdf-form-editor-shared';
import { pdfToCanvas } from '../../utils/coordinates';

interface DraggableFieldProps {
  field: FormField;
  pdfPageHeight: number;
  renderScale: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function DraggableField({
  field,
  pdfPageHeight,
  renderScale,
  isSelected,
  onSelect,
  onDelete,
}: DraggableFieldProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: field.id,
  });

  const canvasPos = pdfToCanvas(
    field.x,
    field.y,
    field.width,
    field.height,
    renderScale,
    pdfPageHeight,
  );

  const style: React.CSSProperties = {
    left: canvasPos.left,
    top: canvasPos.top,
    width: canvasPos.width,
    height: canvasPos.height,
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 50 : isSelected ? 10 : 1,
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(field.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(field.id);
  };

  return (
    <div
      ref={setNodeRef}
      className={`draggable-field${isSelected ? ' selected' : ''}${isDragging ? ' dragging' : ''}`}
      style={style}
      onClick={handleClick}
      data-field-id={field.id}
      {...listeners}
      {...attributes}
    >
      <span className="field-label">{field.name}</span>
      <button
        className="field-delete-btn"
        onClick={handleDelete}
        title="Delete field"
        aria-label={`Delete field ${field.name}`}
      >
        ✕
      </button>
    </div>
  );
}
