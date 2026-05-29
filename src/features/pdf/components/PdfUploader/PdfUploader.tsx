'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui';
import styles from './PdfUploader.module.css';

interface PdfUploaderProps {
  onPdfLoaded: (bytes: ArrayBuffer, filename: string) => void;
  appMode?: 'editor' | 'filler';
}

const COPY = {
  editor: {
    eyebrow: 'Editor de plantilla',
    headline: 'Coloca campos de formulario sobre cualquier PDF.',
    subhead: 'Importa un PDF, dibuja los campos donde los necesites y exporta el archivo listo para firmar.',
    zoneTitle: 'Crea un nuevo formulario',
    zoneDesc: 'Importa un PDF y añade campos de formulario interactivos sobre él.',
  },
  filler: {
    eyebrow: 'Rellenar PDF',
    headline: 'Rellena cualquier formulario PDF, sin imprimirlo.',
    subhead: 'Sube un PDF con campos AcroForm, complétalos con vista previa en vivo y descarga el resultado.',
    zoneTitle: 'Selecciona un formulario',
    zoneDesc: 'Sube un PDF con campos AcroForm para rellenarlos de forma interactiva.',
  },
};

export function PdfUploader({ onPdfLoaded, appMode = 'editor' }: Readonly<PdfUploaderProps>) {
  const [error, setError] = useState<string | null>(null);
  const [draggingOver, setDraggingOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const copy = COPY[appMode];

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('Selecciona un archivo PDF válido.');
      return;
    }
    setError(null);
    const buffer = await file.arrayBuffer();
    onPdfLoaded(buffer, file.name);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggingOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggingOver(true);
  };

  return (
    <div className={styles['upload-screen']}>
      {/* Hero: above and outside the dropzone */}
      <div className={styles['menu-hero']}>
        <span className={styles['menu-eyebrow']}>{copy.eyebrow}</span>
        <h1 className={styles['menu-headline']}>{copy.headline}</h1>
        <p className={styles['menu-subhead']}>{copy.subhead}</p>
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
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/>
          <line x1="9" y1="15" x2="15" y2="15"/>
        </svg>
        <h2 className={styles['zone-title']}>{copy.zoneTitle}</h2>
        <p className={styles['zone-desc']}>{copy.zoneDesc}</p>

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

        {error && <p className={styles['upload-error']}>{error}</p>}
      </section>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        tabIndex={-1}
      />
    </div>
  );
}
