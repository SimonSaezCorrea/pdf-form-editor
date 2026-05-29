'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styles from './Modal.module.css';

const CLOSE_DURATION = 150;

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'md' | 'lg';
}

export function Modal({ isOpen, onClose, title, children, footer, size = 'md' }: ModalProps) {
  const [rendered, setRendered] = useState(isOpen);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setClosing(false);
      setRendered(true);
    } else if (rendered) {
      setClosing(true);
      const t = setTimeout(() => {
        setClosing(false);
        setRendered(false);
      }, CLOSE_DURATION);
      return () => clearTimeout(t);
    }
  }, [isOpen, rendered]);

  const handleClose = useCallback(() => {
    setClosing(true);
    const t = setTimeout(() => {
      setClosing(false);
      setRendered(false);
      onClose();
    }, CLOSE_DURATION);
    return () => clearTimeout(t);
  }, [onClose]);

  useEffect(() => {
    if (!rendered) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [rendered, handleClose]);

  if (!rendered) return null;

  return createPortal(
    <div
      className={[styles.backdrop, closing ? styles['backdrop--out'] : ''].filter(Boolean).join(' ')}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <dialog
        className={[
          styles.dialog,
          size === 'lg' ? styles['dialog--lg'] : '',
          closing ? styles['dialog--out'] : '',
        ].filter(Boolean).join(' ')}
        open
        aria-labelledby="modal-title"
      >
        <div className={styles.header}>
          <span id="modal-title" className={styles.title}>{title}</span>
          <button className={styles.closeBtn} onClick={handleClose} aria-label="Cerrar">✕</button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </dialog>
    </div>,
    document.body,
  );
}
