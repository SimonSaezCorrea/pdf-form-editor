'use client';

import { useEffect, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';


export interface PageDimensions {
  /** Page width in PDF points at scale 1 */
  width: number;
  /** Page height in PDF points at scale 1 */
  height: number;
}

export interface PdfRenderer {
  /** The loaded pdfjs document — null until a PDF is loaded. Needed by ThumbnailStrip. */
  pdfDoc: PDFDocumentProxy | null;
  totalPages: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  /** Current page dimensions (alias for pageDimensionsMap[currentPage]) */
  pageDimensions: PageDimensions | null;
  /** Dimensions for all pages at scale 1. Populated eagerly on document load. */
  pageDimensionsMap: Record<number, PageDimensions>;
  renderScale: number;
  isLoading: boolean;
  error: string | null;
}

export function usePdfRenderer(
  pdfBytes: ArrayBuffer | null,
  renderScale = 1.5,
): PdfRenderer {
  // Lazy init: runs inside the hook (browser-only, no module-level side effect)
  // so Fast Refresh can hot-replace this module without a full reload.
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString();
  }

  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageDimensionsMap, setPageDimensionsMap] = useState<Record<number, PageDimensions>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load PDF document when bytes change
  useEffect(() => {
    if (!pdfBytes) {
      setPdfDoc(null);
      setTotalPages(0);
      setCurrentPage(1);
      setPageDimensionsMap({});
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
      .catch((err) => {
        if (!cancelled) {
          console.error('[usePdfRenderer] Failed to load PDF document:', err);
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

  // Populate per-page dimension map when document loads (cheap: no pixel rendering)
  useEffect(() => {
    if (!pdfDoc) {
      setPageDimensionsMap({});
      return;
    }

    let cancelled = false;

    const loadAllDimensions = async () => {
      const map: Record<number, PageDimensions> = {};
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        if (cancelled) return;
        const page = await pdfDoc.getPage(i);
        const vp = page.getViewport({ scale: 1 });
        map[i] = { width: vp.width, height: vp.height };
      }
      if (!cancelled) setPageDimensionsMap(map);
    };

    loadAllDimensions();
    return () => { cancelled = true; };
  }, [pdfDoc]);

  const pageDimensions = pageDimensionsMap[currentPage] ?? null;

  return {
    pdfDoc,
    totalPages,
    currentPage,
    setCurrentPage,
    pageDimensions,
    pageDimensionsMap,
    renderScale,
    isLoading,
    error,
  };
}
