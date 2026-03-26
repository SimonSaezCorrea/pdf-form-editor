import { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';

export interface PageDimensions {
  /** Page width in PDF points at scale 1 */
  width: number;
  /** Page height in PDF points at scale 1 */
  height: number;
}

export interface PdfRenderer {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  totalPages: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageDimensions: PageDimensions | null;
  renderScale: number;
  isLoading: boolean;
  error: string | null;
}

export function usePdfRenderer(
  pdfBytes: ArrayBuffer | null,
  renderScale = 1.5,
): PdfRenderer {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageDimensions, setPageDimensions] = useState<PageDimensions | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);

  // Load PDF document when bytes change
  useEffect(() => {
    if (!pdfBytes) {
      setPdfDoc(null);
      setTotalPages(0);
      setCurrentPage(1);
      setPageDimensions(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    pdfjs
      .getDocument({ data: pdfBytes.slice(0) })
      .promise.then((doc) => {
        if (cancelled) { doc.destroy(); return; }
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(1);
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            'Failed to load PDF. The file may be corrupted or password-protected.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [pdfBytes]);

  // Render current page whenever doc, page, or scale changes
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    // Cancel any in-progress render
    renderTaskRef.current?.cancel();
    renderTaskRef.current = null;

    let cancelled = false;
    setIsLoading(true);

    const render = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (cancelled) return;

        const viewport = page.getViewport({ scale: renderScale });
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Store natural (scale=1) dimensions for coordinate conversion
        const natural = page.getViewport({ scale: 1 });
        setPageDimensions({ width: natural.width, height: natural.height });

        const task = page.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = task;
        await task.promise;
      } catch (err: unknown) {
        // RenderingCancelledException is expected on cleanup
        if ((err as { name?: string }).name === 'RenderingCancelledException') return;
        if (!cancelled) {
          setError('Failed to render page.');
          console.error(err);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    render();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
    };
  }, [pdfDoc, currentPage, renderScale]);

  return {
    canvasRef,
    totalPages,
    currentPage,
    setCurrentPage,
    pageDimensions,
    renderScale,
    isLoading,
    error,
  };
}
