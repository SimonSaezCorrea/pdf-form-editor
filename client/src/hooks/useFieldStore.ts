import { useState, useCallback } from 'react';
import type { FormField } from 'pdf-form-editor-shared';
import { canvasToPdf } from '../utils/coordinates';

let fieldCounter = 0;

export interface FieldStore {
  fields: FormField[];
  selectedFieldId: string | null;
  addField: (
    pageNum: number,
    canvasX: number,
    canvasY: number,
    pdfPageHeight: number,
    renderScale: number,
  ) => FormField;
  updateField: (id: string, partial: Partial<Omit<FormField, 'id'>>) => void;
  deleteField: (id: string) => void;
  selectField: (id: string | null) => void;
  resetFields: () => void;
}

/** Default field size in PDF points */
const DEFAULT_WIDTH_PT = 150;
const DEFAULT_HEIGHT_PT = 20;

export function useFieldStore(): FieldStore {
  const [fields, setFields] = useState<FormField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  const addField = useCallback(
    (
      pageNum: number,
      canvasX: number,
      canvasY: number,
      pdfPageHeight: number,
      renderScale: number,
    ): FormField => {
      fieldCounter += 1;
      const { x, y, width, height } = canvasToPdf(
        canvasX,
        canvasY,
        DEFAULT_WIDTH_PT * renderScale,
        DEFAULT_HEIGHT_PT * renderScale,
        renderScale,
        pdfPageHeight,
      );

      const newField: FormField = {
        id: `field-${Date.now()}-${fieldCounter}`,
        name: `field_${fieldCounter}`,
        page: pageNum,
        x: Math.max(0, x),
        y: Math.max(0, y),
        width,
        height,
        fontSize: 12,
        fontFamily: 'Helvetica',
      };

      setFields((prev) => [...prev, newField]);
      setSelectedFieldId(newField.id);
      return newField;
    },
    [],
  );

  const updateField = useCallback(
    (id: string, partial: Partial<Omit<FormField, 'id'>>) => {
      setFields((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...partial } : f)),
      );
    },
    [],
  );

  const deleteField = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    setSelectedFieldId((prev) => (prev === id ? null : prev));
  }, []);

  const selectField = useCallback((id: string | null) => {
    setSelectedFieldId(id);
  }, []);

  const resetFields = useCallback(() => {
    setFields([]);
    setSelectedFieldId(null);
  }, []);

  return { fields, selectedFieldId, addField, updateField, deleteField, selectField, resetFields };
}
