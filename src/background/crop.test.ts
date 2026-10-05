import { describe, expect, it } from 'vitest';
import { cropRect } from './crop';

const vp = { width: 1000, height: 800 };

describe('cropRect', () => {
  it('pads and scales to image pixels', () => {
    expect(cropRect({ x: 100, y: 50, width: 200, height: 40 }, vp, { width: 2000, height: 1600 }))
      .toEqual({ sx: 184, sy: 84, sw: 432, sh: 112, clipped: false });
  });

  it('clamps to the viewport and flags clipping', () => {
    expect(cropRect({ x: -20, y: 780, width: 100, height: 40 }, vp, { width: 1000, height: 800 }))
      .toEqual({ sx: 0, sy: 772, sw: 88, sh: 28, clipped: true });
  });

  it('returns null for elements fully outside the viewport', () => {
    expect(cropRect({ x: 1200, y: 10, width: 50, height: 50 }, vp, { width: 1000, height: 800 })).toBeNull();
  });
});
