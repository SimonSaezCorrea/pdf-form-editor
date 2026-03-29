/**
 * Coordinate conversion between canvas pixels and PDF points.
 *
 * PDF coordinate system: origin bottom-left, Y increases upward, unit = PDF point (1/72 inch).
 * Canvas coordinate system: origin top-left, Y increases downward, unit = pixel.
 *
 * All canvas measurements are at the given renderScale factor relative to PDF points.
 * See research.md § 3 for derivation.
 */

export interface CanvasRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PdfRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Convert a canvas-pixel rectangle (top-left origin) to a PDF-point rectangle (bottom-left origin).
 *
 * @param canvasX      - pixels from canvas left edge (left edge of the field)
 * @param canvasY      - pixels from canvas top edge (top edge of the field)
 * @param fieldWidthPx - field width in pixels
 * @param fieldHeightPx - field height in pixels
 * @param renderScale  - the scale factor used when rendering (canvas px / PDF pt)
 * @param pdfPageHeight - page height in PDF points at scale 1 (from page.getViewport({scale:1}).height)
 */
export function canvasToPdf(
  canvasX: number,
  canvasY: number,
  fieldWidthPx: number,
  fieldHeightPx: number,
  renderScale: number,
  pdfPageHeight: number,
): PdfRect {
  const width = fieldWidthPx / renderScale;
  const height = fieldHeightPx / renderScale;
  const x = canvasX / renderScale;
  // Flip Y: canvas top → PDF bottom-left y
  const y = pdfPageHeight - canvasY / renderScale - height;
  return { x, y, width, height };
}

/**
 * Convert a PDF-point rectangle (bottom-left origin) to a canvas-pixel rectangle (top-left origin).
 *
 * @param pdfX         - PDF x coordinate (left edge of field, from page left)
 * @param pdfY         - PDF y coordinate (bottom edge of field, from page bottom)
 * @param pdfWidth     - field width in PDF points
 * @param pdfHeight    - field height in PDF points
 * @param renderScale  - the scale factor used when rendering (canvas px / PDF pt)
 * @param pdfPageHeight - page height in PDF points at scale 1
 */
export function pdfToCanvas(
  pdfX: number,
  pdfY: number,
  pdfWidth: number,
  pdfHeight: number,
  renderScale: number,
  pdfPageHeight: number,
): CanvasRect {
  return {
    left: pdfX * renderScale,
    top: (pdfPageHeight - pdfY - pdfHeight) * renderScale,
    width: pdfWidth * renderScale,
    height: pdfHeight * renderScale,
  };
}
