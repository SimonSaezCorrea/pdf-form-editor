'use client';

import { useEffect, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { AcroFormField } from '../types';
import type { FieldTypeId } from '@/types/shared';

function deriveGroup(fieldName: string): string {
  const prefix = fieldName.split('_')[0];
  if (!prefix) return 'General';
  return prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

function pdfJsTypeToFieldTypeId(fieldType: string | undefined): FieldTypeId | undefined {
  if (fieldType === 'Tx') return 'text';
  return undefined;
}

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

          // pdfjs v4 exposes defaultAppearanceData with fontSize already parsed.
          // Fall back to parsing the raw DA string for older PDFs.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const dad = (a as any).defaultAppearanceData as
            | { fontSize?: number }
            | undefined;
          let fontSize = dad?.fontSize ?? 0;

          if (!fontSize) {
            const daMatch = (a.defaultAppearance as string | undefined)
              ?.match(/(\d+(?:\.\d+)?)\s+Tf/);
            fontSize = daMatch ? parseFloat(daMatch[1]) : 0;
          }

          const group = deriveGroup(a.fieldName);
          const label = `${group} · ${a.fieldName}`;
          // fieldFlags bit 2 (value 4) = Required
          const required = typeof a.fieldFlags === 'number' ? (a.fieldFlags & 4) !== 0 : false;
          const fieldType = pdfJsTypeToFieldTypeId(a.fieldType as string | undefined);

          fields.push({
            name: a.fieldName,
            type: 'text',
            page: pageNum,
            rect: a.rect as [number, number, number, number],
            fontSize,
            label,
            group,
            required,
            fieldType,
          });
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
