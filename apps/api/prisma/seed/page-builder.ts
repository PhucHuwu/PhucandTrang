import { ElementType, PageSide } from '@prisma/client';
import { REAL_LAYOUT_PRESETS } from '../../src/templates/layout-presets.data';
import { CanonicalPageDefinition } from './canonical-pages';

export function buildPageBackground(bg: string, mediaId: string | undefined) {
  return {
    type: 'image',
    imageUrl: bg,
    mediaId,
    headerFade: {
      enabled: true,
      color: '#F9F5EC',
      height: 0.345,
      startOpacity: 0.92,
      endOpacity: 0,
    },
    gutterFade: {
      enabled: true,
      color: '#F9F5EC',
      width: 0.14,
      opacity: 0.28,
    },
  };
}

/** Builds the element payloads (text, decorations, media) for one canonical page. */
export function buildPageElements(
  p: CanonicalPageDefinition,
  derivedSide: PageSide,
  getMediaId: (keyOrUrl: string) => string | undefined,
): any[] {
  const elementsToCreate: any[] = [];
  let currentZ = 1;

  // Subtitle element
  if (p.chapter) {
    elementsToCreate.push({
      type: ElementType.TEXT,
      slot: 'subtitle',
      order: currentZ,
      zIndex: currentZ++,
      transform: {
        x: 0.078,
        y: 0.062,
        width: 0.844,
        height: 0.022,
        rotation: 0,
        scale: 1,
      },
      style: {
        color: '#C99A9A',
        fontFamily: 'Montserrat, sans-serif',
        fontSize: 20,
        fontWeight: 'bold',
        letterSpacing: 4,
        textAlign: derivedSide === PageSide.LEFT ? 'left' : 'right',
      },
      data: { text: p.chapter.toUpperCase(), variant: 'chapter-label' },
    });
  }

  // Header line element
  elementsToCreate.push({
    type: ElementType.SHAPE,
    slot: 'header-line',
    order: currentZ,
    zIndex: currentZ++,
    transform: {
      x: 0.078,
      y: 0.077,
      width: 0.844,
      height: 0.0015,
      rotation: 0,
      scale: 1,
    },
    data: {
      shapeType: 'line',
      strokeColor: 'rgba(201, 154, 154, 0.3)',
      strokeWidth: 1.5,
    },
  });

  // Title element
  if (p.title) {
    elementsToCreate.push({
      type: ElementType.TEXT,
      slot: 'title',
      order: currentZ,
      zIndex: currentZ++,
      transform: {
        x: 0.078,
        y: 0.118,
        width: 0.844,
        height: 0.032,
        rotation: 0,
        scale: 1,
      },
      style: {
        textAlign: 'left',
        color: '#292522',
        fontFamily: '"Cormorant Garamond", Georgia, serif',
        fontSize: 38,
        fontWeight: 'bold',
        letterSpacing: 1,
      },
      data: { text: p.title, variant: 'title' },
    });
  }

  // Quote element
  if (p.quote) {
    elementsToCreate.push({
      type: ElementType.TEXT,
      slot: 'quote',
      order: currentZ,
      zIndex: currentZ++,
      transform: {
        x: 0.078,
        y: 0.15,
        width: 0.844,
        height: 0.028,
        rotation: 0,
        scale: 1,
      },
      style: {
        textAlign: 'left',
        color: '#94384F',
        fontFamily: '"Dancing Script", "Playfair Display", Georgia, cursive',
        fontSize: 26,
        fontStyle: 'italic',
      },
      data: { text: p.quote, variant: 'quote' },
    });
  }

  // Body multiline text element
  if (p.textLines && p.textLines.length > 0) {
    elementsToCreate.push({
      type: ElementType.TEXT,
      slot: 'body',
      order: currentZ,
      zIndex: currentZ++,
      transform: {
        x: 0.078,
        y: 0.19,
        width: 0.844,
        height: p.textLines.length * 0.024,
        rotation: 0,
        scale: 1,
      },
      style: {
        textAlign: 'left',
        color: '#474039',
        fontFamily: '"Cormorant Garamond", Georgia, serif',
        fontSize: 22,
        lineHeight: 30,
      },
      data: {
        text: p.textLines.join('\n'),
        textLines: p.textLines,
        variant: 'body',
        multiline: true,
      },
    });
  }

  // Handwriting element
  if (p.handwriting) {
    elementsToCreate.push({
      type: ElementType.TEXT,
      slot: 'handwriting',
      order: 90,
      zIndex: 90,
      transform: {
        x: derivedSide === PageSide.LEFT ? 0.04 : 0.08,
        y: 0.912,
        width: 0.844,
        height: 0.03,
        rotation: 0,
        scale: 1,
      },
      style: {
        color: '#38161E',
        fontFamily: '"Dancing Script", cursive',
        fontSize: 32,
        fontStyle: 'italic',
        textAlign: derivedSide === PageSide.LEFT ? 'right' : 'center',
      },
      data: { text: p.handwriting, variant: 'handwriting' },
    });
  }

  // Media & Caption elements based on layout preset
  const preset = REAL_LAYOUT_PRESETS[p.layout] || REAL_LAYOUT_PRESETS['auto'];
  const mediaSlots = (
    preset.elementPrototypes || (preset as any).prototypes
  ).filter(
    (pr: any) =>
      pr.slot === 'primaryImage' ||
      pr.slot === 'secondaryImage' ||
      pr.slot === 'tertiaryImage' ||
      pr.slot === 'quaternaryImage',
  );

  for (let mIdx = 0; mIdx < p.items.length; mIdx++) {
    const item: any = p.items[mIdx];
    const slotProto = mediaSlots[mIdx] ||
      mediaSlots[0] || {
        slot: `media-${mIdx}`,
        zIndex: 10 + mIdx * 2,
        transform: {
          x: 0.08,
          y: 0.28,
          width: 0.84,
          height: 0.55,
          rotation: 0,
          scale: 1,
        },
      };

    const mediaZ = slotProto.zIndex;
    const mediaTransform = { ...slotProto.transform };
    delete (mediaTransform as any).zIndex;

    const mediaRecordId = getMediaId(item.src);
    const posterRecordId = item.thumbnailUrl
      ? getMediaId(item.thumbnailUrl)
      : undefined;

    if (item.isVideo) {
      elementsToCreate.push({
        type: ElementType.VIDEO,
        slot: slotProto.slot,
        order: mediaZ,
        zIndex: mediaZ,
        transform: mediaTransform,
        style: { polaroidFrame: true, washiTape: true },
        data: {
          src: item.src,
          thumbnailUrl: item.thumbnailUrl || item.src,
          mediaId: mediaRecordId,
          posterMediaId: posterRecordId,
          caption: item.caption,
        },
        interaction: {
          enabled: true,
          action: 'open-video',
          target: item.src,
          title: item.caption || 'Xem Video',
          activeArea: {
            top: 0.1,
            left: 0.05,
            width: 0.9,
            height: 0.85,
          },
        },
      });
    } else {
      elementsToCreate.push({
        type: ElementType.IMAGE,
        slot: slotProto.slot,
        order: mediaZ,
        zIndex: mediaZ,
        transform: mediaTransform,
        style: { polaroidFrame: true, washiTape: true },
        data: {
          src: item.src,
          mediaId: mediaRecordId,
          objectFit: 'cover',
          caption: item.caption,
        },
      });
    }
  }

  return elementsToCreate;
}
