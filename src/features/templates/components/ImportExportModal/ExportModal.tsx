'use client';

import { useState } from 'react';
import type { FormField } from '@/types/shared';
import { serializeTemplateFile } from '@/features/pdf/utils/templateSchema';
import { Modal, Button } from '@/components/ui';
import styles from './ExportModal.module.css';

interface ExportModalProps {
  fields: FormField[];
  onClose: () => void;
}

export function ExportModal({ fields, onClose }: ExportModalProps) {
  const json = serializeTemplateFile('plantilla', fields);
  const [copied, setCopied] = useState(false);

  const handleDownload = () => {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Exportar plantilla"
      footer={
        <>
          <Button variant="primary" onClick={handleDownload}>Descargar JSON</Button>
          <Button variant="secondary" onClick={handleCopy}>{copied ? '¡Copiado!' : 'Copiar'}</Button>
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
        </>
      }
    >
      <pre className={styles['modal-json-block']}>{json}</pre>
    </Modal>
  );
}
