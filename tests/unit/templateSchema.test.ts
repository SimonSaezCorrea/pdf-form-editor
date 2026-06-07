import { describe, it, expect } from 'vitest';
import {
  parseTemplateFile,
  isValidTemplateFile,
  serializeTemplateFile,
} from '@/features/pdf/utils/templateSchema';
import type { FormField } from '@/types/shared';

const validField: FormField = {
  id: 'field-1',
  name: 'campo1',
  page: 1,
  x: 10,
  y: 20,
  width: 100,
  height: 20,
  fontSize: 12,
  fontFamily: 'Helvetica',
};

const validTemplateJson = JSON.stringify({
  schemaVersion: 1,
  name: 'Mi Plantilla',
  createdAt: '2026-03-27T00:00:00.000Z',
  fields: [validField],
});

describe('parseTemplateFile', () => {
  it('parses a valid template JSON', () => {
    const result = parseTemplateFile(validTemplateJson);
    expect(result.name).toBe('Mi Plantilla');
    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].name).toBe('campo1');
  });

  it('throws on JSON syntax error', () => {
    expect(() => parseTemplateFile('{not valid json')).toThrowError(/Error de sintaxis JSON/);
  });

  it('throws when fields key is missing', () => {
    const json = JSON.stringify({ schemaVersion: 1, name: 'x', createdAt: '2026-01-01' });
    expect(() => parseTemplateFile(json)).toThrowError(/falta el campo 'fields'/);
  });

  it('throws for invalid field at index 0', () => {
    const json = JSON.stringify({
      schemaVersion: 1,
      name: 'x',
      createdAt: '2026-01-01',
      fields: [{ id: 'f1', name: '', page: 1, x: 0, y: 0, width: 100, height: 20, fontSize: 12, fontFamily: 'Helvetica' }],
    });
    expect(() => parseTemplateFile(json)).toThrowError(/Campo en posición \[0\]/);
  });
});

describe('isValidTemplateFile', () => {
  it('returns true for a valid template object', () => {
    const parsed = JSON.parse(validTemplateJson) as unknown;
    expect(isValidTemplateFile(parsed)).toBe(true);
  });

  it('returns false for null', () => {
    expect(isValidTemplateFile(null)).toBe(false);
  });

  it('returns false for missing name', () => {
    expect(
      isValidTemplateFile({
        schemaVersion: 1,
        createdAt: '2026-01-01',
        fields: [],
      }),
    ).toBe(false);
  });

  it('returns false for invalid fontFamily in fields', () => {
    expect(
      isValidTemplateFile({
        schemaVersion: 1,
        name: 'x',
        createdAt: '2026-01-01',
        fields: [{ ...validField, fontFamily: 'Arial' }],
      }),
    ).toBe(false);
  });
});

describe('serializeTemplateFile', () => {
  it('produces valid JSON that round-trips via parseTemplateFile', () => {
    const fields: FormField[] = [validField];
    const json = serializeTemplateFile('test', fields);
    const result = parseTemplateFile(json);
    expect(result.schemaVersion).toBe(3);
    expect(result.name).toBe('test');
    expect(result.fields).toHaveLength(1);
    expect(result.fields[0]).toMatchObject({
      name: validField.name,
      page: validField.page,
      x: validField.x,
      y: validField.y,
      width: validField.width,
      height: validField.height,
      fontSize: validField.fontSize,
      fontFamily: validField.fontFamily,
    });
  });

  it('uses 2-space indentation', () => {
    const json = serializeTemplateFile('x', []);
    expect(json).toContain('  "schemaVersion"');
  });

  it('groups behavior flags into general/position/typography (no behavior block)', () => {
    const field: FormField = {
      ...validField,
      value: 'hola',
      required: true,
      multiline: true,
      locked: true,
      showBorder: true,
      autoFitFont: true,
    };
    const parsed = JSON.parse(serializeTemplateFile('t', [field])) as Record<string, unknown>;
    const f = (parsed.fields as Record<string, unknown>[])[0];
    expect(f).not.toHaveProperty('behavior');
    expect(f.general).toMatchObject({ name: 'campo1', value: 'hola', required: true, multiline: true, locked: true });
    expect(f.position).toMatchObject({ showBorder: true });
    expect(f.typography).toMatchObject({ autoFitFont: true });
  });

  it('round-trips v3 flags back to a flat FormField', () => {
    const field: FormField = {
      ...validField,
      required: true,
      showBorder: true,
      autoFitFont: true,
      multiline: true,
      locked: true,
    };
    const result = parseTemplateFile(serializeTemplateFile('t', [field]));
    expect(result.fields[0]).toMatchObject({
      required: true,
      showBorder: true,
      autoFitFont: true,
      multiline: true,
      locked: true,
    });
  });
});

describe('legacy schema compatibility', () => {
  it('still parses a v2 (behavior block) template', () => {
    const v2 = JSON.stringify({
      schemaVersion: 2,
      name: 'legacy',
      createdAt: '2026-01-01',
      fields: [{
        id: 'f1',
        name: 'campo1',
        fieldType: 'text',
        group: 'General',
        position: { page: 1, x: 10, y: 20, width: 100, height: 20 },
        typography: { fontFamily: 'Helvetica', fontSize: 12 },
        behavior: { value: 'v', required: true, locked: false, showBorder: true, autoFitFont: false, multiline: true },
      }],
    });
    const result = parseTemplateFile(v2);
    expect(result.schemaVersion).toBe(2);
    expect(result.fields[0]).toMatchObject({ name: 'campo1', value: 'v', required: true, showBorder: true, multiline: true });
  });
});
