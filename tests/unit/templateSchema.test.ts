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
    expect(result.schemaVersion).toBe(1);
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
});
