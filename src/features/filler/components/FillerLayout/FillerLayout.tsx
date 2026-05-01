'use client';

import React from 'react';
import { usePdfRenderer } from '@/features/canvas';
import { Button } from '@/components/ui/Button/Button';
import { DynamicForm } from '../DynamicForm/DynamicForm';
import type { AcroFormField } from '../../types';
import styles from './FillerLayout.module.css';

interface FillerLayoutProps {
  pdfBytes: ArrayBuffer;
  fields: AcroFormField[];
  values: Record<string, string>;
  generating: boolean;
  onValueChange: (name: string, value: string) => void;
  onGeneratePdf: () => void;
  onReset: () => void;
}

export function FillerLayout({
  pdfBytes,
  fields,
  values,
  generating,
  onValueChange,
  onGeneratePdf,
  onReset,
}: FillerLayoutProps) {
  const renderer = usePdfRenderer(pdfBytes);

  return (
    <div className={styles['filler-layout']}>
      {/* Header */}
      <div className={styles['layout-header']}>
        <span className={styles['field-count']}>
          {fields.length} campo{fields.length !== 1 ? 's' : ''} detectado{fields.length !== 1 ? 's' : ''}
        </span>
        <Button variant="ghost" size="sm" onClick={onReset} disabled={generating}>
          Subir otro PDF
        </Button>
      </div>

      {/* Two-panel body */}
      <div className={styles['layout-body']}>
        {/* Left: PDF preview */}
        <div className={styles['pdf-panel']}>
          {renderer.isLoading && (
            <div className={styles['pdf-loading']}>Cargando previsualización…</div>
          )}
          {renderer.error && (
            <div className={styles['pdf-error']}>{renderer.error}</div>
          )}
          <canvas ref={renderer.canvasRef as React.RefObject<HTMLCanvasElement>} className={styles['pdf-canvas']} />

          {renderer.totalPages > 1 && (
            <div className={styles['page-nav']}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => renderer.setCurrentPage(renderer.currentPage - 1)}
                disabled={renderer.currentPage <= 1}
                aria-label="Página anterior"
              >
                ‹
              </Button>
              <span className={styles['page-label']}>
                {renderer.currentPage} / {renderer.totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => renderer.setCurrentPage(renderer.currentPage + 1)}
                disabled={renderer.currentPage >= renderer.totalPages}
                aria-label="Página siguiente"
              >
                ›
              </Button>
            </div>
          )}
        </div>

        {/* Right: dynamic form */}
        <div className={styles['form-panel']}>
          <DynamicForm
            fields={fields}
            values={values}
            onValueChange={onValueChange}
            onSubmit={onGeneratePdf}
            generating={generating}
          />
        </div>
      </div>
    </div>
  );
}
