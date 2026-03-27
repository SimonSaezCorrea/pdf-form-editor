import { useState, useEffect } from 'react';
import type { FormField } from 'pdf-form-editor-shared';

export interface Template {
  id: string;
  name: string;
  createdAt: string;
  fields: FormField[];
}

export interface TemplateStore {
  templates: Template[];
  saveTemplate: (name: string, fields: FormField[]) => Template;
  overwriteTemplate: (id: string, fields: FormField[]) => void;
  renameTemplate: (id: string, newName: string) => void;
  deleteTemplate: (id: string) => void;
  storageError: string | null;
}

const STORAGE_KEY = 'pdf-form-editor:templates';
let templateCounter = 0;

function loadFromStorage(): Template[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Template[];
  } catch {
    return [];
  }
}

export function useTemplateStore(): TemplateStore {
  const [templates, setTemplates] = useState<Template[]>(() => loadFromStorage());
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
      setStorageError(null);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'QuotaExceededError') {
        setTemplates(loadFromStorage());
        setStorageError('No se pudo guardar: almacenamiento lleno.');
      }
    }
  }, [templates]);

  const saveTemplate = (name: string, fields: FormField[]): Template => {
    templateCounter += 1;
    const newTemplate: Template = {
      id: `template-${Date.now()}-${templateCounter}`,
      name,
      createdAt: new Date().toISOString(),
      fields,
    };
    setTemplates((prev) => [...prev, newTemplate]);
    return newTemplate;
  };

  const overwriteTemplate = (id: string, fields: FormField[]): void => {
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, fields, createdAt: new Date().toISOString() } : t,
      ),
    );
  };

  const renameTemplate = (id: string, newName: string): void => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, name: newName } : t)),
    );
  };

  const deleteTemplate = (id: string): void => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  return {
    templates,
    saveTemplate,
    overwriteTemplate,
    renameTemplate,
    deleteTemplate,
    storageError,
  };
}
