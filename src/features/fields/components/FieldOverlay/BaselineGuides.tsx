import styles from './BaselineGuides.module.css';

interface BaselineGuidesProps {
  /** All extracted baselines for the page, in PDF pts (bottom-left origin). */
  baselines: number[];
  /** The baseline currently being snapped to, in PDF pts. null = no active snap. */
  activeBaseline: number | null;
  renderScale: number;
  pageHeight: number;
  /**
   * Bottom edge of the field being dragged, in PDF pts.
   * null = not dragging → guides hidden.
   */
  dragPdfY: number | null;
  /** Only render guides within this many canvas px of the dragged field. */
  proximityThresholdPx?: number;
}

/**
 * Renders horizontal guide lines at text baseline positions during a field drag.
 * Must be placed inside a `position: relative/absolute` container (field-overlay).
 * Uses pointer-events: none so it never intercepts mouse/touch events.
 */
export function BaselineGuides({
  baselines,
  activeBaseline,
  renderScale,
  pageHeight,
  dragPdfY,
  proximityThresholdPx = 120,
}: BaselineGuidesProps) {
  if (dragPdfY === null || baselines.length === 0) return null;

  // Approximate canvas Y of the dragged field's top edge (used for proximity filtering)
  const fieldCanvasApproxY = (pageHeight - dragPdfY) * renderScale;

  return (
    <>
      {baselines.map((b) => {
        const canvasY = (pageHeight - b) * renderScale;
        if (Math.abs(canvasY - fieldCanvasApproxY) > proximityThresholdPx) return null;

        const isActive = b === activeBaseline;
        return (
          <div
            key={b}
            className={`${styles['guide-line']} ${isActive ? styles['guide-line--active'] : ''}`}
            style={{ top: canvasY }}
          />
        );
      })}
    </>
  );
}
