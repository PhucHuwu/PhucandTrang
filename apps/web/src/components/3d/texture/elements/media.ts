import { ImageElement, VideoElement } from '@/types/book';
import { TextVariableResolver, VariableContext, computeImageFit } from '@phucandtrang/shared';
import { CAPTION_FONT } from '@/data/fontLoader';
import { resolveVideoPosterUrl } from '../videoPoster';

/**
 * Renders an IMAGE element with:
 * - objectFit: 'cover' | 'contain' | 'fill'
 * - focalPoint: { x, y } (0.0 to 1.0)
 * - Optional polaroid white paper card mount & washi tape
 */
export function renderImageElement(
  ctx: CanvasRenderingContext2D,
  el: ImageElement,
  boxW: number,
  boxH: number,
  imageCache: Map<string, HTMLImageElement>,
  varContext?: VariableContext
) {
  const src = el.data.src;
  if (!src) return;
  const img = imageCache.get(src);
  if (!img || img.width <= 1) return;

  const s = el.style || {};
  const usePolaroid = s.polaroidFrame !== false;
  const padding = usePolaroid ? s.padding ?? 14 : 0;
  const rawCaption = el.data.caption;
  const captionText = rawCaption
    ? varContext
      ? TextVariableResolver.resolve(rawCaption, varContext)
      : rawCaption
    : undefined;
  const captionSpace = usePolaroid || captionText ? 38 : 0;

  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  const srcRatio = el.data.aspectRatio || srcW / srcH;

  const maxImgW = Math.max(10, boxW - padding * 2);
  const maxImgH = Math.max(10, boxH - padding * 2 - captionSpace);

  const objectFit = el.data.objectFit || 'contain';
  const focalPoint = el.data.focalPoint || { x: 0.5, y: 0.5 };
  const fit = computeImageFit(srcW, srcH, maxImgW, maxImgH, objectFit, focalPoint);

  const cardW = Math.round(fit.dw + padding * 2);
  const cardH = Math.round(fit.dh + padding * 2 + captionSpace);

  if (usePolaroid) {
    // White Card Mount
    ctx.fillStyle = s.backgroundColor || '#FFFFFF';
    const r = s.borderRadius ?? 0;
    if (r > 0) {
      ctx.beginPath();
      ctx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, [r]);
      ctx.fill();
    } else {
      ctx.fillRect(-cardW / 2, -cardH / 2, cardW, cardH);
    }

    // The opaque card casts the shadow; its photo, border and tape need no duplicate blur passes.
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Border
    ctx.strokeStyle = s.borderColor || 'rgba(180, 160, 140, 0.25)';
    ctx.lineWidth = s.borderWidth ?? 1;
    if (r > 0) {
      ctx.beginPath();
      ctx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, [r]);
      ctx.stroke();
    } else {
      ctx.strokeRect(-cardW / 2, -cardH / 2, cardW, cardH);
    }
  }

  // Draw Image with exact fit coordinates
  const imgX = -cardW / 2 + padding;
  const imgY = -cardH / 2 + padding;
  ctx.drawImage(img, fit.sx, fit.sy, fit.sw, fit.sh, imgX, imgY, fit.dw, fit.dh);

  // Optional Washi Tape on top
  if (usePolaroid && s.washiTape !== false) {
    ctx.fillStyle = 'rgba(235, 225, 205, 0.85)';
    ctx.fillRect(-38, -cardH / 2 - 7, 76, 16);
  }

  // Legacy inline caption if still present
  if (captionText) {
    ctx.fillStyle = s.color || '#4A1523';
    ctx.font = CAPTION_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(captionText, 0, cardH / 2 - captionSpace / 2, Math.max(10, cardW - 16));
  }
}

/**
 * Renders a VIDEO poster element with play badge overlay.
 */
export function renderVideoElement(
  ctx: CanvasRenderingContext2D,
  el: VideoElement,
  boxW: number,
  boxH: number,
  imageCache: Map<string, HTMLImageElement>,
  varContext?: VariableContext
) {
  // Videos open muted in the overlay (product decision: background music stays on); this only draws the poster.
  const posterUrl = resolveVideoPosterUrl(el.data);
  const img = posterUrl ? imageCache.get(posterUrl) : undefined;
  // No poster: leave the box empty, as before (the page background acts as the placeholder).
  if (!posterUrl || !img || img.width <= 1) return;

  // Render as Image first
  renderImageElement(
    ctx,
    {
      ...el,
      type: 'IMAGE',
      data: {
        src: posterUrl,
        caption: el.data.caption,
        aspectRatio: el.data.aspectRatio,
        objectFit: 'cover',
      },
    } as ImageElement,
    boxW,
    boxH,
    imageCache,
    varContext
  );

  // Overlay Subtle Gold/Glass Play Badge at Center
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, -10, 28, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(24, 15, 18, 0.72)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#FFE5B4';
  ctx.stroke();

  // Play Triangle
  ctx.beginPath();
  ctx.moveTo(-7, -22);
  ctx.lineTo(13, -10);
  ctx.lineTo(-7, 2);
  ctx.closePath();
  ctx.fillStyle = '#FFE5B4';
  ctx.fill();
  ctx.restore();
}
