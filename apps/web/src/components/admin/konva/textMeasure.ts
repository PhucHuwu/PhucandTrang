let measureCtx: CanvasRenderingContext2D | null = null;

/** The shared measuring context, or null until the first wrapTextLikeViewer call created it. */
export function getMeasureContext(): CanvasRenderingContext2D | null {
  return measureCtx;
}

/**
 * Same greedy word wrap as the 3D viewer (PageTextureGenerator.wrapText): breaks only at spaces,
 * never inside a word, so editor line breaks match the published page.
 */
export function wrapTextLikeViewer(text: string, font: string, letterSpacing: number, maxWidth: number): string[] {
  if (!text) return [];
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  const ctx = measureCtx;
  if (!ctx) return text.split('\n');
  ctx.font = font;
  (ctx as any).letterSpacing = letterSpacing ? `${letterSpacing}px` : '0px';

  const wrapped: string[] = [];
  for (const para of text.split('\n')) {
    if (para.trim() === '') {
      wrapped.push('');
      continue;
    }
    const words = para.split(' ');
    let current = '';
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        wrapped.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) wrapped.push(current);
  }
  return wrapped;
}

/** True when every shorthand already resolves — a warm session needs no load and no Stage re-key. */
export function canvasFontsReady(shorthands: string[]): boolean {
  if (typeof document === 'undefined' || !document.fonts) return false;
  try {
    return shorthands.every((shorthand) => document.fonts.check(shorthand));
  } catch {
    return false;
  }
}
