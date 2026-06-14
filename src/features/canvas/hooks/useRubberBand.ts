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
  onOuterPointerDown: (e: React.PointerEvent<HTMLDivElement>, overlayEl: HTMLElement | null) => void;
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
  const pointerIdRef = useRef(-1);
  const [drawTick, setDrawTick] = useState(0);

  const cleanup = useCallback((captureEl: HTMLElement) => {
    if (pointerIdRef.current !== -1) {
      captureEl.releasePointerCapture(pointerIdRef.current);
      pointerIdRef.current = -1;
    }
    setIsDrawing(false);
  }, []);

  function startRubberBand(
    e: React.PointerEvent,
    captureEl: HTMLElement,
    coordRef: HTMLElement,
  ) {
    const rect = coordRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    startRef.current = { x, y };
    endRef.current = { x, y };
    setIsDrawing(true);
    pointerIdRef.current = e.pointerId;
    captureEl.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      const r = coordRef.getBoundingClientRect();
      endRef.current = { x: ev.clientX - r.left, y: ev.clientY - r.top };
      setDrawTick(n => n + 1);
    };

    const onUp = () => {
      cleanup(captureEl);
      captureEl.removeEventListener('pointermove', onMove);
      captureEl.removeEventListener('pointerup', onUp);

      if (!pageDimensions) { onSelectionComplete([]); return; }

      const sx = startRef.current.x;
      const sy = startRef.current.y;
      const ex = endRef.current.x;
      const ey = endRef.current.y;

      const selRect: Rect = {
        left: Math.min(sx, ex), top: Math.min(sy, ey),
        right: Math.max(sx, ex), bottom: Math.max(sy, ey),
      };

      if (selRect.right - selRect.left < 2 && selRect.bottom - selRect.top < 2) {
        onSelectionComplete([]);
        return;
      }

      const intersecting = fields
        .filter((f) => {
          const cp = pdfToCanvas(f.x, f.y, f.width, f.height, renderScale, pageDimensions.height);
          const fieldRect: Rect = {
            left: cp.left, top: cp.top,
            right: cp.left + cp.width, bottom: cp.top + cp.height,
          };
          return intersectsRect(selRect, fieldRect);
        })
        .map((f) => f.id);

      justSelectedRef.current = true;
      onSelectionComplete(intersecting);
    };

    captureEl.addEventListener('pointermove', onMove);
    captureEl.addEventListener('pointerup', onUp);
  }

  const onOverlayPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest('[data-field-id]')) return;
      startRubberBand(e, e.currentTarget, e.currentTarget);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fields, pageDimensions, renderScale, onSelectionComplete, cleanup],
  );

  const onOuterPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, overlayEl: HTMLElement | null) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest('[data-field-id]')) return;
      if (!overlayEl) return;
      // Don't trigger if click is already inside the overlay (it handles itself)
      const r = overlayEl.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right &&
          e.clientY >= r.top  && e.clientY <= r.bottom) return;
      startRubberBand(e, e.currentTarget, overlayEl);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fields, pageDimensions, renderScale, onSelectionComplete, cleanup],
  );

  const sx = startRef.current.x;
  const sy = startRef.current.y;
  const ex = endRef.current.x;
  const ey = endRef.current.y;

  // drawTick drives re-renders when rubber band moves (refs don't trigger renders)
  const rubberBandStyle: React.CSSProperties = isDrawing && drawTick >= 0
    ? {
        left: Math.min(sx, ex), top: Math.min(sy, ey),
        width: Math.abs(ex - sx), height: Math.abs(ey - sy),
      }
    : {};

  const consumeJustSelected = useCallback(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return true;
    }
    return false;
  }, []);

  return { isDrawing, rubberBandStyle, onOverlayPointerDown, onOuterPointerDown, consumeJustSelected };
}
