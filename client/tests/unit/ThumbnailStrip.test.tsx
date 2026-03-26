import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThumbnailStrip } from '../../src/components/ThumbnailStrip/ThumbnailStrip';
import type { PDFDocumentProxy } from 'pdfjs-dist';

// Mock thumbnail generation so tests don't depend on canvas rendering
vi.mock('../../src/utils/thumbnails', () => ({
  generateThumbnail: vi.fn().mockResolvedValue('data:image/jpeg;base64,mock'),
}));

// Mock IntersectionObserver (not available in jsdom)
beforeEach(() => {
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
});

/** Minimal PDFDocumentProxy stub */
function makePdfDoc(numPages: number): PDFDocumentProxy {
  return {
    numPages,
    getPage: vi.fn().mockResolvedValue({
      getViewport: vi.fn().mockReturnValue({ width: 120, height: 168 }),
      render: vi.fn().mockReturnValue({ promise: Promise.resolve() }),
    }),
  } as unknown as PDFDocumentProxy;
}

describe('ThumbnailStrip', () => {
  test('renders exactly totalPages thumbnail slots', () => {
    const pdfDoc = makePdfDoc(5);
    render(
      <ThumbnailStrip
        pdfDoc={pdfDoc}
        totalPages={5}
        currentPage={1}
        onPageSelect={vi.fn()}
      />,
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(5);
  });

  test('the slot for currentPage has the thumbnail-active class', () => {
    const pdfDoc = makePdfDoc(5);
    render(
      <ThumbnailStrip
        pdfDoc={pdfDoc}
        totalPages={5}
        currentPage={3}
        onPageSelect={vi.fn()}
      />,
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons[2]).toHaveClass('thumbnail-active');
    expect(buttons[0]).not.toHaveClass('thumbnail-active');
    expect(buttons[4]).not.toHaveClass('thumbnail-active');
  });

  test('clicking slot N calls onPageSelect with N', () => {
    const onPageSelect = vi.fn();
    const pdfDoc = makePdfDoc(5);
    render(
      <ThumbnailStrip
        pdfDoc={pdfDoc}
        totalPages={5}
        currentPage={1}
        onPageSelect={onPageSelect}
      />,
    );
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[3]); // 0-indexed → page 4
    expect(onPageSelect).toHaveBeenCalledWith(4);
  });

  test('renders one slot per page for a 12-page PDF', () => {
    const pdfDoc = makePdfDoc(12);
    render(
      <ThumbnailStrip
        pdfDoc={pdfDoc}
        totalPages={12}
        currentPage={7}
        onPageSelect={vi.fn()}
      />,
    );
    expect(screen.getAllByRole('button')).toHaveLength(12);
    expect(screen.getAllByRole('button')[6]).toHaveClass('thumbnail-active');
  });
});
