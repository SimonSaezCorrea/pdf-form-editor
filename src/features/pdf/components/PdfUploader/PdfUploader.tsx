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
