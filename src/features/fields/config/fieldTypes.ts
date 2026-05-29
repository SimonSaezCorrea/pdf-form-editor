import type { FieldTypeId } from '@/types/shared';

export interface FieldTypeConfig {
  id: FieldTypeId;
  label: string;
  short: string;
  color: string;
}

export const FIELD_TYPE_CONFIG: FieldTypeConfig[] = [
  { id: 'text',      label: 'Texto',    short: 'T', color: '#66A5AD' },
  { id: 'number',    label: 'Número',   short: 'N', color: '#F4A261' },
  { id: 'date',      label: 'Fecha',    short: 'D', color: '#a78bfa' },
  { id: 'checkbox',  label: 'Checkbox', short: 'C', color: '#22c55e' },
  { id: 'signature', label: 'Firma',    short: 'F', color: '#ec4899' },
];

export function getFieldTypeConfig(id?: FieldTypeId): FieldTypeConfig {
  return FIELD_TYPE_CONFIG.find((t) => t.id === id) ?? FIELD_TYPE_CONFIG[0];
}
