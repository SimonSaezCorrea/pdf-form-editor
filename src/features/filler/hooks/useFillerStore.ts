'use client';

import { useState, useCallback } from 'react';
import type { AcroFormField, FillerStatus } from '../types';
import { detectAcroFormFields } from './useFieldDetection';
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

      const doc = await pdfjs.getDocument({ data: buffer }).promise;
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

      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('fields', JSON.stringify(nonEmpty));

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
    reset,
  };
}
