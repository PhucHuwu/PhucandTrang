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
  private inFlightGenerations = new Map<number, Promise<TextureCacheEntry>>();
  private placeholderDataUrl: string = '';
  private destroyed = false;
  private generationQueue: Promise<unknown> = Promise.resolve();
  private windowRevision = 0;
  private canGenerate = () => true;

  public setGenerationGate(gate: () => boolean) {
    this.canGenerate = gate;
  }

  private async waitForQuietFrame() {
    do {
      await new Promise<void>((resolve) => setTimeout(resolve, 32));
    } while (!this.destroyed && !this.canGenerate());
  }

  // Window distance: eagerly generate ±6 pages ahead of time to eliminate hitching
  public readonly WINDOW_SIZE = 6;

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
   * Retrieves or lazily generates texture entry for a given page index.
   * Directly creates and caches THREE.CanvasTexture to prevent repeated dataUrl decoding.
   */
  public async getPageTextureEntry(pageIndex: number): Promise<TextureCacheEntry> {
    if (this.destroyed) {
      return { dataUrl: this.placeholderDataUrl, lastAccessed: Date.now() };
    }

    const cached = this.cache.get(pageIndex);
    if (cached) {
      cached.lastAccessed = Date.now();
      return cached;
    }

    if (this.inFlightGenerations.has(pageIndex)) {
      return this.inFlightGenerations.get(pageIndex)!;
    }

    const generationPromise = this.generationQueue.then(async (): Promise<TextureCacheEntry> => {
      await this.waitForQuietFrame();
      if (this.destroyed) return { dataUrl: this.placeholderDataUrl, lastAccessed: Date.now() };
      return this.renderTextureByIndex(pageIndex);
    })
      .then((entry) => {
        if (this.destroyed) {
          entry.canvasTexture?.dispose();
          return { dataUrl: this.placeholderDataUrl, lastAccessed: Date.now() };
        }
        this.cache.set(pageIndex, entry);
        this.inFlightGenerations.delete(pageIndex);
        return entry;
      })
      .catch((err) => {
        this.inFlightGenerations.delete(pageIndex);
        console.warn(`[LazyTextureManager] Failed to render page texture #${pageIndex}:`, err);
        return { dataUrl: this.placeholderDataUrl, lastAccessed: Date.now() };
      });

    this.inFlightGenerations.set(pageIndex, generationPromise);
    this.generationQueue = generationPromise;
    return generationPromise;
  }

  public async getPageTextureUrl(pageIndex: number): Promise<string> {
    const entry = await this.getPageTextureEntry(pageIndex);
    // Only initial faces need URLs for the engine constructor.
    if (entry.canvasTexture && entry.dataUrl === this.placeholderDataUrl) {
      entry.dataUrl = (entry.canvasTexture.image as HTMLCanvasElement).toDataURL('image/jpeg', 0.88);
    }
    return entry.dataUrl;
  }

  /**
   * Internal renderer for front cover, inside pages, or back covers
   */
  private async renderTextureByIndex(index: number): Promise<TextureCacheEntry> {
    const totalInsidePages = this.book.pages.length;
    let canvasTexture: THREE.CanvasTexture | undefined;

    // 0: Front Cover
    if (index === 0) {
      canvasTexture = await PageTextureGenerator.createCoverTexture(
        this.book.cover.front.backgroundUrl,
        this.book
      );
    } else if (index >= 1 && index <= totalInsidePages) {
      // Inside Pages: 1..totalInsidePages
      const pageData = this.book.pages[index - 1];
      canvasTexture = await PageTextureGenerator.renderPageTexture(pageData, this.book);
    } else if (index === totalInsidePages + 1) {
      // Back Cover Inside: totalInsidePages + 1
      canvasTexture = await PageTextureGenerator.createBackCoverTexture(
        this.book.cover.back.insideBackgroundUrl,
        true,
        this.book
      );
    } else if (index === totalInsidePages + 2) {
      // Back Cover Outside: totalInsidePages + 2
      canvasTexture = await PageTextureGenerator.createBackCoverTexture(
        this.book.cover.back.outsideBackgroundUrl,
        false,
        this.book
      );
    }

    if (canvasTexture) {
      canvasTexture.generateMipmaps = false;
      canvasTexture.minFilter = THREE.LinearFilter;
      return {
        dataUrl: this.placeholderDataUrl,
        canvasTexture,
        lastAccessed: Date.now(),
      };
    }

    return {
      dataUrl: this.placeholderDataUrl,
      lastAccessed: Date.now(),
    };
  }

  /**
   * Updates current active window around currentPageIndex (face / physical index).
   * Eagerly requests textures within [currentPage - WINDOW_SIZE, currentPage + WINDOW_SIZE].
   * Disposes distant textures from memory if cache size exceeds threshold.
   */
  public async updateActiveWindow(
    currentSpread: number,
    onPageTextureReady?: (pageIndex: number, textureUrl: string, directTexture?: THREE.Texture) => void
  ) {
    if (this.destroyed) return;

    const revision = ++this.windowRevision;

    const totalTextures = this.book.pages.length + 3; // coverFront + pages + 2 back covers
    const targetFace = currentSpread * 2; // each 3D sheet has 2 faces (front & back)

    const minIdx = Math.max(0, targetFace - this.WINDOW_SIZE * 2);
    const maxIdx = Math.min(totalTextures - 1, targetFace + this.WINDOW_SIZE * 2);

    const indices = Array.from({ length: maxIdx - minIdx + 1 }, (_, i) => minIdx + i)
      .sort((a, b) => Math.abs(a - targetFace) - Math.abs(b - targetFace));
    for (const i of indices) {
      if (this.destroyed || revision !== this.windowRevision) return;
      if (!this.cache.has(i)) {
        const entry = await this.getPageTextureEntry(i);
          if (!this.destroyed && onPageTextureReady) {
            onPageTextureReady(i, entry.dataUrl, entry.canvasTexture);
          }
      }
    }

    // Page materials already retain these textures. Keep their cache entries too so
    // returning to a visited spread never rasterizes or uploads the same page again.
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
