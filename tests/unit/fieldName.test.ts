import { describe, test, expect } from 'vitest';
import { duplicatedName } from '@/features/pdf/utils/fieldName';

describe('duplicatedName', () => {
  test('returns base_2 when no conflicts exist', () => {
    expect(duplicatedName('fullname', new Set())).toBe('fullname_2');
  });

  test('increments to _3 when _2 is taken', () => {
    expect(duplicatedName('fullname', new Set(['fullname_2']))).toBe('fullname_3');
  });

  test('strips existing _N suffix before computing next suffix', () => {
    expect(duplicatedName('fullname_2', new Set(['fullname_2']))).toBe('fullname_3');
  });

  test('uses "campo" as base for empty string', () => {
    expect(duplicatedName('', new Set())).toBe('campo_2');
  });

  test('uses "campo" as base for whitespace-only string', () => {
    expect(duplicatedName('  ', new Set())).toBe('campo_2');
  });

  test('chains correctly when multiple suffixes are taken', () => {
    expect(
      duplicatedName('campo', new Set(['campo_2', 'campo_3'])),
    ).toBe('campo_4');
  });

  test('handles names that look like suffixes themselves (_2 base remains)', () => {
    expect(duplicatedName('field_2', new Set())).toBe('field_2');
  });

  test('stripping only removes the last _N segment', () => {
    expect(duplicatedName('name_part_3', new Set())).toBe('name_part_2');
  });
});
