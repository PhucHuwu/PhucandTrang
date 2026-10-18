import { DESIGN_CANVAS_WIDTH, DESIGN_CANVAS_HEIGHT, computeImageFit } from '@phucandtrang/shared';

type Box = { x: number; y: number; width: number; height: number; rotation?: number };

/**
 * Shrinks an image element's box so it hugs the Polaroid card (photo + padding + caption strip),
 * keeping the visible photo size and its on-page centre unchanged. Mirrors the card maths in
 * KonvaPageCanvas / PageTextureGenerator. Konva rotates around the box's top-left corner, so the
 * new top-left is derived from the rotated centre.
 */
export function fitFrameToImage<T extends Box>(
  t: T,
  imageAspect: number,
  opts: { polaroid: boolean; padding?: number; hasCaption: boolean },
  canvasW = DESIGN_CANVAS_WIDTH,
  canvasH = DESIGN_CANVAS_HEIGHT,
): T {
  const padding = opts.polaroid ? (opts.padding ?? 14) : 0;
  const captionSpace = opts.polaroid || opts.hasCaption ? 38 : 0;
  const w = t.width * canvasW;
  const h = t.height * canvasH;
  const fit = computeImageFit(imageAspect * 1000, 1000, Math.max(10, w - padding * 2), Math.max(10, h - padding * 2 - captionSpace), 'contain', { x: 0.5, y: 0.5 });
  const nw = fit.dw + padding * 2;
  const nh = fit.dh + padding * 2 + captionSpace;

  const rad = ((t.rotation ?? 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rotate = (x: number, y: number) => [x * cos - y * sin, x * sin + y * cos];
  const [cx, cy] = rotate(w / 2, h / 2);
  const [ncx, ncy] = rotate(nw / 2, nh / 2);
  const x = t.x * canvasW + cx - ncx;
  const y = t.y * canvasH + cy - ncy;

  const round = (v: number) => parseFloat(v.toFixed(4));
  return { ...t, x: round(x / canvasW), y: round(y / canvasH), width: round(nw / canvasW), height: round(nh / canvasH) };
}

export function loadImageAspect(src: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => (img.naturalWidth && img.naturalHeight ? resolve(img.naturalWidth / img.naturalHeight) : reject(new Error('Ảnh không có kích thước')));
    img.onerror = () => reject(new Error('Không tải được ảnh'));
    img.src = src;
  });
}
