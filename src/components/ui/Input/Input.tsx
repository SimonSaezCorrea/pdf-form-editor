'use client';
import React from 'react';
import styles from './Input.module.css';

interface InputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  type?: 'text' | 'number';
  placeholder?: string;
  id?: string;
  min?: number;
  max?: number;
  step?: number;
  maxLength?: number;
  className?: string;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  autoFocus?: boolean;
}

export function Input({
  value,
  onChange,
  label,
  error,
  hint,
  disabled = false,
  type = 'text',
  placeholder,
  id,
  className = '',
  ...rest
}: InputProps) {
  return (
    <div className={`${styles.wrapper} ${className}`}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className={`${styles.input} ${error ? styles.inputError : ''}`}
        {...rest}
      />
      {error && <span className={styles.error}>{error}</span>}
      {hint && !error && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}
