import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ToolbarModes } from '../../src/components/ToolbarModes/ToolbarModes';
import type { InteractionMode } from '../../src/hooks/useInteractionMode';

describe('ToolbarModes', () => {
  it('renders three mode buttons', () => {
    const { getAllByRole } = render(
      <ToolbarModes mode="select" onModeChange={vi.fn()} />,
    );
    expect(getAllByRole('button')).toHaveLength(3);
  });

  it('marks the active mode button with the active class', () => {
    const { getByTitle } = render(
      <ToolbarModes mode="insert" onModeChange={vi.fn()} />,
    );
    expect(getByTitle('Insertar (I)')).toHaveClass('active');
    expect(getByTitle('Seleccionar (S)')).not.toHaveClass('active');
  });

  it('calls onModeChange with the correct mode when a button is clicked', () => {
    const onModeChange = vi.fn();
    const { getByTitle } = render(
      <ToolbarModes mode="select" onModeChange={onModeChange} />,
    );
    fireEvent.click(getByTitle('Mover (M)'));
    expect(onModeChange).toHaveBeenCalledWith('move');
  });

  it('calls onModeChange for each button with its correct mode', () => {
    const onModeChange = vi.fn();
    const { getByTitle } = render(
      <ToolbarModes mode="select" onModeChange={onModeChange} />,
    );
    const cases: Array<[string, InteractionMode]> = [
      ['Seleccionar (S)', 'select'],
      ['Insertar (I)', 'insert'],
      ['Mover (M)', 'move'],
    ];
    for (const [title, expectedMode] of cases) {
      fireEvent.click(getByTitle(title));
      expect(onModeChange).toHaveBeenCalledWith(expectedMode);
    }
  });
});
