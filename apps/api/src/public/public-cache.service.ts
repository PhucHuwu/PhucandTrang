import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const PUBLIC_JOURNAL_CACHE_KEY = 'journal';

export interface CacheEntry<T = any> {
  document: T;
  etag: string;
  expiresAt: number;
}

@Injectable()
export class PublicCacheService {
  private readonly logger = new Logger(PublicCacheService.name);
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 60 * 1000; // 60 seconds

  constructor(private prisma: PrismaService) {}

  get<T>(key: string): CacheEntry<T> | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry as CacheEntry<T>;
  }

  set<T>(key: string, document: T, etag: string, ttlMs: number = this.CACHE_TTL_MS): void {
    this.cache.set(key, {
      document,
      etag,
      expiresAt: Date.now() + ttlMs,
    });
  }

  invalidate(keyPattern?: string): void {
    if (!keyPattern) {
      this.cache.clear();
      return;
    }
    for (const k of this.cache.keys()) {
      if (k === keyPattern || k.includes(keyPattern)) {
        this.cache.delete(k);
      }
    }
  }

  /**
   * Invalidates the public journal cache without touching the database counter.
   * Used when an operation has already bumped contentRevision in an atomic transaction.
   */
  async invalidateBookCache(_bookId: string): Promise<void> {
    this.invalidate();
  }

  /**
   * Increments the contentRevision counter on the Book model in PostgreSQL
   * and purges any compiled cache entries for this book.
   */
  async touchBook(bookId: string): Promise<number> {
    try {
      const updated = await this.prisma.book.update({
        where: { id: bookId },
        data: {
          contentRevision: { increment: 1 },
        },
        select: { contentRevision: true },
      });

      this.invalidate();

      return updated.contentRevision;
    } catch (err) {
      this.logger.error(
        `touchBook(${bookId}) failed to bump contentRevision; cache invalidated anyway`,
        err instanceof Error ? err.stack : String(err),
      );
      this.invalidate();
      return 1;
    }
  }

  /**
   * Helper to touch book when only a pageId is known
   */
  async touchByPageId(pageId: string): Promise<void> {
    try {
      const page = await this.prisma.page.findUnique({
        where: { id: pageId },
        select: { bookId: true },
      });
      if (page?.bookId) {
        await this.touchBook(page.bookId);
      }
    } catch (err) {
      this.logger.error(
        `touchByPageId(${pageId}) failed; cache invalidated anyway`,
        err instanceof Error ? err.stack : String(err),
      );
      this.invalidate();
    }
  }

  /**
   * Helper to touch book when only an elementId is known
   */
  async touchByElementId(elementId: string): Promise<void> {
    try {
      const element = await this.prisma.pageElement.findUnique({
        where: { id: elementId },
        select: { page: { select: { bookId: true } } },
      });
      if (element?.page?.bookId) {
        await this.touchBook(element.page.bookId);
      }
    } catch (err) {
      this.logger.error(
        `touchByElementId(${elementId}) failed; cache invalidated anyway`,
        err instanceof Error ? err.stack : String(err),
      );
      this.invalidate();
    }
  }
}
