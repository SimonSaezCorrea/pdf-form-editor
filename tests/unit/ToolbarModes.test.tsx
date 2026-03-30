import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ToolbarModes } from '@/features/toolbar/components/ToolbarModes/ToolbarModes';
import type { InteractionMode } from '@/hooks/useInteractionMode';

describe('ToolbarModes', () => {
  it('renders three mode buttons', () => {
    const { getAllByRole } = render(
      <ToolbarModes mode="select" onModeChange={vi.fn()} />,
    );
    expect(getAllByRole('button')).toHaveLength(3);
  });

  it('marks the active mode button with the active class', () => {
    const { getByText } = render(
      <ToolbarModes mode="insert" onModeChange={vi.fn()} />,
    );
    expect(getByText('Insertar')).toHaveClass('active');
    expect(getByText('Seleccionar')).not.toHaveClass('active');
  });

  it('calls onModeChange with the correct mode when a button is clicked', () => {
    const onModeChange = vi.fn();
    const { getByText } = render(
      <ToolbarModes mode="select" onModeChange={onModeChange} />,
    );
    fireEvent.click(getByText('Mover'));
    expect(onModeChange).toHaveBeenCalledWith('move');
  });

  it('calls onModeChange for each button with its correct mode', () => {
    const onModeChange = vi.fn();
    const { getByText } = render(
      <ToolbarModes mode="select" onModeChange={onModeChange} />,
    );
    const cases: Array<[string, InteractionMode]> = [
      ['Seleccionar', 'select'],
      ['Insertar', 'insert'],
      ['Mover', 'move'],
    ];
    for (const [label, expectedMode] of cases) {
      fireEvent.click(getByText(label));
      expect(onModeChange).toHaveBeenCalledWith(expectedMode);
    }
  });
});
