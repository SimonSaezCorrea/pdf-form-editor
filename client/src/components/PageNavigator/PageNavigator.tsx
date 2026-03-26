interface PageNavigatorProps {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}

export function PageNavigator({ currentPage, totalPages, onPrev, onNext }: PageNavigatorProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="page-navigator">
      <button onClick={onPrev} disabled={currentPage <= 1} aria-label="Página anterior">
        ← Anterior
      </button>
      <span>Página {currentPage} de {totalPages}</span>
      <button onClick={onNext} disabled={currentPage >= totalPages} aria-label="Página siguiente">
        Siguiente →
      </button>
    </div>
  );
}
