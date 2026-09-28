import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ValidationIssue,
  ValidationReport,
} from './publish-validation.interface';
import { validateInteractionTarget } from '@phucandtrang/shared';

@Injectable()
export class PublishValidationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Performs an exhaustive pre-publish inspection on a book entity and all its relations.
   */
  async validateBookForPublish(bookId: string): Promise<ValidationReport> {
    const issues: ValidationIssue[] = [];

    // 1. Fetch complete Book with relations
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      include: {
        backgroundMusic: true,
        pages: {
          orderBy: { order: 'asc' },
          include: {
            elements: { orderBy: { zIndex: 'asc' } },
            layoutTemplate: true,
            audioTrack: true,
          },
        },
      },
    });

    if (!book) {
      return {
        isValid: false,
        errorCount: 1,
        warningCount: 0,
        issues: [
          {
            id: 'err-book-not-found',
            severity: 'ERROR',
            code: 'BOOK_NOT_FOUND',
            message: `Không tìm thấy cuốn sách với ID "${bookId}".`,
            location: { type: 'BOOK' },
          },
        ],
      };
    }

    // 2. Fetch all registered Media IDs & AudioTrack IDs for fast in-memory validation
    const [allMedia, allAudioTracks, allLayoutTemplates] = await Promise.all([
      this.prisma.media.findMany({ select: { id: true, size: true, url: true } }),
      this.prisma.audioTrack.findMany({ select: { id: true } }),
      this.prisma.layoutTemplate.findMany({ select: { id: true } }),
    ]);

    const mediaMap = new Map<string, { size?: number | bigint | null; url: string }>();
    allMedia.forEach((m) => mediaMap.set(m.id, { size: m.size, url: m.url }));

    const audioTrackIdSet = new Set(allAudioTracks.map((a) => a.id));
    const layoutTemplateIdSet = new Set(allLayoutTemplates.map((l) => l.id));

    // Known built-in layout IDs
    const builtInLayouts = new Set([
      'auto',
      'single-hero',
      'dual-stacked',
      'dual-columns',
      'asymmetric-featured',
      'scrapbook-trio',
      'quad-gallery',
      'diagonal-duo',
      'custom',
    ]);

    // Check helper for Media existence and size
    const checkMedia = (
      mediaId?: string | null,
      rawUrl?: string | null,
      location?: ValidationIssue['location'],
      fieldLabel?: string
    ) => {
      if (mediaId) {
        if (!mediaMap.has(mediaId)) {
          issues.push({
            id: `err-broken-media-${mediaId}`,
            severity: 'ERROR',
            code: 'BROKEN_MEDIA_ID',
            message: `${fieldLabel || 'Media'} có mediaId "${mediaId}" không tồn tại trong Thư viện Media.`,
            location: location || { type: 'BOOK' },
            fixLink: `/admin/media`,
          });
        } else {
          const item = mediaMap.get(mediaId)!;
          const sizeNum = Number(item.size || 0);
          if (sizeNum > 10 * 1024 * 1024) {
            issues.push({
              id: `warn-large-media-${mediaId}`,
              severity: 'WARNING',
              code: 'VERY_LARGE_MEDIA',
              message: `${fieldLabel || 'File'} có dung lượng lớn (${(sizeNum / (1024 * 1024)).toFixed(1)}MB > 10MB), có thể làm chậm thời gian tải trang.`,
              location: location || { type: 'BOOK' },
              fixLink: `/admin/media`,
            });
          }
        }
      }
    };

    // ==========================================
    // A. BOOK COVER VALIDATION
    // ==========================================
    const cover = (book.cover as any) || {};
    const frontBg = cover.front?.backgroundUrl;
    const frontMediaId = cover.front?.mediaId;

    if (!frontBg && !frontMediaId) {
      issues.push({
        id: 'err-missing-cover',
        severity: 'ERROR',
        code: 'MISSING_COVER',
        message: 'Bìa trước cuốn sách (Front Cover) chưa có ảnh nền hoặc mediaId.',
        location: { type: 'COVER' },
        fixLink: `/admin/books/${book.id}/cover`,
      });
    }

    checkMedia(frontMediaId, frontBg, { type: 'COVER' }, 'Bìa trước');
    checkMedia(cover.back?.insideMediaId, cover.back?.insideBackgroundUrl, { type: 'COVER' }, 'Mặt trong bìa sau');
    checkMedia(cover.back?.outsideMediaId, cover.back?.outsideBackgroundUrl, { type: 'COVER' }, 'Mặt ngoài bìa sau');

    // ==========================================
    // B. BACKGROUND MUSIC VALIDATION
    // ==========================================
    if (book.backgroundMusicId) {
      if (!audioTrackIdSet.has(book.backgroundMusicId)) {
        issues.push({
          id: `err-deleted-bg-music-${book.backgroundMusicId}`,
          severity: 'ERROR',
          code: 'DELETED_AUDIO_REFERENCE',
          message: `Nhạc nền chính ID "${book.backgroundMusicId}" đã bị xóa khỏi Thư viện Audio.`,
          location: { type: 'AUDIO' },
          fixLink: `/admin/books/${book.id}/settings`,
        });
      }
    }

    // ==========================================
    // C. PAGES INTEGRITY & ORDER VALIDATION
    // ==========================================
    const pages = book.pages || [];

    if (pages.length === 0) {
      issues.push({
        id: 'err-empty-book',
        severity: 'ERROR',
        code: 'NO_PAGES',
        message: 'Cuốn sách chưa có bất kỳ trang nội dung nào. Không thể xuất bản.',
        location: { type: 'BOOK' },
        fixLink: `/admin/books/${book.id}/pages`,
      });
    }

    // Check sequence of physical order (0, 1, 2, ..., N-1)
    const seenOrders = new Set<number>();
    pages.forEach((p, idx) => {
      const order = p.order;
      if (order < 0) {
        issues.push({
          id: `err-negative-order-${p.id}`,
          severity: 'ERROR',
          code: 'INVALID_PAGE_ORDER',
          message: `Trang ${p.pageNumber} có thứ tự order âm (${order}).`,
          location: { type: 'PAGE', pageId: p.id, pageNumber: p.pageNumber, pageOrder: order },
          fixLink: `/admin/books/${book.id}/pages`,
        });
      }

      if (seenOrders.has(order)) {
        issues.push({
          id: `err-duplicate-order-${p.id}`,
          severity: 'ERROR',
          code: 'INVALID_PAGE_ORDER',
          message: `Trùng lặp thứ tự order #${order} tại trang ${p.pageNumber}.`,
          location: { type: 'PAGE', pageId: p.id, pageNumber: p.pageNumber, pageOrder: order },
          fixLink: `/admin/books/${book.id}/pages`,
        });
      }
      seenOrders.add(order);

      // Check Layout Template validity
      if (p.layoutTemplateId) {
        if (!builtInLayouts.has(p.layoutTemplateId) && !layoutTemplateIdSet.has(p.layoutTemplateId)) {
          issues.push({
            id: `err-invalid-layout-${p.id}`,
            severity: 'ERROR',
            code: 'INVALID_LAYOUT',
            message: `Trang ${p.pageNumber} sử dụng Layout Template ID không tồn tại ("${p.layoutTemplateId}").`,
            location: { type: 'PAGE', pageId: p.id, pageNumber: p.pageNumber, pageOrder: p.order },
            fixLink: `/admin/books/${book.id}/pages/${p.id}`,
          });
        }
      }

      // Check Page Audio Track validity
      if (p.audioTrackId) {
        if (!audioTrackIdSet.has(p.audioTrackId)) {
          issues.push({
            id: `err-deleted-page-audio-${p.id}`,
            severity: 'ERROR',
            code: 'DELETED_AUDIO_REFERENCE',
            message: `Nhạc nền riêng của Trang ${p.pageNumber} (ID "${p.audioTrackId}") đã bị xóa.`,
            location: { type: 'PAGE', pageId: p.id, pageNumber: p.pageNumber, pageOrder: p.order },
            fixLink: `/admin/books/${book.id}/pages/${p.id}`,
          });
        }
      }

      // Check Page Background Media
      const bg = (p.background as any) || {};
      checkMedia(
        bg.mediaId,
        bg.imageUrl,
        { type: 'PAGE', pageId: p.id, pageNumber: p.pageNumber, pageOrder: p.order },
        `Hình nền Trang ${p.pageNumber}`
      );

      // Warning: Empty Page
      if (!p.elements || p.elements.length === 0) {
        issues.push({
          id: `warn-empty-page-${p.id}`,
          severity: 'WARNING',
          code: 'EMPTY_PAGE',
          message: `Trang ${p.pageNumber} hiện đang để trống (0 phần tử nội dung).`,
          location: { type: 'PAGE', pageId: p.id, pageNumber: p.pageNumber, pageOrder: p.order },
          fixLink: `/admin/books/${book.id}/pages/${p.id}`,
        });
      }

      // ==========================================
      // D. PAGE ELEMENTS VALIDATION
      // ==========================================
      p.elements?.forEach((el) => {
        const d = (el.data as any) || {};
        const trans = (el.transform as any) || {};

        const elementLocation: ValidationIssue['location'] = {
          type: 'ELEMENT',
          pageId: p.id,
          pageNumber: p.pageNumber,
          pageOrder: p.order,
          elementId: el.id,
          elementType: el.type,
        };

        // 1. Malformed Transform check
        const isInvalidNumber = (val: any) => typeof val !== 'number' || isNaN(val);
        if (
          isInvalidNumber(trans.x) ||
          isInvalidNumber(trans.y) ||
          isInvalidNumber(trans.width) ||
          isInvalidNumber(trans.height) ||
          trans.width <= 0 ||
          trans.height <= 0
        ) {
          issues.push({
            id: `err-malformed-transform-${el.id}`,
            severity: 'ERROR',
            code: 'MALFORMED_ELEMENT_TRANSFORM',
            message: `Phần tử ${el.type} trên Trang ${p.pageNumber} có thông số transform không hợp lệ (x=${trans.x}, y=${trans.y}, w=${trans.width}, h=${trans.height}).`,
            location: elementLocation,
            fixLink: `/admin/books/${book.id}/pages/${p.id}`,
          });
        }

        // 2. IMAGE element validation
        if (el.type === 'IMAGE') {
          if (!d.src && !d.mediaId) {
            issues.push({
              id: `err-missing-image-media-${el.id}`,
              severity: 'ERROR',
              code: 'MISSING_REQUIRED_MEDIA',
              message: `Phần tử IMAGE trên Trang ${p.pageNumber} chưa có ảnh hoặc mediaId.`,
              location: elementLocation,
              fixLink: `/admin/books/${book.id}/pages/${p.id}`,
            });
          }

          checkMedia(d.mediaId, d.src, elementLocation, `Ảnh trên Trang ${p.pageNumber}`);

          // Warning: Missing Alt Text
          if (!d.alt && !d.altText) {
            issues.push({
              id: `warn-no-alt-${el.id}`,
              severity: 'WARNING',
              code: 'NO_ALT_TEXT',
              message: `Phần tử IMAGE trên Trang ${p.pageNumber} chưa có văn bản thay thế (alt text).`,
              location: elementLocation,
              fixLink: `/admin/books/${book.id}/pages/${p.id}`,
            });
          }
        }

        // 3. VIDEO element validation
        if (el.type === 'VIDEO') {
          if (!d.src && !d.mediaId) {
            issues.push({
              id: `err-missing-video-media-${el.id}`,
              severity: 'ERROR',
              code: 'MISSING_REQUIRED_MEDIA',
              message: `Phần tử VIDEO trên Trang ${p.pageNumber} chưa có video URL hoặc mediaId.`,
              location: elementLocation,
              fixLink: `/admin/books/${book.id}/pages/${p.id}`,
            });
          }

          checkMedia(d.mediaId, d.src, elementLocation, `Video trên Trang ${p.pageNumber}`);
          checkMedia(d.posterMediaId, d.thumbnailUrl, elementLocation, `Poster video trên Trang ${p.pageNumber}`);

          // Error: Invalid/missing video poster
          if (!d.thumbnailUrl && !d.posterMediaId) {
            issues.push({
              id: `err-invalid-poster-${el.id}`,
              severity: 'ERROR',
              code: 'INVALID_VIDEO_POSTER',
              message: `Phần tử VIDEO trên Trang ${p.pageNumber} chưa cấu hình ảnh poster đại diện.`,
              location: elementLocation,
              fixLink: `/admin/books/${book.id}/pages/${p.id}`,
            });
          }
        }

        // 4. Element Interaction Target Validation
        const interaction = el.interaction as any;
        if (interaction && interaction.enabled && interaction.action && interaction.action !== 'none') {
          const validTarget = validateInteractionTarget(interaction.action, interaction.target);
          if (!validTarget) {
            issues.push({
              id: `err-invalid-target-${el.id}`,
              severity: 'ERROR',
              code: 'INVALID_INTERACTION_TARGET',
              message: `Tương tác "${interaction.action}" của phần tử trên Trang ${p.pageNumber} có target không hợp lệ ("${interaction.target || ''}").`,
              location: elementLocation,
              fixLink: `/admin/books/${book.id}/pages/${p.id}`,
            });
          }
        }
      });
    });

    const errorCount = issues.filter((i) => i.severity === 'ERROR').length;
    const warningCount = issues.filter((i) => i.severity === 'WARNING').length;

    return {
      isValid: errorCount === 0,
      errorCount,
      warningCount,
      issues,
    };
  }
}
