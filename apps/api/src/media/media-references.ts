import { PrismaService } from '../prisma/prisma.service';

export interface MediaReferenceItem {
  targetType: 'BOOK_COVER' | 'PAGE_BACKGROUND' | 'PAGE_ELEMENT' | 'AUDIO_TRACK';
  bookId?: string;
  bookTitle?: string;
  pageId?: string;
  pageNumber?: number;
  chapter?: string;
  elementId?: string;
  elementType?: string;
  slot?: string;
  field: string;
  description: string;
}

/**
 * Scans Books, Covers, Pages, Elements, and AudioTracks for references to a media item.
 * Matches both canonical mediaId, posterMediaId, as well as legacy src and thumbnailUrl URLs.
 */
export async function scanMediaReferences(
  prisma: PrismaService,
  mediaId: string,
  media: { url: string; publicId?: string | null },
): Promise<MediaReferenceItem[]> {
  const references: MediaReferenceItem[] = [];

  const mediaUrl = media.url;
  const mediaPublicId = media.publicId;

  const matchesMedia = (
    testUrl?: string | null,
    testMediaId?: string | null,
  ): boolean => {
    if (testMediaId && testMediaId === mediaId) return true;
    if (!testUrl) return false;
    if (testUrl === mediaUrl) return true;
    if (mediaPublicId && testUrl.includes(mediaPublicId)) return true;
    return false;
  };

  // 1. Scan Books (cover backgrounds, cover elements, background music, playlist)
  const books = await prisma.book.findMany({
    select: {
      id: true,
      title: true,
      cover: true,
      settings: true,
      backgroundMusic: { select: { src: true, mediaId: true } },
    },
  });

  for (const book of books) {
    const cover = (book.cover as any) || {};

    if (matchesMedia(cover.front?.backgroundUrl, cover.front?.mediaId)) {
      references.push({
        targetType: 'BOOK_COVER',
        bookId: book.id,
        bookTitle: book.title,
        field: 'cover.front.backgroundUrl',
        description: `Bìa trước sách "${book.title}" (Front Cover)`,
      });
    }

    if (
      matchesMedia(cover.back?.insideBackgroundUrl, cover.back?.insideMediaId)
    ) {
      references.push({
        targetType: 'BOOK_COVER',
        bookId: book.id,
        bookTitle: book.title,
        field: 'cover.back.insideBackgroundUrl',
        description: `Mặt trong bìa sau sách "${book.title}" (Inside Back Cover)`,
      });
    }

    if (
      matchesMedia(cover.back?.outsideBackgroundUrl, cover.back?.outsideMediaId)
    ) {
      references.push({
        targetType: 'BOOK_COVER',
        bookId: book.id,
        bookTitle: book.title,
        field: 'cover.back.outsideBackgroundUrl',
        description: `Mặt ngoài bìa sau sách "${book.title}" (Outside Back Cover)`,
      });
    }

    // Scan cover elements (front, back, inside back) for both source media and video poster media
    const coverElementGroups: { list: any; field: string; label: string }[] = [
      {
        list: cover.front?.elements,
        field: 'cover.front.elements',
        label: 'bìa trước',
      },
      {
        list: cover.back?.elements,
        field: 'cover.back.elements',
        label: 'bìa sau',
      },
      {
        list: cover.back?.insideElements,
        field: 'cover.back.insideElements',
        label: 'mặt trong bìa sau',
      },
    ];
    for (const group of coverElementGroups) {
      if (!Array.isArray(group.list)) continue;
      for (const el of group.list) {
        const d = el?.data || {};
        const sourceMatched = matchesMedia(d.src || d.url, d.mediaId);
        const posterMatched = matchesMedia(
          d.thumbnailUrl || d.posterUrl,
          d.posterMediaId,
        );

        if (sourceMatched) {
          references.push({
            targetType: 'BOOK_COVER',
            bookId: book.id,
            bookTitle: book.title,
            elementId: el.id,
            elementType: el.type,
            field: `${group.field}.src`,
            description: `Phần tử ${el.type} trên ${group.label} sách "${book.title}"`,
          });
        }

        if (posterMatched && !sourceMatched) {
          references.push({
            targetType: 'BOOK_COVER',
            bookId: book.id,
            bookTitle: book.title,
            elementId: el.id,
            elementType: el.type,
            field: `${group.field}.poster`,
            description: `Poster video trên ${group.label} sách "${book.title}"`,
          });
        }
      }
    }

    if (
      matchesMedia(book.backgroundMusic?.src, book.backgroundMusic?.mediaId)
    ) {
      references.push({
        targetType: 'AUDIO_TRACK',
        bookId: book.id,
        bookTitle: book.title,
        field: 'book.backgroundMusic',
        description: `Nhạc nền chính của sách "${book.title}"`,
      });
    }

    const settings = (book.settings as any) || {};
    if (Array.isArray(settings.playlistTracks)) {
      for (const track of settings.playlistTracks) {
        if (track && matchesMedia(track.src, track.mediaId)) {
          references.push({
            targetType: 'AUDIO_TRACK',
            bookId: book.id,
            bookTitle: book.title,
            field: 'settings.playlistTracks',
            description: `Bản nhạc "${track.title || track.id || ''}" trong playlist của sách "${book.title}"`,
          });
        }
      }
    }
  }

  // 2. Scan Pages (background image & audio track)
  const pages = await prisma.page.findMany({
    select: {
      id: true,
      bookId: true,
      pageNumber: true,
      chapter: true,
      title: true,
      background: true,
      book: { select: { id: true, title: true } },
      audioTrack: { select: { src: true, mediaId: true } },
    },
  });

  for (const page of pages) {
    const bg = (page.background as any) || {};
    if (matchesMedia(bg.imageUrl || bg.url, bg.mediaId)) {
      references.push({
        targetType: 'PAGE_BACKGROUND',
        bookId: page.bookId,
        bookTitle: page.book?.title,
        pageId: page.id,
        pageNumber: page.pageNumber,
        chapter: page.chapter || undefined,
        field: 'page.background.imageUrl',
        description: `Hình nền trang số ${page.pageNumber} (${page.chapter || 'Không có chương'} - ${page.title || 'Không có tiêu đề'})`,
      });
    }

    if (matchesMedia(page.audioTrack?.src, page.audioTrack?.mediaId)) {
      references.push({
        targetType: 'AUDIO_TRACK',
        bookId: page.bookId,
        bookTitle: page.book?.title,
        pageId: page.id,
        pageNumber: page.pageNumber,
        field: 'page.audioTrack',
        description: `Nhạc nền riêng của trang số ${page.pageNumber}`,
      });
    }
  }

  // 3. Scan Page Elements (src, url, mediaId, thumbnailUrl, posterUrl, posterMediaId)
  const elements = await prisma.pageElement.findMany({
    select: {
      id: true,
      type: true,
      slot: true,
      pageId: true,
      data: true,
      page: {
        select: {
          pageNumber: true,
          bookId: true,
          book: { select: { id: true, title: true } },
        },
      },
    },
  });

  for (const elem of elements) {
    const data = (elem.data as any) || {};

    const srcMatched = matchesMedia(data.src || data.url, data.mediaId);
    const posterMatched = matchesMedia(
      data.thumbnailUrl || data.posterUrl,
      data.posterMediaId,
    );

    if (srcMatched) {
      references.push({
        targetType: 'PAGE_ELEMENT',
        bookId: elem.page?.bookId,
        bookTitle: elem.page?.book?.title,
        pageId: elem.pageId,
        pageNumber: elem.page?.pageNumber,
        elementId: elem.id,
        elementType: elem.type,
        slot: elem.slot || undefined,
        field: 'data.src',
        description: `Phần tử ${elem.type} (slot: ${elem.slot || 'tự do'}) tại trang ${elem.page?.pageNumber}`,
      });
    }

    if (posterMatched && !srcMatched) {
      references.push({
        targetType: 'PAGE_ELEMENT',
        bookId: elem.page?.bookId,
        bookTitle: elem.page?.book?.title,
        pageId: elem.pageId,
        pageNumber: elem.page?.pageNumber,
        elementId: elem.id,
        elementType: elem.type,
        slot: elem.slot || undefined,
        field: 'data.thumbnailUrl',
        description: `Ảnh poster video (slot: ${elem.slot || 'tự do'}) tại trang ${elem.page?.pageNumber}`,
      });
    }
  }

  // 4. Scan Audio Tracks table directly
  const audioTracks = await prisma.audioTrack.findMany({
    select: { id: true, title: true, src: true, mediaId: true },
  });
  for (const track of audioTracks) {
    if (matchesMedia(track.src, track.mediaId)) {
      const alreadyFound = references.some(
        (r) =>
          r.targetType === 'AUDIO_TRACK' &&
          r.field !== 'settings.playlistTracks' &&
          r.description.includes(track.title),
      );
      if (!alreadyFound) {
        references.push({
          targetType: 'AUDIO_TRACK',
          field: 'src',
          description: `Bản nhạc "${track.title}"`,
        });
      }
    }
  }

  return references;
}
