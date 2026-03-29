'use client';

import type { FormField } from '@/types/shared';
import type { HandleDirection } from '@/features/fields/hooks/useFieldResize';
import styles from './ResizeHandles.module.css';

interface ResizeHandlesProps {
  field: FormField;
  renderScale: number;
  onHandleMouseDown: (e: React.MouseEvent, field: FormField, handle: HandleDirection) => void;
}

const HANDLES: HandleDirection[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

export function ResizeHandles({ field, onHandleMouseDown }: ResizeHandlesProps) {
  return (
    <>
      {HANDLES.map((d) => (
        <div
          key={d}
          className={[styles['resize-handle'], styles[`resize-handle-${d}`]].join(' ')}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            e.stopPropagation();
            onHandleMouseDown(e, field, d);
          }}
        />
      ))}
    </>
  );
}
