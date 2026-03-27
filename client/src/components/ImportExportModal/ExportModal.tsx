import { useEffect } from 'react';
import type { FormField } from 'pdf-form-editor-shared';
import { serializeTemplateFile } from '../../utils/templateSchema';

interface ExportModalProps {
  fields: FormField[];
  onClose: () => void;
}

export function ExportModal({ fields, onClose }: ExportModalProps) {
  const json = serializeTemplateFile('plantilla', fields);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

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

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal-box" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Exportar plantilla</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <pre className="modal-json-block">{json}</pre>
        </div>

        <div className="modal-footer">
          <button className="btn-modal-primary" onClick={handleDownload}>
            Descargar JSON
          </button>
          <button className="btn-modal-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
