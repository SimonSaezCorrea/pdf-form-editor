'use client';

import { useRef, useEffect, useCallback } from 'react';
import styles from './SignaturePad.module.css';

interface SignaturePadProps {
  /** Current value as a PNG data URL ('' when empty). */
  value: string;
  /** Emits the PNG data URL on each stroke end, or '' when cleared. */
  onChange: (dataUrl: string) => void;
  disabled?: boolean;
  /** Field rect [x1, y1, x2, y2] in PDF points — used to match the pad aspect ratio. */
  rect: [number, number, number, number];
}

const DISPLAY_WIDTH = 280;
const MIN_HEIGHT = 90;
const MAX_HEIGHT = 200;

export function SignaturePad({ value, onChange, disabled, rect }: Readonly<SignaturePadProps>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastEmittedRef = useRef<string>('');

  const [w, h] = (() => {
    const rw = Math.max(1, rect[2] - rect[0]);
    const rh = Math.max(1, rect[3] - rect[1]);
    const height = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, (DISPLAY_WIDTH * rh) / rw));
    return [DISPLAY_WIDTH, Math.round(height)];
  })();

  const ctxStyle = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1a1a1a';
  }, []);

  // Load an externally-provided value (e.g. restored autosave) onto the canvas.
  // Skip when the value is the one we just emitted to avoid clobbering live strokes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!value) {
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    if (value === lastEmittedRef.current) return;
    const img = new Image();
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = value;
  }, [value]);

  const pointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * canvas.width,
      y: ((e.clientY - r.top) / r.height) * canvas.height,
    };
  };

  const handleDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    drawingRef.current = true;
    canvasRef.current!.setPointerCapture(e.pointerId);
    ctxStyle(ctx);
    const { x, y } = pointerPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = pointerPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    lastEmittedRef.current = dataUrl;
    onChange(dataUrl);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    lastEmittedRef.current = '';
    onChange('');
  };

  return (
    <div className={styles['signature-pad']}>
      <canvas
        ref={canvasRef}
        width={w}
        height={h}
        className={[styles.canvas, disabled ? styles.disabled : ''].filter(Boolean).join(' ')}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerLeave={handleUp}
      />
      <div className={styles.actions}>
        <span className={styles.hint}>Dibuja tu firma aquí</span>
        <button type="button" className={styles['clear-btn']} onClick={clear} disabled={disabled || !value}>
          Borrar
        </button>
      </div>
    </div>
  );
}
