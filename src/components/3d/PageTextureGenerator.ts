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
import { applyLayoutTemplate } from '@/templates/layoutPresets';
import {
  TextVariableResolver,
  VariableContext,
  resolveTextVariables,
} from '@/utils/textVariableResolver';

// Re-export types for consumers
export type { PageMediaItem, PageLayoutType };

export const CANVAS_WIDTH = 1024;
export const CANVAS_HEIGHT = 1360;

/**
 * Loads an HTMLImageElement asynchronously with crossOrigin enabled.
 */
function loadImageAsync(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Return 1x1 transparent fallback image on network/CORS error
      const fallback = new Image();
      fallback.onload = () => resolve(fallback);
      fallback.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    };
    img.src = src;
  });
}

/**
 * Generic Page Renderer that renders a normalized Page model into a 1024x1360 THREE.CanvasTexture.
 * 
 * Flow:
 * 1. Preload all media assets (backgrounds, images, video posters, decoration icons).
 * 2. Render page.background (image with fade zones or ivory paper color).
 * 3. Render page.elements strictly in ascending order of transform.zIndex.
 * 4. Export high-fidelity THREE.CanvasTexture with SRGBColorSpace.
 */
export class PageTextureGenerator {
  // =========================================================================
  // 1. GENERIC PAGE RENDERER (Prompt 3 Core Goal)
  // =========================================================================

  /**
   * Primary entry point: Renders a content-driven Page into a THREE.CanvasTexture.
   * Only reads:
   * - page.background
   * - page.elements (sorted by zIndex)
   * Resolves dynamic text variables (e.g. {{couple.he}}, {{daysTogether}}, {{currentDate}}).
   */
  static async renderPageTexture(
    page: Page,
    bookContext?: Partial<Book>
  ): Promise<THREE.CanvasTexture> {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d')!;

    // 1. Ensure custom fonts are ready
    if (typeof document !== 'undefined' && document.fonts) {
      try {
        await document.fonts.ready;
      } catch {
        // Fallback gracefully
      }
    }

    // 1.5 Prepare dynamic text variable context
    const varContext = TextVariableResolver.createContext({
      book: bookContext,
      page,
    });

    // 2. Preload all media assets referenced in this page
    const imageCache = new Map<string, HTMLImageElement>();
    const urlsToLoad = new Set<string>();

    if (page.background?.imageUrl) {
      urlsToLoad.add(page.background.imageUrl);
    }

    for (const el of page.elements || []) {
      if (!el.visible && el.visible !== undefined) continue;
      if (el.type === 'IMAGE') {
        const data = el.data as { src: string };
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

    // 3. Render Background Layer
    this.renderBackground(ctx, page.background, page.side, imageCache);

    // 4. Sort Elements by zIndex ascending
    const sortedElements = [...(page.elements || [])].filter((el) => el.visible !== false);
    sortedElements.sort((a, b) => {
      const za = a.transform?.zIndex ?? 1;
      const zb = b.transform?.zIndex ?? 1;
      return za - zb;
    });

    // 5. Render Elements in zIndex order
    for (const el of sortedElements) {
      this.renderElement(ctx, el, imageCache, varContext);
    }

    // 6. Draw Page Number Footer if specified
    if (page.pageNumber !== undefined && page.pageNumber > 0) {
      this.renderPageNumberFooter(ctx, page.pageNumber);
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
    imageCache: Map<string, HTMLImageElement>
  ) {
    const bgImage = bg?.imageUrl ? imageCache.get(bg.imageUrl) : null;

    if (bgImage && bgImage.width > 1) {
      // Render Full Photo Background
      const srcW = bgImage.naturalWidth || bgImage.width;
      const srcH = bgImage.naturalHeight || bgImage.height;
      const srcRatio = srcW / srcH;
      const destRatio = CANVAS_WIDTH / CANVAS_HEIGHT;

      let sx = 0, sy = 0, sw = srcW, sh = srcH;
      if (srcRatio > destRatio) {
        sw = srcH * destRatio;
        sx = (srcW - sw) / 2;
      } else {
        sh = srcW / destRatio;
        sy = (srcH - sh) / 2;
      }

      ctx.save();
      ctx.globalAlpha = bg.opacity ?? 1.0;
      ctx.drawImage(bgImage, sx, sy, sw, sh, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.restore();

      // Draw Header Reading Zone Fade
      if (bg.headerFade?.enabled !== false) {
        const fadeHeight = (bg.headerFade?.height ?? 0.345) * CANVAS_HEIGHT;
        const fadeColor = bg.headerFade?.color ?? '#F9F5EC';
        const startOp = bg.headerFade?.startOpacity ?? 0.92;

        const headerFade = ctx.createLinearGradient(0, 0, 0, fadeHeight);
        headerFade.addColorStop(0, this.hexToRgba(fadeColor, startOp));
        headerFade.addColorStop(0.28, this.hexToRgba(fadeColor, startOp * 0.85));
        headerFade.addColorStop(0.66, this.hexToRgba(fadeColor, startOp * 0.41));
        headerFade.addColorStop(1, this.hexToRgba(fadeColor, 0));

        ctx.save();
        ctx.fillStyle = headerFade;
        ctx.fillRect(0, 0, CANVAS_WIDTH, fadeHeight);
        ctx.restore();
      }

      // Draw Spine Gutter Fade
      if (bg.gutterFade?.enabled !== false) {
        const gutterWidth = (bg.gutterFade?.width ?? 0.14) * CANVAS_WIDTH;
        const gutterColor = bg.gutterFade?.color ?? '#F9F5EC';
        const gutterOp = bg.gutterFade?.opacity ?? 0.28;

        const gutterFade = ctx.createLinearGradient(
          side === 'left' ? CANVAS_WIDTH : 0,
          0,
          side === 'left' ? CANVAS_WIDTH - gutterWidth : gutterWidth,
          0
        );
        gutterFade.addColorStop(0, this.hexToRgba(gutterColor, gutterOp));
        gutterFade.addColorStop(1, this.hexToRgba(gutterColor, 0));

        ctx.save();
        ctx.fillStyle = gutterFade;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.restore();
      }
    } else {
      // Render Plain Ivory Paper Background
      ctx.save();
      ctx.fillStyle = bg?.color || '#F9F5EC';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const vGrad = ctx.createRadialGradient(
        CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 200,
        CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 800
      );
      vGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
      vGrad.addColorStop(1, 'rgba(180, 154, 106, 0.12)');
      ctx.fillStyle = vGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Spine shadow gradient on inner edge
      const spineGrad = ctx.createLinearGradient(
        side === 'left' ? CANVAS_WIDTH : 0,
        0,
        side === 'left' ? CANVAS_WIDTH - 144 : 144,
        0
      );
      spineGrad.addColorStop(0, 'rgba(0, 0, 0, 0.16)');
      spineGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
      ctx.fillStyle = spineGrad;
      ctx.fillRect(side === 'left' ? CANVAS_WIDTH - 144 : 0, 0, 144, CANVAS_HEIGHT);
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
    varContext?: VariableContext
  ) {
    const t = el.transform;

    // Convert normalized coordinates (0..1) to canvas coordinates
    const boxX = t.x * CANVAS_WIDTH;
    const boxY = t.y * CANVAS_HEIGHT;
    const boxW = t.width * CANVAS_WIDTH;
    const boxH = t.height * CANVAS_HEIGHT;

    ctx.save();

    // Opacity
    ctx.globalAlpha = (el.opacity ?? 1.0);

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
   * - font family, font size, font weight, font style (italic)
   * - color, text align, line height, letter spacing
   * - multiline text array or wrapped text
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

    const fontFamily = s.fontFamily || (
      d.variant === 'handwriting'
        ? '"Dancing Script", cursive'
        : d.variant === 'quote'
        ? '"Dancing Script", "Playfair Display", Georgia, cursive'
        : d.variant === 'chapter-label'
        ? 'Montserrat, sans-serif'
        : '"Cormorant Garamond", Georgia, serif'
    );

    const fontSize = s.fontSize || (
      d.variant === 'title' ? 38 :
      d.variant === 'chapter-label' ? 20 :
      d.variant === 'quote' ? 26 :
      d.variant === 'handwriting' ? 32 :
      d.variant === 'caption' ? 19 : 22
    );

    const fontWeight = s.fontWeight || (
      d.variant === 'title' ? 'bold' :
      d.variant === 'chapter-label' ? 'bold' : 'normal'
    );

    const fontStyle = s.fontStyle || (
      d.variant === 'quote' || d.variant === 'handwriting' || d.variant === 'caption' ? 'italic' : 'normal'
    );

    const color = s.color || (
      d.variant === 'chapter-label' ? '#C99A9A' :
      d.variant === 'title' ? '#292522' :
      d.variant === 'quote' ? '#94384F' :
      d.variant === 'handwriting' ? '#38161E' :
      d.variant === 'caption' ? '#4A1523' : '#474039'
    );

    ctx.fillStyle = color;
    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textAlign = (s.textAlign === 'justify' ? 'left' : s.textAlign) || 'left';
    ctx.textBaseline = 'middle';

    if (s.letterSpacing) {
      ctx.letterSpacing = `${s.letterSpacing}px`;
    }

    // Determine lines and resolve dynamic variables (e.g. {{couple.he}}, {{daysTogether}} NGÀY)
    const rawLines = d.textLines && d.textLines.length > 0
      ? d.textLines
      : d.text ? [d.text] : [];

    const lines = rawLines.map((line) =>
      varContext ? TextVariableResolver.resolve(line, varContext) : line
    );

    const lineHeight = s.lineHeight || fontSize * 1.35;
    const totalTextHeight = lines.length * lineHeight;

    let startY = -totalTextHeight / 2 + lineHeight / 2;
    let startX = s.textAlign === 'center' ? 0 : s.textAlign === 'right' ? boxW / 2 : -boxW / 2;

    for (const line of lines) {
      ctx.fillText(line, startX, startY);
      startY += lineHeight;
    }
  }

  /**
   * Renders an IMAGE element with:
   * - Strict aspect ratio preservation (object-fit: contain/cover/fill)
   * - Optional polaroid white paper card mount & washi tape
   * - Border & border radius
   */
  private static renderImageElement(
    ctx: CanvasRenderingContext2D,
    el: ImageElement,
    boxW: number,
    boxH: number,
    imageCache: Map<string, HTMLImageElement>,
    varContext?: VariableContext
  ) {
    const img = imageCache.get(el.data.src);
    if (!img || img.width <= 1) return;

    const s = el.style || {};
    const usePolaroid = s.polaroidFrame !== false; // Default true for scrapbook aesthetic
    const padding = usePolaroid ? (s.padding ?? 14) : 0;
    const rawCaption = el.data.caption;
    const captionText = rawCaption
      ? (varContext ? TextVariableResolver.resolve(rawCaption, varContext) : rawCaption)
      : undefined;
    const captionSpace = (usePolaroid && captionText) ? 38 : (usePolaroid ? 22 : 0);

    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;
    const srcRatio = el.data.aspectRatio || (srcW / srcH);

    const maxImgW = boxW - padding * 2;
    const maxImgH = boxH - padding * 2 - captionSpace;

    let finalImgW = maxImgW;
    let finalImgH = finalImgW / srcRatio;

    if (finalImgH > maxImgH) {
      finalImgH = maxImgH;
      finalImgW = finalImgH * srcRatio;
    }

    const cardW = Math.round(finalImgW + padding * 2);
    const cardH = Math.round(finalImgH + padding * 2 + captionSpace);

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

    // Draw Image
    const imgX = -cardW / 2 + padding;
    const imgY = -cardH / 2 + padding;
    ctx.drawImage(img, 0, 0, srcW, srcH, imgX, imgY, finalImgW, finalImgH);

    // Optional Washi Tape on top
    if (usePolaroid && s.washiTape !== false) {
      ctx.fillStyle = 'rgba(235, 225, 205, 0.85)';
      ctx.fillRect(-38, -cardH / 2 - 7, 76, 16);
    }

    // Caption
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
        },
      } as ImageElement,
      boxW,
      boxH,
      imageCache,
      varContext
    );

    // Overlay Circular Play Button Badge
    const padding = el.style?.polaroidFrame !== false ? (el.style?.padding ?? 14) : 0;
    const captionSpace = el.data.caption ? 38 : 22;
    const finalH = boxH - padding * 2 - captionSpace;
    const playCenterY = -boxH / 2 + padding + finalH / 2;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.arc(0, playCenterY, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(-5, playCenterY - 9);
    ctx.lineTo(10, playCenterY);
    ctx.lineTo(-5, playCenterY + 9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /**
   * Renders a SHAPE element (rectangle, circle, line, wreath, badge, heart).
   */
  private static renderShapeElement(
    ctx: CanvasRenderingContext2D,
    el: ShapeElement,
    boxW: number,
    boxH: number
  ) {
    const d = el.data;
    const s = el.style || {};

    ctx.save();
    if (d.strokeDashArray) {
      ctx.setLineDash(d.strokeDashArray);
    }
    if (d.fillColor) {
      ctx.fillStyle = d.fillColor;
    }
    if (d.strokeColor) {
      ctx.strokeStyle = d.strokeColor;
      ctx.lineWidth = d.strokeWidth ?? 1;
    }

    switch (d.shapeType) {
      case 'rectangle': {
        const r = s.borderRadius ?? 0;
        if (r > 0) {
          ctx.beginPath();
          ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, [r]);
          if (d.fillColor) ctx.fill();
          if (d.strokeColor) ctx.stroke();
        } else {
          if (d.fillColor) ctx.fillRect(-boxW / 2, -boxH / 2, boxW, boxH);
          if (d.strokeColor) ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);
        }
        break;
      }
      case 'circle': {
        const radius = Math.min(boxW, boxH) / 2;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        if (d.fillColor) ctx.fill();
        if (d.strokeColor) ctx.stroke();
        break;
      }
      case 'line': {
        ctx.beginPath();
        ctx.moveTo(-boxW / 2, 0);
        ctx.lineTo(boxW / 2, 0);
        ctx.stroke();
        break;
      }
      case 'heart': {
        const scale = Math.min(boxW, boxH) / 30;
        ctx.save();
        ctx.scale(scale, scale);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(0, -6, -12, -6, -12, 6);
        ctx.bezierCurveTo(-12, 16, 0, 24, 0, 30);
        ctx.bezierCurveTo(0, 24, 12, 16, 12, 6);
        ctx.bezierCurveTo(12, -6, 0, -6, 0, 0);
        if (d.fillColor) ctx.fill();
        if (d.strokeColor) ctx.stroke();
        ctx.restore();
        break;
      }
    }
    ctx.restore();
  }

  /**
   * Renders a DECORATION element (washi tape, stamps, ribbons, floral ornaments).
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
        ctx.fillStyle = el.style?.backgroundColor || 'rgba(235, 225, 205, 0.85)';
        ctx.fillRect(-boxW / 2, -boxH / 2, boxW, boxH);
        break;
      case 'corner-ornament':
      case 'flourish':
      case 'flower':
        if (d.icon) {
          ctx.fillStyle = el.style?.color || '#D4AF37';
          ctx.font = `${el.style?.fontSize ?? 28}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(d.icon, 0, 0);
        }
        break;
    }
    ctx.restore();
  }

  private static renderPageNumberFooter(ctx: CanvasRenderingContext2D, pageNumber: number) {
    ctx.save();
    ctx.fillStyle = '#8A7E71';
    ctx.font = '22px "Cormorant Garamond", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`— ${pageNumber} —`, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 45);
    ctx.restore();
  }

  private static hexToRgba(hexOrRgba: string, alpha: number): string {
    if (hexOrRgba.startsWith('rgba') || hexOrRgba.startsWith('rgb')) {
      return hexOrRgba;
    }
    const cleanHex = hexOrRgba.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16) || 249;
    const g = parseInt(cleanHex.substring(2, 4), 16) || 245;
    const b = parseInt(cleanHex.substring(4, 6), 16) || 236;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // =========================================================================
  // 5. BACKWARD-COMPATIBILITY ADAPTERS (Keep 100% functional with Flipbook)
  // =========================================================================

  /**
   * Backward-compatible adapter for inside pages.
   * Delegates layout instantiation to applyLayoutTemplate() and renders via renderPageTexture(page).
   * Page renderer itself does NOT know or hardcode any layout templates.
   */
  static async createInsidePageTexture(params: {
    pageNumber: number;
    chapter?: string;
    title?: string;
    quote?: string;
    textLines?: string[];
    handwriting?: string;
    media?: PageMediaItem[];
    layout?: PageLayoutType;
    backgroundSrc?: string;
    side: 'left' | 'right';
  }): Promise<THREE.CanvasTexture> {
    const layout = (params.layout as LayoutTemplate) || 'auto';
    const page = applyLayoutTemplate(
      {
        pageNumber: params.pageNumber,
        side: params.side,
        chapter: params.chapter,
        title: params.title,
        quote: params.quote,
        textLines: params.textLines,
        handwriting: params.handwriting,
        background: {
          type: params.backgroundSrc ? 'image' : 'color',
          imageUrl: params.backgroundSrc,
          color: '#F9F5EC',
          headerFade: { enabled: true, color: '#F9F5EC', height: 0.345, startOpacity: 0.92, endOpacity: 0 },
          gutterFade: { enabled: true, color: '#F9F5EC', width: 0.14, opacity: 0.28 },
        },
      },
      layout,
      {
        title: params.title,
        subtitle: params.chapter,
        chapter: params.chapter,
        quote: params.quote,
        textLines: params.textLines,
        handwriting: params.handwriting,
        media: params.media,
      }
    );
    return this.renderPageTexture(page);
  }

  // =========================================================================
  // 6. COVERS CONVENIENCE METHODS
  // =========================================================================

  static createCoverTexture(
    photoSrc: string,
    bookContext?: Partial<Book>
  ): Promise<THREE.CanvasTexture> {
    return new Promise(async (resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
      const ctx = canvas.getContext('2d')!;

      if (typeof document !== 'undefined' && document.fonts) {
        try {
          await document.fonts.load('60px "SVN-Housttely Signature"');
          await document.fonts.load('60px "Coldwell Bridges"');
          await document.fonts.ready;
        } catch {
          // Pass
        }
      }

      const varContext = TextVariableResolver.createContext({ book: bookContext });
      const title = TextVariableResolver.resolve(
        bookContext?.cover?.front?.title || 'Chúng Mình',
        varContext
      );
      const daysText = TextVariableResolver.resolve('{{daysTogether | number}} NGÀY', varContext);
      const subtitle = TextVariableResolver.resolve(
        bookContext?.cover?.front?.counterBadge?.subtitle || 'Bên nhau từ ngày {{anniversaryDate}}',
        varContext
      );

      const renderCover = (img?: HTMLImageElement) => {
        if (img && img.width > 1) {
          const srcW = img.naturalWidth || img.width;
          const srcH = img.naturalHeight || img.height;
          const srcRatio = srcW / srcH;
          const destRatio = CANVAS_WIDTH / CANVAS_HEIGHT;

          let sX = 0, sY = 0, sW = srcW, sH = srcH;
          if (srcRatio > destRatio) {
            sW = srcH * destRatio;
            sX = (srcW - sW) / 2;
          } else {
            sH = srcW / destRatio;
            sY = (srcH - sH) / 2;
          }
          ctx.drawImage(img, sX, sY, sW, sH, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        } else {
          const grad = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          grad.addColorStop(0, '#FFE8EE');
          grad.addColorStop(1, '#F7D6DE');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }

        // Title and live days counter at middle-left
        ctx.save();
        ctx.textAlign = 'left';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 3;

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'normal 60px "SVN-Housttely Signature", "Coldwell Bridges", cursive, serif';
        ctx.letterSpacing = '1px';
        ctx.fillText(title, 70, 780);

        ctx.strokeStyle = '#F0B6C3';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(70, 850);
        ctx.lineTo(340, 850);
        ctx.stroke();

        ctx.fillStyle = '#FFE5B4';
        ctx.font = 'bold 32px "Montserrat", sans-serif';
        ctx.letterSpacing = '1px';
        ctx.fillText(daysText, 70, 900);

        ctx.fillStyle = 'rgba(255, 245, 247, 0.85)';
        ctx.font = 'italic 24px "Dancing Script", cursive';
        ctx.fillText(subtitle, 70, 930);
        ctx.restore();

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        resolve(texture);
      };

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => renderCover(img);
      img.onerror = () => renderCover();
      img.src = photoSrc;
    });
  }

  static createBackCoverTexture(photoSrc: string, isInside: boolean = false): Promise<THREE.CanvasTexture> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
      const ctx = canvas.getContext('2d')!;

      const renderBack = (img?: HTMLImageElement) => {
        if (img && img.width > 1) {
          const srcW = img.naturalWidth || img.width;
          const srcH = img.naturalHeight || img.height;
          const srcRatio = srcW / srcH;
          const destRatio = CANVAS_WIDTH / CANVAS_HEIGHT;

          let sX = 0, sY = 0, sW = srcW, sH = srcH;
          if (srcRatio > destRatio) {
            sW = srcH * destRatio;
            sX = (srcW - sW) / 2;
          } else {
            sH = srcW / destRatio;
            sY = (srcH - sH) / 2;
          }
          ctx.drawImage(img, sX, sY, sW, sH, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        } else {
          ctx.fillStyle = '#1A1215';
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        resolve(texture);
      };

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => renderBack(img);
      img.onerror = () => renderBack();
      img.src = photoSrc;
    });
  }
}
