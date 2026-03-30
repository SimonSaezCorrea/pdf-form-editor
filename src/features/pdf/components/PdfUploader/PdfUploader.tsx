'use client';

import { useState } from 'react';
import styles from './PdfUploader.module.css';

interface PdfUploaderProps {
  onPdfLoaded: (bytes: ArrayBuffer, filename: string) => void;
}

export function PdfUploader({ onPdfLoaded }: PdfUploaderProps) {
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('Please select a valid PDF file.');
      e.target.value = '';
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      onPdfLoaded(reader.result as ArrayBuffer, file.name);
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <label className={styles['uploader']} htmlFor="pdf-upload">
      <svg className={styles['uploader-icon']} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="12" y1="18" x2="12" y2="12"/>
        <line x1="9" y1="15" x2="15" y2="15"/>
      </svg>
      <h2>PDF Form Editor</h2>
      <p>Importa un PDF y añade campos de formulario interactivos.</p>
      <span className={styles['uploader-hint']}>Haz clic para seleccionar un archivo PDF</span>
      <input
        id="pdf-upload"
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      {error && <p className={styles['uploader-error']}>{error}</p>}
    </label>
  );
}
