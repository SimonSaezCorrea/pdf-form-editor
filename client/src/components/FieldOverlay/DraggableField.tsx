import { useRef, useState, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { FormField } from 'pdf-form-editor-shared';
import { pdfToCanvas } from '../../utils/coordinates';
import { useFieldResize } from '../../hooks/useFieldResize';
import { ResizeHandles } from './ResizeHandles';

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
}

interface DraggableFieldProps {
  field: FormField;
  pdfPageHeight: number;
  renderScale: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate?: () => void;
  onUpdate?: (id: string, partial: Partial<Omit<FormField, 'id'>>) => void;
}

export function DraggableField({
  field,
  pdfPageHeight,
  renderScale,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  onUpdate,
}: DraggableFieldProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: field.id,
  });

  const { onHandleMouseDown } = useFieldResize(renderScale, onUpdate ?? (() => {}));

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
  });
  const menuRef = useRef<HTMLDivElement>(null);

  // Dismiss context menu on mousedown outside menu or Escape key
  useEffect(() => {
    if (!contextMenu.visible) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu((v) => ({ ...v, visible: false }));
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu((v) => ({ ...v, visible: false }));
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu.visible]);

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

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onSelect(field.id);
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
  };

  const handleDuplicateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDuplicate?.();
    setContextMenu((v) => ({ ...v, visible: false }));
  };

  return (
    <>
      <div
        ref={setNodeRef}
        className={`draggable-field${isSelected ? ' selected' : ''}${isDragging ? ' dragging' : ''}`}
        style={style}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
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
        {isSelected && (
          <ResizeHandles
            field={field}
            renderScale={renderScale}
            onHandleMouseDown={onHandleMouseDown}
          />
        )}
      </div>

      {contextMenu.visible && (
        <div
          ref={menuRef}
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button className="context-menu-item" onClick={handleDuplicateClick}>
            Duplicar campo
          </button>
        </div>
      )}
    </>
  );
}
