'use client';

import { useState, useCallback } from 'react';
import type { AcroFormField, FillerStatus } from '../types';
import { detectAcroFormFields } from './useFieldDetection';
import { writeGroupsToPdf } from '../utils/writeGroupsToPdf';
import * as pdfjs from 'pdfjs-dist';

interface FillerStore {
  status: FillerStatus;
  pdfBytes: ArrayBuffer | null;
  pdfFile: File | null;
  fields: AcroFormField[];
  values: Record<string, string>;
  error: string | null;
  handleFileSelected: (file: File) => Promise<void>;
  setValue: (name: string, value: string) => void;
  generatePdf: () => Promise<void>;
  applyMetadata: (groupMap: Record<string, string>) => Promise<void>;
  reset: () => void;
}

export function useFillerStore(): FillerStore {
  const [status, setStatus] = useState<FillerStatus>('idle');
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [fields, setFields] = useState<AcroFormField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = useCallback(async (file: File) => {
    setStatus('loading');
    setError(null);
    setPdfFile(file);

    try {
      const buffer = await file.arrayBuffer();
      setPdfBytes(buffer);

      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url,
        ).toString();
      }

      // Pass a copy to pdfjs — getDocument transfers the buffer to the worker,
      // detaching it from the main thread. We need the original intact for usePdfRenderer.
      const doc = await pdfjs.getDocument({ data: buffer.slice(0) }).promise;
      const detected = await detectAcroFormFields(doc);

      setFields(detected);
      setValues({});
      setStatus(detected.length === 0 ? 'no-fields' : 'ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze PDF');
      setStatus('error');
    }
  }, []);

  const setValue = useCallback((name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const generatePdf = useCallback(async () => {
    if (!pdfFile) return;
    setStatus('generating');
    setError(null);

    try {
      // Filter empty values before sending (FR-009)
      const nonEmpty = Object.fromEntries(
        Object.entries(values).filter(([, v]) => v !== ''),
      );

      // Build metadata map: fieldName → { fontSize, multiline }
      const metadata: Record<string, { fontSize: number; multiline: boolean }> = {};
      for (const f of fields) {
        metadata[f.name] = { fontSize: f.fontSize, multiline: f.multiline ?? false };
      }

      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('fields', JSON.stringify(nonEmpty));
      formData.append('metadata', JSON.stringify(metadata));

      const res = await fetch('/api/fill-pdf', { method: 'POST', body: formData });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'PROCESSING_ERROR' }));
        throw new Error(body.error ?? 'PROCESSING_ERROR');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'filled.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PROCESSING_ERROR');
      setStatus('error');
    }
  }, [pdfFile, values]);

  const applyMetadata = useCallback(async (groupMap: Record<string, string>) => {
    // 1. Update React state (optimista — refleja en la UI de inmediato)
    setFields((prev) => prev.map((f) =>
      groupMap[f.name] ? { ...f, group: groupMap[f.name] } : f,
    ));

    // 2. Persistir las categorías en el binario del PDF (/TU) para que sobrevivan
    //    al guardado/exportación. Sin esto el cambio sería efímero (solo estado React).
    if (!pdfBytes) return;
    try {
      const updated = await writeGroupsToPdf(pdfBytes, groupMap);
      // Copia limpia a ArrayBuffer para el estado / usePdfRenderer
      const updatedBuffer = updated.slice().buffer;
      setPdfBytes(updatedBuffer);
      // Mantener pdfFile en sync — es lo que generatePdf() sube al backend
      setPdfFile((prev) => {
        const name = prev?.name ?? 'document.pdf';
        return new File([updatedBuffer], name, { type: 'application/pdf' });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron persistir las categorías');
    }
  }, [pdfBytes]);

  const reset = useCallback(() => {
    setStatus('idle');
    setPdfBytes(null);
    setPdfFile(null);
    setFields([]);
    setValues({});
    setError(null);
  }, []);

  return {
    status,
    pdfBytes,
    pdfFile,
    fields,
    values,
    error,
    handleFileSelected,
    setValue,
    generatePdf,
    applyMetadata,
    reset,
  };
}
