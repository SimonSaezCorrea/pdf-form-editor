'use client';
import React from 'react';
import styles from './Tooltip.module.css';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  return (
    <div className={styles.wrapper}>
      {children}
      <span className={`${styles.tip} ${styles[position]}`}>{content}</span>
    </div>
  );
}
