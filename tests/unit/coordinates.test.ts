import { describe, test, expect } from 'vitest';
import { canvasToPdf, pdfToCanvas } from '@/features/pdf/utils/coordinates';

const PAGE_HEIGHT = 792; // Letter: 11 inches × 72 pt/inch
const SCALE = 1.5;

describe('pdfToCanvas', () => {
  test('maps PDF bottom-left to canvas top-left correctly', () => {
    const result = pdfToCanvas(72, 680, 200, 24, SCALE, PAGE_HEIGHT);
    expect(result.left).toBeCloseTo(72 * SCALE);
    expect(result.top).toBeCloseTo((PAGE_HEIGHT - 680 - 24) * SCALE);
    expect(result.width).toBeCloseTo(200 * SCALE);
    expect(result.height).toBeCloseTo(24 * SCALE);
  });

  test('field at page bottom (y=0) maps to canvas bottom', () => {
    const result = pdfToCanvas(0, 0, 100, 20, SCALE, PAGE_HEIGHT);
    expect(result.top).toBeCloseTo((PAGE_HEIGHT - 20) * SCALE);
    expect(result.left).toBe(0);
  });

  test('field at page top (y = pageHeight - fieldHeight) maps to canvas top', () => {
    const h = 20;
    const result = pdfToCanvas(0, PAGE_HEIGHT - h, 100, h, SCALE, PAGE_HEIGHT);
    expect(result.top).toBeCloseTo(0);
  });
});

describe('canvasToPdf', () => {
  test('maps canvas top-left to PDF bottom-left correctly', () => {
    const canvasX = 108;
    const canvasY = 132;
    const widthPx = 300;
    const heightPx = 36;
    const result = canvasToPdf(canvasX, canvasY, widthPx, heightPx, SCALE, PAGE_HEIGHT);
    expect(result.x).toBeCloseTo(72);
    expect(result.y).toBeCloseTo(680);
    expect(result.width).toBeCloseTo(200);
    expect(result.height).toBeCloseTo(24);
  });

  test('uses scale factor correctly (scale = 2)', () => {
    const scale = 2;
    const result = canvasToPdf(144, 264, 400, 48, scale, PAGE_HEIGHT);
    expect(result.x).toBeCloseTo(72);
    expect(result.y).toBeCloseTo(PAGE_HEIGHT - 264 / scale - 48 / scale);
  });
});

describe('round-trip: canvasToPdf ∘ pdfToCanvas = identity', () => {
  test('round-trip preserves PDF coordinates', () => {
    const pdfX = 72, pdfY = 680, pdfW = 200, pdfH = 24;
    const canvas = pdfToCanvas(pdfX, pdfY, pdfW, pdfH, SCALE, PAGE_HEIGHT);
    const back = canvasToPdf(canvas.left, canvas.top, canvas.width, canvas.height, SCALE, PAGE_HEIGHT);
    expect(back.x).toBeCloseTo(pdfX);
    expect(back.y).toBeCloseTo(pdfY);
    expect(back.width).toBeCloseTo(pdfW);
    expect(back.height).toBeCloseTo(pdfH);
  });

  test('round-trip works with scale = 1.0', () => {
    const pdfX = 36, pdfY = 100, pdfW = 150, pdfH = 18;
    const canvas = pdfToCanvas(pdfX, pdfY, pdfW, pdfH, 1.0, PAGE_HEIGHT);
    const back = canvasToPdf(canvas.left, canvas.top, canvas.width, canvas.height, 1.0, PAGE_HEIGHT);
    expect(back.x).toBeCloseTo(pdfX);
    expect(back.y).toBeCloseTo(pdfY);
  });

  test('round-trip works with fractional coordinates', () => {
    const pdfX = 123.456, pdfY = 234.567, pdfW = 99.9, pdfH = 15.5;
    const canvas = pdfToCanvas(pdfX, pdfY, pdfW, pdfH, SCALE, PAGE_HEIGHT);
    const back = canvasToPdf(canvas.left, canvas.top, canvas.width, canvas.height, SCALE, PAGE_HEIGHT);
    expect(back.x).toBeCloseTo(pdfX);
    expect(back.y).toBeCloseTo(pdfY);
    expect(back.width).toBeCloseTo(pdfW);
    expect(back.height).toBeCloseTo(pdfH);
  });
});
