import {
  Book,
  PageElement,
  TextElement,
  ImageElement,
  VideoElement,
  ShapeElement,
  DecorationElement,
} from '@/types/book';
import { VariableContext } from '@phucandtrang/shared';
import { DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from '../constants';
import { renderTextElement } from './text';
import { renderImageElement, renderVideoElement } from './media';
import { renderShapeElement, renderDecorationElement } from './shapes';

export { renderPageNumberFooter } from './shapes';

export function renderElement(
  ctx: CanvasRenderingContext2D,
  el: PageElement,
  imageCache: Map<string, HTMLImageElement>,
  varContext?: VariableContext,
  canvasW: number = DEFAULT_CANVAS_WIDTH,
  canvasH: number = DEFAULT_CANVAS_HEIGHT,
  bookContext?: Partial<Book>
) {
  const t = el.transform;

  // Convert normalized coordinates (0..1) to pixel canvas coordinates
  const boxX = t.x * canvasW;
  const boxY = t.y * canvasH;
  const boxW = t.width * canvasW;
  const boxH = t.height * canvasH;

  ctx.save();

  // Opacity
  ctx.globalAlpha = el.opacity ?? 1.0;

  // Rotate around the box's top-left corner like Konva does in the editor, then move the
  // origin to the (rotated) box centre that the drawing code below is relative to.
  ctx.translate(boxX, boxY);
  if (t.rotation) {
    ctx.rotate((t.rotation * Math.PI) / 180);
  }
  ctx.translate(boxW / 2, boxH / 2);
  if (t.scale && t.scale !== 1) {
    ctx.scale(t.scale, t.scale);
  }

  // Apply shadow if configured
  if (el.style?.shadow) {
    ctx.shadowColor = el.style.shadow.color;
    ctx.shadowBlur = el.style.shadow.blur;
    ctx.shadowOffsetX = el.style.shadow.offsetX;
    ctx.shadowOffsetY = el.style.shadow.offsetY;
  }

  // Dispatch by element type
  switch (el.type) {
    case 'TEXT':
      renderTextElement(ctx, el as TextElement, boxW, boxH, varContext, bookContext);
      break;
    case 'IMAGE':
      renderImageElement(ctx, el as ImageElement, boxW, boxH, imageCache, varContext);
      break;
    case 'VIDEO':
      renderVideoElement(ctx, el as VideoElement, boxW, boxH, imageCache, varContext);
      break;
    case 'SHAPE':
      renderShapeElement(ctx, el as ShapeElement, boxW, boxH);
      break;
    case 'DECORATION':
      renderDecorationElement(ctx, el as DecorationElement, boxW, boxH);
      break;
  }

  ctx.restore();
}
