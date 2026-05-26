'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { usePdfRenderer } from '@/features/canvas';
import type { PageDimensions } from '@/features/canvas';
import { Button } from '@/components/ui/Button/Button';
import { IconButton } from '@/components/ui/IconButton/IconButton';
import { DynamicForm } from '../DynamicForm/DynamicForm';
import type { AcroFormField } from '../../types';
import styles from './FillerLayout.module.css';

const BASE_SCALE = 1.5;
const MIN_ZOOM  = 0.25;
const MAX_ZOOM  = 3.0;
const ZOOM_STEP = 0.1;

// ─────────────────────────────────────────────────────────────────────────────
// FillerPageSection — renders one PDF page + its live-preview overlay canvas
// ─────────────────────────────────────────────────────────────────────────────

interface FillerPageSectionProps {
  pageNum: number;
  pdfDoc: PDFDocumentProxy;
  pageDimensions: PageDimensions;
  renderScale: number;
  fields: AcroFormField[];
  values: Record<string, string>;
}

function FillerPageSection({
  pageNum,
  pdfDoc,
  pageDimensions,
  renderScale,
  fields,
  values,
}: FillerPageSectionProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);

  // Render PDF page onto canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    let cancelled = false;
    let renderTask: RenderTask | null = null;

    const render = async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        if (cancelled) return;
        const viewport = page.getViewport({ scale: renderScale });
        const canvas = canvasRef.current!;
        canvas.width  = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext('2d')!;
        // annotationMode 2 = ENABLE_FORMS — hides native AcroForm widget boxes
        renderTask = page.render({ canvasContext: ctx, viewport, annotationMode: 2 });
        await renderTask.promise;
      } catch (err: unknown) {
        if ((err as { name?: string }).name === 'RenderingCancelledException') return;
      }
    };

    render();
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdfDoc, pageNum, renderScale]);

  // Draw live-preview text overlay
  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;

    const s  = renderScale;
    const ph = pageDimensions.height;
    const w  = Math.round(pageDimensions.width  * s);
    const h  = Math.round(ph * s);
    canvas.width  = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);

    for (const field of fields) {
      const value = values[field.name];
      if (!value) continue;

      const [x1, y1pdf, x2, y2] = field.rect;
      const cx = x1 * s;
      const cy = (ph - y2) * s;
      const cw = (x2 - x1) * s;
      const ch = (y2 - y1pdf) * s;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
      ctx.fillRect(cx, cy, cw, ch);

      const fontSize = field.fontSize > 0 ? field.fontSize * s : Math.max(6, ch * 0.80);
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
  }, [values, fields, renderScale, pageDimensions]);

  return (
    <div id={`filler-page-${pageNum}`} className={styles['page-section']}>
      <div className={styles['canvas-wrapper']}>
        <canvas ref={canvasRef} className={styles['pdf-canvas']} />
        <canvas ref={overlayRef} className={styles['field-overlay']} aria-hidden="true" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FillerLayout — two-panel layout: form LEFT, cascading PDF RIGHT
// ─────────────────────────────────────────────────────────────────────────────

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

  const renderer    = usePdfRenderer(pdfBytes, BASE_SCALE * zoom);
  const pdfPanelRef = useRef<HTMLDivElement>(null);

  // Ctrl+Scroll zoom — non-passive so we can preventDefault
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

  const { pdfDoc, totalPages, pageDimensionsMap, renderScale, isLoading, error } = renderer;
  const dimensionsReady =
    Object.keys(pageDimensionsMap).length === totalPages && totalPages > 0;

  const pageNums = dimensionsReady
    ? Array.from({ length: totalPages }, (_, i) => i + 1)
    : [];

  return (
    <div className={styles['filler-layout']}>
      {/* Header */}
      <div className={styles['layout-header']}>
        <span className={styles['field-count']}>
          {fields.length} campo{fields.length !== 1 ? 's' : ''} detectado{fields.length !== 1 ? 's' : ''}
        </span>

        <div className={styles['zoom-controls']}>
          <IconButton icon="−" label="Alejar"  onClick={zoomOut} disabled={zoom <= MIN_ZOOM} />
          <span className={styles['zoom-label']}>{Math.round(zoom * 100)}%</span>
          <IconButton icon="+" label="Acercar" onClick={zoomIn}  disabled={zoom >= MAX_ZOOM} />
        </div>

        <Button variant="ghost" size="sm" onClick={onReset} disabled={generating}>
          Subir otro PDF
        </Button>
      </div>

      {/* Two-panel body */}
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

        {/* Right: cascading PDF pages */}
        <div ref={pdfPanelRef} className={styles['pdf-panel']}>
          {isLoading && <div className={styles['pdf-loading']}>Cargando previsualización…</div>}
          {error    && <div className={styles['pdf-error']}>{error}</div>}

          {pdfDoc && dimensionsReady && pageNums.map((pageNum) => {
            const pageDimensions = pageDimensionsMap[pageNum];
            if (!pageDimensions) return null;
            return (
              <FillerPageSection
                key={pageNum}
                pageNum={pageNum}
                pdfDoc={pdfDoc}
                pageDimensions={pageDimensions}
                renderScale={renderScale}
                fields={fields.filter((f) => f.page === pageNum)}
                values={values}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
