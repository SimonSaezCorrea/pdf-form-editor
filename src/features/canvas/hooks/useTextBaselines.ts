'use client';

import { useEffect, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';

/** Baseline y-values extracted from a PDF page, in PDF user space (points, bottom-left origin). */
export interface UseTextBaselinesResult {
  baselines: number[];
  isExtracting: boolean;
}

interface PdfjsTextItem {
  str: string;
  transform: number[];
}

function isTextItem(item: unknown): item is PdfjsTextItem {
  return (
    typeof item === 'object' &&
    item !== null &&
    'transform' in item &&
    'str' in item
  );
}

/** Two baselines within this tolerance (PDF pts) are merged into one. */
const DEDUP_TOLERANCE_PT = 1.0;

/**
 * Extracts unique text baseline y-positions from the current PDF page using pdfjs
 * getTextContent(). Returns values in PDF user space (bottom-left origin, scale=1).
 * These map directly to field.y coordinates.
 */
export function useTextBaselines(
  pdfDoc: PDFDocumentProxy | null,
  currentPage: number,
): UseTextBaselinesResult {
  const [baselines, setBaselines] = useState<number[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);

  useEffect(() => {
    if (!pdfDoc) {
      setBaselines([]);
      return;
    }

    let cancelled = false;
    setIsExtracting(true);
    setBaselines([]);

    const extract = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (cancelled) return;

        const textContent = await page.getTextContent();
        if (cancelled) return;

        const rawY: number[] = [];
        for (const item of textContent.items) {
          if (!isTextItem(item)) continue;
          if (item.str.trim().length === 0) continue;
          // transform[5] = y translation in PDF user space (the text baseline)
          rawY.push(item.transform[5]);
        }

        // Sort ascending, then deduplicate within tolerance
        rawY.sort((a, b) => a - b);
        const deduped: number[] = [];
        for (const y of rawY) {
          if (
            deduped.length === 0 ||
            y - deduped[deduped.length - 1] > DEDUP_TOLERANCE_PT
          ) {
            deduped.push(y);
          }
        }

        if (!cancelled) setBaselines(deduped);
      } catch {
        // Ignore errors (page not found, cancelled, image-only PDFs)
      } finally {
        if (!cancelled) setIsExtracting(false);
      }
    };

    extract();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, currentPage]);

  return { baselines, isExtracting };
}
