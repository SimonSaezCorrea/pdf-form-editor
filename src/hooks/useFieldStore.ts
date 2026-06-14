'use client';

import { useState, useCallback, useRef } from 'react';
import type { FormField, FieldTypeId } from '@/types/shared';
import { canvasToPdf } from '@/features/pdf/utils/coordinates';
import { duplicatedName } from '@/features/pdf/utils/fieldName';

let fieldCounter = 0;

const MAX_HISTORY = 50;

/**
 * Per-widget keys that are NOT shared between same-name fields. Same-name fields
 * collapse into ONE AcroForm field on export, so all their *configuration* is
 * shared — only `name` (the group key) and each widget's own placement
 * (`page`/`x`/`y`/`width`/`height`) stay independent. `id` is React-only.
 */
const PER_WIDGET_KEYS = new Set<string>(['id', 'name', 'page', 'x', 'y', 'width', 'height']);

/** The shareable configuration of a field (everything except per-widget keys). */
function shareableConfig(f: FormField): Partial<Omit<FormField, 'id'>> {
  return Object.fromEntries(
    Object.entries(f).filter(([k]) => !PER_WIDGET_KEYS.has(k)),
  ) as Partial<Omit<FormField, 'id'>>;
}

export type AlignKind = 'left' | 'right' | 'center-h' | 'top' | 'bottom' | 'center-v';
export type DistributeAxis = 'h' | 'v';

export interface FieldStore {
  fields: FormField[];
  /** Full selection set — may contain 0, 1 or many IDs */
  selectionIds: ReadonlySet<string>;
  /** Derived single-selection compat: the selected ID when exactly 1 is selected, else null */
  selectedFieldId: string | null;
  /** True when fields have been modified since last export */
  isDirty: boolean;
  /** True while a drag gesture is in progress (suppresses per-event history) */
  dragging: boolean;
  canUndo: boolean;
  canRedo: boolean;
  addField: (
    pageNum: number,
    canvasX: number,
    canvasY: number,
    pdfPageHeight: number,
    renderScale: number,
    fieldType?: FieldTypeId,
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
  duplicateField: (id: string, offsetX: number, offsetY: number) => FormField | null;
  loadTemplateFields: (fields: FormField[], mode: 'replace' | 'append') => void;
  /** Move field to end of array (rendered on top) */
  bringToFront: (id: string) => void;
  /** Move field to start of array (rendered on bottom) */
  sendToBack: (id: string) => void;
  /** Toggle locked state on a field */
  toggleLock: (id: string) => void;
  /** Reorder fields array by moving fromIndex to toIndex */
  reorderFields: (fromIndex: number, toIndex: number) => void;
  /** Align all selected fields according to kind */
  alignSelected: (kind: AlignKind) => void;
  /** Distribute selected fields evenly along axis (requires ≥3 fields) */
  distributeSelected: (axis: DistributeAxis) => void;
  /** Undo last recorded snapshot */
  undo: () => void;
  /** Redo last undone snapshot */
  redo: () => void;
  /** Manually set dirty flag (e.g. clear after export) */
  setDirty: (v: boolean) => void;
  /** Record one history snapshot and mark drag start; subsequent updateField calls skip recording */
  beginDrag: () => void;
  /** Clear the dragging flag */
  endDrag: () => void;
}

/** Default field size in PDF points */
const DEFAULT_WIDTH_PT = 150;
const DEFAULT_HEIGHT_PT = 20;

export function useFieldStore(): FieldStore {
  const [fields, setFields] = useState<FormField[]>([]);
  const [selectionIds, setSelectionIds] = useState<ReadonlySet<string>>(new Set());
  const [isDirty, setIsDirty] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const undoStackRef = useRef<FormField[][]>([]);
  const redoStackRef = useRef<FormField[][]>([]);
  const draggingRef = useRef(false);
  const fieldsRef = useRef<FormField[]>([]);

  const syncFields = (next: FormField[]) => {
    fieldsRef.current = next;
    setFields(next);
  };

  const recordHistory = useCallback((snapshot: FormField[]) => {
    undoStackRef.current = [...undoStackRef.current, snapshot].slice(-MAX_HISTORY);
    redoStackRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const maybeRecord = useCallback((snapshot: FormField[]) => {
    if (draggingRef.current) return;
    recordHistory(snapshot);
  }, [recordHistory]);

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
      fieldType?: FieldTypeId,
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
        fieldType: fieldType ?? 'text',
      };

      recordHistory(fieldsRef.current);
      const next = [...fieldsRef.current, newField];
      syncFields(next);
      setSelectionIds(new Set([newField.id]));
      setIsDirty(true);
      return newField;
    },
    [recordHistory],
  );

  const updateField = useCallback(
    (id: string, partial: Partial<Omit<FormField, 'id'>>) => {
      maybeRecord(fieldsRef.current);
      const target = fieldsRef.current.find((f) => f.id === id);

      // Same-name fields collapse into one shared AcroForm field on export, so
      // ALL their configuration is shared:
      //  - editing any non-positional prop propagates to every same-name sibling;
      //  - renaming into an existing group adopts that group's full config.
      const sharedPartial = Object.fromEntries(
        Object.entries(partial).filter(([k]) => !PER_WIDGET_KEYS.has(k)),
      ) as Partial<Omit<FormField, 'id'>>;
      const hasShared = target !== undefined && Object.keys(sharedPartial).length > 0;

      const adoptInto =
        typeof partial.name === 'string' && partial.name !== target?.name
          ? fieldsRef.current.find((f) => f.id !== id && f.name === partial.name)
          : undefined;
      const adopted = adoptInto ? shareableConfig(adoptInto) : undefined;

      const next = fieldsRef.current.map((f) => {
        if (f.id === id) {
          // adopted (new group's config) first, then the explicit edit wins.
          return { ...f, ...adopted, ...partial };
        }
        if (hasShared && f.name === target?.name) {
          return { ...f, ...sharedPartial };
        }
        return f;
      });
      syncFields(next);
      setIsDirty(true);
    },
    [maybeRecord],
  );

  const updateFields = useCallback(
    (ids: string[], partial: Partial<Omit<FormField, 'id'>>) => {
      maybeRecord(fieldsRef.current);
      const idSet = new Set(ids);

      // Shared config (non-positional) also flows to same-name siblings of any
      // selected field, so duplicated fields stay in sync from multi-edits too.
      const sharedPartial = Object.fromEntries(
        Object.entries(partial).filter(([k]) => !PER_WIDGET_KEYS.has(k)),
      ) as Partial<Omit<FormField, 'id'>>;
      const selectedNames =
        Object.keys(sharedPartial).length > 0
          ? new Set(fieldsRef.current.filter((f) => idSet.has(f.id)).map((f) => f.name))
          : null;

      const next = fieldsRef.current.map((f) => {
        if (idSet.has(f.id)) return { ...f, ...partial };
        if (selectedNames?.has(f.name)) return { ...f, ...sharedPartial };
        return f;
      });
      syncFields(next);
      setIsDirty(true);
    },
    [maybeRecord],
  );

  const deleteField = useCallback((id: string) => {
    recordHistory(fieldsRef.current);
    const next = fieldsRef.current.filter((f) => f.id !== id);
    syncFields(next);
    setIsDirty(true);
    setSelectionIds((prev) => {
      if (!prev.has(id)) return prev;
      const next2 = new Set(prev);
      next2.delete(id);
      return next2;
    });
  }, [recordHistory]);

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
      setSelectionIds(new Set(fieldsRef.current.filter((f) => f.page === page).map((f) => f.id)));
    },
    [],
  );

  const setSelection = useCallback((ids: string[]) => {
    setSelectionIds(new Set(ids));
  }, []);

  const resetFields = useCallback(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    draggingRef.current = false;
    syncFields([]);
    setSelectionIds(new Set());
    setIsDirty(false);
    setDragging(false);
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  const duplicateField = useCallback(
    (id: string, offsetX: number, offsetY: number): FormField | null => {
      const source = fieldsRef.current.find((f) => f.id === id);
      if (!source) return null;

      fieldCounter += 1;
      const newName = duplicatedName(
        source.name,
        new Set(fieldsRef.current.map((f) => f.name)),
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
        fieldType: source.fieldType,
      };

      recordHistory(fieldsRef.current);
      const next = [...fieldsRef.current, newField];
      syncFields(next);
      setSelectionIds(new Set([newField.id]));
      setIsDirty(true);
      return newField;
    },
    [recordHistory],
  );

  const loadTemplateFields = useCallback(
    (imported: FormField[], mode: 'replace' | 'append') => {
      if (mode === 'replace') {
        const regenerated = imported.map((f) => {
          fieldCounter += 1;
          return { ...f, id: `field-${Date.now()}-${fieldCounter}` };
        });
        syncFields(regenerated);
        setSelectionIds(new Set());
      } else {
        const existingNames = new Set(fieldsRef.current.map((f) => f.name));
        const resolved: FormField[] = [];
        for (const f of imported) {
          fieldCounter += 1;
          const newName = existingNames.has(f.name)
            ? duplicatedName(f.name, existingNames)
            : f.name;
          existingNames.add(newName);
          resolved.push({ ...f, id: `field-${Date.now()}-${fieldCounter}`, name: newName });
        }
        const next = [...fieldsRef.current, ...resolved];
        syncFields(next);
      }
    },
    [],
  );

  const bringToFront = useCallback((id: string) => {
    recordHistory(fieldsRef.current);
    const field = fieldsRef.current.find((f) => f.id === id);
    if (!field) return;
    const next = [...fieldsRef.current.filter((f) => f.id !== id), field];
    syncFields(next);
    setIsDirty(true);
  }, [recordHistory]);

  const sendToBack = useCallback((id: string) => {
    recordHistory(fieldsRef.current);
    const field = fieldsRef.current.find((f) => f.id === id);
    if (!field) return;
    const next = [field, ...fieldsRef.current.filter((f) => f.id !== id)];
    syncFields(next);
    setIsDirty(true);
  }, [recordHistory]);

  const toggleLock = useCallback((id: string) => {
    recordHistory(fieldsRef.current);
    const next = fieldsRef.current.map((f) =>
      f.id === id ? { ...f, locked: !f.locked } : f,
    );
    syncFields(next);
    setIsDirty(true);
  }, [recordHistory]);

  const reorderFields = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const next = [...fieldsRef.current];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    recordHistory(fieldsRef.current);
    syncFields(next);
    setIsDirty(true);
  }, [recordHistory]);

  const alignSelected = useCallback(
    (kind: AlignKind) => {
      const selected = fieldsRef.current.filter((f) => selectionIds.has(f.id));
      if (selected.length < 2) return;

      const minL = Math.min(...selected.map((f) => f.x));
      const maxR = Math.max(...selected.map((f) => f.x + f.width));
      const minT = Math.min(...selected.map((f) => f.y));
      const maxB = Math.max(...selected.map((f) => f.y + f.height));
      const cx = (minL + maxR) / 2;
      const cy = (minT + maxB) / 2;

      recordHistory(fieldsRef.current);
      const next = fieldsRef.current.map((f) => {
        if (!selectionIds.has(f.id)) return f;
        switch (kind) {
          case 'left':     return { ...f, x: minL };
          case 'right':    return { ...f, x: maxR - f.width };
          case 'center-h': return { ...f, x: cx - f.width / 2 };
          case 'top':      return { ...f, y: minT };
          case 'bottom':   return { ...f, y: maxB - f.height };
          case 'center-v': return { ...f, y: cy - f.height / 2 };
        }
      });
      syncFields(next);
      setIsDirty(true);
    },
    [selectionIds, recordHistory],
  );

  const distributeSelected = useCallback(
    (axis: DistributeAxis) => {
      const selected = fieldsRef.current.filter((f) => selectionIds.has(f.id));
      if (selected.length < 3) return;

      recordHistory(fieldsRef.current);

      if (axis === 'h') {
        const sorted = [...selected].sort((a, b) => a.x - b.x);
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const totalSpan = last.x - first.x;
        const totalFieldWidths = sorted.slice(1, -1).reduce((s, f) => s + f.width, 0);
        const gap = (totalSpan - first.width - last.width - totalFieldWidths) / (sorted.length - 1);
        let cursor = first.x + first.width + gap;
        const positions = new Map<string, number>();
        for (const f of sorted.slice(1, -1)) {
          positions.set(f.id, cursor);
          cursor += f.width + gap;
        }
        const next = fieldsRef.current.map((f) => {
          const nx = positions.get(f.id);
          return nx !== undefined ? { ...f, x: nx } : f;
        });
        syncFields(next);
      } else {
        const sorted = [...selected].sort((a, b) => a.y - b.y);
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const totalSpan = last.y - first.y;
        const totalFieldHeights = sorted.slice(1, -1).reduce((s, f) => s + f.height, 0);
        const gap = (totalSpan - first.height - last.height - totalFieldHeights) / (sorted.length - 1);
        let cursor = first.y + first.height + gap;
        const positions = new Map<string, number>();
        for (const f of sorted.slice(1, -1)) {
          positions.set(f.id, cursor);
          cursor += f.height + gap;
        }
        const next = fieldsRef.current.map((f) => {
          const ny = positions.get(f.id);
          return ny !== undefined ? { ...f, y: ny } : f;
        });
        syncFields(next);
      }

      setIsDirty(true);
    },
    [selectionIds, recordHistory],
  );

  const undo = useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length === 0) return;
    const snapshot = stack[stack.length - 1];
    redoStackRef.current = [fieldsRef.current, ...redoStackRef.current].slice(0, MAX_HISTORY);
    undoStackRef.current = stack.slice(0, -1);
    syncFields(snapshot);
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);
  }, []);

  const redo = useCallback(() => {
    const stack = redoStackRef.current;
    if (stack.length === 0) return;
    const snapshot = stack[0];
    undoStackRef.current = [...undoStackRef.current, fieldsRef.current].slice(-MAX_HISTORY);
    redoStackRef.current = stack.slice(1);
    syncFields(snapshot);
    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
  }, []);

  const setDirty = useCallback((v: boolean) => {
    setIsDirty(v);
  }, []);

  const beginDrag = useCallback(() => {
    if (draggingRef.current) return;
    recordHistory(fieldsRef.current);
    draggingRef.current = true;
    setDragging(true);
  }, [recordHistory]);

  const endDrag = useCallback(() => {
    draggingRef.current = false;
    setDragging(false);
  }, []);

  return {
    fields,
    selectionIds,
    selectedFieldId,
    isDirty,
    dragging,
    canUndo,
    canRedo,
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
    bringToFront,
    sendToBack,
    toggleLock,
    reorderFields,
    alignSelected,
    distributeSelected,
    undo,
    redo,
    setDirty,
    beginDrag,
    endDrag,
  };
}
