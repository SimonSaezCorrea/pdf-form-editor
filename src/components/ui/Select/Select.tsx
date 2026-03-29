'use client';
import React from 'react';
import styles from './Select.module.css';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: SelectOption[];
  label?: string;
  error?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function Select({
  value,
  onChange,
  options,
  label,
  error,
  disabled = false,
  id,
  className = '',
}: SelectProps) {
  return (
    <div className={`${styles.wrapper} ${className}`}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      )}
      <div className={styles.selectWrapper}>
        <select
          id={id}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`${styles.select} ${error ? styles.selectError : ''}`}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className={styles.arrow}>▾</span>
      </div>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
