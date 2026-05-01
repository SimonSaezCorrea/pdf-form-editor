'use client';

import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import type { AcroFormField } from '../../types';
import styles from './DynamicForm.module.css';

interface DynamicFormProps {
  fields: AcroFormField[];
  values: Record<string, string>;
  onValueChange: (name: string, value: string) => void;
  onSubmit: () => void;
  generating: boolean;
}

export function DynamicForm({
  fields,
  values,
  onValueChange,
  onSubmit,
  generating,
}: DynamicFormProps) {
  return (
    <div className={styles['dynamic-form']}>
      <div className={styles['form-fields']}>
        {fields.map((field) => (
          <Input
            key={field.name}
            id={`filler-field-${field.name}`}
            label={field.name}
            value={values[field.name] ?? ''}
            onChange={(e) => onValueChange(field.name, e.target.value)}
            placeholder={`Valor para "${field.name}"`}
            disabled={generating}
          />
        ))}
      </div>
      <div className={styles['form-footer']}>
        <Button
          variant="primary"
          onClick={onSubmit}
          disabled={generating}
          loading={generating}
        >
          {generating ? 'Generando…' : 'Generar PDF'}
        </Button>
      </div>
    </div>
  );
}
