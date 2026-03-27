import type { FormField } from 'pdf-form-editor-shared';
import type { HandleDirection } from '../../hooks/useFieldResize';

interface ResizeHandlesProps {
  field: FormField;
  renderScale: number;
  onHandleMouseDown: (e: React.MouseEvent, field: FormField, handle: HandleDirection) => void;
}

const HANDLES: HandleDirection[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

export function ResizeHandles({ field, onHandleMouseDown }: ResizeHandlesProps) {
  return (
    <>
      {HANDLES.map((d) => (
        <div
          key={d}
          className={`resize-handle resize-handle-${d}`}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            e.stopPropagation();
            onHandleMouseDown(e, field, d);
          }}
        />
      ))}
    </>
  );
}
