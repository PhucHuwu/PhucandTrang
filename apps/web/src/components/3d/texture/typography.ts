import { Book, Page, TextElement } from '@/types/book';
import {
  CAPTION_FONT,
  DECORATION_GLYPH_FONT,
  PAGE_NUMBER_FONT,
  ensureCanvasFontLoaded,
} from '@/data/fontLoader';

/**
 * Automatic word-wrapping helper for Canvas 2D.
 * Splits text into lines that do not exceed maxWidth.
 */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (!text) return [];
  const paragraphs = text.split('\n');
  const wrappedLines: string[] = [];

  for (const para of paragraphs) {
    if (para.trim() === '') {
      wrappedLines.push('');
      continue;
    }
    const words = para.split(' ');
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        wrappedLines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      wrappedLines.push(currentLine);
    }
  }
  return wrappedLines;
}

/**
 * Single source of truth for element text typography — shared by the renderer and by the
 * pre-draw font load, so a canvas never paints a family it did not wait for.
 */
export function resolveTextFont(
  el: TextElement,
  bookContext?: Partial<Book>
): { fontFamily: string; fontSize: number; fontWeight: string; fontStyle: string } {
  const s = el.style || {};
  const d = el.data;

  const typo = bookContext?.settings?.typography;

  const fontFamily =
    s.fontFamily ||
    (d.variant === 'handwriting'
      ? (typo?.handwritingFont ? `"${typo.handwritingFont}", cursive` : '"Dancing Script", cursive')
      : d.variant === 'quote'
      ? (typo?.handwritingFont ? `"${typo.handwritingFont}", "Playfair Display", Georgia, cursive` : '"Dancing Script", "Playfair Display", Georgia, cursive')
      : d.variant === 'chapter-label'
      ? (typo?.sansFont || 'Montserrat, sans-serif')
      : d.variant === 'title'
      ? (typo?.titleFont || '"Cormorant Garamond", Georgia, serif')
      : (typo?.bodyFont || '"Cormorant Garamond", Georgia, serif'));

  const baseFontSize = (typo as any)?.baseFontSize || 22;

  const fontSize =
    s.fontSize ||
    (d.variant === 'title'
      ? Math.round(baseFontSize * 1.72)
      : d.variant === 'chapter-label'
      ? Math.round(baseFontSize * 0.9)
      : d.variant === 'quote'
      ? Math.round(baseFontSize * 1.18)
      : d.variant === 'handwriting'
      ? Math.round(baseFontSize * 1.45)
      : d.variant === 'caption'
      ? Math.round(baseFontSize * 0.86)
      : baseFontSize);

  const fontWeight =
    s.fontWeight ||
    (d.variant === 'title'
      ? 'bold'
      : d.variant === 'chapter-label'
      ? 'bold'
      : 'normal');

  const fontStyle =
    s.fontStyle ||
    (d.variant === 'quote' || d.variant === 'handwriting' || d.variant === 'caption'
      ? 'italic'
      : 'normal');

  return { fontFamily, fontSize, fontWeight, fontStyle };
}

/** Canvas font shorthand for a text element — the exact string the renderer assigns to ctx.font. */
export function textElementFontShorthand(
  el: TextElement,
  bookContext?: Partial<Book>
): string {
  const { fontFamily, fontSize, fontWeight, fontStyle } = resolveTextFont(el, bookContext);
  return `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
}

/**
 * Waits for every font face this page is about to paint. Canvas 2D silently substitutes the
 * next family in the stack when a face is not loaded yet, so a page rendered before this
 * resolves keeps the fallback glyphs for the whole session (textures are cached).
 */
export async function ensurePageFontsLoaded(
  page: Page,
  bookContext?: Partial<Book>
): Promise<void> {
  const shorthands = new Set<string>();

  for (const el of page.elements || []) {
    if (el.visible === false) continue;

    if (el.type === 'TEXT') {
      shorthands.add(textElementFontShorthand(el as TextElement, bookContext));
    } else if (el.type === 'VIDEO') {
      shorthands.add(CAPTION_FONT);
    } else if (el.type === 'IMAGE') {
      // Legacy polaroid caption — renderImageElement paints it in CAPTION_FONT.
      if ((el.data as { caption?: string }).caption) shorthands.add(CAPTION_FONT);
    } else if (el.type === 'DECORATION') {
      shorthands.add(DECORATION_GLYPH_FONT);
    }
  }

  if (
    page.showPageNumber !== false &&
    page.pageNumber !== undefined &&
    page.pageNumber > 0
  ) {
    shorthands.add(PAGE_NUMBER_FONT);
  }

  await Promise.all(Array.from(shorthands).map((shorthand) => ensureCanvasFontLoaded(shorthand)));
}
