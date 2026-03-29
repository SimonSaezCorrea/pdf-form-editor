'use client';

import { useRef, useState, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { FormField } from '@/types/shared';
import type { InteractionMode } from '@/hooks/useInteractionMode';
import { pdfToCanvas } from '@/features/pdf/utils/coordinates';
import { useFieldResize } from '@/features/fields/hooks/useFieldResize';
import { ResizeHandles } from './ResizeHandles';
import { IconButton, Button } from '@/components/ui';
import styles from './DraggableField.module.css';

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
  isSingleSelection: boolean;
  mode: InteractionMode;
  groupDragDelta?: { activeId: string; x: number; y: number } | null;
  onSelectSingle: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate?: () => void;
  onUpdate?: (id: string, partial: Partial<Omit<FormField, 'id'>>) => void;
}

export function DraggableField({
  field,
  pdfPageHeight,
  renderScale,
  isSelected,
  isSingleSelection,
  mode,
  groupDragDelta,
  onSelectSingle,
  onToggleSelect,
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

  // Apply group drag delta to all selected non-active fields
  const isGroupFollower =
    !!groupDragDelta &&
    groupDragDelta.activeId !== field.id &&
    isSelected;

  const fieldTransform = isGroupFollower
    ? `translate(${groupDragDelta!.x}px, ${groupDragDelta!.y}px)`
    : CSS.Translate.toString(transform);

  const style: React.CSSProperties = {
    left: canvasPos.left,
    top: canvasPos.top,
    width: canvasPos.width,
    height: canvasPos.height,
    transform: fieldTransform,
    zIndex: isDragging || isGroupFollower ? 50 : isSelected ? 10 : 1,
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.shiftKey) {
      onToggleSelect(field.id);
    } else {
      onSelectSingle(field.id);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(field.id);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onSelectSingle(field.id);
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
        className={[styles['draggable-field'], isSelected ? styles.selected : '', isDragging ? styles.dragging : ''].filter(Boolean).join(' ')}
        style={style}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        data-field-id={field.id}
        {...listeners}
        {...attributes}
      >
        <span className={[styles['field-label'], field.value ? styles['field-label--has-value'] : ''].filter(Boolean).join(' ')}>
          {field.value || field.name}
        </span>
        <IconButton
          icon="✕"
          label={`Delete field ${field.name}`}
          variant="danger"
          size="sm"
          onClick={handleDelete}
          className={styles['field-delete-btn']}
        />
        {isSelected && isSingleSelection && (
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
          className={styles['context-menu']}
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <Button variant="ghost" size="sm" className={styles['context-menu-item']} onClick={handleDuplicateClick}>
            Duplicar campo
          </Button>
        </div>
      )}
    </>
  );
}
