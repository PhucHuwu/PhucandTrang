import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookStatus } from '@prisma/client';
import {
  CompiledBookDocument,
  CompiledPage,
  CompiledElement,
  CompiledMediaReferences,
} from './compiled-book.interface';
import { PublicCacheService } from './public-cache.service';
import { derivePageSide } from '../utils/page-utils';

@Injectable()
export class PublicService {
  constructor(
    private prisma: PrismaService,
    private cacheService: PublicCacheService,
  ) {}

  /**
   * Retrieves the compiled published book document by slug.
   * Returns cached document if available and fresh.
   */
  async getPublishedBook(slug: string): Promise<{ document: CompiledBookDocument; etag: string }> {
    const cached = this.cacheService.get<CompiledBookDocument>(slug);
    if (cached) {
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
          orderBy: { order: 'asc' },
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
            orderBy: { order: 'asc' },
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

    // Resolve any mediaId references to canonical URLs
    const mediaMap = await this.collectAndResolveMedia(book);

    const document = this.compileBookDocument(book, mediaMap);
    const latestVersion = book.versions?.[0]?.version || '2.0.0';
    const etag = `"${book.id}-rev${book.contentRevision || 1}-v${latestVersion}"`;

    this.cacheService.set(slug, document, etag);

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
   * Scans all mediaIds referenced in covers, cover elements, backgrounds, elements, and audio,
   * then fetches them in one batch to resolve canonical runtime URLs.
   */
  private async collectAndResolveMedia(book: any): Promise<Map<string, any>> {
    const mediaIdSet = new Set<string>();

    // 1. Cover background & cover elements mediaIds
    const cover = (book.cover as any) || {};
    if (cover.front?.mediaId) mediaIdSet.add(cover.front.mediaId);
    if (cover.back?.insideMediaId) mediaIdSet.add(cover.back.insideMediaId);
    if (cover.back?.outsideMediaId) mediaIdSet.add(cover.back.outsideMediaId);

    for (const el of cover.front?.elements || []) {
      const d = (el.data as any) || {};
      if (d.mediaId) mediaIdSet.add(d.mediaId);
      if (d.posterMediaId) mediaIdSet.add(d.posterMediaId);
    }

    for (const el of cover.back?.elements || []) {
      const d = (el.data as any) || {};
      if (d.mediaId) mediaIdSet.add(d.mediaId);
      if (d.posterMediaId) mediaIdSet.add(d.posterMediaId);
    }

    // 2. Background music
    if (book.backgroundMusic?.mediaId) {
      mediaIdSet.add(book.backgroundMusic.mediaId);
    }

    // 3. Pages & Elements
    for (const p of book.pages || []) {
      const bg = (p.background as any) || {};
      if (bg.mediaId) mediaIdSet.add(bg.mediaId);
      if (p.audioTrack?.mediaId) mediaIdSet.add(p.audioTrack.mediaId);

      for (const el of p.elements || []) {
        const d = (el.data as any) || {};
        if (d.mediaId) mediaIdSet.add(d.mediaId);
        if (d.posterMediaId) mediaIdSet.add(d.posterMediaId);
      }
    }

    const mediaMap = new Map<string, any>();
    if (mediaIdSet.size > 0) {
      const mediaList = await this.prisma.media.findMany({
        where: { id: { in: Array.from(mediaIdSet) } },
      });
      for (const m of mediaList) {
        mediaMap.set(m.id, m);
      }
    }

    return mediaMap;
  }

  /**
   * Compiles an individual element, resolving canonical media URLs and normalizing transform.
   */
  private compileElement(
    el: any,
    mediaMap: Map<string, any>,
    images: Set<string>,
    allUrls: Set<string>,
    videos: Array<{ url: string; thumbnailUrl?: string; caption?: string }>,
  ): CompiledElement {
    const rawData = (el.data as any) || {};
    const data: Record<string, any> = { ...rawData };

    // Resolve Image canonical URL
    if (el.type === 'IMAGE') {
      const resolvedSrc =
        (rawData.mediaId && mediaMap.get(rawData.mediaId)?.url) || rawData.src;
      data.src = resolvedSrc;
      if (resolvedSrc) {
        images.add(resolvedSrc);
        allUrls.add(resolvedSrc);
      }
    }

    // Resolve Video canonical URL and poster thumbnail
    if (el.type === 'VIDEO') {
      const resolvedSrc =
        (rawData.mediaId && mediaMap.get(rawData.mediaId)?.url) || rawData.src;
      const resolvedPoster =
        (rawData.posterMediaId && mediaMap.get(rawData.posterMediaId)?.url) ||
        rawData.thumbnailUrl;

      data.src = resolvedSrc;
      data.thumbnailUrl = resolvedPoster;

      if (resolvedSrc) {
        allUrls.add(resolvedSrc);
        videos.push({
          url: resolvedSrc,
          thumbnailUrl: resolvedPoster,
          caption: rawData.caption,
        });
      }
      if (resolvedPoster) {
        images.add(resolvedPoster);
        allUrls.add(resolvedPoster);
      }
    }

    // Ensure transform has no duplicate zIndex
    const rawTransform = (el.transform as any) || {};
    const transform = {
      x: Number(rawTransform.x ?? 0),
      y: Number(rawTransform.y ?? 0),
      width: Number(rawTransform.width ?? 0.5),
      height: Number(rawTransform.height ?? 0.5),
      rotation: Number(rawTransform.rotation ?? 0),
      scale: Number(rawTransform.scale ?? 1),
    };

    return {
      id: el.id,
      type: el.type,
      slot: el.slot || null,
      order: el.order ?? el.zIndex ?? 1,
      zIndex: el.zIndex ?? 1,
      opacity: el.opacity ?? 1.0,
      transform,
      style: el.style as any,
      data,
      interaction: el.interaction as any,
    };
  }

  /**
   * Compiles raw database entities into a pristine, lean client document.
   * Resolves canonical URLs, strips sensitive fields, and computes deterministic page side sequencing.
   */
  private compileBookDocument(book: any, mediaMap: Map<string, any>): CompiledBookDocument {
    const allUrls = new Set<string>();
    const images = new Set<string>();
    const videos: Array<{ url: string; thumbnailUrl?: string; caption?: string }> = [];
    const audio: string[] = [];
    const backgrounds = new Set<string>();

    // 1. Audio track
    let compiledAudio: CompiledBookDocument['audio'] = null;
    if (book.backgroundMusic) {
      const resolvedSrc =
        (book.backgroundMusic.mediaId && mediaMap.get(book.backgroundMusic.mediaId)?.url) ||
        book.backgroundMusic.src;

      compiledAudio = {
        id: book.backgroundMusic.id,
        title: book.backgroundMusic.title,
        artist: book.backgroundMusic.artist,
        src: resolvedSrc,
        mediaId: book.backgroundMusic.mediaId,
        autoPlay: book.backgroundMusic.autoPlay ?? true,
        loop: book.backgroundMusic.loop ?? true,
        volume: book.backgroundMusic.volume ?? 0.8,
        startAt: book.backgroundMusic.startAt ?? 0.0,
        fadeIn: book.backgroundMusic.fadeIn ?? 0.0,
        fadeOut: book.backgroundMusic.fadeOut ?? 0.0,
        durationSeconds: book.backgroundMusic.durationSeconds,
      };
      if (resolvedSrc) {
        audio.push(resolvedSrc);
        allUrls.add(resolvedSrc);
      }
    }

    // 2. Covers
    const cover = (book.cover as any) || {};
    const frontBg =
      (cover.front?.mediaId && mediaMap.get(cover.front.mediaId)?.url) ||
      cover.front?.backgroundUrl ||
      '';
    const backInsideBg =
      (cover.back?.insideMediaId && mediaMap.get(cover.back.insideMediaId)?.url) ||
      cover.back?.insideBackgroundUrl ||
      '';
    const backOutsideBg =
      (cover.back?.outsideMediaId && mediaMap.get(cover.back.outsideMediaId)?.url) ||
      cover.back?.outsideBackgroundUrl ||
      '';

    if (frontBg) {
      backgrounds.add(frontBg);
      allUrls.add(frontBg);
    }
    if (backInsideBg) {
      backgrounds.add(backInsideBg);
      allUrls.add(backInsideBg);
    }
    if (backOutsideBg) {
      backgrounds.add(backOutsideBg);
      allUrls.add(backOutsideBg);
    }

    // Compile cover elements (if any)
    const frontCoverElements = (cover.front?.elements || [])
      .filter((el: any) => el.visible !== false)
      .map((el: any) => this.compileElement(el, mediaMap, images, allUrls, videos));

    const backCoverElements = (cover.back?.elements || [])
      .filter((el: any) => el.visible !== false)
      .map((el: any) => this.compileElement(el, mediaMap, images, allUrls, videos));

    // 3. Pages & Elements: sort strictly by order ASC
    const rawPages = [...(book.pages || [])].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));

    const compiledPages: CompiledPage[] = rawPages.map((page: any, physicalIndex: number) => {
      const bg = (page.background as any) || { type: 'color', color: '#F9F5EC' };
      const resolvedBgImage =
        (bg.mediaId && mediaMap.get(bg.mediaId)?.url) || bg.imageUrl;

      if (resolvedBgImage) {
        backgrounds.add(resolvedBgImage);
        allUrls.add(resolvedBgImage);
      }

      // Page-level audio track
      let pageAudio: CompiledPage['audio'] = null;
      if (page.audioTrack) {
        const trackSrc =
          (page.audioTrack.mediaId && mediaMap.get(page.audioTrack.mediaId)?.url) ||
          page.audioTrack.src;

        pageAudio = {
          id: page.audioTrack.id,
          title: page.audioTrack.title,
          artist: page.audioTrack.artist,
          src: trackSrc,
          mediaId: page.audioTrack.mediaId,
          volume: page.audioTrack.volume ?? 0.8,
          loop: page.audioTrack.loop ?? true,
          startAt: page.audioTrack.startAt ?? 0.0,
          fadeIn: page.audioTrack.fadeIn ?? 0.0,
          fadeOut: page.audioTrack.fadeOut ?? 0.0,
          durationSeconds: page.audioTrack.durationSeconds,
          autoPlay: page.audioTrack.autoPlay ?? true,
        };
        if (trackSrc) {
          audio.push(trackSrc);
          allUrls.add(trackSrc);
        }
      }

      // Elements: filter visible, sort by zIndex ASC
      const rawElements = (page.elements || [])
        .filter((el: any) => el.visible !== false)
        .sort((a: any, b: any) => (a.zIndex ?? 1) - (b.zIndex ?? 1));

      const compiledElements: CompiledElement[] = rawElements.map((el: any) =>
        this.compileElement(el, mediaMap, images, allUrls, videos),
      );

      // Side is deterministically derived from physical order index
      const derivedSide = derivePageSide(physicalIndex);

      return {
        id: page.id,
        order: page.order ?? physicalIndex,
        displayPageNumber: page.pageNumber ?? physicalIndex,
        pageNumber: page.pageNumber ?? physicalIndex,
        side: derivedSide,
        chapter: page.chapter || null,
        title: page.title || null,
        quote: page.quote || null,
        handwriting: page.handwriting || null,
        layout: page.layoutTemplateId || (page.sourceTemplateId ? page.sourceTemplateId : 'auto'),
        layoutMode: page.layoutMode || 'PRESET',
        background: {
          ...bg,
          imageUrl: resolvedBgImage,
        },
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

    const latestVersion = book.versions?.[0]?.version || '2.0.0';

    return {
      id: book.id,
      slug: book.slug,
      title: book.title,
      description: book.description || null,
      contentRevision: book.contentRevision || 1,
      couple: {
        he: book.heName,
        she: book.sheName,
        anniversaryDate: book.anniversaryDate
          ? new Date(book.anniversaryDate).toISOString()
          : '2022-10-20T00:00:00Z',
        proposalQuote: book.proposalQuote,
      },
      cover: {
        front: {
          ...cover.front,
          backgroundUrl: frontBg,
          elements: frontCoverElements,
        },
        back: {
          ...cover.back,
          insideBackgroundUrl: backInsideBg,
          outsideBackgroundUrl: backOutsideBg,
          elements: backCoverElements,
        },
      },
      audio: compiledAudio,
      settings: (book.settings as any) || {},
      pages: compiledPages,
      media: mediaReferences,
      publishedAt: book.updatedAt instanceof Date ? book.updatedAt.toISOString() : book.updatedAt,
      version: latestVersion,
    };
  }
}
