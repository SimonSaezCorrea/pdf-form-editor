'use client';

import { useState, useRef } from 'react';
import type { FormField } from '@/types/shared';
import { getFieldTypeConfig } from '@/features/fields/config/fieldTypes';
import { FieldContextMenu } from '@/features/fields/components/FieldContextMenu/FieldContextMenu';
const ICON_LOCK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
const ICON_UNLOCK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>`;
import styles from './FieldList.module.css';

interface CtxState { x: number; y: number; fieldId: string }

interface FieldListProps {
  fields: FormField[];
  selectedFieldId: string | null;
  selectionIds: ReadonlySet<string>;
  onSelect: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onDuplicate: (id: string) => void;
  onCopyProps: (id: string) => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export function FieldList({
  fields, selectedFieldId, selectionIds,
  onSelect, onToggleSelect, onDuplicate, onCopyProps,
  onBringToFront, onSendToBack, onToggleLock, onDelete, onReorder,
}: Readonly<FieldListProps>) {
  const [ctx, setCtx] = useState<CtxState | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const dragIndexRef = useRef<number>(-1);

  const ctxField = ctx ? fields.find((f) => f.id === ctx.fieldId) : null;

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectionIds.has(id)) onSelect(id);
    setCtx({ x: e.clientX, y: e.clientY, fieldId: id });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(index);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndexRef.current !== -1 && dragIndexRef.current !== index) {
      onReorder(dragIndexRef.current, index);
    }
    dragIndexRef.current = -1;
    setDragOver(null);
  };

  const handleDragEnd = () => {
    dragIndexRef.current = -1;
    setDragOver(null);
  };

  return (
    <div className={styles['field-list']}>
      <h3>Campos ({fields.length})</h3>
      {fields.length === 0 ? (
        <p className={styles['field-list-empty']}>Haz clic en el PDF para añadir campos.</p>
      ) : (
        <ul className={styles['field-list-ul']}>
        {fields.map((field, index) => {
          const typeConfig = getFieldTypeConfig(field.fieldType);
          return (
            <li
              key={field.id}
              className={[
                styles['field-list-item'],
                selectionIds.has(field.id) ? styles.selected : '',
                field.locked ? styles.locked : '',
                dragOver === index ? styles['drag-over'] : '',
              ].filter(Boolean).join(' ')}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              <span className={styles['drag-handle']} aria-hidden="true">⠿</span>
              <button
                type="button"
                className={styles['item-select-btn']}
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey) onToggleSelect(field.id);
                  else onSelect(field.id);
                }}
                onContextMenu={(e) => handleContextMenu(e, field.id)}
              >
                <span
                  className={styles['type-badge']}
                  style={{ background: `${typeConfig.color}28`, color: typeConfig.color }}
                >
                  {typeConfig.short}
                </span>
                <span className={styles['item-info']}>
                  <span className={styles['item-name']} title={field.name}>
                    {field.name}
                  </span>
                  {field.group && (
                    <span className={styles['item-group']}>{field.group}</span>
                  )}
                </span>
                <span className={styles['item-page']}>p.{field.page}</span>
              </button>
              <button
                type="button"
                className={[styles['lock-btn'], field.locked ? styles['lock-btn--active'] : ''].filter(Boolean).join(' ')}
                onClick={(e) => { e.stopPropagation(); onToggleLock(field.id); }}
                aria-label={field.locked ? 'Desbloquear' : 'Bloquear'}
                title={field.locked ? 'Desbloquear campo' : 'Bloquear campo'}
              >
                <span
                  className={styles['lock-icon-svg']}
                  dangerouslySetInnerHTML={{ __html: field.locked ? ICON_LOCK : ICON_UNLOCK }}
                />
              </button>
            </li>
          );
        })}
        </ul>
      )}

      {ctx && ctxField && (() => {
        const inSelection = selectionIds.has(ctx.fieldId) && selectionIds.size > 1;
        const ids = inSelection ? [...selectionIds] : [ctx.fieldId];
        return (
          <FieldContextMenu
            x={ctx.x}
            y={ctx.y}
            isLocked={ctxField.locked ?? false}
            onClose={() => setCtx(null)}
            onDuplicate={() => ids.forEach((id) => onDuplicate(id))}
            onCopyProps={() => onCopyProps(ctx.fieldId)}
            onBringToFront={() => ids.forEach((id) => onBringToFront(id))}
            onSendToBack={() => ids.forEach((id) => onSendToBack(id))}
            onToggleLock={() => ids.forEach((id) => onToggleLock(id))}
            onDelete={() => ids.forEach((id) => onDelete(id))}
          />
        );
      })()}
    </div>
  );
}
