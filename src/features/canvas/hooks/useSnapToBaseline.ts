import { useCallback } from 'react';

/**
 * Fraction of fontSize that the text baseline sits above the field's bottom edge.
 * For standard AcroForm fields rendered by pdf-lib, ~0.2 gives a good match
 * for most fonts (e.g. for fontSize=12, baseline ≈ field.y + 2.4pt from bottom).
 */
const BASELINE_FACTOR = 0.2;

export interface SnapResult {
  /** New field.y (bottom edge, PDF pts) after snap is applied. */
  snappedPdfY: number;
  /** The PDF-space baseline being snapped to, or null if no snap triggered. */
  activeBaseline: number | null;
}

/**
 * Returns a memoized snap function.
 *
 * Given a candidate field.y (PDF pts) and the field's height + fontSize,
 * the function finds the nearest extracted PDF text baseline within
 * `snapThresholdPx` canvas pixels and returns the adjusted field.y.
 *
 * Baselines come from useTextBaselines (PDF user space, scale=1).
 * renderScale is used only to convert the pixel threshold to PDF points.
 */
export function useSnapToBaseline(
  baselines: number[],
  renderScale: number,
  snapThresholdPx = 8,
): (candidatePdfY: number, fieldHeightPt: number, fontSizePt: number) => SnapResult {
  return useCallback(
    (candidatePdfY: number, _fieldHeightPt: number, fontSizePt: number): SnapResult => {
      if (baselines.length === 0) {
        return { snappedPdfY: candidatePdfY, activeBaseline: null };
      }

      // The field's text baseline in PDF space
      const candidateBaseline = candidatePdfY + fontSizePt * BASELINE_FACTOR;
      const thresholdPt = snapThresholdPx / renderScale;

      let closest: number | null = null;
      let closestDist = Infinity;

      for (const b of baselines) {
        const dist = Math.abs(b - candidateBaseline);
        if (dist < closestDist) {
          closestDist = dist;
          closest = b;
        }
      }

      if (closest !== null && closestDist <= thresholdPt) {
        return {
          snappedPdfY: closest - fontSizePt * BASELINE_FACTOR,
          activeBaseline: closest,
        };
      }

      return { snappedPdfY: candidatePdfY, activeBaseline: null };
    },
    [baselines, renderScale, snapThresholdPx],
  );
}
