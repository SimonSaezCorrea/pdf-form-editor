'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { usePdfRenderer } from '@/features/canvas';
import type { PageDimensions } from '@/features/canvas';
import { Button } from '@/components/ui/Button/Button';
import { IconButton } from '@/components/ui/IconButton/IconButton';
import { ThumbnailStrip } from '@/features/canvas/components/ThumbnailStrip/ThumbnailStrip';
import { DynamicForm } from '../DynamicForm/DynamicForm';
import type { AcroFormField } from '../../types';
import styles from './FillerLayout.module.css';

const BASE_SCALE = 1.5;
const MIN_ZOOM  = 0.25;
const MAX_ZOOM  = 3;
const ZOOM_STEP = 0.1;

const OVERLAY_FONT = 'Helvetica, Arial, sans-serif';
const LINE_HEIGHT_RATIO = 1.2;

/**
 * Word-wrap `text` to `maxWidth` (canvas px) at the font currently set on `ctx`.
 * Honors explicit "\n" breaks; long words that exceed the width are broken by
 * character (mirrors how a PDF multiline field reflows long tokens).
 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
      // Break a single word that is itself wider than the box.
      while (ctx.measureText(line).width > maxWidth && line.length > 1) {
        let cut = line.length - 1;
        while (cut > 1 && ctx.measureText(line.slice(0, cut)).width > maxWidth) cut--;
        lines.push(line.slice(0, cut));
        line = line.slice(cut);
      }
    }
    lines.push(line);
  }
  return lines;
}

/**
 * Lay out text for the preview overlay, mirroring how pdf-lib renders the field
 * on download:
 *  - fixed size (DA size > 0): use it as-is; multiline wraps, single line clips.
 *  - auto-size (DA size 0): shrink the font until the (wrapped) text fits the box.
 */
function layoutOverlayText(
  ctx: CanvasRenderingContext2D,
  text: string,
  opts: { maxWidth: number; maxHeight: number; basePx: number; multiline: boolean; autoFit: boolean },
): { fontPx: number; lines: string[] } {
  const { maxWidth, maxHeight, basePx, multiline, autoFit } = opts;
  const setFont = (px: number) => { ctx.font = `${px}px ${OVERLAY_FONT}`; };

  if (!autoFit) {
    setFont(basePx);
    return { fontPx: basePx, lines: multiline ? wrapText(ctx, text, maxWidth) : [text] };
  }

  // Auto-size: largest font (starting near box height) whose content fits.
  for (let px = Math.min(basePx, maxHeight); px > 6; px -= 0.5) {
    setFont(px);
    const lines = multiline ? wrapText(ctx, text, maxWidth) : [text];
    const widthFits = lines.every((l) => ctx.measureText(l).width <= maxWidth);
    const heightFits = lines.length * px * LINE_HEIGHT_RATIO <= maxHeight;
    if (widthFits && (heightFits || !multiline)) return { fontPx: px, lines };
  }
  setFont(6);
  return { fontPx: 6, lines: multiline ? wrapText(ctx, text, maxWidth) : [text] };
}

// ─────────────────────────────────────────────────────────────────────────────
// FillerPageSection — one PDF page + live-preview overlay + click targets
// ─────────────────────────────────────────────────────────────────────────────

/** One widget placement of a field on a given page (same field may appear N times). */
type FieldPlacement = { field: AcroFormField; rect: [number, number, number, number] };

interface FillerPageSectionProps {
  pageNum: number;
  pdfDoc: PDFDocumentProxy;
  pageDimensions: PageDimensions;
  renderScale: number;
  placements: FieldPlacement[];
  values: Record<string, string>;
  jumpedId: string | null;
  onFocusField: (name: string) => void;
}

function FillerPageSection({
  pageNum,
  pdfDoc,
  pageDimensions,
  renderScale,
  placements,
  values,
  jumpedId,
  onFocusField,
}: Readonly<FillerPageSectionProps>) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);

  // Render PDF page
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
        // annotationMode: 0 = DISABLE — no native annotation boxes on canvas
        // (the live-preview overlay draws values). Avoids stray widget/square borders.
        renderTask = page.render({ canvasContext: ctx, viewport, annotationMode: 0 });
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

    // Async signature image draws must not paint onto a later (re-run) frame.
    let cancelled = false;

    for (const { field, rect } of placements) {
      const value = values[field.name];

      const [x1, y1pdf, x2, y2] = rect;
      const cx = x1 * s;
      const cy = (ph - y2) * s;
      const cw = (x2 - x1) * s;
      const ch = (y2 - y1pdf) * s;

      // Signature: a baseline guide is always drawn (so the user sees where to
      // sign); the captured PNG is layered on top once drawn. The line lives only
      // in this preview — it is NOT baked into the PDF in the editor.
      if (field.type === 'signature') {
        const lineY = cy + ch * 0.8;
        ctx.strokeStyle = 'rgba(90, 90, 90, 0.7)';
        ctx.lineWidth = Math.max(1, ch * 0.012);
        ctx.beginPath();
        ctx.moveTo(cx + cw * 0.06, lineY);
        ctx.lineTo(cx + cw * 0.94, lineY);
        ctx.stroke();
        if (value) {
          const img = new Image();
          img.onload = () => {
            if (cancelled) return;
            const scale = Math.min(cw / img.width, ch / img.height);
            const dw = img.width * scale;
            const dh = img.height * scale;
            ctx.drawImage(img, cx + (cw - dw) / 2, cy + (ch - dh) / 2, dw, dh);
          };
          img.src = value;
        }
        continue;
      }

      if (!value) continue;

      if (field.type === 'checkbox') {
        // Centered checkmark sized to the box.
        const mark = Math.min(cw, ch) * 0.8;
        ctx.font = `${mark}px Helvetica, Arial, sans-serif`;
        ctx.fillStyle = '#1a1a1a';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.fillText('✓', cx + cw / 2, cy + ch / 2);
        ctx.textAlign = 'start';
        continue;
      }

      ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
      ctx.fillRect(cx, cy, cw, ch);

      const multiline = field.multiline ?? false;
      const autoFit = field.fontSize <= 0; // DA size 0 = AcroForm auto-size sentinel
      const { fontPx, lines } = layoutOverlayText(ctx, value, {
        maxWidth: cw - 8,
        maxHeight: ch - 4,
        basePx: autoFit ? ch : field.fontSize * s,
        multiline,
        autoFit,
      });

      ctx.fillStyle = '#1a1a1a';
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx + 2, cy, cw - 4, ch);
      ctx.clip();
      if (lines.length > 1 || multiline) {
        ctx.textBaseline = 'top';
        const lineHeight = fontPx * LINE_HEIGHT_RATIO;
        lines.forEach((line, i) => ctx.fillText(line, cx + 4, cy + 2 + i * lineHeight));
      } else {
        ctx.textBaseline = 'middle';
        ctx.fillText(lines[0], cx + 4, cy + ch / 2);
      }
      ctx.restore();
    }

    return () => {
      cancelled = true;
    };
  }, [values, placements, renderScale, pageDimensions]);

  return (
    <div id={`filler-page-${pageNum}`} className={styles['page-section']}>
      <div className={styles['canvas-wrapper']}>
        <canvas ref={canvasRef} className={styles['pdf-canvas']} />
        <canvas ref={overlayRef} className={styles['field-overlay']} />
        {/* Click targets: transparent buttons over each widget placement */}
        {placements.map(({ field, rect }, i) => {
          const [x1, y1pdf, x2, y2] = rect;
          const s  = renderScale;
          const ph = pageDimensions.height;
          const left   = x1 * s;
          const top    = (ph - y2) * s;
          const width  = (x2 - x1) * s;
          const height = (y2 - y1pdf) * s;
          const isJumped = field.name === jumpedId;
          return (
            <button
              key={`${field.name}-${i}`}
              type="button"
              data-field={field.name}
              className={[
                styles['pdf-field-target'],
                isJumped ? styles['pdf-field-target--jumped'] : '',
              ].filter(Boolean).join(' ')}
              style={{ left, top, width, height }}
              onClick={() => onFocusField(field.name)}
              aria-label={`Ir al campo: ${field.label ?? field.name}`}
            />
          );
        })}
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
  // T065 state from FillerMode
  collapsed: Set<string>;
  lastSaved: number | null;
  resetConfirm: boolean;
  errors: Set<string>;
  jumpedId: string | null;
  onToggleCollapse: (group: string) => void;
  onJumpToNextEmpty: (fromId: string | null) => void;
  onFocusField: (name: string) => void;
  onCancelReset: () => void;
  onConfirmReset: () => void;
  onImportMetadata: () => void;
}

export function FillerLayout({
  pdfBytes,
  fields,
  values,
  generating,
  onValueChange,
  collapsed,
  lastSaved,
  resetConfirm,
  errors,
  jumpedId,
  onToggleCollapse,
  onJumpToNextEmpty,
  onFocusField,
  onCancelReset,
  onConfirmReset,
  onImportMetadata,
}: Readonly<FillerLayoutProps>) {
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [thumbnailsVisible, setThumbnailsVisible] = useState(true);
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

  // PDF auto-scroll when jumpedId changes (T072)
  useEffect(() => {
    if (!jumpedId || !pdfPanelRef.current) return;
    const btn = pdfPanelRef.current.querySelector(`[data-field="${jumpedId}"]`);
    btn?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [jumpedId]);

  // Track which page is most visible to highlight it in the thumbnail strip
  const handlePanelScroll = useCallback(() => {
    const container = pdfPanelRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    let bestPage = 1;
    let bestOverlap = -1;
    for (const el of container.querySelectorAll('[id^="filler-page-"]')) {
      const r = el.getBoundingClientRect();
      const overlap = Math.min(r.bottom, cRect.bottom) - Math.max(r.top, cRect.top);
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestPage = Number(el.id.replace('filler-page-', ''));
      }
    }
    setCurrentPage((prev) => (prev === bestPage ? prev : bestPage));
  }, []);

  const handlePageSelect = useCallback((page: number) => {
    setCurrentPage(page);
    document.getElementById(`filler-page-${page}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const { pdfDoc, totalPages, pageDimensionsMap, renderScale, isLoading, error } = renderer;
  const dimensionsReady =
    Object.keys(pageDimensionsMap).length === totalPages && totalPages > 0;

  const pageNums = dimensionsReady
    ? Array.from({ length: totalPages }, (_, i) => i + 1)
    : [];

  return (
    <div className={styles['filler-layout']}>
      {/* Header — 3-column toolbar (left info · center zoom · right) mirrors editor */}
      <div className={styles['layout-header']}>
        <div className={styles['header-left']} />

        <div className={styles['zoom-controls']}>
          <IconButton icon="−" label="Alejar"  onClick={zoomOut} disabled={zoom <= MIN_ZOOM} />
          <span className={styles['zoom-label']}>{Math.round(zoom * 100)}%</span>
          <IconButton icon="+" label="Acercar" onClick={zoomIn}  disabled={zoom >= MAX_ZOOM} />
        </div>

        <div className={styles['header-right']}>
          {pdfDoc && totalPages > 1 && (
            <Button variant="navbar" onClick={() => setThumbnailsVisible((v) => !v)}>
              {thumbnailsVisible ? 'Ocultar páginas' : 'Ver páginas'}
            </Button>
          )}
        </div>
      </div>

      {/* Body: thumbnails · form · cascading PDF */}
      <div className={styles['layout-body']}>
        {pdfDoc && totalPages > 1 && (
          <ThumbnailStrip
            pdfDoc={pdfDoc}
            totalPages={totalPages}
            currentPage={currentPage}
            onPageSelect={handlePageSelect}
            hidden={!thumbnailsVisible}
          />
        )}

        {/* Form */}
        <div className={styles['form-panel']}>
          <DynamicForm
            fields={fields}
            values={values}
            onValueChange={onValueChange}
            generating={generating}
            collapsed={collapsed}
            lastSaved={lastSaved}
            resetConfirm={resetConfirm}
            errors={errors}
            jumpedId={jumpedId}
            onToggleCollapse={onToggleCollapse}
            onJumpToNextEmpty={onJumpToNextEmpty}
            onCancelReset={onCancelReset}
            onConfirmReset={onConfirmReset}
            onImportMetadata={onImportMetadata}
          />
        </div>

        {/* Right: cascading PDF pages */}
        <div ref={pdfPanelRef} className={styles['pdf-panel']} onScroll={handlePanelScroll}>
          {isLoading && <div className={styles['pdf-loading']}>Cargando previsualización…</div>}
          {error    && <div className={styles['pdf-error']}>{error}</div>}

          {pdfDoc && dimensionsReady && pageNums.map((pageNum) => {
            const pageDimensions = pageDimensionsMap[pageNum];
            if (!pageDimensions) return null;
            // One field can have several widgets (shared name) on this page or
            // across pages — expand to per-placement entries for this page.
            const placements: FieldPlacement[] = fields.flatMap((f) =>
              (f.placements ?? [{ page: f.page, rect: f.rect }])
                .filter((p) => p.page === pageNum)
                .map((p) => ({ field: f, rect: p.rect })),
            );
            return (
              <FillerPageSection
                key={pageNum}
                pageNum={pageNum}
                pdfDoc={pdfDoc}
                pageDimensions={pageDimensions}
                renderScale={renderScale}
                placements={placements}
                values={values}
                jumpedId={jumpedId}
                onFocusField={onFocusField}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
