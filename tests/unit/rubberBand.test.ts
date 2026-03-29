import { describe, it, expect } from 'vitest';
import { intersectsRect, type Rect } from '@/features/canvas/hooks/useRubberBand';

function r(left: number, top: number, right: number, bottom: number): Rect {
  return { left, top, right, bottom };
}

describe('intersectsRect', () => {
  it('returns true for fully overlapping rects', () => {
    expect(intersectsRect(r(0, 0, 100, 100), r(10, 10, 90, 90))).toBe(true);
  });

  it('returns true for partial horizontal overlap', () => {
    expect(intersectsRect(r(0, 0, 60, 60), r(40, 0, 100, 60))).toBe(true);
  });

  it('returns true for partial vertical overlap', () => {
    expect(intersectsRect(r(0, 0, 60, 60), r(0, 40, 60, 100))).toBe(true);
  });

  it('returns true for partial diagonal overlap', () => {
    expect(intersectsRect(r(0, 0, 50, 50), r(30, 30, 80, 80))).toBe(true);
  });

  it('returns false for non-overlapping rects (to the right)', () => {
    expect(intersectsRect(r(0, 0, 40, 40), r(50, 0, 90, 40))).toBe(false);
  });

  it('returns false for non-overlapping rects (below)', () => {
    expect(intersectsRect(r(0, 0, 40, 40), r(0, 50, 40, 90))).toBe(false);
  });

  it('returns false when rects only touch on an edge (right/left boundary)', () => {
    expect(intersectsRect(r(0, 0, 50, 50), r(50, 0, 100, 50))).toBe(false);
  });

  it('returns false when rects only touch on a top/bottom boundary', () => {
    expect(intersectsRect(r(0, 0, 50, 50), r(0, 50, 50, 100))).toBe(false);
  });

  it('returns true when rubber band completely contains a field', () => {
    expect(intersectsRect(r(0, 0, 200, 200), r(50, 50, 100, 100))).toBe(true);
  });

  it('returns true when a field completely contains the rubber band', () => {
    expect(intersectsRect(r(50, 50, 100, 100), r(0, 0, 200, 200))).toBe(true);
  });

  it('returns false when rubber band is entirely to the left of the field', () => {
    expect(intersectsRect(r(0, 0, 10, 100), r(20, 0, 80, 100))).toBe(false);
  });

  it('handles reversed coordinates (endX < startX — drag right-to-left)', () => {
    const normalized = r(Math.min(80, 20), Math.min(80, 20), Math.max(80, 20), Math.max(80, 20));
    expect(intersectsRect(normalized, r(30, 30, 70, 70))).toBe(true);
  });
});
