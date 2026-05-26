'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { usePdfRenderer } from '@/features/canvas';
import { Button } from '@/components/ui/Button/Button';
import { IconButton } from '@/components/ui/IconButton/IconButton';
import { DynamicForm } from '../DynamicForm/DynamicForm';
import type { AcroFormField } from '../../types';
import styles from './FillerLayout.module.css';

const BASE_SCALE = 1.5;
const MIN_ZOOM  = 0.25;
const MAX_ZOOM  = 3.0;
const ZOOM_STEP = 0.1;

interface FillerLayoutProps {
  pdfBytes: ArrayBuffer;
  fields: AcroFormField[];
  values: Record<string, string>;
  generating: boolean;
  onValueChange: (name: string, value: string) => void;
  onGeneratePdf: () => void;
  onReset: () => void;
}

export function FillerLayout({
  pdfBytes,
  fields,
  values,
  generating,
  onValueChange,
  onGeneratePdf,
  onReset,
}: FillerLayoutProps) {
  const [zoom, setZoom] = useState(1);
  const zoomOut = useCallback(() =>
    setZoom((z) => Math.max(MIN_ZOOM, Math.round((z - ZOOM_STEP) * 100) / 100)), []);
  const zoomIn  = useCallback(() =>
    setZoom((z) => Math.min(MAX_ZOOM, Math.round((z + ZOOM_STEP) * 100) / 100)), []);

  const renderer = usePdfRenderer(pdfBytes, BASE_SCALE * zoom);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const overlayRef  = useRef<HTMLCanvasElement>(null);
  const pdfPanelRef = useRef<HTMLDivElement>(null);

  // Render current PDF page onto the canvas (mirrors PdfViewer logic)
  useEffect(() => {
    const canvas = canvasRef.current;
    const { pdfDoc, currentPage, renderScale } = renderer;
    if (!canvas || !pdfDoc) return;

    let cancelled = false;
    // RenderTask has both .promise and .cancel()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renderTask: any = null;

    pdfDoc.getPage(currentPage).then((page) => {
      if (cancelled) return;
      const viewport = page.getViewport({ scale: renderScale });
      canvas.width  = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx || cancelled) return;
      // annotationMode 2 = ENABLE_FORMS — hides native AcroForm widget boxes
      renderTask = page.render({ canvasContext: ctx, viewport, annotationMode: 2 });
      renderTask.promise.catch(() => { /* cancelled — suppress unhandled rejection */ });
    });

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [renderer.pdfDoc, renderer.currentPage, renderer.renderScale]);

  // Ctrl+Scroll zoom — non-passive so we can preventDefault (same as editor)
  useEffect(() => {
    const el = pdfPanelRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      if (e.deltaY < 0) zoomIn(); else zoomOut();
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [zoomIn, zoomOut]);

  // Redraw text overlay whenever values, page or dimensions change.
  // Using a canvas overlay (same pixel dimensions as the PDF canvas) avoids the
  // CSS-scale mismatch: the browser applies max-width scaling identically to both
  // canvases, so canvas-pixel positions always match visually.
  useEffect(() => {
    const canvas = overlayRef.current;
    const pd = renderer.pageDimensions;
    if (!canvas || !pd) return;

    const s = renderer.renderScale;
    const w = Math.round(pd.width * s);
    const h = Math.round(pd.height * s);
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);

    for (const field of fields) {
      if (field.page !== renderer.currentPage) continue;
      const value = values[field.name];
      if (!value) continue;

      const [x1, , x2, y2] = field.rect;
      const y1pdf = field.rect[1];
      const cx = x1 * s;
      const cy = (pd.height - y2) * s;
      const cw = (x2 - x1) * s;
      const ch = (y2 - y1pdf) * s;

      // Subtle white fill so text is readable over any PDF background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
      ctx.fillRect(cx, cy, cw, ch);

      // Use the DA font size (in PDF points) scaled to canvas pixels.
      // If fontSize===0 the field is auto-sized: pdf-lib fills ~80% of field height.
      const fontSize = field.fontSize > 0
        ? field.fontSize * s
        : Math.max(6, ch * 0.80);
      ctx.font = `${fontSize}px Helvetica, Arial, sans-serif`;
      ctx.fillStyle = '#1a1a1a';
      ctx.textBaseline = 'middle';

      ctx.save();
      ctx.beginPath();
      ctx.rect(cx + 2, cy, cw - 4, ch);
      ctx.clip();
      ctx.fillText(value, cx + 4, cy + ch / 2);
      ctx.restore();
    }
  }, [values, fields, renderer.currentPage, renderer.pageDimensions, renderer.renderScale]);

  return (
    <div className={styles['filler-layout']}>
      {/* Header */}
      <div className={styles['layout-header']}>
        <span className={styles['field-count']}>
          {fields.length} campo{fields.length !== 1 ? 's' : ''} detectado{fields.length !== 1 ? 's' : ''}
        </span>

        {/* Zoom controls */}
        <div className={styles['zoom-controls']}>
          <IconButton icon="−" label="Alejar" onClick={zoomOut} disabled={zoom <= MIN_ZOOM} />
          <span className={styles['zoom-label']}>{Math.round(zoom * 100)}%</span>
          <IconButton icon="+" label="Acercar" onClick={zoomIn}  disabled={zoom >= MAX_ZOOM} />
        </div>

        <Button variant="ghost" size="sm" onClick={onReset} disabled={generating}>
          Subir otro PDF
        </Button>
      </div>

      {/* Two-panel body: form LEFT, pdf RIGHT */}
      <div className={styles['layout-body']}>
        {/* Left: form fields */}
        <div className={styles['form-panel']}>
          <DynamicForm
            fields={fields}
            values={values}
            onValueChange={onValueChange}
            onSubmit={onGeneratePdf}
            generating={generating}
          />
        </div>

        {/* Right: PDF preview */}
        <div ref={pdfPanelRef} className={styles['pdf-panel']}>
          {renderer.isLoading && (
            <div className={styles['pdf-loading']}>Cargando previsualización…</div>
          )}
          {renderer.error && (
            <div className={styles['pdf-error']}>{renderer.error}</div>
          )}

          {/* Canvas + live-preview overlay (second canvas, same pixel dimensions) */}
          <div className={styles['canvas-wrapper']}>
            <canvas ref={canvasRef} className={styles['pdf-canvas']} />
            <canvas ref={overlayRef} className={styles['field-overlay']} aria-hidden="true" />
          </div>

          {renderer.totalPages > 1 && (
            <div className={styles['page-nav']}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => renderer.setCurrentPage(renderer.currentPage - 1)}
                disabled={renderer.currentPage <= 1}
                aria-label="Página anterior"
              >
                ‹
              </Button>
              <span className={styles['page-label']}>
                {renderer.currentPage} / {renderer.totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => renderer.setCurrentPage(renderer.currentPage + 1)}
                disabled={renderer.currentPage >= renderer.totalPages}
                aria-label="Página siguiente"
              >
                ›
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
