import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ToolbarModes } from '@/features/toolbar/components/ToolbarModes/ToolbarModes';

describe('ToolbarModes', () => {
  it('renders two mode buttons (Seleccionar, Mover)', () => {
    const { getByText } = render(
      <ToolbarModes mode="select" onModeChange={vi.fn()} />,
    );
    expect(getByText('Seleccionar')).toBeTruthy();
    expect(getByText('Mover')).toBeTruthy();
  });

  it('marks the active mode button with the active class', () => {
    const { getByText } = render(
      <ToolbarModes mode="move" onModeChange={vi.fn()} />,
    );
    expect(getByText('Mover')).toHaveClass('active');
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

  it('clicking a type chip enters insert mode with that type', () => {
    const onModeChange = vi.fn();
    const onInsertTypeChange = vi.fn();
    const { getByText } = render(
      <ToolbarModes
        mode="select"
        onModeChange={onModeChange}
        insertType="text"
        onInsertTypeChange={onInsertTypeChange}
      />,
    );
    fireEvent.click(getByText('Número'));
    expect(onInsertTypeChange).toHaveBeenCalledWith('number');
    expect(onModeChange).toHaveBeenCalledWith('insert');
  });
});
