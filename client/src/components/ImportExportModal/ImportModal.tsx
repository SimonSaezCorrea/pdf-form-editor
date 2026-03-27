import { useState, useRef, useEffect } from 'react';
import type { FormField } from 'pdf-form-editor-shared';
import { parseTemplateFile } from '../../utils/templateSchema';

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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

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

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal-box" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Importar plantilla</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* Drop zone */}
          <div
            className={`modal-dropzone${isDragging ? ' modal-dropzone--active' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <p className="modal-dropzone-main">Arrastra un archivo .json aquí</p>
            <p className="modal-dropzone-sub">o haz clic para seleccionar</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleFileInput}
            />
          </div>

          {/* Manual text input */}
          <div className="modal-divider"><span>o escribe / pega el JSON</span></div>

          <div className="modal-manual-row">
            <textarea
              className="modal-manual-textarea"
              placeholder='{ "schemaVersion": 1, "name": "...", "fields": [...] }'
              value={manualText}
              onChange={(e) => handleManualChange(e.target.value)}
              spellCheck={false}
            />
            <button
              className="btn-modal-secondary"
              onClick={handleManualImport}
              disabled={!manualText.trim()}
            >
              Importar texto
            </button>
          </div>

          {error && <p className="modal-error">{error}</p>}
        </div>

        <div className="modal-footer">
          {hasPreview && existingFieldCount > 0 ? (
            <>
              <button className="btn-modal-primary" onClick={() => handleAccept('replace')}>
                Reemplazar todo
              </button>
              <button className="btn-modal-secondary" onClick={() => handleAccept('append')}>
                Agregar a existentes
              </button>
            </>
          ) : hasPreview ? (
            <button className="btn-modal-primary" onClick={() => handleAccept('replace')}>
              Aceptar
            </button>
          ) : null}
          <button className="btn-modal-secondary" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
