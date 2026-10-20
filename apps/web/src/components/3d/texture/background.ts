import { Book, PageBackground } from '@/types/book';
import { computeImageFit } from '@phucandtrang/shared';
import { hexToRgba } from './color';

export function renderBackground(
  ctx: CanvasRenderingContext2D,
  bg: PageBackground,
  side: 'left' | 'right',
  imageCache: Map<string, HTMLImageElement>,
  canvasW: number,
  canvasH: number,
  bookContext?: Partial<Book>
) {
  const bgImage = bg?.imageUrl ? imageCache.get(bg.imageUrl) : null;

  // 1. Fill base paper background color before drawing image to avoid transparent blank area (especially in contain mode)
  ctx.save();
  ctx.fillStyle = bg?.color || bookContext?.settings?.theme?.paperColor || '#F9F5EC';
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.restore();

  if (bg?.type === 'gradient' && bg.gradient) {
    // Linear Gradient Background
    const angleRad = ((bg.gradient.angle ?? 180) * Math.PI) / 180;
    const x1 = canvasW / 2 - (Math.sin(angleRad) * canvasW) / 2;
    const y1 = canvasH / 2 - (Math.cos(angleRad) * canvasH) / 2;
    const x2 = canvasW / 2 + (Math.sin(angleRad) * canvasW) / 2;
    const y2 = canvasH / 2 + (Math.cos(angleRad) * canvasH) / 2;

    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    for (const stop of bg.gradient.stops || []) {
      grad.addColorStop(stop.offset, stop.color);
    }
    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.restore();
  } else if (bgImage && bgImage.width > 1) {
    // Photo Background with objectFit & focalPoint
    const srcW = bgImage.naturalWidth || bgImage.width;
    const srcH = bgImage.naturalHeight || bgImage.height;

    const fit = computeImageFit(
      srcW,
      srcH,
      canvasW,
      canvasH,
      bg.objectFit || 'cover',
      bg.focalPoint || { x: 0.5, y: 0.5 }
    );

    ctx.save();
    ctx.globalAlpha = bg.opacity ?? 1.0;
    ctx.drawImage(bgImage, fit.sx, fit.sy, fit.sw, fit.sh, fit.dx, fit.dy, fit.dw, fit.dh);
    ctx.restore();

    // Draw Header Reading Zone Fade
    if (bg.headerFade?.enabled !== false) {
      const fadeHeight = (bg.headerFade?.height ?? 0.345) * canvasH;
      const fadeColor = bg.headerFade?.color ?? '#F9F5EC';
      const startOp = bg.headerFade?.startOpacity ?? 0.92;

      const headerFade = ctx.createLinearGradient(0, 0, 0, fadeHeight);
      headerFade.addColorStop(0, hexToRgba(fadeColor, startOp));
      headerFade.addColorStop(0.28, hexToRgba(fadeColor, startOp * 0.85));
      headerFade.addColorStop(0.66, hexToRgba(fadeColor, startOp * 0.41));
      headerFade.addColorStop(1, hexToRgba(fadeColor, 0));

      ctx.save();
      ctx.fillStyle = headerFade;
      ctx.fillRect(0, 0, canvasW, fadeHeight);
      ctx.restore();
    }

    // Draw Spine Gutter Fade
    if (bg.gutterFade?.enabled !== false) {
      const gutterWidth = (bg.gutterFade?.width ?? 0.14) * canvasW;
      const gutterColor = bg.gutterFade?.color ?? '#F9F5EC';
      const gutterOp = bg.gutterFade?.opacity ?? 0.28;

      const gutterFade = ctx.createLinearGradient(
        side === 'left' ? canvasW : 0,
        0,
        side === 'left' ? canvasW - gutterWidth : gutterWidth,
        0
      );
      gutterFade.addColorStop(0, hexToRgba(gutterColor, gutterOp));
      gutterFade.addColorStop(1, hexToRgba(gutterColor, 0));

      ctx.save();
      ctx.fillStyle = gutterFade;
      ctx.fillRect(0, 0, canvasW, canvasH);
      ctx.restore();
    }
  } else {
    // Plain Ivory Paper Background
    ctx.save();
    ctx.fillStyle = bg?.color || '#F9F5EC';
    ctx.fillRect(0, 0, canvasW, canvasH);

    const vGrad = ctx.createRadialGradient(
      canvasW / 2, canvasH / 2, 200,
      canvasW / 2, canvasH / 2, 800
    );
    vGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
    vGrad.addColorStop(1, 'rgba(180, 154, 106, 0.12)');
    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Spine shadow gradient on inner edge (respect gutterFade if disabled or customized)
    if (bg?.gutterFade?.enabled !== false) {
      const spineGrad = ctx.createLinearGradient(
        side === 'left' ? canvasW : 0,
        0,
        side === 'left' ? canvasW - 144 : 144,
        0
      );
      spineGrad.addColorStop(0, 'rgba(0, 0, 0, 0.16)');
      spineGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
      ctx.fillStyle = spineGrad;
      ctx.fillRect(side === 'left' ? canvasW - 144 : 0, 0, 144, canvasH);
    }
    ctx.restore();
  }
}
