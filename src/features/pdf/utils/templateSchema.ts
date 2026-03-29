import type { FormField, FontFamily } from '@/types/shared';

export interface TemplateFile {
  schemaVersion: 1;
  name: string;
  createdAt: string;
  fields: FormField[];
}

const VALID_FONT_FAMILIES: FontFamily[] = ['Helvetica', 'TimesRoman', 'Courier'];

function isValidField(value: unknown, index: number): value is FormField {
  if (typeof value !== 'object' || value === null) return false;
  const f = value as Record<string, unknown>;

  if (typeof f.id !== 'string') return false;
  if (typeof f.name !== 'string' || f.name.length === 0 || f.name.length > 128) return false;
  if (typeof f.page !== 'number' || !Number.isInteger(f.page) || f.page < 1) return false;
  if (typeof f.x !== 'number' || f.x < 0) return false;
  if (typeof f.y !== 'number' || f.y < 0) return false;
  if (typeof f.width !== 'number' || f.width <= 0) return false;
  if (typeof f.height !== 'number' || f.height <= 0) return false;
  if (
    typeof f.fontSize !== 'number' ||
    !Number.isInteger(f.fontSize) ||
    f.fontSize < 6 ||
    f.fontSize > 72
  )
    return false;
  if (!VALID_FONT_FAMILIES.includes(f.fontFamily as FontFamily)) return false;
  if (f.value !== undefined && typeof f.value !== 'string') return false;

  void index;
  return true;
}

export function isValidTemplateFile(data: unknown): data is TemplateFile {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;

  if (d.schemaVersion !== undefined && d.schemaVersion !== 1) return false;
  if (typeof d.name !== 'string' || d.name.length === 0) return false;
  if (typeof d.createdAt !== 'string' || d.createdAt.length === 0) return false;
  if (!Array.isArray(d.fields)) return false;
  for (let i = 0; i < d.fields.length; i++) {
    if (!isValidField(d.fields[i], i)) return false;
  }
  return true;
}

export function parseTemplateFile(json: string): TemplateFile {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch (err) {
    throw new Error(`Error de sintaxis JSON: ${(err as Error).message}`);
  }

  if (typeof data !== 'object' || data === null) {
    throw new Error("Plantilla inválida: falta el campo 'fields'");
  }

  const d = data as Record<string, unknown>;

  if (!('fields' in d)) {
    throw new Error("Plantilla inválida: falta el campo 'fields'");
  }

  if (!Array.isArray(d.fields)) {
    throw new Error("Plantilla inválida: 'fields' debe ser un array");
  }

  for (let i = 0; i < d.fields.length; i++) {
    if (!isValidField(d.fields[i], i)) {
      const f = d.fields[i] as Record<string, unknown> | null;
      let prop = 'desconocido';
      if (typeof f !== 'object' || f === null) {
        prop = 'tipo';
      } else if (typeof f.id !== 'string') {
        prop = 'id';
      } else if (typeof f.name !== 'string' || f.name.length === 0 || f.name.length > 128) {
        prop = 'name';
      } else if (typeof f.page !== 'number' || !Number.isInteger(f.page) || f.page < 1) {
        prop = 'page';
      } else if (typeof f.x !== 'number' || f.x < 0) {
        prop = 'x';
      } else if (typeof f.y !== 'number' || f.y < 0) {
        prop = 'y';
      } else if (typeof f.width !== 'number' || f.width <= 0) {
        prop = 'width';
      } else if (typeof f.height !== 'number' || f.height <= 0) {
        prop = 'height';
      } else if (
        typeof f.fontSize !== 'number' ||
        !Number.isInteger(f.fontSize) ||
        f.fontSize < 6 ||
        f.fontSize > 72
      ) {
        prop = 'fontSize';
      } else {
        prop = 'fontFamily';
      }
      throw new Error(`Campo en posición [${i}] es inválido: ${prop} incorrecto`);
    }
  }

  if (!isValidTemplateFile(data)) {
    throw new Error("Plantilla inválida: falta el campo 'fields'");
  }

  return data;
}

export function serializeTemplateFile(name: string, fields: FormField[]): string {
  const file: TemplateFile = {
    schemaVersion: 1,
    name,
    createdAt: new Date().toISOString(),
    fields,
  };
  return JSON.stringify(file, null, 2);
}
