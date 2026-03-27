import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ResizeHandles } from '../../src/components/FieldOverlay/ResizeHandles';
import type { FormField } from 'pdf-form-editor-shared';

const mockField: FormField = {
  id: 'field-1',
  name: 'test',
  page: 1,
  x: 10,
  y: 10,
  width: 100,
  height: 30,
  fontSize: 12,
  fontFamily: 'Helvetica',
};

describe('ResizeHandles', () => {
  it('renders exactly 8 handles', () => {
    const { container } = render(
      <ResizeHandles field={mockField} renderScale={1.5} onHandleMouseDown={vi.fn()} />,
    );
    expect(container.querySelectorAll('.resize-handle')).toHaveLength(8);
  });

  it('each handle has the resize-handle base class', () => {
    const { container } = render(
      <ResizeHandles field={mockField} renderScale={1.5} onHandleMouseDown={vi.fn()} />,
    );
    const handles = container.querySelectorAll('.resize-handle');
    handles.forEach((h) => expect(h.classList.contains('resize-handle')).toBe(true));
  });

  it('se handle has resize-handle-se class', () => {
    const { container } = render(
      <ResizeHandles field={mockField} renderScale={1.5} onHandleMouseDown={vi.fn()} />,
    );
    expect(container.querySelector('.resize-handle-se')).not.toBeNull();
  });

  it('mousedown on se handle calls onHandleMouseDown with correct direction', () => {
    const mockFn = vi.fn();
    const { container } = render(
      <ResizeHandles field={mockField} renderScale={1.5} onHandleMouseDown={mockFn} />,
    );
    const seHandle = container.querySelector('.resize-handle-se')!;
    fireEvent.mouseDown(seHandle);
    expect(mockFn).toHaveBeenCalledWith(expect.any(Object), mockField, 'se');
  });
});
