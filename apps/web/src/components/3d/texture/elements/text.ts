import { Book, TextElement } from '@/types/book';
import { TextVariableResolver, VariableContext } from '@phucandtrang/shared';
import { resolveTextFont, textElementFontShorthand, wrapText } from '../typography';

/**
 * Renders a TEXT element supporting:
 * - Dynamic text variables resolved BEFORE line wrapping
 * - Multiline and automatic word wrapping within element box
 * - Font typography, letter spacing, alignment, colors
 */
export function renderTextElement(
  ctx: CanvasRenderingContext2D,
  el: TextElement,
  boxW: number,
  boxH: number,
  varContext?: VariableContext,
  bookContext?: Partial<Book>
) {
  const s = el.style || {};
  const d = el.data;

  const { fontSize } = resolveTextFont(el, bookContext);

  const themeColor = bookContext?.settings?.theme?.textColor;
  const accentColor = bookContext?.settings?.theme?.accentColor;

  const color =
    s.color ||
    (d.variant === 'chapter-label'
      ? (accentColor || '#C99A9A')
      : d.variant === 'title'
      ? (themeColor || '#292522')
      : d.variant === 'quote'
      ? '#94384F'
      : d.variant === 'handwriting'
      ? '#38161E'
      : d.variant === 'caption'
      ? '#4A1523'
      : (themeColor || '#474039'));

  ctx.fillStyle = color;
  ctx.font = textElementFontShorthand(el, bookContext);
  ctx.textAlign = (s.textAlign === 'justify' ? 'left' : s.textAlign) || 'left';
  ctx.textBaseline = 'middle';

  if (s.letterSpacing) {
    ctx.letterSpacing = `${s.letterSpacing}px`;
  }

  // Step 1: Resolve dynamic text variables BEFORE word wrapping
  const rawLines =
    d.textLines && d.textLines.length > 0
      ? d.textLines
      : d.text
      ? [d.text]
      : [];

  const resolvedLines = rawLines.map((line) =>
    varContext ? TextVariableResolver.resolve(line, varContext) : line
  );

  // Step 2: Apply automatic word wrapping within boxW
  const maxWrapWidth = Math.max(80, boxW - (s.padding ? s.padding * 2 : 0));
  const lines: string[] = [];
  for (const rawLine of resolvedLines) {
    const wrapped = wrapText(ctx, rawLine, maxWrapWidth);
    lines.push(...wrapped);
  }

  const lineHeight = s.lineHeight || fontSize * 1.35;
  const totalTextHeight = lines.length * lineHeight;

  let startY = -totalTextHeight / 2 + lineHeight / 2;
  const startX =
    s.textAlign === 'center'
      ? 0
      : s.textAlign === 'right'
      ? boxW / 2
      : -boxW / 2;

  for (const line of lines) {
    ctx.fillText(line, startX, startY);
    startY += lineHeight;
  }
}
