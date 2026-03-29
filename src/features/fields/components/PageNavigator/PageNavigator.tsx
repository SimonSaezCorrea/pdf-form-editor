'use client';

import { Button } from '@/components/ui';
import styles from './PageNavigator.module.css';

interface PageNavigatorProps {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}

export function PageNavigator({ currentPage, totalPages, onPrev, onNext }: PageNavigatorProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={styles['page-navigator']}>
      <Button variant="secondary" size="sm" onClick={onPrev} disabled={currentPage <= 1} aria-label="Página anterior">
        ← Anterior
      </Button>
      <span>Página {currentPage} de {totalPages}</span>
      <Button variant="secondary" size="sm" onClick={onNext} disabled={currentPage >= totalPages} aria-label="Página siguiente">
        Siguiente →
      </Button>
    </div>
  );
}
