'use client';

import { useState, useRef } from 'react';
import type { FormField } from '@/types/shared';
import type { Template } from '@/features/templates/hooks/useTemplateStore';
import { serializeTemplateFile, parseTemplateFile } from '@/features/pdf/utils/templateSchema';
import { Button, Input } from '@/components/ui';
import styles from './TemplatePanel.module.css';

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
    <div className={styles['template-panel']}>
      <h3>Plantillas</h3>

      {storageError && (
        <div className={styles['template-error-banner']}>{storageError}</div>
      )}

      {/* ── Save section ── */}
      <div className={styles['template-save-row']}>
        <Input
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
          className={styles['template-name-input']}
        />
        <Button variant="primary" size="sm" disabled={saveDisabled} onClick={handleSave}>
          Guardar
        </Button>
      </div>

      {showOverwriteConfirm && (
        <div className={styles['template-inline-confirm']}>
          <span>Una plantilla con este nombre ya existe. ¿Sobreescribir?</span>
          <Button variant="danger" size="sm" onClick={handleOverwriteConfirm}>Sí</Button>
          <Button variant="ghost" size="sm" onClick={handleOverwriteCancel}>Cancelar</Button>
        </div>
      )}

      {/* ── Template list ── */}
      {templates.length === 0 ? (
        <p className={styles['template-list-empty']}>Sin plantillas guardadas.</p>
      ) : (
        <ul className={styles['template-list']}>
          {templates.map((t) => (
            <li key={t.id} className={styles['template-list-item']}>
              {renamingId === t.id ? (
                <Input
                  value={renameValue}
                  autoFocus
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameConfirm(t.id);
                    if (e.key === 'Escape') handleRenameCancel();
                  }}
                  className={styles['template-rename-input']}
                />
              ) : (
                <span className={styles['template-item-name']} title={t.name}>
                  {t.name}
                </span>
              )}
              <div className={styles['template-item-actions']}>
                {renamingId !== t.id && deletingId !== t.id && (
                  <>
                    <Button variant="secondary" size="sm" onClick={() => handleLoad(t)}>Cargar</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleRenameStart(t)}>Renombrar</Button>
                    <Button variant="danger" size="sm" onClick={() => handleDeleteStart(t.id)}>Eliminar</Button>
                  </>
                )}
                {renamingId === t.id && (
                  <>
                    <Button variant="primary" size="sm" disabled={!renameValue.trim()} onClick={() => handleRenameConfirm(t.id)}>OK</Button>
                    <Button variant="ghost" size="sm" onClick={handleRenameCancel}>Cancelar</Button>
                  </>
                )}
              </div>
              {deletingId === t.id && (
                <div className={styles['template-inline-confirm']}>
                  <span>¿Eliminar esta plantilla?</span>
                  <Button variant="danger" size="sm" onClick={() => handleDeleteConfirm(t.id)}>Sí</Button>
                  <Button variant="ghost" size="sm" onClick={handleDeleteCancel}>Cancelar</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* ── Export section ── */}
      <div className={styles['template-export-section']}>
        <Button variant="secondary" size="sm" onClick={handleDownload}>Descargar JSON</Button>
        <Button variant="secondary" size="sm" onClick={handleCopy}>Copiar al portapapeles</Button>
        {copiedFeedback && (
          <span className={styles['template-copied-feedback']}>¡Copiado!</span>
        )}
        {clipboardError && (
          <span className={styles['template-clipboard-error']}>{clipboardError}</span>
        )}
      </div>

      {/* ── Import section ── */}
      <div className={styles['template-import-section']}>
        <label className={styles['template-import-file-btn']}>
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
          className={styles['template-import-textarea']}
          placeholder="Pegar JSON aquí..."
          value={importText}
          onChange={(e) => {
            setImportText(e.target.value);
            setImportError(null);
            setPendingImportFields(null);
          }}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={handleImportText}
          disabled={!importText.trim()}
        >
          Importar texto
        </Button>

        {importError && (
          <span className={styles['template-import-error']}>{importError}</span>
        )}

        {pendingImportFields !== null && (
          <div className={styles['template-replace-append-row']}>
            <Button variant="primary" size="sm" onClick={handleImportReplace}>Reemplazar todo</Button>
            <Button variant="secondary" size="sm" onClick={handleImportAppend}>Agregar a existentes</Button>
            <Button variant="ghost" size="sm" onClick={handleImportCancel}>Cancelar</Button>
          </div>
        )}
      </div>
    </div>
  );
}
