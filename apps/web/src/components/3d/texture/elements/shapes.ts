import { ShapeElement, DecorationElement } from '@/types/book';
import { DECORATION_GLYPH_FONT, PAGE_NUMBER_FONT } from '@/data/fontLoader';

/**
 * Renders a SHAPE element (rectangle, circle, line, badge, wreath, heart).
 */
export function renderShapeElement(
  ctx: CanvasRenderingContext2D,
  el: ShapeElement,
  boxW: number,
  boxH: number
) {
  const d = el.data;
  ctx.save();

  if (d.fillColor) ctx.fillStyle = d.fillColor;
  if (d.strokeColor) ctx.strokeStyle = d.strokeColor;
  if (d.strokeWidth) ctx.lineWidth = d.strokeWidth;
  if (d.strokeDashArray) ctx.setLineDash(d.strokeDashArray);

  switch (d.shapeType) {
    case 'line':
      ctx.beginPath();
      ctx.moveTo(-boxW / 2, 0);
      ctx.lineTo(boxW / 2, 0);
      ctx.stroke();
      break;

    case 'circle':
      ctx.beginPath();
      ctx.arc(0, 0, Math.min(boxW, boxH) / 2, 0, Math.PI * 2);
      if (d.fillColor) ctx.fill();
      if (d.strokeColor) ctx.stroke();
      break;

    case 'rectangle':
    default:
      if (d.fillColor) ctx.fillRect(-boxW / 2, -boxH / 2, boxW, boxH);
      if (d.strokeColor) ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);
      break;
  }

  ctx.restore();
}

/**
 * Renders a DECORATION element (washi-tape, flourish, stamp, wax-seal).
 */
export function renderDecorationElement(
  ctx: CanvasRenderingContext2D,
  el: DecorationElement,
  boxW: number,
  boxH: number
) {
  const d = el.data;
  ctx.save();

  switch (d.decorationType) {
    case 'washi-tape':
      ctx.fillStyle = 'rgba(235, 225, 205, 0.85)';
      ctx.fillRect(-boxW / 2, -boxH / 2, boxW, boxH);
      break;

    case 'wax-seal':
      ctx.beginPath();
      ctx.arc(0, 0, Math.min(boxW, boxH) / 2, 0, Math.PI * 2);
      ctx.fillStyle = '#8B263E';
      ctx.fill();
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 2;
      ctx.stroke();
      break;

    case 'flourish':
    default:
      if (d.icon) {
        ctx.font = DECORATION_GLYPH_FONT;
        ctx.fillStyle = '#C99A9A';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(d.icon, 0, 0);
      }
      break;
  }

  ctx.restore();
}

/**
 * Renders Page Number footer at the bottom margin.
 */
export function renderPageNumberFooter(
  ctx: CanvasRenderingContext2D,
  pageNumber: number,
  canvasW: number,
  canvasH: number
) {
  ctx.save();
  ctx.fillStyle = '#8C6F5A';
  ctx.font = PAGE_NUMBER_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '2px';
  ctx.fillText(`— ${pageNumber} —`, canvasW / 2, canvasH - 45);
  ctx.restore();
}
