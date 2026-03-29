'use client';

import { useRef } from 'react';
import type { FormField } from '@/types/shared';
import { MIN_FIELD_WIDTH_PX, MIN_FIELD_HEIGHT_PX } from '@/features/pdf/utils/fieldName';

export type HandleDirection = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface DragState {
  fieldId: string;
  handle: HandleDirection;
  startMouseX: number;
  startMouseY: number;
  startX: number;
  startY: number;
  startW: number;
  startH: number;
  aspectRatio: number;
}

/**
 * Hook that provides a mousedown handler for resize handles.
 *
 * Uses native document mouse events (NOT @dnd-kit) so that resize drags don't
 * conflict with the existing @dnd-kit field-move interaction.
 */
export function useFieldResize(
  renderScale: number,
  onUpdate: (id: string, partial: Partial<Omit<FormField, 'id'>>) => void,
): { onHandleMouseDown: (e: React.MouseEvent, field: FormField, handle: HandleDirection) => void } {
  const dragRef = useRef<DragState | null>(null);

  const onHandleMouseDown = (
    e: React.MouseEvent,
    field: FormField,
    handle: HandleDirection,
  ) => {
    e.stopPropagation();
    e.preventDefault();

    dragRef.current = {
      fieldId: field.id,
      handle,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: field.x,
      startY: field.y,
      startW: field.width,
      startH: field.height,
      aspectRatio: field.width / field.height,
    };

    const onMouseMove = (ev: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      let dx = (ev.clientX - drag.startMouseX) / renderScale;
      let dy = (ev.clientY - drag.startMouseY) / renderScale;

      if (ev.shiftKey && isCorner(drag.handle)) {
        if (Math.abs(dx) >= Math.abs(dy)) {
          dy = dx / drag.aspectRatio;
        } else {
          dx = dy * drag.aspectRatio;
        }
      }

      let x = drag.startX;
      let y = drag.startY;
      let w = drag.startW;
      let h = drag.startH;

      switch (drag.handle) {
        case 'n':  h -= dy; break;
        case 's':  y -= dy; h += dy; break;
        case 'e':  w += dx; break;
        case 'w':  x += dx; w -= dx; break;
        case 'ne': w += dx; h -= dy; break;
        case 'nw': x += dx; w -= dx; h -= dy; break;
        case 'se': w += dx; y -= dy; h += dy; break;
        case 'sw': x += dx; w -= dx; y -= dy; h += dy; break;
      }

      const minW = MIN_FIELD_WIDTH_PX / renderScale;
      const minH = MIN_FIELD_HEIGHT_PX / renderScale;

      if (w < minW) {
        if (drag.handle === 'w' || drag.handle === 'nw' || drag.handle === 'sw') {
          x = drag.startX + drag.startW - minW;
        }
        w = minW;
      }

      if (h < minH) {
        if (drag.handle === 'n' || drag.handle === 'nw' || drag.handle === 'ne') {
          h = minH;
        } else if (drag.handle === 's' || drag.handle === 'sw' || drag.handle === 'se') {
          y = drag.startY + drag.startH - minH;
          h = minH;
        }
      }

      onUpdate(drag.fieldId, { x, y, width: w, height: h });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      dragRef.current = null;
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return { onHandleMouseDown };
}

function isCorner(handle: HandleDirection): boolean {
  return handle === 'nw' || handle === 'ne' || handle === 'se' || handle === 'sw';
}
