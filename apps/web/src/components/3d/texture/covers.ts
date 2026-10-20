import { Book, Page, PageElement } from '@/types/book';

/**
 * Creates Front Cover Texture by converting cover metadata into a generic Page object.
 * Eliminates hardcoded coordinates and unifies front cover with Generic Page Renderer.
 */
export function buildFrontCoverPage(
  photoSrc: string,
  bookContext?: Partial<Book>
): Page {
  const frontCover = bookContext?.cover?.front as any;
  const bgUrl = frontCover?.backgroundUrl || photoSrc;

  let elements: PageElement[] = frontCover?.elements || [];

  if (!elements || elements.length === 0) {
    const coupleHe = bookContext?.couple?.he || 'PHÚC';
    const coupleShe = bookContext?.couple?.she || 'TRANG';
    const title = frontCover?.title || 'Chúng Mình';
    const subtitle =
      frontCover?.counterBadge?.subtitle || 'Bên nhau từ ngày {{anniversaryDate}}';

    elements = [
      // Title: "Chúng Mình"
      {
        id: 'cover-title',
        type: 'TEXT',
        slot: 'title',
        order: 1,
        zIndex: 10,
        visible: true,
        locked: true,
        opacity: 1,
        transform: {
          x: 0.068,
          y: 0.55,
          width: 0.86,
          height: 0.08,
          rotation: 0,
          scale: 1,
        },
        style: {
          textAlign: 'left',
          color: '#FFFFFF',
          fontFamily:
            '"SVN-Housttely Signature", "Coldwell Bridges", cursive, serif',
          fontSize: 60,
          letterSpacing: 1,
          shadow: {
            color: 'rgba(0, 0, 0, 0.85)',
            blur: 12,
            offsetX: 0,
            offsetY: 3,
          },
        },
        data: { text: title, variant: 'title' },
      },
      // Divider line
      {
        id: 'cover-divider',
        type: 'SHAPE',
        slot: 'divider',
        order: 2,
        zIndex: 11,
        visible: true,
        locked: true,
        opacity: 1,
        transform: {
          x: 0.068,
          y: 0.625,
          width: 0.28,
          height: 0.002,
          rotation: 0,
          scale: 1,
        },
        data: { shapeType: 'line', strokeColor: '#F0B6C3', strokeWidth: 2 },
      },
      // Live Days Counter
      {
        id: 'cover-days-counter',
        type: 'TEXT',
        slot: 'counter',
        order: 3,
        zIndex: 12,
        visible: true,
        locked: true,
        opacity: 1,
        transform: {
          x: 0.068,
          y: 0.65,
          width: 0.86,
          height: 0.05,
          rotation: 0,
          scale: 1,
        },
        style: {
          textAlign: 'left',
          color: '#FFE5B4',
          fontFamily: 'Montserrat, sans-serif',
          fontSize: 32,
          fontWeight: 'bold',
          letterSpacing: 1,
          shadow: {
            color: 'rgba(0, 0, 0, 0.85)',
            blur: 12,
            offsetX: 0,
            offsetY: 3,
          },
        },
        data: { text: '{{daysTogether | number}} NGÀY', variant: 'title' },
      },
      // Subtitle
      {
        id: 'cover-subtitle',
        type: 'TEXT',
        slot: 'subtitle',
        order: 4,
        zIndex: 13,
        visible: true,
        locked: true,
        opacity: 1,
        transform: {
          x: 0.068,
          y: 0.685,
          width: 0.86,
          height: 0.04,
          rotation: 0,
          scale: 1,
        },
        style: {
          textAlign: 'left',
          color: 'rgba(255, 245, 247, 0.9)',
          fontFamily: '"Dancing Script", cursive',
          fontSize: 24,
          fontStyle: 'italic',
          shadow: {
            color: 'rgba(0, 0, 0, 0.85)',
            blur: 12,
            offsetX: 0,
            offsetY: 3,
          },
        },
        data: { text: subtitle, variant: 'quote' },
      },
    ];
  }

  const frontCoverPage: Page = {
    id: 'page-cover-front',
    pageNumber: -1,
    order: -1,
    showPageNumber: false,
    side: 'right',
    layout: 'custom',
    background: {
      type: frontCover?.type || (bgUrl ? 'image' : 'color'),
      imageUrl: bgUrl,
      mediaId: frontCover?.mediaId,
      color: frontCover?.color || '#FFE8EE',
      opacity: frontCover?.opacity !== undefined ? frontCover.opacity : 1,
      objectFit: frontCover?.objectFit || 'cover',
      focalPoint: frontCover?.focalPoint || { x: 0.5, y: 0.5 },
      gradient: frontCover?.gradient,
      headerFade: frontCover?.headerFade,
      gutterFade: frontCover?.gutterFade,
    },
    elements,
  };

  return frontCoverPage;
}

/**
 * Creates Back Cover Texture (inside and outside) by delegating to Generic Page Renderer.
 */
export function buildBackCoverPage(
  photoSrc: string,
  isInside: boolean,
  bookContext?: Partial<Book>
): Page {
  const cover = bookContext?.cover?.back as any;
  const bgUrl = isInside
    ? cover?.insideBackgroundUrl || photoSrc
    : cover?.outsideBackgroundUrl || photoSrc;

  const targetBg = isInside
    ? cover?.insideBackground || cover
    : cover?.outsideBackground || cover;

  // Correctly read insideElements for inside, and elements for outside!
  const elements = isInside
    ? cover?.insideElements || []
    : cover?.elements || [];

  const backCoverPage: Page = {
    id: `page-cover-back-${isInside ? 'inside' : 'outside'}`,
    pageNumber: -1,
    order: -1,
    showPageNumber: false,
    side: isInside ? 'left' : 'right',
    layout: 'custom',
    background: {
      type: targetBg?.type || (bgUrl ? 'image' : 'color'),
      imageUrl: bgUrl,
      mediaId: isInside ? (cover?.insideMediaId || targetBg?.mediaId) : (cover?.outsideMediaId || targetBg?.mediaId),
      color: targetBg?.color || '#1F1218',
      opacity: targetBg?.opacity !== undefined ? targetBg.opacity : 1,
      objectFit: targetBg?.objectFit || 'cover',
      focalPoint: targetBg?.focalPoint || { x: 0.5, y: 0.5 },
      gradient: targetBg?.gradient,
      headerFade: targetBg?.headerFade,
      gutterFade: targetBg?.gutterFade,
    },
    elements,
  };

  return backCoverPage;
}
