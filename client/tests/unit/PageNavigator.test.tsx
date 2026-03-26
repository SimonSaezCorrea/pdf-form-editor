import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PageNavigator } from '../../src/components/PageNavigator/PageNavigator';

describe('PageNavigator', () => {
  test('returns null when totalPages is 1', () => {
    const { container } = render(
      <PageNavigator currentPage={1} totalPages={1} onPrev={vi.fn()} onNext={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  test('returns null when totalPages is 0', () => {
    const { container } = render(
      <PageNavigator currentPage={1} totalPages={0} onPrev={vi.fn()} onNext={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  test('Previous is disabled and Next is enabled on the first page', () => {
    render(
      <PageNavigator currentPage={1} totalPages={5} onPrev={vi.fn()} onNext={vi.fn()} />,
    );
    expect(screen.getByLabelText('Página anterior')).toBeDisabled();
    expect(screen.getByLabelText('Página siguiente')).toBeEnabled();
  });

  test('Next is disabled and Previous is enabled on the last page', () => {
    render(
      <PageNavigator currentPage={5} totalPages={5} onPrev={vi.fn()} onNext={vi.fn()} />,
    );
    expect(screen.getByLabelText('Página anterior')).toBeEnabled();
    expect(screen.getByLabelText('Página siguiente')).toBeDisabled();
  });

  test('both buttons are enabled on a middle page', () => {
    render(
      <PageNavigator currentPage={3} totalPages={5} onPrev={vi.fn()} onNext={vi.fn()} />,
    );
    expect(screen.getByLabelText('Página anterior')).toBeEnabled();
    expect(screen.getByLabelText('Página siguiente')).toBeEnabled();
  });

  test('displays correct "Página X de N" label', () => {
    render(
      <PageNavigator currentPage={2} totalPages={5} onPrev={vi.fn()} onNext={vi.fn()} />,
    );
    expect(screen.getByText('Página 2 de 5')).toBeInTheDocument();
  });

  test('calls onPrev when Previous is clicked', () => {
    const onPrev = vi.fn();
    render(
      <PageNavigator currentPage={3} totalPages={5} onPrev={onPrev} onNext={vi.fn()} />,
    );
    fireEvent.click(screen.getByLabelText('Página anterior'));
    expect(onPrev).toHaveBeenCalledOnce();
  });

  test('calls onNext when Next is clicked', () => {
    const onNext = vi.fn();
    render(
      <PageNavigator currentPage={3} totalPages={5} onPrev={vi.fn()} onNext={onNext} />,
    );
    fireEvent.click(screen.getByLabelText('Página siguiente'));
    expect(onNext).toHaveBeenCalledOnce();
  });
});
