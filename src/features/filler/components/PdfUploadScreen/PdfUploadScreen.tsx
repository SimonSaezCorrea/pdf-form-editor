'use client';

import styles from './PdfUploadScreen.module.css';

interface PdfUploadScreenProps {
  onFileSelected: (file: File) => void;
  loading: boolean;
  error: string | null;
}

export function PdfUploadScreen({ onFileSelected, loading, error }: PdfUploadScreenProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
    e.target.value = '';
  };

  if (loading) {
    return (
      <div className={styles['upload-screen']}>
        <div className={styles['loading-box']}>
          <div className={styles['spinner']} aria-hidden="true" />
          <p className={styles['loading-text']}>Analizando campos del PDF…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['upload-screen']}>
      <label className={styles['uploader']} htmlFor="filler-pdf-upload">
        <svg
          className={styles['uploader-icon']}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
        <h2 className={styles['uploader-title']}>Rellenar PDF</h2>
        <p className={styles['uploader-desc']}>
          Sube un PDF con campos AcroForm para rellenarlos de forma interactiva.
        </p>
        <span className={styles['uploader-hint']}>Haz clic para seleccionar un archivo PDF</span>
        <input
          id="filler-pdf-upload"
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleChange}
          style={{ display: 'none' }}
        />
      </label>
      {error && (
        <p className={styles['error-msg']} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
