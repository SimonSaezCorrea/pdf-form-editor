import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { generateThumbnail } from '../../utils/thumbnails';

/** PDFs with more pages than this threshold use lazy (IntersectionObserver) loading */
const EAGER_THRESHOLD = 20;

interface ThumbnailSlotProps {
  pdfDoc: PDFDocumentProxy;
  pageNum: number;
  isActive: boolean;
  isLazy: boolean;
  onSelect: (page: number) => void;
}

function ThumbnailSlot({ pdfDoc, pageNum, isActive, isLazy, onSelect }: ThumbnailSlotProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;

    if (!isLazy) {
      // Eager: generate immediately; silently ignore cancellations (slot shows placeholder)
      generateThumbnail(pdfDoc, pageNum)
        .then((url) => { if (!cancelled) setDataUrl(url); })
        .catch(() => { /* render failed — placeholder stays */ });
      return () => { cancelled = true; };
    }

    // Lazy: generate only when the slot scrolls into view
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          generateThumbnail(pdfDoc, pageNum)
            .then((url) => { if (!cancelled) setDataUrl(url); })
            .catch(() => { /* render failed — placeholder stays */ });
        }
      },
      { rootMargin: '50px' },
    );

    if (buttonRef.current) observer.observe(buttonRef.current);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [pdfDoc, pageNum, isLazy]);

  return (
    <button
      ref={buttonRef}
      className={`thumbnail-slot${isActive ? ' thumbnail-active' : ''}`}
      onClick={() => onSelect(pageNum)}
      title={`Página ${pageNum}`}
      aria-label={`Ir a página ${pageNum}`}
      aria-pressed={isActive}
    >
      {dataUrl ? (
        <img src={dataUrl} alt={`Página ${pageNum}`} />
      ) : (
        <span className="thumbnail-placeholder">{pageNum}</span>
      )}
      <span className="thumbnail-label">{pageNum}</span>
    </button>
  );
}

interface ThumbnailStripProps {
  pdfDoc: PDFDocumentProxy;
  totalPages: number;
  currentPage: number;
  onPageSelect: (page: number) => void;
}

export function ThumbnailStrip({ pdfDoc, totalPages, currentPage, onPageSelect }: ThumbnailStripProps) {
  const isLazy = totalPages > EAGER_THRESHOLD;

  return (
    <div className="thumbnail-strip" aria-label="Miniaturas de páginas">
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
        <ThumbnailSlot
          key={pageNum}
          pdfDoc={pdfDoc}
          pageNum={pageNum}
          isActive={pageNum === currentPage}
          isLazy={isLazy}
          onSelect={onPageSelect}
        />
      ))}
    </div>
  );
}
