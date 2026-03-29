'use client';

import type { FormField } from '@/types/shared';
import styles from './FieldList.module.css';

interface FieldListProps {
  fields: FormField[];
  selectedFieldId: string | null;
  onSelect: (id: string) => void;
}

export function FieldList({ fields, selectedFieldId, onSelect }: FieldListProps) {
  return (
    <div className={styles['field-list']}>
      <h3>Fields ({fields.length})</h3>
      {fields.length === 0 ? (
        <p className={styles['field-list-empty']}>Click on the PDF to add fields.</p>
      ) : (
        fields.map((field) => (
          <div
            key={field.id}
            className={[styles['field-list-item'], field.id === selectedFieldId ? styles.selected : ''].filter(Boolean).join(' ')}
            onClick={() => onSelect(field.id)}
          >
            <span className={styles['item-name']} title={field.name}>
              {field.name}
            </span>
            <span className={styles['item-page']}>p.{field.page}</span>
          </div>
        ))
      )}
    </div>
  );
}
