'use client';

import { forwardRef, useImperativeHandle, useEffect } from 'react';
import { useFillerStore } from '../../hooks/useFillerStore';
import { PdfUploadScreen } from '../PdfUploadScreen/PdfUploadScreen';
import { FillerLayout } from '../FillerLayout/FillerLayout';
import { Button } from '@/components/ui/Button/Button';
import styles from './FillerMode.module.css';

export interface FillerModeHandle {
  /** Resets the filler to the upload screen — callable from outside (e.g. navbar). */
  reset: () => void;
}

interface FillerModeProps {
  /** Called whenever the filler transitions between "has a file" and "no file". */
  onHasFileChange?: (hasFile: boolean) => void;
  /** Called with the current PDF filename (or '' when reset). */
  onFilenameChange?: (filename: string) => void;
}

export const FillerMode = forwardRef<FillerModeHandle, FillerModeProps>(
  function FillerMode({ onHasFileChange, onFilenameChange }, ref) {
    const store = useFillerStore();

    // Expose reset() so App.tsx can trigger it from the navbar back button
    useImperativeHandle(ref, () => ({ reset: store.reset }), [store.reset]);

    // Notify parent when file presence changes
    useEffect(() => {
      const hasFile = store.status === 'ready' ||
                      store.status === 'generating' ||
                      store.status === 'no-fields';
      onHasFileChange?.(hasFile);
    }, [store.status, onHasFileChange]);

    // Notify parent of the current filename
    useEffect(() => {
      onFilenameChange?.(store.pdfFile?.name ?? '');
    }, [store.pdfFile, onFilenameChange]);

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

    // PDF has no AcroForm text fields
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
  },
);
