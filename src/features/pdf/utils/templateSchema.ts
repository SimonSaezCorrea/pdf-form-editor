import type { FormField, FontFamily, FieldTypeId } from '@/types/shared';

// ── v1: flat (legacy, read-only) ───────────────────────────────────────────
export interface TemplateFileV1 {
  schemaVersion: 1;
  name: string;
  createdAt: string;
  fields: FormField[];
}

// ── v2: nested sub-objects with a single `behavior` block (legacy, read-only) ─
export interface TemplateFieldV2 {
  id: string;
  name: string;
  fieldType: FieldTypeId;
  group: string;
  position: {
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  typography: {
    fontFamily: FontFamily;
    fontSize: number;
    displayFont?: string;
  };
  behavior: {
    value: string;
    required: boolean;
    locked: boolean;
    showBorder: boolean;
    autoFitFont: boolean;
    multiline: boolean;
  };
}

export interface TemplateFileV2 {
  schemaVersion: 2;
  name: string;
  createdAt: string;
  fields: TemplateFieldV2[];
}

// ── v3: behavior props folded into their matching UI section ────────────────
// Mirrors the editor's PropertiesPanel layout/order: General → Posición y
// tamaño → Tipografía. There is no standalone `behavior` block — each flag
// lives in the section it belongs to.
export interface TemplateFieldV3 {
  id: string;
  general: {
    name: string;
    fieldType: FieldTypeId;
    group: string;
    value: string;
    required: boolean;
    multiline: boolean;
    locked: boolean;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    bakeValue?: boolean;
  };
  position: {
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
    showBorder: boolean;
  };
  typography: {
    fontFamily: FontFamily;
    fontSize: number;
    displayFont?: string;
    autoFitFont: boolean;
  };
}

export interface TemplateFileV3 {
  schemaVersion: 3;
  name: string;
  createdAt: string;
  fields: TemplateFieldV3[];
}

export type TemplateFile = TemplateFileV1 | TemplateFileV2 | TemplateFileV3;

export interface ParsedTemplate {
  schemaVersion: 1 | 2 | 3;
  name: string;
  createdAt: string;
  fields: FormField[];
}

// ── Validation ─────────────────────────────────────────────────────────────

const VALID_FONT_FAMILIES: Set<string> = new Set(['Helvetica', 'TimesRoman', 'Courier']);

function isValidFieldV1(value: unknown): value is FormField {
  if (typeof value !== 'object' || value === null) return false;
  const f = value as Record<string, unknown>;
  if (typeof f.id !== 'string') return false;
  if (typeof f.name !== 'string' || f.name.length === 0 || f.name.length > 128) return false;
  if (typeof f.page !== 'number' || !Number.isInteger(f.page) || f.page < 1) return false;
  if (typeof f.x !== 'number' || f.x < 0) return false;
  if (typeof f.y !== 'number' || f.y < 0) return false;
  if (typeof f.width !== 'number' || f.width <= 0) return false;
  if (typeof f.height !== 'number' || f.height <= 0) return false;
  if (typeof f.fontSize !== 'number' || !Number.isInteger(f.fontSize) || f.fontSize < 6 || f.fontSize > 72) return false;
  if (!VALID_FONT_FAMILIES.has(f.fontFamily as string)) return false;
  if (f.value !== undefined && typeof f.value !== 'string') return false;
  return true;
}

function isValidFieldV2(value: unknown): value is TemplateFieldV2 {
  if (typeof value !== 'object' || value === null) return false;
  const f = value as Record<string, unknown>;
  if (typeof f.id !== 'string') return false;
  if (typeof f.name !== 'string' || f.name.length === 0) return false;
  const pos = f.position as Record<string, unknown> | undefined;
  if (typeof pos !== 'object' || pos === null) return false;
  if (typeof pos.page !== 'number' || typeof pos.x !== 'number' || typeof pos.y !== 'number') return false;
  if (typeof pos.width !== 'number' || typeof pos.height !== 'number') return false;
  const typo = f.typography as Record<string, unknown> | undefined;
  if (typeof typo !== 'object' || typo === null) return false;
  if (!VALID_FONT_FAMILIES.has(typo.fontFamily as string)) return false;
  if (typeof typo.fontSize !== 'number') return false;
  return true;
}

function isValidFieldV3(value: unknown): value is TemplateFieldV3 {
  if (typeof value !== 'object' || value === null) return false;
  const f = value as Record<string, unknown>;
  if (typeof f.id !== 'string') return false;
  const general = f.general as Record<string, unknown> | undefined;
  if (typeof general !== 'object' || general === null) return false;
  if (typeof general.name !== 'string' || general.name.length === 0) return false;
  const pos = f.position as Record<string, unknown> | undefined;
  if (typeof pos !== 'object' || pos === null) return false;
  if (typeof pos.page !== 'number' || typeof pos.x !== 'number' || typeof pos.y !== 'number') return false;
  if (typeof pos.width !== 'number' || typeof pos.height !== 'number') return false;
  const typo = f.typography as Record<string, unknown> | undefined;
  if (typeof typo !== 'object' || typo === null) return false;
  if (!VALID_FONT_FAMILIES.has(typo.fontFamily as string)) return false;
  if (typeof typo.fontSize !== 'number') return false;
  return true;
}

export function isValidTemplateFile(data: unknown): data is TemplateFile {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  if (typeof d.name !== 'string' || d.name.length === 0) return false;
  if (typeof d.createdAt !== 'string' || d.createdAt.length === 0) return false;
  if (!Array.isArray(d.fields)) return false;
  if (d.schemaVersion === 3) return d.fields.every(isValidFieldV3);
  if (d.schemaVersion === 2) return d.fields.every(isValidFieldV2);
  return d.fields.every(isValidFieldV1);
}

// ── Flatten v2 / v3 → FormField ────────────────────────────────────────────

function flattenV2Field(f: TemplateFieldV2): FormField {
  return {
    id: f.id,
    name: f.name,
    fieldType: f.fieldType ?? 'text',
    group: f.group ?? '',
    page: f.position.page,
    x: f.position.x,
    y: f.position.y,
    width: f.position.width,
    height: f.position.height,
    fontFamily: f.typography.fontFamily,
    fontSize: f.typography.fontSize,
    ...( f.typography.displayFont ? { displayFont: f.typography.displayFont } : {}),
    value: f.behavior.value ?? '',
    required: f.behavior.required ?? false,
    locked: f.behavior.locked ?? false,
    showBorder: f.behavior.showBorder ?? false,
    autoFitFont: f.behavior.autoFitFont ?? false,
    multiline: f.behavior.multiline ?? false,
  };
}

function flattenV3Field(f: TemplateFieldV3): FormField {
  return {
    id: f.id,
    name: f.general.name,
    fieldType: f.general.fieldType ?? 'text',
    group: f.general.group ?? '',
    value: f.general.value ?? '',
    required: f.general.required ?? false,
    multiline: f.general.multiline ?? false,
    locked: f.general.locked ?? false,
    bold: f.general.bold ?? false,
    italic: f.general.italic ?? false,
    underline: f.general.underline ?? false,
    strikethrough: f.general.strikethrough ?? false,
    bakeValue: f.general.bakeValue ?? true,
    page: f.position.page,
    x: f.position.x,
    y: f.position.y,
    width: f.position.width,
    height: f.position.height,
    showBorder: f.position.showBorder ?? false,
    fontFamily: f.typography.fontFamily,
    fontSize: f.typography.fontSize,
    ...(f.typography.displayFont ? { displayFont: f.typography.displayFont } : {}),
    autoFitFont: f.typography.autoFitFont ?? false,
  };
}

// ── Parse ──────────────────────────────────────────────────────────────────

function invalidFieldProp(f: Record<string, unknown>): string {
  if (typeof f.id !== 'string') return 'id';
  if (typeof f.name !== 'string' || f.name.length === 0) return 'name';
  if (typeof f.page !== 'number') return 'page';
  if (typeof f.x !== 'number') return 'x';
  if (typeof f.y !== 'number') return 'y';
  if (typeof f.width !== 'number') return 'width';
  if (typeof f.height !== 'number') return 'height';
  if (typeof f.fontSize !== 'number') return 'fontSize';
  return 'fontFamily';
}

function parseV3Fields(raw: unknown[]): FormField[] {
  return raw.map((item, i) => {
    if (!isValidFieldV3(item)) throw new TypeError(`Campo v3 [${i}] inválido`);
    return flattenV3Field(item);
  });
}

function parseV2Fields(raw: unknown[]): FormField[] {
  return raw.map((item, i) => {
    if (!isValidFieldV2(item)) throw new TypeError(`Campo v2 [${i}] inválido`);
    return flattenV2Field(item);
  });
}

function parseV1Fields(raw: unknown[]): FormField[] {
  return raw.map((item, i) => {
    if (isValidFieldV1(item)) return item;
    const f = typeof item === 'object' && item !== null
      ? item as Record<string, unknown>
      : {};
    throw new TypeError(`Campo en posición [${i}] es inválido: ${invalidFieldProp(f)}`);
  });
}

export function parseTemplateFile(json: string): ParsedTemplate {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch (err) {
    throw new TypeError(`Error de sintaxis JSON: ${(err as Error).message}`);
  }

  if (typeof data !== 'object' || data === null) {
    throw new TypeError('Plantilla inválida: formato incorrecto');
  }

  const d = data as Record<string, unknown>;
  const name = typeof d.name === 'string' ? d.name : 'plantilla';
  const createdAt = typeof d.createdAt === 'string' ? d.createdAt : '';

  if (!Array.isArray(d.fields)) {
    throw new TypeError("Plantilla inválida: falta el campo 'fields'");
  }

  if (d.schemaVersion === 3) {
    return { schemaVersion: 3, name, createdAt, fields: parseV3Fields(d.fields) };
  }
  if (d.schemaVersion === 2) {
    return { schemaVersion: 2, name, createdAt, fields: parseV2Fields(d.fields) };
  }

  return { schemaVersion: 1, name, createdAt, fields: parseV1Fields(d.fields) };
}

// ── Serialize → v3 ─────────────────────────────────────────────────────────

function toV3Field(f: FormField): TemplateFieldV3 {
  return {
    id: f.id,
    general: {
      name: f.name,
      fieldType: f.fieldType ?? 'text',
      group: f.group?.trim() || 'General',
      value: f.value ?? '',
      required: f.required ?? false,
      multiline: f.multiline ?? false,
      locked: f.locked ?? false,
      bold: f.bold ?? false,
      italic: f.italic ?? false,
      underline: f.underline ?? false,
      strikethrough: f.strikethrough ?? false,
      bakeValue: f.bakeValue ?? true,
    },
    position: {
      page: f.page,
      x: f.x,
      y: f.y,
      width: f.width,
      height: f.height,
      showBorder: f.showBorder ?? false,
    },
    typography: {
      fontFamily: f.fontFamily,
      fontSize: f.fontSize,
      ...(f.displayFont ? { displayFont: f.displayFont } : {}),
      autoFitFont: f.autoFitFont ?? false,
    },
  };
}

export function serializeTemplateFile(name: string, fields: FormField[]): string {
  const file: TemplateFileV3 = {
    schemaVersion: 3,
    name,
    createdAt: new Date().toISOString(),
    fields: fields.map(toV3Field),
  };
  return JSON.stringify(file, null, 2);
}
