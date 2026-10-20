import * as THREE from 'three';
import {
  Book,
  Page,
  PageMediaItem,
  PageLayoutType,
} from '@/types/book';
import { TextVariableResolver } from '@phucandtrang/shared';
import { ensureCustomFontLoaded } from '@/data/fontLoader';
import { DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from './texture/constants';
import { loadImageAsync } from './texture/imageCache';
import { resolveVideoPosterUrl } from './texture/videoPoster';
import { ensurePageFontsLoaded } from './texture/typography';
import { renderBackground } from './texture/background';
import { renderElement, renderPageNumberFooter } from './texture/elements';
import { buildFrontCoverPage, buildBackCoverPage } from './texture/covers';

// Re-export types for consumers
export type { PageMediaItem, PageLayoutType };

export { DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from './texture/constants';
export { clearDecodedImageCache, preloadDecodedImage } from './texture/imageCache';
export { deriveVideoPosterUrl } from './texture/videoPoster';

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
    bookContext?: Partial<Book>,
    beforeDraw?: () => Promise<void>
  ): Promise<THREE.CanvasTexture> {
    const canvas = await this.renderPageCanvas(page, bookContext, beforeDraw);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Renders a page directly into a new HTMLCanvasElement.
   */
  static async renderPageCanvas(
    page: Page,
    bookContext?: Partial<Book>,
    beforeDraw?: () => Promise<void>
  ): Promise<HTMLCanvasElement> {
    const canvasW =
      bookContext?.settings?.dimensions?.canvasResolution?.width ||
      DEFAULT_CANVAS_WIDTH;
    const canvasH =
      bookContext?.settings?.dimensions?.canvasResolution?.height ||
      DEFAULT_CANVAS_HEIGHT;

    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    await this.renderPageToCanvas(page, canvas, bookContext, beforeDraw);
    return canvas;
  }

  /**
   * Renders a page directly into a provided HTMLCanvasElement.
   * Reusable by Admin CMS Live Preview without duplicating any renderer logic.
   */
  static async renderPageToCanvas(
    page: Page,
    canvas: HTMLCanvasElement,
    bookContext?: Partial<Book>,
    beforeDraw?: () => Promise<void>
  ): Promise<void> {
    const canvasW =
      bookContext?.settings?.dimensions?.canvasResolution?.width ||
      DEFAULT_CANVAS_WIDTH;
    const canvasH =
      bookContext?.settings?.dimensions?.canvasResolution?.height ||
      DEFAULT_CANVAS_HEIGHT;

    if (canvas.width !== canvasW) canvas.width = canvasW;
    if (canvas.height !== canvasH) canvas.height = canvasH;

    const ctx = canvas.getContext('2d')!;

    // 1. Rasterizing text on canvas requires every face to be loaded BEFORE the draw:
    //    canvas never triggers a webfont fetch, it just paints the fallback family instead.
    //    Both awaits are bounded internally and per-family — a blanket document.fonts.ready
    //    would add nothing here and would hang forever on an unrelated stalled font.
    await ensureCustomFontLoaded();
    await ensurePageFontsLoaded(page, bookContext);

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
        // Never download/decode the video file itself as an image.
        const posterUrl = resolveVideoPosterUrl(el.data as { thumbnailUrl?: string; src?: string });
        if (posterUrl) urlsToLoad.add(posterUrl);
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

    // Asset loading may have finished after a page turn started.
    await beforeDraw?.();

    // 4. Render Background Layer
    renderBackground(ctx, page.background, page.side, imageCache, canvasW, canvasH, bookContext);

    // 5. Sort Elements strictly by PageElement.zIndex ascending (Single Source of Truth)
    const sortedElements = [...(page.elements || [])].filter(
      (el) => el.visible !== false
    );
    sortedElements.sort((a, b) => {
      const za = typeof a.zIndex === 'number' ? a.zIndex : 1;
      const zb = typeof b.zIndex === 'number' ? b.zIndex : 1;
      return za - zb;
    });

    // 6. Render Elements in zIndex order
    for (const el of sortedElements) {
      renderElement(ctx, el, imageCache, varContext, canvasW, canvasH, bookContext);
    }

    // 7. Draw Page Number Footer if positive inside page and not explicitly disabled
    if (
      page.showPageNumber !== false &&
      page.pageNumber !== undefined &&
      page.pageNumber > 0
    ) {
      renderPageNumberFooter(ctx, page.pageNumber, canvasW, canvasH);
    }
  }


  // =========================================================================
  // 2. UNIFIED GENERIC COVER CONVENIENCE METHODS
  // =========================================================================

  /**
   * Creates Front Cover Texture by converting cover metadata into a generic Page object.
   * Eliminates hardcoded coordinates and unifies front cover with Generic Page Renderer.
   */
  static createCoverTexture(
    photoSrc: string,
    bookContext?: Partial<Book>,
    beforeDraw?: () => Promise<void>
  ): Promise<THREE.CanvasTexture> {
    const frontCoverPage = buildFrontCoverPage(photoSrc, bookContext);
    return this.renderPageTexture(frontCoverPage, bookContext, beforeDraw);
  }

  /**
   * Creates Back Cover Texture (inside and outside) by delegating to Generic Page Renderer.
   */
  static createBackCoverTexture(
    photoSrc: string,
    isInside: boolean,
    bookContext?: Partial<Book>,
    beforeDraw?: () => Promise<void>
  ): Promise<THREE.CanvasTexture> {
    const backCoverPage = buildBackCoverPage(photoSrc, isInside, bookContext);
    return this.renderPageTexture(backCoverPage, bookContext, beforeDraw);
  }
}
