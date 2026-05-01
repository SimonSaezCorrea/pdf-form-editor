'use client';

import { useFillerStore } from '../../hooks/useFillerStore';
import { PdfUploadScreen } from '../PdfUploadScreen/PdfUploadScreen';
import { FillerLayout } from '../FillerLayout/FillerLayout';
import { Button } from '@/components/ui/Button/Button';
import styles from './FillerMode.module.css';

export function FillerMode() {
  const store = useFillerStore();

  // Upload / loading / error states
  if (store.status === 'idle' || store.status === 'loading' || store.status === 'error') {
    return (
      <PdfUploadScreen
        onFileSelected={store.handleFileSelected}
        loading={store.status === 'loading'}
        error={store.status === 'error' ? store.error : null}
      />
    );
  }

  // PDF has no AcroForm text fields (US4)
  if (store.status === 'no-fields') {
    return (
      <div className={styles['no-fields']}>
        <svg
          className={styles['no-fields-icon']}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <h2 className={styles['no-fields-title']}>Sin campos rellenables</h2>
        <p className={styles['no-fields-desc']}>
          Este PDF no contiene campos AcroForm de texto. Solo se pueden rellenar PDFs con campos
          interactivos creados con un editor de formularios PDF.
        </p>
        <Button variant="primary" onClick={store.reset}>
          Subir otro PDF
        </Button>
      </div>
    );
  }

  // PDF with fields — two-panel layout (ready | generating)
  return (
    <FillerLayout
      pdfBytes={store.pdfBytes!}
      fields={store.fields}
      values={store.values}
      generating={store.status === 'generating'}
      onValueChange={store.setValue}
      onGeneratePdf={store.generatePdf}
      onReset={store.reset}
    />
  );
}
