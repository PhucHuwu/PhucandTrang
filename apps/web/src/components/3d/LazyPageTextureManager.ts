import * as THREE from 'three';
import { Page, Book } from '@/types/book';
import { PageTextureGenerator } from './PageTextureGenerator';

export interface TextureCacheEntry {
  dataUrl: string;
  canvasTexture?: THREE.CanvasTexture;
  lastAccessed: number;
}

export class LazyPageTextureManager {
  private book: Book;
  private cache = new Map<number, TextureCacheEntry>();
  private inFlightGenerations = new Map<number, Promise<string>>();
  private placeholderDataUrl: string = '';
  private destroyed = false;

  // Window distance: current page ± WINDOW_SIZE pages
  public readonly WINDOW_SIZE = 3;

  constructor(book: Book) {
    this.book = book;
    this.placeholderDataUrl = this.createParchmentPlaceholder();
  }

  /**
   * Fast 1x1 parchment colored placeholder canvas as initial texture
   */
  private createParchmentPlaceholder(): string {
    if (typeof document === 'undefined') return '';
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#F4EDE2';
      ctx.fillRect(0, 0, 16, 16);
    }
    return canvas.toDataURL('image/jpeg', 0.8);
  }

  public getPlaceholder(): string {
    return this.placeholderDataUrl;
  }

  /**
   * Retrieves or lazily generates texture dataUrl for a given page index.
   * pageIndex: 0 = front cover, 1..N = inside pages, N+1 = back cover inside, N+2 = back cover outside.
   */
  public async getPageTextureUrl(pageIndex: number): Promise<string> {
    if (this.destroyed) return this.placeholderDataUrl;

    const cached = this.cache.get(pageIndex);
    if (cached) {
      cached.lastAccessed = Date.now();
      return cached.dataUrl;
    }

    if (this.inFlightGenerations.has(pageIndex)) {
      return this.inFlightGenerations.get(pageIndex)!;
    }

    const generationPromise = this.renderTextureByIndex(pageIndex)
      .then((dataUrl) => {
        this.cache.set(pageIndex, {
          dataUrl,
          lastAccessed: Date.now(),
        });
        this.inFlightGenerations.delete(pageIndex);
        return dataUrl;
      })
      .catch((err) => {
        this.inFlightGenerations.delete(pageIndex);
        console.warn(`[LazyTextureManager] Failed to render page texture #${pageIndex}:`, err);
        return this.placeholderDataUrl;
      });

    this.inFlightGenerations.set(pageIndex, generationPromise);
    return generationPromise;
  }

  /**
   * Internal renderer for front cover, inside pages, or back covers
   */
  private async renderTextureByIndex(index: number): Promise<string> {
    const totalInsidePages = this.book.pages.length;

    // 0: Front Cover
    if (index === 0) {
      const coverFront = await PageTextureGenerator.createCoverTexture(
        this.book.cover.front.backgroundUrl,
        this.book
      );
      const canvas = coverFront.image as HTMLCanvasElement;
      return canvas.toDataURL('image/jpeg', 0.90);
    }

    // Inside Pages: 1..totalInsidePages
    if (index >= 1 && index <= totalInsidePages) {
      const pageData = this.book.pages[index - 1];
      const texture = await PageTextureGenerator.renderPageTexture(pageData, this.book);
      const canvas = texture.image as HTMLCanvasElement;
      return canvas.toDataURL('image/jpeg', 0.90);
    }

    // Back Cover Inside: totalInsidePages + 1
    if (index === totalInsidePages + 1) {
      const coverBackInside = await PageTextureGenerator.createBackCoverTexture(
        this.book.cover.back.insideBackgroundUrl,
        true,
        this.book
      );
      const canvas = coverBackInside.image as HTMLCanvasElement;
      return canvas.toDataURL('image/jpeg', 0.90);
    }

    // Back Cover Outside: totalInsidePages + 2
    if (index === totalInsidePages + 2) {
      const coverBackOutside = await PageTextureGenerator.createBackCoverTexture(
        this.book.cover.back.outsideBackgroundUrl,
        false,
        this.book
      );
      const canvas = coverBackOutside.image as HTMLCanvasElement;
      return canvas.toDataURL('image/jpeg', 0.90);
    }

    return this.placeholderDataUrl;
  }

  /**
   * Updates current active window around currentPageIndex (face / physical index).
   * Eagerly requests textures within [currentPage - WINDOW_SIZE, currentPage + WINDOW_SIZE].
   * Disposes distant textures from memory if cache size exceeds threshold.
   */
  public async updateActiveWindow(
    currentSpread: number,
    onPageTextureReady?: (pageIndex: number, textureUrl: string) => void
  ) {
    if (this.destroyed) return;

    const totalTextures = this.book.pages.length + 3; // coverFront + pages + 2 back covers
    const targetFace = currentSpread * 2; // each 3D sheet has 2 faces (front & back)

    const minIdx = Math.max(0, targetFace - this.WINDOW_SIZE * 2);
    const maxIdx = Math.min(totalTextures - 1, targetFace + this.WINDOW_SIZE * 2);

    // 1. Generate nearby textures asynchronously in parallel
    for (let i = minIdx; i <= maxIdx; i++) {
      if (!this.cache.has(i)) {
        this.getPageTextureUrl(i).then((url) => {
          if (!this.destroyed && onPageTextureReady) {
            onPageTextureReady(i, url);
          }
        });
      }
    }

    // 2. Prune distant textures to conserve GPU / canvas RAM (keep at most 16 textures in cache)
    if (this.cache.size > 16) {
      const entries = Array.from(this.cache.entries()).sort(
        (a, b) => a[1].lastAccessed - b[1].lastAccessed
      );

      for (const [idx, entry] of entries) {
        // Do not dispose front cover, back covers or textures in current window
        if (idx === 0 || idx >= totalTextures - 2 || (idx >= minIdx && idx <= maxIdx)) {
          continue;
        }

        if (entry.canvasTexture) {
          entry.canvasTexture.dispose();
        }
        this.cache.delete(idx);

        if (this.cache.size <= 12) break;
      }
    }
  }

  public getCacheSize(): number {
    return this.cache.size;
  }

  public destroy() {
    this.destroyed = true;
    for (const entry of this.cache.values()) {
      if (entry.canvasTexture) {
        entry.canvasTexture.dispose();
      }
    }
    this.cache.clear();
    this.inFlightGenerations.clear();
  }
}
