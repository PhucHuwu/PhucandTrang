import type { Book, PageElement } from '@/types/book';

/**
 * Text typography rules of the 3D viewer, mirrored for the Konva editor. Keep in sync with
 * PageTextureGenerator.resolveTextFont / renderTextElement (those are private to the viewer).
 */
export interface ResolvedTextTypography {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  color: string;
  lineHeightPx: number;
  /** Viewer wraps at max(80, boxW - 2*padding) but still anchors lines to the box edges. */
  wrapWidth: number;
  align: 'left' | 'center' | 'right';
  lines: string[];
}

export function resolveTextTypography(
  element: PageElement,
  book?: Partial<Book> | null,
  boxW = 0
): ResolvedTextTypography {
  const s = (element.style || {}) as any;
  const d = (element.data || {}) as any;
  const typo = book?.settings?.typography as any;

  const fontFamily =
    s.fontFamily ||
    (d.variant === 'handwriting'
      ? (typo?.handwritingFont ? `"${typo.handwritingFont}", cursive` : '"Dancing Script", cursive')
      : d.variant === 'quote'
      ? (typo?.handwritingFont
          ? `"${typo.handwritingFont}", "Playfair Display", Georgia, cursive`
          : '"Dancing Script", "Playfair Display", Georgia, cursive')
      : d.variant === 'chapter-label'
      ? (typo?.sansFont || 'Montserrat, sans-serif')
      : d.variant === 'title'
      ? (typo?.titleFont || '"Cormorant Garamond", Georgia, serif')
      : (typo?.bodyFont || '"Cormorant Garamond", Georgia, serif'));

  const baseFontSize = typo?.baseFontSize || 22;
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

  const fontWeight = String(
    s.fontWeight || (d.variant === 'title' || d.variant === 'chapter-label' ? 'bold' : 'normal')
  );
  const fontStyle =
    s.fontStyle ||
    (d.variant === 'quote' || d.variant === 'handwriting' || d.variant === 'caption' ? 'italic' : 'normal');

  const themeColor = book?.settings?.theme?.textColor;
  const accentColor = book?.settings?.theme?.accentColor;
  const color =
    s.color ||
    (d.variant === 'chapter-label'
      ? accentColor || '#C99A9A'
      : d.variant === 'title'
      ? themeColor || '#292522'
      : d.variant === 'quote'
      ? '#94384F'
      : d.variant === 'handwriting'
      ? '#38161E'
      : d.variant === 'caption'
      ? '#4A1523'
      : themeColor || '#474039');

  const lines: string[] =
    Array.isArray(d.textLines) && d.textLines.length > 0 ? d.textLines : d.text ? [d.text] : [];

  const align = s.textAlign === 'center' || s.textAlign === 'right' ? s.textAlign : 'left';

  return {
    fontFamily,
    fontSize,
    fontWeight,
    fontStyle,
    color,
    lineHeightPx: s.lineHeight || fontSize * 1.35,
    wrapWidth: Math.max(80, boxW - (s.padding ? s.padding * 2 : 0)),
    align,
    lines,
  };
}

/** Canvas font shorthand — identical to the viewer's textElementFontShorthand. */
export function textFontShorthand(element: PageElement, book?: Partial<Book> | null): string {
  const { fontFamily, fontSize, fontWeight, fontStyle } = resolveTextTypography(element, book);
  return `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
}
