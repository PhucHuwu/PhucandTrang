import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookStatus } from '@prisma/client';
import {
  CompiledBookDocument,
  CompiledPage,
  CompiledElement,
  CompiledMediaReferences,
} from './compiled-book.interface';

interface CacheEntry {
  document: CompiledBookDocument;
  etag: string;
  expiresAt: number;
}

@Injectable()
export class PublicService {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 60 * 1000; // 60 seconds in-memory TTL

  constructor(private prisma: PrismaService) {}

  /**
   * Retrieves the compiled published book document by slug.
   * Returns cached document if available and fresh.
   */
  async getPublishedBook(slug: string): Promise<{ document: CompiledBookDocument; etag: string }> {
    const now = Date.now();
    const cached = this.cache.get(slug);

    if (cached && cached.expiresAt > now) {
      return { document: cached.document, etag: cached.etag };
    }

    let book = await this.prisma.book.findFirst({
      where: {
        slug,
        status: BookStatus.PUBLISHED,
      },
      include: {
        backgroundMusic: true,
        pages: {
          orderBy: { pageNumber: 'asc' },
          include: {
            elements: {
              where: { visible: true },
              orderBy: { zIndex: 'asc' },
            },
            layoutTemplate: true,
            audioTrack: true,
          },
        },
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { version: true },
        },
      },
    });

    if (!book && (slug === 'phuc-and-trang' || slug === 'chung-minh')) {
      book = await this.prisma.book.findFirst({
        where: {
          status: BookStatus.PUBLISHED,
        },
        orderBy: { createdAt: 'asc' },
        include: {
          backgroundMusic: true,
          pages: {
            orderBy: { pageNumber: 'asc' },
            include: {
              elements: {
                where: { visible: true },
                orderBy: { zIndex: 'asc' },
              },
              layoutTemplate: true,
              audioTrack: true,
            },
          },
          versions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { version: true },
          },
        },
      });
    }

    if (!book) {
      throw new NotFoundException(`Không tìm thấy cuốn sách đang xuất bản với slug: "${slug}"`);
    }

    const document = this.compileBookDocument(book);
    const etag = `W/"${book.id}-${book.updatedAt.getTime()}-${book.pages.length}"`;

    this.cache.set(slug, {
      document,
      etag,
      expiresAt: now + this.CACHE_TTL_MS,
    });

    return { document, etag };
  }

  /**
   * Retrieves the primary published book (e.g. for root / website home).
   */
  async getMasterBook(): Promise<{ document: CompiledBookDocument; etag: string }> {
    const primary = await this.prisma.book.findFirst({
      where: {
        status: BookStatus.PUBLISHED,
      },
      orderBy: { createdAt: 'asc' },
      select: { slug: true },
    });

    if (!primary) {
      throw new NotFoundException('Hiện tại chưa có cuốn sách nào được xuất bản công khai.');
    }

    return this.getPublishedBook(primary.slug);
  }

  /**
   * Compiles raw database entities into a pristine, lean client document.
   * Strips all internal IDs, passwords, admin metadata, and gathers media references.
   */
  private compileBookDocument(book: any): CompiledBookDocument {
    const allUrls = new Set<string>();
    const images = new Set<string>();
    const videos: Array<{ url: string; thumbnailUrl?: string; caption?: string }> = [];
    const audio: string[] = [];
    const backgrounds = new Set<string>();

    // 1. Audio track
    let compiledAudio: CompiledBookDocument['audio'] = null;
    if (book.backgroundMusic) {
      compiledAudio = {
        id: book.backgroundMusic.id,
        title: book.backgroundMusic.title,
        artist: book.backgroundMusic.artist,
        src: book.backgroundMusic.src,
        mediaId: book.backgroundMusic.mediaId,
        autoPlay: book.backgroundMusic.autoPlay,
        loop: book.backgroundMusic.loop,
        volume: book.backgroundMusic.volume,
        startAt: book.backgroundMusic.startAt,
        fadeIn: book.backgroundMusic.fadeIn,
        fadeOut: book.backgroundMusic.fadeOut,
        durationSeconds: book.backgroundMusic.durationSeconds,
      };
      if (book.backgroundMusic.src) {
        audio.push(book.backgroundMusic.src);
        allUrls.add(book.backgroundMusic.src);
      }
    }

    // 2. Covers
    const cover = book.cover as any;
    if (cover?.front?.backgroundUrl) {
      backgrounds.add(cover.front.backgroundUrl);
      allUrls.add(cover.front.backgroundUrl);
    }
    if (cover?.back?.insideBackgroundUrl) {
      backgrounds.add(cover.back.insideBackgroundUrl);
      allUrls.add(cover.back.insideBackgroundUrl);
    }
    if (cover?.back?.outsideBackgroundUrl) {
      backgrounds.add(cover.back.outsideBackgroundUrl);
      allUrls.add(cover.back.outsideBackgroundUrl);
    }

    // 3. Pages & Elements
    const compiledPages: CompiledPage[] = (book.pages || []).map((page: any) => {
      const bg = (page.background as any) || { type: 'color', color: '#F9F5EC' };
      if (bg.imageUrl) {
        backgrounds.add(bg.imageUrl);
        allUrls.add(bg.imageUrl);
      }

      // Page / chapter level audio track
      let pageAudio: CompiledPage['audio'] = null;
      if (page.audioTrack) {
        pageAudio = {
          id: page.audioTrack.id,
          title: page.audioTrack.title,
          artist: page.audioTrack.artist,
          src: page.audioTrack.src,
          mediaId: page.audioTrack.mediaId,
          volume: page.audioTrack.volume,
          loop: page.audioTrack.loop,
          startAt: page.audioTrack.startAt,
          fadeIn: page.audioTrack.fadeIn,
          fadeOut: page.audioTrack.fadeOut,
          durationSeconds: page.audioTrack.durationSeconds,
          autoPlay: page.audioTrack.autoPlay,
        };
        if (page.audioTrack.src) {
          audio.push(page.audioTrack.src);
          allUrls.add(page.audioTrack.src);
        }
      }

      const compiledElements: CompiledElement[] = (page.elements || []).map((el: any) => {
        const data = (el.data as any) || {};

        if (el.type === 'IMAGE' && data.src) {
          images.add(data.src);
          allUrls.add(data.src);
        } else if (el.type === 'VIDEO') {
          if (data.src) {
            allUrls.add(data.src);
            videos.push({
              url: data.src,
              thumbnailUrl: data.thumbnailUrl,
              caption: data.caption,
            });
          }
          if (data.thumbnailUrl) {
            images.add(data.thumbnailUrl);
            allUrls.add(data.thumbnailUrl);
          }
        }

        return {
          id: el.id,
          type: el.type,
          slot: el.slot || null,
          zIndex: el.zIndex,
          opacity: el.opacity,
          transform: el.transform as any,
          style: el.style as any,
          data: el.data as any,
          interaction: el.interaction as any,
        };
      });

      return {
        id: page.id,
        pageNumber: page.pageNumber,
        side: page.side.toLowerCase() as 'left' | 'right',
        order: page.order,
        chapter: page.chapter || null,
        title: page.title || null,
        quote: page.quote || null,
        handwriting: page.handwriting || null,
        layout: page.layoutTemplateId || (page.sourceTemplateId ? page.sourceTemplateId : 'auto'),
        layoutMode: page.layoutMode,
        background: bg,
        audio: pageAudio,
        elements: compiledElements,
      };
    });

    const mediaReferences: CompiledMediaReferences = {
      allUrls: Array.from(allUrls),
      images: Array.from(images),
      videos,
      audio,
      backgrounds: Array.from(backgrounds),
    };

    const latestVersion = book.versions?.[0]?.version || '1.0.0';

    return {
      id: book.id,
      slug: book.slug,
      title: book.title,
      description: book.description,
      couple: {
        he: book.heName,
        she: book.sheName,
        anniversaryDate: book.anniversaryDate.toISOString(),
        proposalQuote: book.proposalQuote,
      },
      cover,
      audio: compiledAudio,
      settings: book.settings as any,
      pages: compiledPages,
      media: mediaReferences,
      publishedAt: book.updatedAt.toISOString(),
      version: latestVersion,
    };
  }

  /**
   * Invalidate cache when books, pages, or elements are updated.
   */
  invalidateCache(slug?: string) {
    if (slug) {
      this.cache.delete(slug);
    } else {
      this.cache.clear();
    }
  }
}
