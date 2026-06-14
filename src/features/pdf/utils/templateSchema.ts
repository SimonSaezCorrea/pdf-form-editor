import type { FormField, FontFamily, FieldTypeId } from '@/types/shared';

type TextAlign = 'left' | 'center' | 'right';

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
  // Group order is semantic; within a group, primary keys are pinned first and
  // the rest are alphabetical (stable diffs). `position` keeps geometric order.
  general: {
    // pinned
    name: string;
    fieldType: FieldTypeId;
    value: string;
    required: boolean;
    // alphabetical
    bakeValue?: boolean;
    group: string;
    locked: boolean;
    multiline: boolean;
    /** @deprecated Legacy location — text styles now live in `typography`. Read-only fallback. */
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    align?: TextAlign;
  };
  position: {
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
    /** @deprecated Moved to `appearance.showBorder`. Read-only fallback. */
    showBorder?: boolean;
  };
  typography: {
    // pinned
    fontFamily: FontFamily;
    fontSize: number;
    displayFont?: string;
    // alphabetical
    align?: TextAlign;
    autoFitFont: boolean;
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
  };
  appearance: {
    showBorder: boolean;
  };
}

export interface TemplateFileV3 {
  schemaVersion: 3;
  name: string;
  createdAt: string;
  fields: TemplateFieldV3[];
}

// ── v4: flat identity at top + scalable semantic groups (current) ────────────
// id/name/type/value/group live at the top (the essence of a field). Everything
// else is grouped by intent so each group can grow without reshuffling:
//   - validation: input constraints (required, …future: minLength, pattern, range)
//   - behavior:   field mechanics (locked, multiline, bakeValue, …)
//   - geometry:   page + box (kept in geometric order, not alphabetical)
//   - style:      everything visual (font, text styles, alignment, border, …)
// Within groups: primary keys pinned first, rest alphabetical.
export interface TemplateFieldV4 {
  id: string;
  name: string;
  type: FieldTypeId;
  value: string;
  group: string;
  validation: {
    required: boolean;
  };
  behavior: {
    bakeValue: boolean;
    locked: boolean;
    multiline: boolean;
  };
  geometry: {
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  style: {
    fontFamily: FontFamily;
    fontSize: number;
    displayFont?: string;
    align: TextAlign;
    autoFitFont: boolean;
    bold: boolean;
    italic: boolean;
    showBorder: boolean;
    strikethrough: boolean;
    underline: boolean;
  };
}

export interface TemplateFileV4 {
  schemaVersion: 4;
  name: string;
  createdAt: string;
  fields: TemplateFieldV4[];
}

export type TemplateFile = TemplateFileV1 | TemplateFileV2 | TemplateFileV3 | TemplateFileV4;

export interface ParsedTemplate {
  schemaVersion: 1 | 2 | 3 | 4;
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

function isValidFieldV4(value: unknown): value is TemplateFieldV4 {
  if (typeof value !== 'object' || value === null) return false;
  const f = value as Record<string, unknown>;
  if (typeof f.id !== 'string') return false;
  if (typeof f.name !== 'string' || f.name.length === 0) return false;
  const geo = f.geometry as Record<string, unknown> | undefined;
  if (typeof geo !== 'object' || geo === null) return false;
  if (typeof geo.page !== 'number' || typeof geo.x !== 'number' || typeof geo.y !== 'number') return false;
  if (typeof geo.width !== 'number' || typeof geo.height !== 'number') return false;
  const style = f.style as Record<string, unknown> | undefined;
  if (typeof style !== 'object' || style === null) return false;
  if (!VALID_FONT_FAMILIES.has(style.fontFamily as string)) return false;
  if (typeof style.fontSize !== 'number') return false;
  return true;
}

export function isValidTemplateFile(data: unknown): data is TemplateFile {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  if (typeof d.name !== 'string' || d.name.length === 0) return false;
  if (typeof d.createdAt !== 'string' || d.createdAt.length === 0) return false;
  if (!Array.isArray(d.fields)) return false;
  if (d.schemaVersion === 4) return d.fields.every(isValidFieldV4);
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
    bakeValue: f.general.bakeValue ?? true,
    page: f.position.page,
    x: f.position.x,
    y: f.position.y,
    width: f.position.width,
    height: f.position.height,
    // showBorder now lives in `appearance`; fall back to the legacy position slot.
    showBorder: f.appearance?.showBorder ?? f.position.showBorder ?? false,
    fontFamily: f.typography.fontFamily,
    fontSize: f.typography.fontSize,
    ...(f.typography.displayFont ? { displayFont: f.typography.displayFont } : {}),
    autoFitFont: f.typography.autoFitFont ?? false,
    // Text styles now live in typography; fall back to the legacy general.* slot.
    bold: f.typography.bold ?? f.general.bold ?? false,
    italic: f.typography.italic ?? f.general.italic ?? false,
    underline: f.typography.underline ?? f.general.underline ?? false,
    strikethrough: f.typography.strikethrough ?? f.general.strikethrough ?? false,
    align: f.typography.align ?? f.general.align ?? 'left',
  };
}

function flattenV4Field(f: TemplateFieldV4): FormField {
  return {
    id: f.id,
    name: f.name,
    fieldType: f.type ?? 'text',
    value: f.value ?? '',
    group: f.group ?? '',
    required: f.validation?.required ?? false,
    bakeValue: f.behavior?.bakeValue ?? true,
    locked: f.behavior?.locked ?? false,
    multiline: f.behavior?.multiline ?? false,
    page: f.geometry.page,
    x: f.geometry.x,
    y: f.geometry.y,
    width: f.geometry.width,
    height: f.geometry.height,
    fontFamily: f.style.fontFamily,
    fontSize: f.style.fontSize,
    ...(f.style.displayFont ? { displayFont: f.style.displayFont } : {}),
    align: f.style.align ?? 'left',
    autoFitFont: f.style.autoFitFont ?? false,
    bold: f.style.bold ?? false,
    italic: f.style.italic ?? false,
    showBorder: f.style.showBorder ?? false,
    strikethrough: f.style.strikethrough ?? false,
    underline: f.style.underline ?? false,
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

function parseV4Fields(raw: unknown[]): FormField[] {
  return raw.map((item, i) => {
    if (!isValidFieldV4(item)) throw new TypeError(`Campo v4 [${i}] inválido`);
    return flattenV4Field(item);
  });
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

  if (d.schemaVersion === 4) {
    return { schemaVersion: 4, name, createdAt, fields: parseV4Fields(d.fields) };
  }
  if (d.schemaVersion === 3) {
    return { schemaVersion: 3, name, createdAt, fields: parseV3Fields(d.fields) };
  }
  if (d.schemaVersion === 2) {
    return { schemaVersion: 2, name, createdAt, fields: parseV2Fields(d.fields) };
  }

  return { schemaVersion: 1, name, createdAt, fields: parseV1Fields(d.fields) };
}

// ── Serialize → v4 ─────────────────────────────────────────────────────────
// Within behavior/style: primary keys pinned first, rest alphabetical (stable
// diffs). geometry stays in geometric order. Top-level identity stays flat.

function toV4Field(f: FormField): TemplateFieldV4 {
  return {
    id: f.id,
    name: f.name,
    type: f.fieldType ?? 'text',
    value: f.value ?? '',
    group: f.group?.trim() || 'General',
    validation: {
      required: f.required ?? false,
    },
    behavior: {
      // alphabetical
      bakeValue: f.bakeValue ?? true,
      locked: f.locked ?? false,
      multiline: f.multiline ?? false,
    },
    geometry: {
      page: f.page,
      x: f.x,
      y: f.y,
      width: f.width,
      height: f.height,
    },
    style: {
      // pinned
      fontFamily: f.fontFamily,
      fontSize: f.fontSize,
      ...(f.displayFont ? { displayFont: f.displayFont } : {}),
      // alphabetical
      align: f.align ?? 'left',
      autoFitFont: f.autoFitFont ?? false,
      bold: f.bold ?? false,
      italic: f.italic ?? false,
      showBorder: f.showBorder ?? false,
      strikethrough: f.strikethrough ?? false,
      underline: f.underline ?? false,
    },
  };
}

export function serializeTemplateFile(name: string, fields: FormField[]): string {
  const file: TemplateFileV4 = {
    schemaVersion: 4,
    name,
    createdAt: new Date().toISOString(),
    fields: fields.map(toV4Field),
  };
  return JSON.stringify(file, null, 2);
}
