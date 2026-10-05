import type { Box } from '../shared/schema';

export interface Crop { sx: number; sy: number; sw: number; sh: number; clipped: boolean; }

/** Maps a CSS-pixel viewport rect to source pixels of a captureVisibleTab image. */
export function cropRect(
  rect: Box,
  viewport: { width: number; height: number },
  image: { width: number; height: number },
  pad = 8,
): Crop | null {
  const clipped = rect.x < 0 || rect.y < 0 || rect.x + rect.width > viewport.width || rect.y + rect.height > viewport.height;
  const x0 = Math.max(0, rect.x - pad);
  const y0 = Math.max(0, rect.y - pad);
  const x1 = Math.min(viewport.width, rect.x + rect.width + pad);
  const y1 = Math.min(viewport.height, rect.y + rect.height + pad);
  if (x1 <= x0 || y1 <= y0) return null;
  const kx = image.width / viewport.width;
  const ky = image.height / viewport.height;
  const sx = Math.round(x0 * kx);
  const sy = Math.round(y0 * ky);
  return {
    sx,
    sy,
    sw: Math.max(1, Math.round(x1 * kx) - sx),
    sh: Math.max(1, Math.round(y1 * ky) - sy),
    clipped,
  };
}
