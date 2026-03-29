'use client';

import { useState, useRef } from 'react';
import type { FormField } from '@/types/shared';
import { parseTemplateFile } from '@/features/pdf/utils/templateSchema';
import { Modal, Button } from '@/components/ui';
import styles from './ImportModal.module.css';

interface ImportModalProps {
  existingFieldCount: number;
  onImport: (fields: FormField[], mode: 'replace' | 'append') => void;
  onClose: () => void;
}

export function ImportModal({ existingFieldCount, onImport, onClose }: ImportModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [manualText, setManualText] = useState('');
  const [parsedFields, setParsedFields] = useState<FormField[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processText = (text: string) => {
    try {
      const parsed = parseTemplateFile(text);
      setParsedFields(parsed.fields);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
      setParsedFields(null);
    }
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setManualText(text);
      processText(text);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleManualChange = (text: string) => {
    setManualText(text);
    setError(null);
    setParsedFields(null);
  };

  const handleManualImport = () => {
    processText(manualText);
  };

  const handleAccept = (mode: 'replace' | 'append') => {
    if (!parsedFields) return;
    onImport(parsedFields, mode);
    onClose();
  };

  const hasPreview = parsedFields !== null;

  const footer = (
    <>
      {hasPreview && existingFieldCount > 0 ? (
        <>
          <Button variant="primary" onClick={() => handleAccept('replace')}>Reemplazar todo</Button>
          <Button variant="secondary" onClick={() => handleAccept('append')}>Agregar a existentes</Button>
        </>
      ) : hasPreview ? (
        <Button variant="primary" onClick={() => handleAccept('replace')}>Aceptar</Button>
      ) : null}
      <Button variant="ghost" onClick={onClose}>Cancelar</Button>
    </>
  );

  return (
    <Modal isOpen={true} onClose={onClose} title="Importar plantilla" footer={footer}>
      {/* Drop zone */}
      <div
        className={[styles['modal-dropzone'], isDragging ? styles['modal-dropzone--active'] : ''].filter(Boolean).join(' ')}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <p className={styles['modal-dropzone-main']}>Arrastra un archivo .json aquí</p>
        <p className={styles['modal-dropzone-sub']}>o haz clic para seleccionar</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFileInput}
        />
      </div>

      {/* Manual text input */}
      <div className={styles['modal-divider']}><span>o escribe / pega el JSON</span></div>

      <div className={styles['modal-manual-row']}>
        <textarea
          className={styles['modal-manual-textarea']}
          placeholder='{ "schemaVersion": 1, "name": "...", "fields": [...] }'
          value={manualText}
          onChange={(e) => handleManualChange(e.target.value)}
          spellCheck={false}
        />
        <Button
          variant="secondary"
          onClick={handleManualImport}
          disabled={!manualText.trim()}
        >
          Importar texto
        </Button>
      </div>

      {error && <p className={styles['modal-error']}>{error}</p>}
    </Modal>
  );
}
