'use client';

import { useState, useRef, useCallback } from 'react';
import type { FormField } from '@/types/shared';
import { pdfToCanvas } from '@/features/pdf/utils/coordinates';

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Returns true if rectangles a and b overlap (touching edges do NOT count as overlap) */
export function intersectsRect(a: Rect, b: Rect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

interface UseRubberBandOptions {
  fields: FormField[];
  pageDimensions: { width: number; height: number } | null;
  renderScale: number;
  onSelectionComplete: (ids: string[]) => void;
}

interface RubberBandResult {
  isDrawing: boolean;
  rubberBandStyle: React.CSSProperties;
  onOverlayPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  consumeJustSelected: () => boolean;
}

export function useRubberBand({
  fields,
  pageDimensions,
  renderScale,
  onSelectionComplete,
}: UseRubberBandOptions): RubberBandResult {
  const [isDrawing, setIsDrawing] = useState(false);
  const startRef = useRef({ x: 0, y: 0 });
  const endRef = useRef({ x: 0, y: 0 });
  const justSelectedRef = useRef(false);
  const [, forceRender] = useState(0);

  const cleanup = useCallback(
    (overlayEl: HTMLElement) => {
      overlayEl.releasePointerCapture;
      setIsDrawing(false);
    },
    [],
  );

  const onOverlayPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest('[data-field-id]')) return;

      const overlay = e.currentTarget;
      const rect = overlay.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      startRef.current = { x, y };
      endRef.current = { x, y };
      setIsDrawing(true);

      overlay.setPointerCapture(e.pointerId);

      const onMove = (ev: PointerEvent) => {
        const r = overlay.getBoundingClientRect();
        endRef.current = { x: ev.clientX - r.left, y: ev.clientY - r.top };
        forceRender((n) => n + 1);
      };

      const onUp = () => {
        cleanup(overlay);

        if (!pageDimensions) {
          onSelectionComplete([]);
          overlay.removeEventListener('pointermove', onMove);
          overlay.removeEventListener('pointerup', onUp);
          return;
        }

        const sx = startRef.current.x;
        const sy = startRef.current.y;
        const ex = endRef.current.x;
        const ey = endRef.current.y;

        const selRect: Rect = {
          left: Math.min(sx, ex),
          top: Math.min(sy, ey),
          right: Math.max(sx, ex),
          bottom: Math.max(sy, ey),
        };

        if (selRect.right - selRect.left < 2 && selRect.bottom - selRect.top < 2) {
          onSelectionComplete([]);
          overlay.removeEventListener('pointermove', onMove);
          overlay.removeEventListener('pointerup', onUp);
          return;
        }

        const intersecting = fields
          .filter((f) => {
            const cp = pdfToCanvas(f.x, f.y, f.width, f.height, renderScale, pageDimensions.height);
            const fieldRect: Rect = {
              left: cp.left,
              top: cp.top,
              right: cp.left + cp.width,
              bottom: cp.top + cp.height,
            };
            return intersectsRect(selRect, fieldRect);
          })
          .map((f) => f.id);

        justSelectedRef.current = true;
        onSelectionComplete(intersecting);
        overlay.removeEventListener('pointermove', onMove);
        overlay.removeEventListener('pointerup', onUp);
      };

      overlay.addEventListener('pointermove', onMove);
      overlay.addEventListener('pointerup', onUp);
    },
    [fields, pageDimensions, renderScale, onSelectionComplete, cleanup],
  );

  const sx = startRef.current.x;
  const sy = startRef.current.y;
  const ex = endRef.current.x;
  const ey = endRef.current.y;

  const rubberBandStyle: React.CSSProperties = isDrawing
    ? {
        left: Math.min(sx, ex),
        top: Math.min(sy, ey),
        width: Math.abs(ex - sx),
        height: Math.abs(ey - sy),
      }
    : {};

  const consumeJustSelected = useCallback(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return true;
    }
    return false;
  }, []);

  return { isDrawing, rubberBandStyle, onOverlayPointerDown, consumeJustSelected };
}
