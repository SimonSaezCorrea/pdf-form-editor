'use client';

import { useEffect, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { AcroFormField } from '../types';

export async function detectAcroFormFields(
  pdfDoc: PDFDocumentProxy,
): Promise<AcroFormField[]> {
  const seen = new Set<string>();
  const fields: AcroFormField[] = [];

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const annotations = await page.getAnnotations();

    for (const a of annotations) {
      if (a.subtype === 'Widget' && a.fieldType === 'Tx' && a.fieldName) {
        if (!seen.has(a.fieldName)) {
          seen.add(a.fieldName);
          fields.push({ name: a.fieldName, type: 'text', page: pageNum });
        }
      }
    }
  }

  return fields;
}

interface UseFieldDetectionResult {
  fields: AcroFormField[];
  loading: boolean;
  error: string | null;
}

export function useFieldDetection(
  pdfBytes: ArrayBuffer | null,
): UseFieldDetectionResult {
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString();
  }

  const [fields, setFields] = useState<AcroFormField[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pdfBytes) {
      setFields([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const task = pdfjs.getDocument({ data: pdfBytes });
    task.promise
      .then((doc) => {
        if (cancelled) return;
        return detectAcroFormFields(doc).then((detected) => {
          if (!cancelled) {
            setFields(detected);
            setLoading(false);
          }
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to analyze PDF');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      task.destroy?.();
    };
  }, [pdfBytes]);

  return { fields, loading, error };
}
