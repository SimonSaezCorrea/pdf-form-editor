'use client';

import { useEffect, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { AcroFormField } from '../types';
import type { FieldTypeId } from '@/types/shared';

type DetectedKind = { type: 'text' | 'number' | 'date' | 'checkbox' | 'signature'; fieldType: FieldTypeId };

// AcroForm JS actions (AFNumber_* / AFDate_*) mark a text field as number/date.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function textFieldKind(a: any): 'text' | 'number' | 'date' {
  const actions = a.actions as Record<string, string[]> | undefined;
  if (!actions) return 'text';
  const all = Object.values(actions).flat();
  if (all.some((js) => typeof js === 'string' && js.includes('AFNumber'))) return 'number';
  if (all.some((js) => typeof js === 'string' && js.includes('AFDate'))) return 'date';
  return 'text';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function detectKind(a: any): DetectedKind | null {
  if (a.fieldType === 'Tx') {
    const kind = textFieldKind(a);
    return { type: kind, fieldType: kind };
  }
  if (a.fieldType === 'Btn') {
    if (a.checkBox) return { type: 'checkbox', fieldType: 'checkbox' };
    if (a.pushButton) return { type: 'signature', fieldType: 'signature' };
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractFontSize(a: any): number {
  const dad = a.defaultAppearanceData as { fontSize?: number } | undefined;
  if (dad?.fontSize) return dad.fontSize;
  const daMatch = (a.defaultAppearance as string | undefined)?.match(/(\d+(?:\.\d+)?)\s+Tf/);
  return daMatch ? Number.parseFloat(daMatch[1]) : 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildField(a: any, pageNum: number, kind: DetectedKind): AcroFormField {
  const fontSize = extractFontSize(a);
  // pdfjs maps the /TU (alternate name) entry to `alternativeText` — NOT `tooltip`.
  // (see pdf.worker: `data.alternativeText = stringToPDFString(dict.get("TU"))`).
  // Strict read: /TU or 'General'. No prefix-guessing.
  const group = (a.alternativeText as string | undefined)?.trim() || 'General';
  const flags = typeof a.fieldFlags === 'number' ? (a.fieldFlags as number) : 0;
  return {
    name: a.fieldName as string,
    type: kind.type,
    page: pageNum,
    rect: a.rect as [number, number, number, number],
    fontSize,
    label: `${group} · ${a.fieldName}`,
    group,
    required: (flags & 4) !== 0,
    multiline: (flags & 4096) !== 0,
    fieldType: kind.fieldType,
  };
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
      if (a.subtype !== 'Widget' || !a.fieldName) continue;
      const kind = detectKind(a);
      if (!kind) continue;
      if (seen.has(a.fieldName)) continue;
      seen.add(a.fieldName);
      fields.push(buildField(a, pageNum, kind));
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
