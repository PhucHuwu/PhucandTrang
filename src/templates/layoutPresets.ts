import {
  Page,
  PageElement,
  LayoutTemplate,
  PageMediaItem,
  TextElement,
  ImageElement,
  VideoElement,
  ShapeElement,
} from '@/types/book';
import {
  LAYOUT_PRESETS,
  LayoutPresetDefinition,
  TemplateElementPrototypeData as TemplateElementPrototype,
} from '../../shared/layoutPresets';

export * from '../../shared/layoutPresets';

/**
 * Data passed into slots when applying a layout template.
 */
export interface SlotData {
  title?: string;
  subtitle?: string;
  chapter?: string;
  quote?: string;
  textLines?: string[];
  handwriting?: string;
  primaryImage?: PageMediaItem | string;
  secondaryImage?: PageMediaItem | string;
  tertiaryImage?: PageMediaItem | string;
  quaternaryImage?: PageMediaItem | string;
  caption?: string;
  media?: PageMediaItem[];
}

/**
 * Normalizes input media parameter into a PageMediaItem object.
 */
function normalizeMedia(input?: PageMediaItem | string): PageMediaItem | undefined {
  if (!input) return undefined;
  if (typeof input === 'string') {
    return { src: input };
  }
  return input;
}

/**
 * Core API Function: Applies a LayoutTemplate to a Page object.
 * Generic template processor: can accept either templateId or a LayoutPresetDefinition.
 *
 * Rules:
 * - Each PageElement has top-level `zIndex` as single source of truth.
 * - Captions become independent `TEXT` elements with `variant: 'caption'`.
 * - Video elements separate `src` (video) from `thumbnailUrl` (poster).
 */
export function applyLayoutTemplate(
  page: Partial<Page> & { pageNumber: number; side: 'left' | 'right' },
  templateIdOrDef: LayoutTemplate | LayoutPresetDefinition,
  slotData?: SlotData
): Page {
  const preset: LayoutPresetDefinition =
    typeof templateIdOrDef === 'string'
      ? LAYOUT_PRESETS[templateIdOrDef] || LAYOUT_PRESETS['auto']
      : templateIdOrDef;

  const elements: PageElement[] = [];
  const pageNum = page.pageNumber;
  const side = page.side;

  // Consolidate media items
  const mediaList: PageMediaItem[] = [];
  if (slotData?.primaryImage) mediaList.push(normalizeMedia(slotData.primaryImage)!);
  if (slotData?.secondaryImage) mediaList.push(normalizeMedia(slotData.secondaryImage)!);
  if (slotData?.tertiaryImage) mediaList.push(normalizeMedia(slotData.tertiaryImage)!);
  if (slotData?.quaternaryImage) mediaList.push(normalizeMedia(slotData.quaternaryImage)!);
  if (slotData?.media && slotData.media.length > 0) {
    for (const m of slotData.media) {
      if (!mediaList.some((existing) => existing.src === m.src)) {
        mediaList.push(m);
      }
    }
  }

  let imageSlotIndex = 0;

  // 1. Process Prototypes into real cloned PageElements
  for (const proto of preset.elementPrototypes) {
    const slot = proto.slot;
    const protoZ = proto.zIndex ?? (proto.transform as any)?.zIndex ?? 1;
    const { zIndex: _ignore, ...cleanTransform } = (proto.transform as any) || {};

    // Subtitle / Chapter Label
    if (slot === 'subtitle') {
      const text = slotData?.chapter || slotData?.subtitle || page.chapter;
      if (text) {
        elements.push({
          id: `el-sub-${pageNum}`,
          type: 'TEXT',
          slot: 'subtitle',
          order: protoZ,
          zIndex: protoZ,
          transform: cleanTransform,
          visible: true,
          locked: false,
          opacity: 1,
          data: {
            text: text.toUpperCase(),
            variant: 'chapter-label',
          },
          style: {
            ...proto.style,
            textAlign: side === 'left' ? 'left' : 'right',
          },
        } as TextElement);
      }
      continue;
    }

    // Header Line
    if (slot === 'header-line') {
      elements.push({
        id: `el-hline-${pageNum}`,
        type: 'SHAPE',
        slot: 'header-line',
        order: protoZ,
        zIndex: protoZ,
        transform: cleanTransform,
        visible: true,
        locked: false,
        opacity: 1,
        data: {
          shapeType: 'line',
          strokeColor: 'rgba(201, 154, 154, 0.3)',
          strokeWidth: 1.5,
        },
      } as ShapeElement);
      continue;
    }

    // Title
    if (slot === 'title') {
      const text = slotData?.title || page.title;
      if (text) {
        elements.push({
          id: `el-title-${pageNum}`,
          type: 'TEXT',
          slot: 'title',
          order: protoZ,
          zIndex: protoZ,
          transform: cleanTransform,
          visible: true,
          locked: false,
          opacity: 1,
          data: {
            text,
            variant: 'title',
          },
          style: { ...proto.style },
        } as TextElement);
      }
      continue;
    }

    // Quote
    if (slot === 'quote') {
      const text = slotData?.quote || page.quote;
      if (text) {
        elements.push({
          id: `el-quote-${pageNum}`,
          type: 'TEXT',
          slot: 'quote',
          order: protoZ,
          zIndex: protoZ,
          transform: cleanTransform,
          visible: true,
          locked: false,
          opacity: 1,
          data: {
            text,
            variant: 'quote',
          },
          style: { ...proto.style },
        } as TextElement);
      }
      continue;
    }

    // Handwriting
    if (slot === 'handwriting') {
      const text = slotData?.handwriting || page.handwriting;
      if (text) {
        elements.push({
          id: `el-handwriting-${pageNum}`,
          type: 'TEXT',
          slot: 'handwriting',
          order: protoZ,
          zIndex: protoZ,
          transform: {
            ...cleanTransform,
            x: side === 'left' ? 0.04 : 0.08,
          },
          visible: true,
          locked: false,
          opacity: 1,
          data: {
            text,
            variant: 'handwriting',
          },
          style: {
            ...proto.style,
            textAlign: side === 'left' ? 'right' : 'center',
          },
        } as TextElement);
      }
      continue;
    }

    // Image & Video Slots
    if (
      slot === 'primaryImage' ||
      slot === 'secondaryImage' ||
      slot === 'tertiaryImage' ||
      slot === 'quaternaryImage'
    ) {
      const mediaItem = mediaList[imageSlotIndex++];
      if (mediaItem) {
        if (mediaItem.isVideo) {
          const videoSrc = mediaItem.src;
          const posterUrl = mediaItem.thumbnailUrl || mediaItem.src;

          elements.push({
            id: `el-video-${pageNum}-${imageSlotIndex}`,
            type: 'VIDEO',
            slot,
            order: imageSlotIndex * 2,
            zIndex: protoZ,
            visible: true,
            locked: false,
            opacity: 1,
            transform: cleanTransform,
            data: {
              src: videoSrc,
              thumbnailUrl: posterUrl,
              aspectRatio: mediaItem.aspectRatio,
              mediaId: mediaItem.mediaId,
              posterMediaId: mediaItem.posterMediaId,
            },
            style: { polaroidFrame: true, washiTape: true },
            interaction: {
              enabled: true,
              action: 'open-video',
              target: videoSrc,
              title: mediaItem.caption || 'Xem Video',
              activeArea: { top: 0.1, left: 0.05, width: 0.9, height: 0.85 },
            },
          } as VideoElement);
        } else {
          elements.push({
            id: `el-img-${pageNum}-${imageSlotIndex}`,
            type: 'IMAGE',
            slot,
            order: imageSlotIndex * 2,
            zIndex: protoZ,
            visible: true,
            locked: false,
            opacity: 1,
            transform: cleanTransform,
            data: {
              src: mediaItem.src,
              aspectRatio: mediaItem.aspectRatio,
              objectFit: 'cover',
              mediaId: mediaItem.mediaId,
            },
            style: { polaroidFrame: true, washiTape: true },
          } as ImageElement);
        }

        // Requirement 10: Caption becomes an independent TEXT element
        if (mediaItem.caption) {
          const captionHeight = 0.035;
          const captionY = Math.min(
            0.94,
            cleanTransform.y + cleanTransform.height + 0.008
          );

          elements.push({
            id: `el-cap-${pageNum}-${imageSlotIndex}`,
            type: 'TEXT',
            slot: `${slot}-caption`,
            order: imageSlotIndex * 2 + 1,
            zIndex: protoZ + 1,
            visible: true,
            locked: false,
            opacity: 1,
            transform: {
              x: cleanTransform.x,
              y: captionY,
              width: cleanTransform.width,
              height: captionHeight,
              rotation: cleanTransform.rotation || 0,
              scale: cleanTransform.scale || 1,
            },
            data: {
              text: mediaItem.caption,
              variant: 'caption',
            },
            style: {
              textAlign: 'center',
              color: '#4A1523',
              fontFamily: '"Dancing Script", "Playfair Display", Georgia, cursive',
              fontSize: 19,
              fontStyle: 'italic',
            },
          } as TextElement);
        }
      }
      continue;
    }
  }

  // 2. Add Multiline Body Text if present
  const textLines = slotData?.textLines || page.textLines;
  if (textLines && textLines.length > 0) {
    const lineHeightNormalized = 30 / 1360;
    const totalHeight = textLines.length * lineHeightNormalized;
    elements.push({
      id: `el-body-${pageNum}`,
      type: 'TEXT',
      slot: 'body',
      order: 5,
      zIndex: 5,
      transform: {
        x: 0.078,
        y: 0.190,
        width: 0.844,
        height: totalHeight,
        rotation: 0,
        scale: 1,
      },
      visible: true,
      locked: false,
      opacity: 1,
      data: {
        text: '',
        textLines,
        variant: 'body',
        multiline: true,
      },
      style: {
        textAlign: 'left',
        color: '#474039',
        fontFamily: '"Cormorant Garamond", Georgia, serif',
        fontSize: 22,
        lineHeight: 30,
      },
    } as TextElement);
  }

  return {
    id: `page-${pageNum}`,
    order: pageNum,
    ...page,
    pageNumber: pageNum,
    side,
    layout: preset.id,
    sourceTemplateId: preset.id,
    layoutMode: page.layoutMode || 'PRESET',
    isCustomized: page.isCustomized || false,
    background: page.background || { type: 'color', color: '#F9F5EC' },
    elements,
  };
}

/**
 * Creates slots metadata for database persistence
 */
export function getLayoutSlots(preset: LayoutPresetDefinition) {
  return preset.elementPrototypes.map((p) => ({
    name: p.slot,
    defaultTransform: p.transform,
    allowedTypes: [p.defaultType],
  }));
}
