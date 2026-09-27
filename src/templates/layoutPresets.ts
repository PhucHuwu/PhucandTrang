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
  LayoutSlotData,
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
 * Extracts reusable content (media items, title, quote, textLines, handwriting)
 * from existing Page and its elements so they are completely preserved when applying a new layout template.
 */
export function extractContentFromPage(page: Page): SlotData {
  const mediaList: PageMediaItem[] = [];
  let title = page.title || '';
  let chapter = page.chapter || '';
  let quote = page.quote || '';
  let handwriting = page.handwriting || '';
  const textLines: string[] = page.textLines ? [...page.textLines] : [];

  // Inspect existing elements
  const sortedElements = [...(page.elements || [])].sort((a, b) => a.zIndex - b.zIndex);

  for (const el of sortedElements) {
    const d = el.data as any;
    if (!d) continue;

    if (el.type === 'IMAGE' && d.src) {
      mediaList.push({
        src: d.src,
        caption: d.caption,
        aspectRatio: d.aspectRatio,
        mediaId: d.mediaId,
        isVideo: false,
      });
    } else if (el.type === 'VIDEO' && d.src) {
      mediaList.push({
        src: d.src,
        thumbnailUrl: d.thumbnailUrl,
        caption: d.caption,
        aspectRatio: d.aspectRatio,
        mediaId: d.mediaId,
        posterMediaId: d.posterMediaId,
        isVideo: true,
      });
    } else if (el.type === 'TEXT') {
      if (el.slot === 'title' && !title) title = d.text || '';
      else if (el.slot === 'subtitle' && !chapter) chapter = d.text || '';
      else if (el.slot === 'quote' && !quote) quote = d.text || '';
      else if (el.slot === 'handwriting' && !handwriting) handwriting = d.text || '';
      else if (d.variant === 'caption') {
        // If there is a standalone caption element, attach it to the preceding media item if uncaptioned
        if (mediaList.length > 0 && !mediaList[mediaList.length - 1].caption) {
          mediaList[mediaList.length - 1].caption = d.text;
        }
      } else if (d.variant === 'body' && d.textLines && d.textLines.length > 0) {
        if (textLines.length === 0) {
          textLines.push(...d.textLines);
        }
      }
    }
  }

  return {
    title,
    chapter,
    subtitle: chapter,
    quote,
    handwriting,
    textLines,
    media: mediaList,
  };
}

/**
 * Prompt 17: Extracts normalized slots and element prototypes from the current page's arrangement
 * to save as a custom Layout Template (isSystem = false).
 */
export function extractLayoutDefinitionFromPage(
  page: Page,
  id: string,
  name: string,
  description?: string
): LayoutPresetDefinition {
  const sortedElements = [...(page.elements || [])].sort((a, b) => a.zIndex - b.zIndex);

  const elementPrototypes: TemplateElementPrototype[] = [];
  const slots: LayoutSlotData[] = [];

  let imageIndex = 0;

  for (const el of sortedElements) {
    let slot: string = el.slot || '';
    if (!slot) {
      if (el.type === 'IMAGE' || el.type === 'VIDEO') {
        imageIndex++;
        slot = imageIndex === 1 ? 'primaryImage' : imageIndex === 2 ? 'secondaryImage' : imageIndex === 3 ? 'tertiaryImage' : `image-${imageIndex}`;
      } else if (el.type === 'TEXT') {
        const variant = (el.data as any)?.variant;
        slot = variant || `text-${el.zIndex}`;
      } else {
        slot = `${el.type.toLowerCase()}-${el.zIndex}`;
      }
    }

    const defaultTransform = {
      x: el.transform.x,
      y: el.transform.y,
      width: el.transform.width,
      height: el.transform.height,
      rotation: el.transform.rotation || 0,
      scale: el.transform.scale || 1,
    };

    elementPrototypes.push({
      slot,
      defaultType: el.type,
      zIndex: el.zIndex,
      transform: defaultTransform,
      style: el.style,
      defaultData: el.data ? { variant: (el.data as any).variant, shapeType: (el.data as any).shapeType } : undefined,
    });

    slots.push({
      name: slot,
      defaultTransform,
      allowedTypes: [el.type],
    });
  }

  return {
    id,
    name,
    description: description || `Bố cục tùy biến lưu từ Trang số ${page.pageNumber}`,
    slots,
    elementPrototypes,
  };
}

/**
 * Core API Function: Applies a LayoutTemplate to a Page object.
 * Generic template processor: can accept either templateId or a LayoutPresetDefinition loaded dynamically from backend.
 *
 * Rules:
 * - Each PageElement has top-level `zIndex` as single source of truth.
 * - Captions become independent `TEXT` elements with `variant: 'caption'`.
 * - Video elements separate `src` (video) from `thumbnailUrl` (poster).
 * - Preserves existing text & media content when applying new layout.
 */
export function applyLayoutTemplate(
  page: Partial<Page> & { pageNumber: number; side: 'left' | 'right' },
  templateIdOrDef: LayoutTemplate | LayoutPresetDefinition,
  slotData?: SlotData
): Page {
  // If templateIdOrDef has slots / prototypes (from backend /layout-templates), normalize it
  let preset: LayoutPresetDefinition;

  if (typeof templateIdOrDef === 'string') {
    preset = LAYOUT_PRESETS[templateIdOrDef] || LAYOUT_PRESETS['auto'];
  } else {
    // If passed from backend LayoutTemplate entity
    const anyDef = templateIdOrDef as any;
    preset = {
      id: anyDef.id,
      name: anyDef.name,
      description: anyDef.description || '',
      slots: anyDef.slots || [],
      elementPrototypes: anyDef.elementPrototypes || anyDef.prototypes || [],
    };
  }

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
    layoutTemplateId: preset.id,
    layoutMode: 'PRESET',
    isCustomized: false,
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
