'use client';

import { useState, useCallback } from 'react';
import type { FormField } from '@/types/shared';
import { canvasToPdf } from '@/features/pdf/utils/coordinates';
import { duplicatedName } from '@/features/pdf/utils/fieldName';

let fieldCounter = 0;

export interface FieldStore {
  fields: FormField[];
  /** Full selection set — may contain 0, 1 or many IDs */
  selectionIds: ReadonlySet<string>;
  /** Derived single-selection compat: the selected ID when exactly 1 is selected, else null */
  selectedFieldId: string | null;
  addField: (
    pageNum: number,
    canvasX: number,
    canvasY: number,
    pdfPageHeight: number,
    renderScale: number,
  ) => FormField;
  updateField: (id: string, partial: Partial<Omit<FormField, 'id'>>) => void;
  /** Bulk-update multiple fields with the same partial */
  updateFields: (ids: string[], partial: Partial<Omit<FormField, 'id'>>) => void;
  deleteField: (id: string) => void;
  /** Select exactly one field, clearing all others */
  selectSingle: (id: string) => void;
  /** Clear the entire selection */
  clearSelection: () => void;
  /** Toggle a field in/out of the current selection (Shift+click) */
  toggleSelect: (id: string) => void;
  /** Select all fields on the given page */
  selectAll: (page: number) => void;
  /** Replace the entire selection set (rubber band result) */
  setSelection: (ids: string[]) => void;
  resetFields: () => void;
  /**
   * Duplicate a field, auto-naming it with a unique suffix.
   * @param id - ID of the source field
   * @param offsetX - X offset for the duplicate in PDF points
   * @param offsetY - Y offset for the duplicate in PDF points
   * @returns the new FormField, or null if the source id is not found
   */
  duplicateField: (id: string, offsetX: number, offsetY: number) => FormField | null;
  /**
   * Load template fields onto the canvas.
   * - 'replace': clears canvas, loads template fields (IDs regenerated).
   * - 'append': adds template fields alongside existing ones (IDs regenerated,
   *             name conflicts resolved via duplicatedName).
   */
  loadTemplateFields: (fields: FormField[], mode: 'replace' | 'append') => void;
}

/** Default field size in PDF points */
const DEFAULT_WIDTH_PT = 150;
const DEFAULT_HEIGHT_PT = 20;

export function useFieldStore(): FieldStore {
  const [fields, setFields] = useState<FormField[]>([]);
  const [selectionIds, setSelectionIds] = useState<ReadonlySet<string>>(new Set());

  // Derived single-selection compat getter
  const selectedFieldId: string | null =
    selectionIds.size === 1 ? [...selectionIds][0] : null;

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
        value: '',
      };

      setFields((prev) => [...prev, newField]);
      setSelectionIds(new Set([newField.id]));
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

  const updateFields = useCallback(
    (ids: string[], partial: Partial<Omit<FormField, 'id'>>) => {
      const idSet = new Set(ids);
      setFields((prev) =>
        prev.map((f) => (idSet.has(f.id) ? { ...f, ...partial } : f)),
      );
    },
    [],
  );

  const deleteField = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    setSelectionIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const selectSingle = useCallback((id: string) => {
    setSelectionIds(new Set([id]));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectionIds(new Set());
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(
    (page: number) => {
      setSelectionIds(new Set(fields.filter((f) => f.page === page).map((f) => f.id)));
    },
    [fields],
  );

  const setSelection = useCallback((ids: string[]) => {
    setSelectionIds(new Set(ids));
  }, []);

  const resetFields = useCallback(() => {
    setFields([]);
    setSelectionIds(new Set());
  }, []);

  const duplicateField = useCallback(
    (id: string, offsetX: number, offsetY: number): FormField | null => {
      const source = fields.find((f) => f.id === id);
      if (!source) return null;

      fieldCounter += 1;
      const newName = duplicatedName(
        source.name,
        new Set(fields.map((f) => f.name)),
      );
      const newField: FormField = {
        id: `field-${Date.now()}-${fieldCounter}`,
        name: newName,
        page: source.page,
        x: Math.max(0, source.x + offsetX),
        y: Math.max(0, source.y + offsetY),
        width: source.width,
        height: source.height,
        fontSize: source.fontSize,
        fontFamily: source.fontFamily,
      };

      setFields((prev) => [...prev, newField]);
      setSelectionIds(new Set([newField.id]));
      return newField;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fields],
  );

  const loadTemplateFields = useCallback(
    (imported: FormField[], mode: 'replace' | 'append') => {
      if (mode === 'replace') {
        const regenerated = imported.map((f) => {
          fieldCounter += 1;
          return { ...f, id: `field-${Date.now()}-${fieldCounter}` };
        });
        setFields(regenerated);
        setSelectionIds(new Set());
      } else {
        setFields((prev) => {
          const existingNames = new Set(prev.map((f) => f.name));
          const resolved: FormField[] = [];
          for (const f of imported) {
            fieldCounter += 1;
            const newName = existingNames.has(f.name)
              ? duplicatedName(f.name, existingNames)
              : f.name;
            existingNames.add(newName);
            resolved.push({ ...f, id: `field-${Date.now()}-${fieldCounter}`, name: newName });
          }
          return [...prev, ...resolved];
        });
      }
    },
    [],
  );

  return {
    fields,
    selectionIds,
    selectedFieldId,
    addField,
    updateField,
    updateFields,
    deleteField,
    selectSingle,
    clearSelection,
    toggleSelect,
    selectAll,
    setSelection,
    resetFields,
    duplicateField,
    loadTemplateFields,
  };
}
