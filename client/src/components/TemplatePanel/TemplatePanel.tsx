import { useState, useRef } from 'react';
import type { FormField } from 'pdf-form-editor-shared';
import type { Template } from '../../hooks/useTemplateStore';
import { serializeTemplateFile, parseTemplateFile } from '../../utils/templateSchema';

interface TemplatePanelProps {
  templates: Template[];
  saveTemplate: (name: string, fields: FormField[]) => Template;
  overwriteTemplate: (id: string, fields: FormField[]) => void;
  renameTemplate: (id: string, newName: string) => void;
  deleteTemplate: (id: string) => void;
  storageError: string | null;
  fields: FormField[];
  loadTemplateFields: (fields: FormField[], mode: 'replace' | 'append') => void;
}

function sanitizeFilename(raw: string): string {
  const sanitized = raw.replace(/[/\\:*?"<>|]/g, '_').trim().replace(/^[.\s]+|[.\s]+$/g, '');
  return sanitized.length > 0 ? sanitized : 'template';
}

export function TemplatePanel({
  templates,
  saveTemplate,
  overwriteTemplate,
  renameTemplate,
  deleteTemplate,
  storageError,
  fields,
  loadTemplateFields,
}: TemplatePanelProps) {
  // ── Save section state ──
  const [saveName, setSaveName] = useState('');
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const existingMatch = templates.find((t) => t.name === saveName.trim());

  // ── Rename state ──
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // ── Delete confirm state ──
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Export section state ──
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [clipboardError, setClipboardError] = useState<string | null>(null);

  // ── Import section state ──
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [pendingImportFields, setPendingImportFields] = useState<FormField[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Save handlers ──
  const handleSave = () => {
    const name = saveName.trim();
    if (!name || name.length > 100) return;
    if (existingMatch) {
      setShowOverwriteConfirm(true);
    } else {
      saveTemplate(name, fields);
      setSaveName('');
    }
  };

  const handleOverwriteConfirm = () => {
    if (!existingMatch) return;
    overwriteTemplate(existingMatch.id, fields);
    setShowOverwriteConfirm(false);
    setSaveName('');
  };

  const handleOverwriteCancel = () => {
    setShowOverwriteConfirm(false);
  };

  // ── Load handler ──
  const handleLoad = (template: Template) => {
    loadTemplateFields(template.fields, 'replace');
  };

  // ── Rename handlers ──
  const handleRenameStart = (t: Template) => {
    setRenamingId(t.id);
    setRenameValue(t.name);
    setDeletingId(null);
  };

  const handleRenameConfirm = (id: string) => {
    const name = renameValue.trim();
    if (!name) return;
    renameTemplate(id, name);
    setRenamingId(null);
  };

  const handleRenameCancel = () => {
    setRenamingId(null);
  };

  // ── Delete handlers ──
  const handleDeleteStart = (id: string) => {
    setDeletingId(id);
    setRenamingId(null);
  };

  const handleDeleteConfirm = (id: string) => {
    deleteTemplate(id);
    setDeletingId(null);
  };

  const handleDeleteCancel = () => {
    setDeletingId(null);
  };

  // ── Export handlers ──
  const handleDownload = () => {
    const name = saveName.trim() || 'template';
    const json = serializeTemplateFile(name, fields);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = sanitizeFilename(name) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    const name = saveName.trim() || 'template';
    const json = serializeTemplateFile(name, fields);
    try {
      await navigator.clipboard.writeText(json);
      setCopiedFeedback(true);
      setClipboardError(null);
      setTimeout(() => setCopiedFeedback(false), 2000);
    } catch {
      setClipboardError('No se pudo copiar al portapapeles. Selecciona el texto manualmente.');
    }
  };

  // ── Import handlers ──
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setPendingImportFields(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      try {
        const parsed = parseTemplateFile(text);
        if (fields.length > 0) {
          setPendingImportFields(parsed.fields);
        } else {
          loadTemplateFields(parsed.fields, 'replace');
        }
      } catch (err) {
        setImportError((err as Error).message);
      }
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleImportText = () => {
    setImportError(null);
    setPendingImportFields(null);
    try {
      const parsed = parseTemplateFile(importText);
      if (fields.length > 0) {
        setPendingImportFields(parsed.fields);
      } else {
        loadTemplateFields(parsed.fields, 'replace');
        setImportText('');
      }
    } catch (err) {
      setImportError((err as Error).message);
    }
  };

  const handleImportReplace = () => {
    if (!pendingImportFields) return;
    loadTemplateFields(pendingImportFields, 'replace');
    setPendingImportFields(null);
    setImportText('');
  };

  const handleImportAppend = () => {
    if (!pendingImportFields) return;
    loadTemplateFields(pendingImportFields, 'append');
    setPendingImportFields(null);
    setImportText('');
  };

  const handleImportCancel = () => {
    setPendingImportFields(null);
  };

  const saveDisabled = !saveName.trim() || saveName.trim().length > 100;

  return (
    <div className="template-panel">
      <h3>Plantillas</h3>

      {storageError && (
        <div className="template-error-banner">{storageError}</div>
      )}

      {/* ── Save section ── */}
      <div className="template-save-row">
        <input
          type="text"
          className="template-name-input"
          placeholder="Nombre de plantilla"
          value={saveName}
          maxLength={100}
          onChange={(e) => {
            setSaveName(e.target.value);
            setShowOverwriteConfirm(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !saveDisabled) handleSave();
          }}
        />
        <button
          className="btn btn-primary template-save-btn"
          disabled={saveDisabled}
          onClick={handleSave}
        >
          Guardar
        </button>
      </div>

      {showOverwriteConfirm && (
        <div className="template-inline-confirm">
          <span>Una plantilla con este nombre ya existe. ¿Sobreescribir?</span>
          <button className="template-confirm-btn" onClick={handleOverwriteConfirm}>
            Sí
          </button>
          <button className="template-cancel-btn" onClick={handleOverwriteCancel}>
            Cancelar
          </button>
        </div>
      )}

      {/* ── Template list ── */}
      {templates.length === 0 ? (
        <p className="template-list-empty">Sin plantillas guardadas.</p>
      ) : (
        <ul className="template-list">
          {templates.map((t) => (
            <li key={t.id} className="template-list-item">
              {renamingId === t.id ? (
                <input
                  className="template-rename-input"
                  value={renameValue}
                  autoFocus
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameConfirm(t.id);
                    if (e.key === 'Escape') handleRenameCancel();
                  }}
                />
              ) : (
                <span className="template-item-name" title={t.name}>
                  {t.name}
                </span>
              )}
              <div className="template-item-actions">
                {renamingId !== t.id && deletingId !== t.id && (
                  <>
                    <button
                      className="template-action-btn"
                      onClick={() => handleLoad(t)}
                    >
                      Cargar
                    </button>
                    <button
                      className="template-action-btn"
                      onClick={() => handleRenameStart(t)}
                    >
                      Renombrar
                    </button>
                    <button
                      className="template-action-btn template-action-btn--danger"
                      onClick={() => handleDeleteStart(t.id)}
                    >
                      Eliminar
                    </button>
                  </>
                )}
                {renamingId === t.id && (
                  <>
                    <button
                      className="template-action-btn"
                      disabled={!renameValue.trim()}
                      onClick={() => handleRenameConfirm(t.id)}
                    >
                      OK
                    </button>
                    <button
                      className="template-cancel-btn"
                      onClick={handleRenameCancel}
                    >
                      Cancelar
                    </button>
                  </>
                )}
              </div>
              {deletingId === t.id && (
                <div className="template-inline-confirm template-inline-confirm--full">
                  <span>¿Eliminar esta plantilla?</span>
                  <button
                    className="template-confirm-btn"
                    onClick={() => handleDeleteConfirm(t.id)}
                  >
                    Sí
                  </button>
                  <button className="template-cancel-btn" onClick={handleDeleteCancel}>
                    Cancelar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* ── Export section ── */}
      <div className="template-export-section">
        <button className="template-export-btn" onClick={handleDownload}>
          Descargar JSON
        </button>
        <button className="template-export-btn" onClick={handleCopy}>
          Copiar al portapapeles
        </button>
        {copiedFeedback && (
          <span className="template-copied-feedback">¡Copiado!</span>
        )}
        {clipboardError && (
          <span className="template-clipboard-error">{clipboardError}</span>
        )}
      </div>

      {/* ── Import section ── */}
      <div className="template-import-section">
        <label className="template-import-file-btn">
          Importar archivo JSON
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </label>

        <textarea
          className="template-import-textarea"
          placeholder="Pegar JSON aquí..."
          value={importText}
          onChange={(e) => {
            setImportText(e.target.value);
            setImportError(null);
            setPendingImportFields(null);
          }}
        />
        <button
          className="template-import-btn"
          onClick={handleImportText}
          disabled={!importText.trim()}
        >
          Importar texto
        </button>

        {importError && (
          <span className="template-import-error">{importError}</span>
        )}

        {pendingImportFields !== null && (
          <div className="template-replace-append-row">
            <button className="template-action-btn" onClick={handleImportReplace}>
              Reemplazar todo
            </button>
            <button className="template-action-btn" onClick={handleImportAppend}>
              Agregar a existentes
            </button>
            <button className="template-cancel-btn" onClick={handleImportCancel}>
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
