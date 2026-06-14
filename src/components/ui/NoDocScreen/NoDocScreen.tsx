'use client';

import { useRef, useState } from 'react';
import { Button } from '../Button/Button';
import styles from './NoDocScreen.module.css';

interface NoDocScreenProps {
  /** Mode label shown in the status pill, e.g. "Editor de plantilla". */
  eyebrow: string;
  title?: string;
  description?: string;
  /** Called with a validated PDF file (from picker or drag-and-drop). */
  onFile: (file: File) => void;
  /** External error (e.g. from the filler store) shown under the description. */
  error?: string | null;
}

const FileIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="12" y1="18" x2="12" y2="12" />
    <line x1="9" y1="15" x2="15" y2="15" />
  </svg>
);

const DownloadIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" width="16" height="16"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export function NoDocScreen({
  eyebrow,
  title = 'No hay ningún documento abierto',
  description = 'Carga un PDF para empezar. Arrástralo aquí o selecciónalo desde tu equipo.',
  onFile,
  error,
}: Readonly<NoDocScreenProps>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draggingOver, setDraggingOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const processFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setLocalError('Selecciona un archivo PDF válido.');
      return;
    }
    setLocalError(null);
    onFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggingOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const shownError = localError ?? error;

  return (
    <div className={styles['no-doc-screen']}>
      <span className={styles.pill}>
        <span className={styles['pill-dot']} aria-hidden="true" />
        {eyebrow} · sin documento
      </span>

      <section
        aria-label="Zona de carga de archivos"
        className={[styles.card, draggingOver ? styles['card--over'] : ''].filter(Boolean).join(' ')}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDraggingOver(true); }}
        onDragLeave={() => setDraggingOver(false)}
      >
        <span className={styles['icon-wrap']}>{FileIcon}</span>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.desc}>{description}</p>

        <span className={styles.cta}>
          <Button variant="primary" onClick={() => inputRef.current?.click()}>
            {DownloadIcon} Cargar PDF
          </Button>
          <span className={styles['drag-hint']}>o arrastra un archivo aquí</span>
        </span>

        {shownError && <p className={styles.error}>{shownError}</p>}

        <span className={styles.meta}>
          <span>PDF</span>
          <span className={styles['meta-sep']}>·</span>
          <span>hasta 50 MB</span>
          <span className={styles['meta-sep']}>·</span>
          <span>se procesa en tu navegador</span>
        </span>
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
