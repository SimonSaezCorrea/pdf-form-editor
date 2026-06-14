'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button/Button';
import styles from './PdfUploadScreen.module.css';

interface PdfUploadScreenProps {
  onFileSelected: (file: File) => void;
  loading: boolean;
  error: string | null;
}

export function PdfUploadScreen({ onFileSelected, loading, error }: Readonly<PdfUploadScreenProps>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draggingOver, setDraggingOver] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggingOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelected(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggingOver(true);
  };

  if (loading) {
    return (
      <div className={styles['upload-screen']}>
        <div className={styles['loading-box']}>
          <div className={styles['spinner']} />
          <p className={styles['loading-text']}>Analizando campos del PDF…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['upload-screen']}>
      {/* Hero: above and outside the dropzone */}
      <div className={styles['menu-hero']}>
        <span className={styles['menu-eyebrow']}>Rellenar PDF</span>
        <h1 className={styles['menu-headline']}>Rellena cualquier formulario PDF, sin imprimirlo.</h1>
        <p className={styles['menu-subhead']}>
          Sube un PDF con campos AcroForm, complétalos con vista previa en vivo y descarga el resultado.
        </p>
      </div>

      {/* Dropzone card */}
      <section
        aria-label="Zona de carga de archivos"
        className={[styles['drop-zone'], draggingOver ? styles['drop-zone--over'] : ''].filter(Boolean).join(' ')}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setDraggingOver(false)}
      >
        <svg className={styles['zone-icon']} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
        <h2 className={styles['zone-title']}>Selecciona un formulario</h2>
        <p className={styles['zone-desc']}>
          Sube un PDF con campos AcroForm para rellenarlos de forma interactiva.
        </p>

        <div className={styles['dropzone-cta']}>
          <Button variant="primary" onClick={() => inputRef.current?.click()}>
            Seleccionar PDF
          </Button>
          <span className={styles['drag-hint']}>o arrastra un archivo aquí</span>
        </div>

        <div className={styles['quick-row']}>
          <span>PDF</span>
          <span className={styles['quick-sep']}>·</span>
          <span>hasta 50 MB</span>
          <span className={styles['quick-sep']}>·</span>
          <span>se procesa localmente</span>
        </div>

        {error && (
          <p className={styles['error-msg']} role="alert">{error}</p>
        )}
      </section>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleChange}
        style={{ display: 'none' }}
        tabIndex={-1}
      />
    </div>
  );
}
