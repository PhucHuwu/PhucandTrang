/**
 * MediaPreloader
 * =====================
 * Intelligent Priority-Driven Asset Preloader for 3D Experience (Prompt 27).
 * 
 * Features:
 * - Priority queue:
 *   1. Covers (Front & Back)
 *   2. Current Page
 *   3. Adjacent Pages (current ± 2)
 *   4. Remaining Pages
 * - Preloads:
 *   - Images (HTMLImageElement with decode())
 *   - Video Posters (HTMLImageElement with decode())
 *   - Audio metadata (HTMLAudioElement with preload="metadata")
 * - NO full video download (strictly posters and metadata to save bandwidth).
 * - Deduplication via URL set.
 * - Abort / Cancellation support when switching pages or destroying.
 * - Non-blocking: background loading does not delay first meaningful render.
 */

import { Book, Page } from '@/types/book';

export type PreloadItemType = 'image' | 'video-poster' | 'audio-meta';

export interface PreloadItem {
  url: string;
  type: PreloadItemType;
  priority: number; // 1 = highest, 4 = lowest
  pageIndex?: number;
}

export interface PreloadProgress {
  total: number;
  loaded: number;
  percent: number;
  isInitialReady: boolean;
}

export class MediaPreloader {
  private book: Book;
  private preloadedUrls = new Set<string>();
  private activeControllers = new Set<AbortController>();
  private queue: PreloadItem[] = [];
  private isProcessing = false;
  private totalQueued = 0;
  private totalLoaded = 0;
  private destroyed = false;
  private onProgressCallback?: (progress: PreloadProgress) => void;

  constructor(book: Book, onProgress?: (progress: PreloadProgress) => void) {
    this.book = book;
    this.onProgressCallback = onProgress;
  }

  /**
   * Builds the initial prioritized item queue:
   * Priority 1: Covers
   * Priority 2: Current Page (0)
   * Priority 3: Adjacent Pages (1, 2)
   * Priority 4: Remaining Pages
   */
  public init(initialSpread = 0) {
    this.queue = [];
    this.totalQueued = 0;
    this.totalLoaded = 0;

    // 1. Priority 1: Covers & Background Audio
    const coverFront = this.book.cover?.front?.backgroundUrl;
    const coverBackInside = this.book.cover?.back?.insideBackgroundUrl;
    const coverBackOutside = this.book.cover?.back?.outsideBackgroundUrl;

    if (coverFront) this.enqueue(coverFront, 'image', 1);
    if (coverBackInside) this.enqueue(coverBackInside, 'image', 1);
    if (coverBackOutside) this.enqueue(coverBackOutside, 'image', 1);

    if (this.book.audio?.src) {
      this.enqueue(this.book.audio.src, 'audio-meta', 1);
    }

    // 2. Pages: determine priorities relative to initialSpread
    this.updatePagePriorities(initialSpread);

    // Start background processing
    this.processQueue();
  }

  /**
   * Recalculates remaining queue priorities when user navigates to a new page
   */
  public updatePagePriorities(currentSpread: number) {
    if (this.destroyed) return;

    const currentFace = currentSpread * 2;
    const pages = this.book.pages || [];

    pages.forEach((page, pageIdx) => {
      const faceIdx = pageIdx + 1; // 0 is front cover
      const distance = Math.abs(faceIdx - currentFace);

      let priority = 4;
      if (distance <= 1) {
        priority = 2; // Current page face
      } else if (distance <= 4) {
        priority = 3; // Adjacent pages
      } else {
        priority = 4; // Remaining
      }

      // Collect page background
      const bg = (page.background as any) || {};
      if (bg.imageUrl) {
        this.enqueue(bg.imageUrl, 'image', priority, pageIdx);
      }

      // Collect page audio
      if (page.audio?.src) {
        this.enqueue(page.audio.src, 'audio-meta', priority, pageIdx);
      }

      // Collect element images & video posters (NEVER full video)
      (page.elements || []).forEach((el) => {
        const d = (el.data as any) || {};
        if (el.type === 'IMAGE' && d.src) {
          this.enqueue(d.src, 'image', priority, pageIdx);
        }
        if (el.type === 'VIDEO') {
          const poster = d.thumbnailUrl || d.poster;
          if (poster) {
            this.enqueue(poster, 'video-poster', priority, pageIdx);
          }
        }
      });
    });

    // Sort queue by priority ascending (1 = highest)
    this.queue.sort((a, b) => a.priority - b.priority);

    // Resume processing if stalled
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private enqueue(url: string, type: PreloadItemType, priority: number, pageIndex?: number) {
    if (!url || this.preloadedUrls.has(url)) return;

    // Check if already in queue
    const existingIndex = this.queue.findIndex((item) => item.url === url);
    if (existingIndex >= 0) {
      // Elevate priority if needed
      if (priority < this.queue[existingIndex].priority) {
        this.queue[existingIndex].priority = priority;
      }
      return;
    }

    this.queue.push({ url, type, priority, pageIndex });
    this.totalQueued++;
  }

  /**
   * Processes preloading queue with controlled concurrency (up to 4 concurrent downloads)
   */
  private async processQueue() {
    if (this.destroyed || this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const CONCURRENCY = 4;

    while (this.queue.length > 0 && !this.destroyed) {
      // Pick top N highest priority items
      const batch = this.queue.splice(0, CONCURRENCY);

      await Promise.all(
        batch.map((item) => this.preloadItem(item))
      );

      this.reportProgress();
    }

    this.isProcessing = false;
  }

  private async preloadItem(item: PreloadItem): Promise<void> {
    if (this.destroyed || this.preloadedUrls.has(item.url)) return;

    const controller = new AbortController();
    this.activeControllers.add(controller);

    try {
      if (item.type === 'image' || item.type === 'video-poster') {
        await this.preloadImage(item.url, controller.signal);
      } else if (item.type === 'audio-meta') {
        await this.preloadAudioMetadata(item.url, controller.signal);
      }

      this.preloadedUrls.add(item.url);
      this.totalLoaded++;
    } catch {
      // Ignore network aborts or silent image load fails without crashing
    } finally {
      this.activeControllers.delete(controller);
    }
  }

  /**
   * Preloads image and decodes off-thread
   */
  private preloadImage(url: string, signal: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve();

      const img = new Image();
      img.crossOrigin = 'anonymous';

      const cleanup = () => {
        img.onload = null;
        img.onerror = null;
      };

      if (signal.aborted) return resolve();
      signal.addEventListener('abort', () => {
        cleanup();
        img.src = '';
        resolve();
      });

      img.onload = () => {
        if ('decode' in img && typeof img.decode === 'function') {
          img.decode().catch(() => {}).finally(() => {
            cleanup();
            resolve();
          });
        } else {
          cleanup();
          resolve();
        }
      };

      img.onerror = () => {
        cleanup();
        resolve();
      };

      img.src = url;
    });
  }

  /**
   * Preloads audio metadata without streaming entire audio buffer
   */
  private preloadAudioMetadata(url: string, signal: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve();

      const audio = new Audio();
      audio.preload = 'metadata';

      const cleanup = () => {
        audio.onloadedmetadata = null;
        audio.onerror = null;
      };

      if (signal.aborted) return resolve();
      signal.addEventListener('abort', () => {
        cleanup();
        audio.src = '';
        resolve();
      });

      audio.onloadedmetadata = () => {
        cleanup();
        resolve();
      };

      audio.onerror = () => {
        cleanup();
        resolve();
      };

      audio.src = url;
    });
  }

  private reportProgress() {
    if (this.onProgressCallback) {
      const percent = this.totalQueued > 0 ? (this.totalLoaded / this.totalQueued) * 100 : 100;
      this.onProgressCallback({
        total: this.totalQueued,
        loaded: this.totalLoaded,
        percent: Math.min(100, Math.round(percent)),
        isInitialReady: this.totalLoaded >= Math.min(3, this.totalQueued),
      });
    }
  }

  public cancelAll() {
    for (const c of this.activeControllers) {
      c.abort();
    }
    this.activeControllers.clear();
    this.queue = [];
  }

  public destroy() {
    this.destroyed = true;
    this.cancelAll();
    this.preloadedUrls.clear();
  }
}
