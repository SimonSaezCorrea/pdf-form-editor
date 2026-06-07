import { describe, it, expect } from 'vitest';
import { orderGroups, GROUP_ORDER } from '@/features/filler/config/groups';

describe('orderGroups', () => {
  it('orders known groups by GROUP_ORDER, not by input order', () => {
    expect(orderGroups(['Finanzas', 'Datos Personales', 'Contacto'])).toEqual([
      'Datos Personales',
      'Contacto',
      'Finanzas',
    ]);
  });

  it('always places General last', () => {
    expect(orderGroups(['General', 'Contacto'])).toEqual(['Contacto', 'General']);
  });

  it('places unknown groups after known ones, before General', () => {
    expect(orderGroups(['General', 'Mascotas', 'Contacto'])).toEqual([
      'Contacto',
      'Mascotas',
      'General',
    ]);
  });

  it('sorts multiple unknown groups alphabetically', () => {
    expect(orderGroups(['Zeta', 'Alfa', 'Mascotas'])).toEqual([
      'Alfa',
      'Mascotas',
      'Zeta',
    ]);
  });

  it('combines all rules: listed → unlisted (alpha) → General', () => {
    const input = ['General', 'Zeta', 'Finanzas', 'Alfa', 'Datos Personales'];
    expect(orderGroups(input)).toEqual([
      'Datos Personales',
      'Finanzas',
      'Alfa',
      'Zeta',
      'General',
    ]);
  });

  it('omits known groups that are not present', () => {
    expect(orderGroups(['Finanzas'])).toEqual(['Finanzas']);
  });

  it('omits General when not present', () => {
    expect(orderGroups(['Contacto', 'Mascotas'])).toEqual(['Contacto', 'Mascotas']);
  });

  it('returns empty array for empty input', () => {
    expect(orderGroups([])).toEqual([]);
  });

  it('handles only General', () => {
    expect(orderGroups(['General'])).toEqual(['General']);
  });

  it('does not duplicate when input has all categories including unknowns', () => {
    const result = orderGroups(['General', 'Contacto', 'Otros', 'Datos Personales']);
    expect(result).toEqual(['Datos Personales', 'Contacto', 'Otros', 'General']);
    expect(new Set(result).size).toBe(result.length);
  });

  it('GROUP_ORDER ends with General (invariant the fallback relies on)', () => {
    expect(GROUP_ORDER[GROUP_ORDER.length - 1]).toBe('General');
  });
});
