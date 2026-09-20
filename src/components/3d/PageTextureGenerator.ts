import * as THREE from 'three';
import {
  Book,
  Page,
  PageElement,
  PageBackground,
  PageMediaItem,
  PageLayoutType,
  LayoutTemplate,
  TextElement,
  ImageElement,
  VideoElement,
  ShapeElement,
  DecorationElement,
} from '@/types/book';
import {
  TextVariableResolver,
  VariableContext,
} from '@/utils/textVariableResolver';
import { computeImageFit } from '@/utils/imageFitting';

// Re-export types for consumers
export type { PageMediaItem, PageLayoutType };

export const DEFAULT_CANVAS_WIDTH = 1024;
export const DEFAULT_CANVAS_HEIGHT = 1360;

/**
 * Loads an HTMLImageElement asynchronously with crossOrigin enabled.
 */
function loadImageAsync(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Create a 1x1 transparent dummy image on error to prevent crashing
      const fallback = new Image();
      fallback.src =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      fallback.onload = () => resolve(fallback);
      fallback.onerror = () => resolve(fallback);
    };
    img.src = src;
  });
}

/**
 * Automatic word-wrapping helper for Canvas 2D.
 * Splits text into lines that do not exceed maxWidth.
 */
function wrapText(
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

export class PageTextureGenerator {
  // =========================================================================
  // 1. GENERIC PAGE RENDERER
  // =========================================================================

  /**
   * Primary entry point: Renders a content-driven Page into a THREE.CanvasTexture.
   * Single source of truth for all canvas rendering:
   * - Front Cover
   * - Inside Pages
   * - Back Cover
   */
  static async renderPageTexture(
    page: Page,
    bookContext?: Partial<Book>
  ): Promise<THREE.CanvasTexture> {
    const canvasW =
      bookContext?.settings?.dimensions?.canvasResolution?.width ||
      DEFAULT_CANVAS_WIDTH;
    const canvasH =
      bookContext?.settings?.dimensions?.canvasResolution?.height ||
      DEFAULT_CANVAS_HEIGHT;

    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d')!;

    // 1. Ensure custom fonts are ready
    if (typeof document !== 'undefined' && document.fonts) {
      try {
        await document.fonts.ready;
      } catch {
        // Fallback gracefully
      }
    }

    // 2. Prepare dynamic text variable context
    const varContext = TextVariableResolver.createContext({
      book: bookContext,
      page,
    });

    // 3. Preload all media assets referenced in this page
    const imageCache = new Map<string, HTMLImageElement>();
    const urlsToLoad = new Set<string>();

    if (page.background?.imageUrl) {
      urlsToLoad.add(page.background.imageUrl);
    }

    for (const el of page.elements || []) {
      if (!el.visible && el.visible !== undefined) continue;
      if (el.type === 'IMAGE') {
        const data = el.data as { src?: string };
        if (data.src) urlsToLoad.add(data.src);
      } else if (el.type === 'VIDEO') {
        const data = el.data as { thumbnailUrl?: string; src?: string };
        if (data.thumbnailUrl) urlsToLoad.add(data.thumbnailUrl);
        else if (data.src) urlsToLoad.add(data.src);
      } else if (el.type === 'DECORATION') {
        const data = el.data as { assetUrl?: string };
        if (data.assetUrl) urlsToLoad.add(data.assetUrl);
      }
    }

    await Promise.all(
      Array.from(urlsToLoad).map(async (url) => {
        try {
          const img = await loadImageAsync(url);
          imageCache.set(url, img);
        } catch {
          // Handled by fallback in loadImageAsync
        }
      })
    );

    // 4. Render Background Layer
    this.renderBackground(ctx, page.background, page.side, imageCache, canvasW, canvasH);

    // 5. Sort Elements strictly by PageElement.zIndex ascending (Single Source of Truth)
    const sortedElements = [...(page.elements || [])].filter(
      (el) => el.visible !== false
    );
    sortedElements.sort((a, b) => {
      const za = typeof a.zIndex === 'number' ? a.zIndex : (a.transform as any)?.zIndex ?? 1;
      const zb = typeof b.zIndex === 'number' ? b.zIndex : (b.transform as any)?.zIndex ?? 1;
      return za - zb;
    });

    // 6. Render Elements in zIndex order
    for (const el of sortedElements) {
      this.renderElement(ctx, el, imageCache, varContext, canvasW, canvasH);
    }

    // 7. Draw Page Number Footer if positive inside page and not disabled
    if (
      page.pageNumber !== undefined &&
      page.pageNumber > 0 &&
      page.pageNumber !== 999 &&
      (page as any).showPageNumber !== false
    ) {
      this.renderPageNumberFooter(ctx, page.pageNumber, canvasW, canvasH);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  // =========================================================================
  // 2. BACKGROUND RENDERING LOGIC
  // =========================================================================

  private static renderBackground(
    ctx: CanvasRenderingContext2D,
    bg: PageBackground,
    side: 'left' | 'right',
    imageCache: Map<string, HTMLImageElement>,
    canvasW: number,
    canvasH: number
  ) {
    const bgImage = bg?.imageUrl ? imageCache.get(bg.imageUrl) : null;

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
        headerFade.addColorStop(0, this.hexToRgba(fadeColor, startOp));
        headerFade.addColorStop(0.28, this.hexToRgba(fadeColor, startOp * 0.85));
        headerFade.addColorStop(0.66, this.hexToRgba(fadeColor, startOp * 0.41));
        headerFade.addColorStop(1, this.hexToRgba(fadeColor, 0));

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
        gutterFade.addColorStop(0, this.hexToRgba(gutterColor, gutterOp));
        gutterFade.addColorStop(1, this.hexToRgba(gutterColor, 0));

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

      // Spine shadow gradient on inner edge
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
      ctx.restore();
    }
  }

  // =========================================================================
  // 3. ELEMENT RENDERING DISPATCHER
  // =========================================================================

  private static renderElement(
    ctx: CanvasRenderingContext2D,
    el: PageElement,
    imageCache: Map<string, HTMLImageElement>,
    varContext?: VariableContext,
    canvasW: number = DEFAULT_CANVAS_WIDTH,
    canvasH: number = DEFAULT_CANVAS_HEIGHT
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

    // Translation & Rotation around element center
    const centerX = boxX + boxW / 2;
    const centerY = boxY + boxH / 2;
    ctx.translate(centerX, centerY);

    if (t.rotation) {
      ctx.rotate((t.rotation * Math.PI) / 180);
    }
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
        this.renderTextElement(ctx, el as TextElement, boxW, boxH, varContext);
        break;
      case 'IMAGE':
        this.renderImageElement(ctx, el as ImageElement, boxW, boxH, imageCache, varContext);
        break;
      case 'VIDEO':
        this.renderVideoElement(ctx, el as VideoElement, boxW, boxH, imageCache, varContext);
        break;
      case 'SHAPE':
        this.renderShapeElement(ctx, el as ShapeElement, boxW, boxH);
        break;
      case 'DECORATION':
        this.renderDecorationElement(ctx, el as DecorationElement, boxW, boxH);
        break;
    }

    ctx.restore();
  }

  // =========================================================================
  // 4. SPECIFIC ELEMENT RENDERERS
  // =========================================================================

  /**
   * Renders a TEXT element supporting:
   * - Dynamic text variables resolved BEFORE line wrapping
   * - Multiline and automatic word wrapping within element box
   * - Font typography, letter spacing, alignment, colors
   */
  private static renderTextElement(
    ctx: CanvasRenderingContext2D,
    el: TextElement,
    boxW: number,
    boxH: number,
    varContext?: VariableContext
  ) {
    const s = el.style || {};
    const d = el.data;

    const fontFamily =
      s.fontFamily ||
      (d.variant === 'handwriting'
        ? '"Dancing Script", cursive'
        : d.variant === 'quote'
        ? '"Dancing Script", "Playfair Display", Georgia, cursive'
        : d.variant === 'chapter-label'
        ? 'Montserrat, sans-serif'
        : '"Cormorant Garamond", Georgia, serif');

    const fontSize =
      s.fontSize ||
      (d.variant === 'title'
        ? 38
        : d.variant === 'chapter-label'
        ? 20
        : d.variant === 'quote'
        ? 26
        : d.variant === 'handwriting'
        ? 32
        : d.variant === 'caption'
        ? 19
        : 22);

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

    const color =
      s.color ||
      (d.variant === 'chapter-label'
        ? '#C99A9A'
        : d.variant === 'title'
        ? '#292522'
        : d.variant === 'quote'
        ? '#94384F'
        : d.variant === 'handwriting'
        ? '#38161E'
        : d.variant === 'caption'
        ? '#4A1523'
        : '#474039');

    ctx.fillStyle = color;
    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
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
    let startX =
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

  /**
   * Renders an IMAGE element with:
   * - objectFit: 'cover' | 'contain' | 'fill'
   * - focalPoint: { x, y } (0.0 to 1.0)
   * - Optional polaroid white paper card mount & washi tape
   */
  private static renderImageElement(
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
    const captionSpace = usePolaroid && captionText ? 38 : usePolaroid ? 22 : 0;

    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;
    const srcRatio = el.data.aspectRatio || srcW / srcH;

    const maxImgW = Math.max(10, boxW - padding * 2);
    const maxImgH = Math.max(10, boxH - padding * 2 - captionSpace);

    const objectFit = el.data.objectFit || (usePolaroid ? 'contain' : 'cover');
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
    const imgX = -cardW / 2 + padding + fit.dx;
    const imgY = -cardH / 2 + padding + fit.dy;
    ctx.drawImage(img, fit.sx, fit.sy, fit.sw, fit.sh, imgX, imgY, fit.dw, fit.dh);

    // Optional Washi Tape on top
    if (usePolaroid && s.washiTape !== false) {
      ctx.fillStyle = 'rgba(235, 225, 205, 0.85)';
      ctx.fillRect(-38, -cardH / 2 - 7, 76, 16);
    }

    // Legacy inline caption if still present
    if (captionText) {
      ctx.fillStyle = s.color || '#4A1523';
      ctx.font = 'italic 19px "Dancing Script", cursive';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(captionText, 0, cardH / 2 - 13);
    }
  }

  /**
   * Renders a VIDEO poster element with play badge overlay.
   */
  private static renderVideoElement(
    ctx: CanvasRenderingContext2D,
    el: VideoElement,
    boxW: number,
    boxH: number,
    imageCache: Map<string, HTMLImageElement>,
    varContext?: VariableContext
  ) {
    const posterUrl = el.data.thumbnailUrl || el.data.src;
    if (!posterUrl) return;
    const img = imageCache.get(posterUrl);
    if (!img || img.width <= 1) return;

    // Render as Image first
    this.renderImageElement(
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

  /**
   * Renders a SHAPE element (rectangle, circle, line, badge, wreath, heart).
   */
  private static renderShapeElement(
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
  private static renderDecorationElement(
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
          ctx.font = '24px "Dancing Script", cursive';
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
  private static renderPageNumberFooter(
    ctx: CanvasRenderingContext2D,
    pageNumber: number,
    canvasW: number,
    canvasH: number
  ) {
    ctx.save();
    ctx.fillStyle = '#8C6F5A';
    ctx.font = 'italic 16px "Cormorant Garamond", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '2px';
    ctx.fillText(`— ${pageNumber} —`, canvasW / 2, canvasH - 45);
    ctx.restore();
  }

  // =========================================================================
  // 5. UNIFIED GENERIC COVER CONVENIENCE METHODS
  // =========================================================================

  /**
   * Creates Front Cover Texture by converting cover metadata into a generic Page object.
   * Eliminates hardcoded coordinates and unifies front cover with Generic Page Renderer.
   */
  static createCoverTexture(
    photoSrc: string,
    bookContext?: Partial<Book>
  ): Promise<THREE.CanvasTexture> {
    const cover = bookContext?.cover?.front;
    const title = cover?.title || 'Chúng Mình';
    const bgUrl = cover?.backgroundUrl || photoSrc;
    const subtitle =
      cover?.counterBadge?.subtitle || 'Bên nhau từ ngày {{anniversaryDate}}';

    // If front cover elements are already configured in JSON, use them
    let elements: PageElement[] = cover?.elements || [];

    if (!elements || elements.length === 0) {
      elements = [
        // Title: "Chúng Mình"
        {
          id: 'cover-title',
          type: 'TEXT',
          slot: 'title',
          order: 1,
          zIndex: 10,
          visible: true,
          locked: true,
          opacity: 1,
          transform: {
            x: 0.068,
            y: 0.55,
            width: 0.86,
            height: 0.08,
            rotation: 0,
            scale: 1,
          },
          style: {
            textAlign: 'left',
            color: '#FFFFFF',
            fontFamily:
              '"SVN-Housttely Signature", "Coldwell Bridges", cursive, serif',
            fontSize: 60,
            letterSpacing: 1,
            shadow: {
              color: 'rgba(0, 0, 0, 0.85)',
              blur: 12,
              offsetX: 0,
              offsetY: 3,
            },
          },
          data: { text: title, variant: 'title' },
        },
        // Divider line
        {
          id: 'cover-divider',
          type: 'SHAPE',
          slot: 'divider',
          order: 2,
          zIndex: 11,
          visible: true,
          locked: true,
          opacity: 1,
          transform: {
            x: 0.068,
            y: 0.625,
            width: 0.28,
            height: 0.002,
            rotation: 0,
            scale: 1,
          },
          data: { shapeType: 'line', strokeColor: '#F0B6C3', strokeWidth: 2 },
        },
        // Live Days Counter
        {
          id: 'cover-days-counter',
          type: 'TEXT',
          slot: 'counter',
          order: 3,
          zIndex: 12,
          visible: true,
          locked: true,
          opacity: 1,
          transform: {
            x: 0.068,
            y: 0.65,
            width: 0.86,
            height: 0.05,
            rotation: 0,
            scale: 1,
          },
          style: {
            textAlign: 'left',
            color: '#FFE5B4',
            fontFamily: 'Montserrat, sans-serif',
            fontSize: 32,
            fontWeight: 'bold',
            letterSpacing: 1,
            shadow: {
              color: 'rgba(0, 0, 0, 0.85)',
              blur: 12,
              offsetX: 0,
              offsetY: 3,
            },
          },
          data: { text: '{{daysTogether | number}} NGÀY', variant: 'title' },
        },
        // Subtitle
        {
          id: 'cover-subtitle',
          type: 'TEXT',
          slot: 'subtitle',
          order: 4,
          zIndex: 13,
          visible: true,
          locked: true,
          opacity: 1,
          transform: {
            x: 0.068,
            y: 0.685,
            width: 0.86,
            height: 0.04,
            rotation: 0,
            scale: 1,
          },
          style: {
            textAlign: 'left',
            color: 'rgba(255, 245, 247, 0.9)',
            fontFamily: '"Dancing Script", cursive',
            fontSize: 24,
            fontStyle: 'italic',
            shadow: {
              color: 'rgba(0, 0, 0, 0.85)',
              blur: 12,
              offsetX: 0,
              offsetY: 3,
            },
          },
          data: { text: subtitle, variant: 'quote' },
        },
      ];
    }

    const frontCoverPage: Page = {
      id: 'page-cover-front',
      pageNumber: -1,
      order: -1,
      side: 'right',
      layout: 'custom',
      background: {
        type: bgUrl ? 'image' : 'color',
        imageUrl: bgUrl,
        color: '#FFE8EE',
      },
      elements,
    };

    return this.renderPageTexture(frontCoverPage, bookContext);
  }

  /**
   * Creates Back Cover Texture (inside and outside) by delegating to Generic Page Renderer.
   */
  static createBackCoverTexture(
    photoSrc: string,
    isInside: boolean,
    bookContext?: Partial<Book>
  ): Promise<THREE.CanvasTexture> {
    const cover = bookContext?.cover?.back;
    const bgUrl = isInside
      ? cover?.insideBackgroundUrl || photoSrc
      : cover?.outsideBackgroundUrl || photoSrc;

    const backCoverPage: Page = {
      id: `page-cover-back-${isInside ? 'inside' : 'outside'}`,
      pageNumber: -1,
      order: -1,
      side: isInside ? 'left' : 'right',
      layout: 'custom',
      background: {
        type: bgUrl ? 'image' : 'color',
        imageUrl: bgUrl,
        color: '#1F1218',
      },
      elements: cover?.elements || [],
    };

    return this.renderPageTexture(backCoverPage, bookContext);
  }

  // =========================================================================
  // 6. COLOR UTILITIES
  // =========================================================================

  private static hexToRgba(hex: string, alpha: number): string {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
    const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
    const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
