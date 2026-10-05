import * as THREE from 'three';
import { Book } from '@/types/book';
import { PageTextureGenerator } from './PageTextureGenerator';

export interface TextureCacheEntry {
  dataUrl: string;
  canvasTexture?: THREE.CanvasTexture;
  lastAccessed: number;
}

type TextureReady = (index: number, url: string, texture?: THREE.Texture) => void;

export class LazyPageTextureManager {
  private cache = new Map<number, TextureCacheEntry>();
  private inFlight = new Map<number, Promise<TextureCacheEntry>>();
  private placeholderDataUrl: string;
  private destroyed = false;
  private pending: number[] = [];
  private processing = false;
  private currentSpread = 0;
  private onReady?: TextureReady;
  public readonly WINDOW_SIZE = 3;

  constructor(private book: Book, private isBusy: () => boolean = () => false) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#F4EDE2';
      ctx.fillRect(0, 0, 16, 16);
    }
    this.placeholderDataUrl = canvas.toDataURL('image/jpeg', 0.8);
  }

  public getPlaceholder() { return this.placeholderDataUrl; }

  private waitForIdle = async (): Promise<void> => {
    // Yield between pages and re-check after image/font loading, before rasterization.
    do {
      await new Promise<void>(resolve => setTimeout(resolve, 32));
      if (this.destroyed) throw new Error('Texture manager destroyed');
    } while (this.isBusy() || document.hidden);
  };

  public async getPageTextureEntry(index: number): Promise<TextureCacheEntry> {
    if (!Number.isInteger(index) || index < 0 || index > this.book.pages.length + 2) {
      throw new RangeError(`Invalid texture face index: ${index}`);
    }
    const cached = this.cache.get(index);
    if (cached) return cached;
    const existing = this.inFlight.get(index);
    if (existing) return existing;
    if (this.destroyed) return { dataUrl: this.placeholderDataUrl, lastAccessed: Date.now() };
    const promise = this.render(index).then(entry => {
      if (this.destroyed) {
        entry.canvasTexture?.dispose();
        return { dataUrl: this.placeholderDataUrl, lastAccessed: Date.now() };
      }
      this.cache.set(index, entry);
      return entry;
    }).finally(() => this.inFlight.delete(index));
    this.inFlight.set(index, promise);
    return promise;
  }

  private async render(index: number): Promise<TextureCacheEntry> {
    const n = this.book.pages.length;
    let texture: THREE.CanvasTexture;
    if (index === 0) {
      texture = await PageTextureGenerator.createCoverTexture(this.book.cover.front.backgroundUrl, this.book, this.waitForIdle);
    } else if (index <= n) {
      texture = await PageTextureGenerator.renderPageTexture(this.book.pages[index - 1], this.book, this.waitForIdle);
    } else {
      const inside = index === n + 1;
      texture = await PageTextureGenerator.createBackCoverTexture(
        inside ? this.book.cover.back.insideBackgroundUrl : this.book.cover.back.outsideBackgroundUrl,
        inside, this.book, this.waitForIdle
      );
    }
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    // No JPEG/Base64 encoding: the material receives the canvas texture itself.
    return { dataUrl: this.placeholderDataUrl, canvasTexture: texture, lastAccessed: Date.now() };
  }

  public async updateActiveWindow(spread: number, onReady?: TextureReady) {
    if (this.destroyed) return;
    this.currentSpread = spread;
    this.onReady = onReady;
    const face = spread * 2;
    const min = Math.max(0, face - this.WINDOW_SIZE * 2);
    const max = Math.min(this.book.pages.length + 2, face + this.WINDOW_SIZE * 2);
    this.pending = [];
    for (let i = min; i <= max; i++) {
      if (!this.cache.has(i)) this.pending.push(i);
    }
    this.pending.sort((a, b) => Math.abs(a - face) - Math.abs(b - face));
    if (!this.processing) void this.process();
  }

  private async process() {
    this.processing = true;
    try {
      while (this.pending.length && !this.destroyed) {
        await this.waitForIdle();
        // A window update can replace the queue while waitForIdle is suspended.
        const index = this.pending.shift();
        if (index === undefined) continue;
        try {
          const entry = await this.getPageTextureEntry(index);
          await this.waitForIdle();
          this.onReady?.(index, entry.dataUrl, entry.canvasTexture);
          this.prune();
        } catch (error) {
          if (this.destroyed) break;
          console.warn(`[LazyTextureManager] Face ${index} failed:`, error);
        }
      }
    } catch (error) {
      if (!this.destroyed) console.warn('[LazyTextureManager]', error);
    } finally {
      this.processing = false;
    }
  }

  private prune() {
    if (this.cache.size <= 20) return;
    const face = this.currentSpread * 2;
    for (const [index, entry] of this.cache) {
      if (index === 0 || Math.abs(index - face) <= this.WINDOW_SIZE * 2) continue;
      // Detach the material before releasing its GPU texture.
      this.onReady?.(index, this.placeholderDataUrl);
      entry.canvasTexture?.dispose();
      this.cache.delete(index);
      if (this.cache.size <= 16) break;
    }
  }

  public getCacheSize() { return this.cache.size; }

  public destroy() {
    this.destroyed = true;
    this.pending = [];
    for (const entry of this.cache.values()) entry.canvasTexture?.dispose();
    this.cache.clear();
  }
}
