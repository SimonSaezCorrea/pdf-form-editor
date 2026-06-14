'use client';

import { useRef, useState, useEffect } from 'react';

function fieldBorderColor(
  isSelected: boolean,
  locked: boolean,
  required: boolean,
  typeColor: string,
): string {
  // Required always shows red — even while selected.
  if (required) return 'var(--color-danger)';
  if (isSelected) return 'var(--color-primary)';
  if (locked) return 'rgba(150,150,150,0.5)';
  return typeColor;
}

function fieldBgColor(isSelected: boolean, locked: boolean, typeColor: string): string {
  if (isSelected) return 'rgba(102, 165, 173, 0.18)';
  if (locked) return 'rgba(150,150,150,0.06)';
  return `${typeColor}18`;
}

function fieldZIndex(isDragging: boolean, isGroupFollower: boolean, isSelected: boolean): number {
  if (isDragging || isGroupFollower) return 50;
  if (isSelected) return 10;
  return 1;
}

function computeCanvasFitFontSize(
  text: string,
  widthPx: number,
  heightPx: number,
  basePx: number,
  multiline: boolean,
): number {
  const PADDING = 4;
  const available = widthPx - PADDING;
  const ratio = 0.58;
  if (!multiline) {
    const textWidth = text.length * ratio * basePx;
    if (textWidth <= available) return basePx;
    return Math.max(8, (available / textWidth) * basePx);
  }
  const charsPerLine = Math.max(1, Math.floor(available / (ratio * basePx)));
  const numLines = Math.ceil(text.length / charsPerLine);
  const heightNeeded = numLines * basePx * 1.4;
  if (heightNeeded <= heightPx) return basePx;
  return Math.max(8, (heightPx / heightNeeded) * basePx);
}

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { FormField } from '@/types/shared';
import type { InteractionMode } from '@/hooks/useInteractionMode';
import { getFieldTypeConfig } from '@/features/fields/config/fieldTypes';
import { pdfToCanvas } from '@/features/pdf/utils/coordinates';
import { useFieldResize } from '@/features/fields/hooks/useFieldResize';
import { ResizeHandles } from './ResizeHandles';

import { IconButton } from '@/components/ui';
import styles from './DraggableField.module.css';

interface RenameInputProps {
  defaultValue: string;
  onCommit: (v: string) => void;
  onCancel: () => void;
}
function RenameInput({ defaultValue, onCommit, onCancel }: Readonly<RenameInputProps>) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.select(); }, []);
  return (
    <input
      ref={ref}
      className={styles['field-rename-input']}
      defaultValue={defaultValue}
      onBlur={(e) => onCommit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); onCommit(e.currentTarget.value); }
        if (e.key === 'Escape') { e.stopPropagation(); onCancel(); }
      }}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

interface FieldLabelProps {
  field: FormField;
  renderScale: number;
  canvasWidth: number;
  canvasHeight: number;
}
/** Maps text alignment to flex justification (single line) — text-align covers multiline. */
const ALIGN_JUSTIFY = { left: 'flex-start', center: 'center', right: 'flex-end' } as const;
function FieldLabel({ field, renderScale, canvasWidth, canvasHeight }: Readonly<FieldLabelProps>) {
  const fontSize = field.value && field.autoFitFont
    ? computeCanvasFitFontSize(field.value, canvasWidth, canvasHeight, field.fontSize * renderScale, field.multiline ?? false)
    : field.fontSize * renderScale;
  const align = field.align ?? 'left';
  return (
    <span
      className={[
        styles['field-label'],
        field.value ? styles['field-label--has-value'] : '',
        field.value && field.multiline ? styles['field-label--multiline'] : '',
        field.locked ? styles['field-label--locked'] : '',
        field.required ? styles['field-label--required'] : '',
      ].filter(Boolean).join(' ')}
      style={{
        fontSize: `${fontSize}px`,
        justifyContent: ALIGN_JUSTIFY[align],
        textAlign: align,
        ...(field.displayFont ? { fontFamily: field.displayFont } : {}),
        ...(field.value && field.bold ? { fontWeight: 700 } : {}),
        ...(field.value && field.italic ? { fontStyle: 'italic' } : {}),
        ...(field.value && (field.underline || field.strikethrough)
          ? {
              textDecorationLine: [
                field.underline ? 'underline' : '',
                field.strikethrough ? 'line-through' : '',
              ]
                .filter(Boolean)
                .join(' '),
            }
          : {}),
      }}
    >
      {field.value || field.name}
    </span>
  );
}

interface TypeGlyphProps {
  field: FormField;
  typeColor: string;
  canvasWidth: number;
  canvasHeight: number;
}

/** Centered square checkbox — the editor preview of an exported AcroForm checkbox. */
function CheckboxGlyph({ field, typeColor, canvasWidth, canvasHeight }: Readonly<TypeGlyphProps>) {
  const size = Math.max(8, Math.min(canvasWidth, canvasHeight) - 4);
  const checked = !!field.value &&
    ['true', '1', 'x', '✓', 'si', 'sí', 'yes', 'on', 'checked'].includes(field.value.trim().toLowerCase());
  return (
    <span className={styles['checkbox-glyph']}>
      <span
        className={styles['checkbox-box']}
        style={{ width: size, height: size, borderColor: typeColor }}
      >
        {checked && <span style={{ color: typeColor, fontSize: size * 0.8, lineHeight: 1 }}>✓</span>}
      </span>
    </span>
  );
}

/** Signature zone preview: baseline + label. */
function SignatureGlyph({ field, typeColor }: Readonly<TypeGlyphProps>) {
  return (
    <span className={styles['signature-glyph']}>
      <span className={styles['signature-name']} style={{ color: typeColor }}>
        {field.name}
      </span>
      <span className={styles['signature-line']} style={{ borderColor: typeColor }} />
    </span>
  );
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
  onCopyProps?: (id: string) => void;
  onUpdate?: (id: string, partial: Partial<Omit<FormField, 'id'>>) => void;
  onBringToFront?: (id: string) => void;
  onSendToBack?: (id: string) => void;
  onToggleLock?: (id: string) => void;
  onContextMenuRequest?: (fieldId: string, x: number, y: number) => void;
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
  onCopyProps,
  onUpdate,
  onBringToFront,
  onSendToBack,
  onToggleLock,
  onContextMenuRequest,
}: Readonly<DraggableFieldProps>) {
  const typeConfig = getFieldTypeConfig(field.fieldType);
  const typeColor = typeConfig.color;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: field.id,
    disabled: !!field.locked,
  });

  const { onHandleMouseDown } = useFieldResize(renderScale, onUpdate ?? (() => {}));

  // Native contextmenu listener — bypasses dnd-kit React-tree interception
  const fieldElRef = useRef<HTMLDivElement | null>(null);
  const isSelectedRef = useRef(isSelected);
  isSelectedRef.current = isSelected;
  const ctxRequestRef = useRef(onContextMenuRequest);
  ctxRequestRef.current = onContextMenuRequest;

  const setRef = (el: HTMLDivElement | null) => {
    fieldElRef.current = el;
    setNodeRef(el);
  };

  useEffect(() => {
    const el = fieldElRef.current;
    if (!el) return;
    const handler = (e: Event) => {
      const me = e as MouseEvent;
      me.preventDefault();
      me.stopPropagation();
      if (!isSelectedRef.current) onSelectSingle(field.id);
      ctxRequestRef.current?.(field.id, me.clientX, me.clientY);
    };
    el.addEventListener('contextmenu', handler);
    return () => el.removeEventListener('contextmenu', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.id, onSelectSingle]);
  const [renaming, setRenaming] = useState(false);

  const canvasPos = pdfToCanvas(field.x, field.y, field.width, field.height, renderScale, pdfPageHeight);

  const delta = groupDragDelta ?? null;
  const isGroupFollower = !!delta && delta.activeId !== field.id && isSelected;
  const fieldTransform = isGroupFollower && delta
    ? `translate(${delta.x}px, ${delta.y}px)`
    : CSS.Translate.toString(transform);

  const borderColor = fieldBorderColor(isSelected, field.locked ?? false, field.required ?? false, typeColor);
  const bgColor = fieldBgColor(isSelected, field.locked ?? false, typeColor);
  const selectionRing = field.required
    ? '0 0 0 2px var(--color-danger), 0 0 8px rgba(220, 38, 38, 0.35)'
    : '0 0 0 2px var(--color-primary), 0 0 8px rgba(102, 165, 173, 0.35)';
  const boxShadow = isSelected ? selectionRing : undefined;

  const style: React.CSSProperties = {
    left: canvasPos.left,
    top: canvasPos.top,
    width: canvasPos.width,
    height: canvasPos.height,
    transform: fieldTransform,
    zIndex: fieldZIndex(isDragging, isGroupFollower, isSelected),
    border: `1.5px solid ${borderColor}`,
    background: bgColor,
    boxShadow,
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (renaming) return;
    if (e.shiftKey) onToggleSelect(field.id);
    else onSelectSingle(field.id);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (field.locked || mode !== 'select') return;
    setRenaming(true);
  };

  const commitRename = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== field.name) onUpdate?.(field.id, { name: trimmed });
    setRenaming(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(field.id);
  };

  return (
    <div
        ref={setRef}
        className={[
          styles['draggable-field'],
          isSelected ? styles.selected : '',
          isDragging ? styles.dragging : '',
          field.locked ? styles.locked : '',
        ].filter(Boolean).join(' ')}
        style={style}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleClick(e as unknown as React.MouseEvent);
          if (e.key === 'Delete' && !field.locked) onDelete(field.id);
        }}
        data-field-id={field.id}
        {...listeners}
        {...attributes}
      >
        {field.fieldType !== 'checkbox' && <div className={styles['field-bg']} />}

        {renaming ? (
          <RenameInput
            defaultValue={field.name}
            onCommit={commitRename}
            onCancel={() => setRenaming(false)}
          />
        ) : field.fieldType === 'checkbox' ? (
          <CheckboxGlyph
            field={field}
            typeColor={typeColor}
            canvasWidth={canvasPos.width}
            canvasHeight={canvasPos.height}
          />
        ) : field.fieldType === 'signature' ? (
          <SignatureGlyph
            field={field}
            typeColor={typeColor}
            canvasWidth={canvasPos.width}
            canvasHeight={canvasPos.height}
          />
        ) : (
          <FieldLabel
            field={field}
            renderScale={renderScale}
            canvasWidth={canvasPos.width}
            canvasHeight={canvasPos.height}
          />
        )}

        {!field.locked && (
          <IconButton
            icon="✕"
            label={`Delete field ${field.name}`}
            variant="danger"
            size="sm"
            onClick={handleDelete}
            className={styles['field-delete-btn']}
          />
        )}

        {isSelected && isSingleSelection && !renaming && (
          <ResizeHandles
            field={field}
            renderScale={renderScale}
            onHandleMouseDown={onHandleMouseDown}
          />
        )}
    </div>
  );
}
