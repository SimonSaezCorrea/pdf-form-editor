'use client';
import React from 'react';
import styles from './IconButton.module.css';

type Size = 'sm' | 'md';
type Variant = 'default' | 'active' | 'danger';

interface IconButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  size?: Size;
  variant?: Variant;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
  className?: string;
}

export function IconButton({
  icon,
  label,
  onClick,
  size = 'md',
  variant = 'default',
  disabled = false,
  type = 'button',
  title,
  className = '',
}: IconButtonProps) {
  const cls = [
    styles.iconButton,
    styles[size],
    styles[variant],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={cls}
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={title ?? label}
    >
      {icon}
    </button>
  );
}
