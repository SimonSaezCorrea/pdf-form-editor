import { useCallback } from 'react';

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
    (candidatePdfY: number, fieldHeightPt: number, _fontSizePt: number): SnapResult => {
      if (baselines.length === 0) {
        return { snappedPdfY: candidatePdfY, activeBaseline: null };
      }

      // Baseline sits ~30% from the field bottom: text body fills the upper portion,
      // baseline near the lower third (descenders + padding below, ascenders above).
      const baselineOffset = fieldHeightPt * 0.3;
      const candidateBaseline = candidatePdfY + baselineOffset;
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
          snappedPdfY: closest - baselineOffset,
          activeBaseline: closest,
        };
      }

      return { snappedPdfY: candidatePdfY, activeBaseline: null };
    },
    [baselines, renderScale, snapThresholdPx],
  );
}
