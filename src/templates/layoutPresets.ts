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
 * Template element definition with default normalized coordinates (0..1),
 * default styling, and slot assignment.
 * zIndex is strictly top-level as the single source of truth.
 */
export interface TemplateElementPrototype {
  slot: string;
  defaultType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'SHAPE' | 'DECORATION';
  zIndex: number;
  transform: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    scale: number;
    zIndex?: number; // optional legacy backward compatibility
  };
  style?: Record<string, unknown>;
  defaultData?: Record<string, unknown>;
}

export interface LayoutPresetDefinition {
  id: LayoutTemplate;
  name: string;
  description: string;
  elementPrototypes: TemplateElementPrototype[];
}

/**
 * Common text prototypes used across templates with zIndex as top-level property.
 */
const COMMON_TEXT_PROTOTYPES: TemplateElementPrototype[] = [
  {
    slot: 'subtitle',
    defaultType: 'TEXT',
    zIndex: 1,
    transform: { x: 0.078, y: 0.062, width: 0.844, height: 0.022, rotation: 0, scale: 1 },
    style: {
      color: '#C99A9A',
      fontFamily: 'Montserrat, sans-serif',
      fontSize: 20,
      fontWeight: 'bold',
      letterSpacing: 4,
    },
    defaultData: { variant: 'chapter-label' },
  },
  {
    slot: 'header-line',
    defaultType: 'SHAPE',
    zIndex: 2,
    transform: { x: 0.078, y: 0.077, width: 0.844, height: 0.0015, rotation: 0, scale: 1 },
    defaultData: {
      shapeType: 'line',
      strokeColor: 'rgba(201, 154, 154, 0.3)',
      strokeWidth: 1.5,
    },
  },
  {
    slot: 'title',
    defaultType: 'TEXT',
    zIndex: 3,
    transform: { x: 0.078, y: 0.118, width: 0.844, height: 0.032, rotation: 0, scale: 1 },
    style: {
      textAlign: 'left',
      color: '#292522',
      fontFamily: '"Cormorant Garamond", Georgia, serif',
      fontSize: 38,
      fontWeight: 'bold',
      letterSpacing: 1,
    },
    defaultData: { variant: 'title' },
  },
  {
    slot: 'quote',
    defaultType: 'TEXT',
    zIndex: 4,
    transform: { x: 0.078, y: 0.150, width: 0.844, height: 0.028, rotation: 0, scale: 1 },
    style: {
      textAlign: 'left',
      color: '#94384F',
      fontFamily: '"Dancing Script", "Playfair Display", Georgia, cursive',
      fontSize: 26,
      fontStyle: 'italic',
    },
    defaultData: { variant: 'quote' },
  },
  {
    slot: 'handwriting',
    defaultType: 'TEXT',
    zIndex: 90,
    transform: { x: 0.078, y: 0.912, width: 0.844, height: 0.030, rotation: 0, scale: 1 },
    style: {
      color: '#38161E',
      fontFamily: '"Dancing Script", "Playfair Display", Georgia, cursive',
      fontSize: 32,
      fontStyle: 'italic',
    },
    defaultData: { variant: 'handwriting' },
  },
];

/**
 * Registry of all 8 Layout Presets with normalized coordinates (0..1)
 */
export const LAYOUT_PRESETS: Record<LayoutTemplate, LayoutPresetDefinition> = {
  // 1. Single Hero (1 prominent portrait or landscape card)
  'single-hero': {
    id: 'single-hero',
    name: 'Single Hero',
    description: 'Bố cục 1 ảnh lớn tràn trang trang nhã với tỷ lệ tối ưu.',
    elementPrototypes: [
      ...COMMON_TEXT_PROTOTYPES,
      {
        slot: 'primaryImage',
        defaultType: 'IMAGE',
        zIndex: 10,
        transform: { x: 0.068, y: 0.280, width: 0.864, height: 0.580, rotation: 0, scale: 1 },
        style: { polaroidFrame: true, washiTape: true },
      },
    ],
  },

  // 2. Dual Columns (2 vertical polaroids side-by-side)
  'dual-columns': {
    id: 'dual-columns',
    name: 'Dual Columns',
    description: 'Bố cục 2 ảnh dọc thanh mảnh đứng cạnh nhau song song.',
    elementPrototypes: [
      ...COMMON_TEXT_PROTOTYPES,
      {
        slot: 'primaryImage',
        defaultType: 'IMAGE',
        zIndex: 10,
        transform: { x: 0.068, y: 0.280, width: 0.420, height: 0.590, rotation: -1.5, scale: 1 },
        style: { polaroidFrame: true, washiTape: true },
      },
      {
        slot: 'secondaryImage',
        defaultType: 'IMAGE',
        zIndex: 11,
        transform: { x: 0.512, y: 0.280, width: 0.420, height: 0.590, rotation: 1.8, scale: 1 },
        style: { polaroidFrame: true, washiTape: true },
      },
    ],
  },

  // 3. Dual Stacked (2 horizontal/square cards stacked vertically)
  'dual-stacked': {
    id: 'dual-stacked',
    name: 'Dual Stacked',
    description: 'Bố cục 2 ảnh ngang hoặc video poster xếp trên dưới.',
    elementPrototypes: [
      ...COMMON_TEXT_PROTOTYPES,
      {
        slot: 'primaryImage',
        defaultType: 'IMAGE',
        zIndex: 10,
        transform: { x: 0.078, y: 0.280, width: 0.844, height: 0.280, rotation: -1.2, scale: 1 },
        style: { polaroidFrame: true, washiTape: true },
      },
      {
        slot: 'secondaryImage',
        defaultType: 'IMAGE',
        zIndex: 11,
        transform: { x: 0.078, y: 0.585, width: 0.844, height: 0.280, rotation: 1.4, scale: 1 },
        style: { polaroidFrame: true, washiTape: true },
      },
    ],
  },

  // 4. Asymmetric Featured (1 featured hero + 2 smaller photos)
  'asymmetric-featured': {
    id: 'asymmetric-featured',
    name: 'Asymmetric Featured',
    description: 'Bố cục bất đối xứng: 1 ảnh chủ đạo trên + 2 ảnh nhỏ bên dưới.',
    elementPrototypes: [
      ...COMMON_TEXT_PROTOTYPES,
      {
        slot: 'primaryImage',
        defaultType: 'IMAGE',
        zIndex: 10,
        transform: { x: 0.078, y: 0.260, width: 0.844, height: 0.325, rotation: 0.6, scale: 1 },
        style: { polaroidFrame: true, washiTape: true },
      },
      {
        slot: 'secondaryImage',
        defaultType: 'IMAGE',
        zIndex: 11,
        transform: { x: 0.078, y: 0.605, width: 0.412, height: 0.275, rotation: -1.8, scale: 1 },
        style: { polaroidFrame: true, washiTape: true },
      },
      {
        slot: 'tertiaryImage',
        defaultType: 'IMAGE',
        zIndex: 12,
        transform: { x: 0.510, y: 0.605, width: 0.412, height: 0.275, rotation: 1.9, scale: 1 },
        style: { polaroidFrame: true, washiTape: true },
      },
    ],
  },

  // 5. Scrapbook Trio (3 artistic staggered polaroids)
  'scrapbook-trio': {
    id: 'scrapbook-trio',
    name: 'Scrapbook Trio',
    description: 'Bố cục scrapbook 3 ảnh so le ngẫu hứng nghệ thuật.',
    elementPrototypes: [
      ...COMMON_TEXT_PROTOTYPES,
      {
        slot: 'primaryImage',
        defaultType: 'IMAGE',
        zIndex: 10,
        transform: { x: 0.068, y: 0.260, width: 0.527, height: 0.290, rotation: -2.0, scale: 1 },
        style: { polaroidFrame: true, washiTape: true },
      },
      {
        slot: 'secondaryImage',
        defaultType: 'IMAGE',
        zIndex: 11,
        transform: { x: 0.404, y: 0.380, width: 0.527, height: 0.290, rotation: 2.5, scale: 1 },
        style: { polaroidFrame: true, washiTape: true },
      },
      {
        slot: 'tertiaryImage',
        defaultType: 'IMAGE',
        zIndex: 12,
        transform: { x: 0.156, y: 0.630, width: 0.605, height: 0.290, rotation: -1.0, scale: 1 },
        style: { polaroidFrame: true, washiTape: true },
      },
    ],
  },

  // 6. Quad Gallery (2x2 grid of 4 cards)
  'quad-gallery': {
    id: 'quad-gallery',
    name: 'Quad Gallery',
    description: 'Lưới 4 ảnh polaroid thanh lịch (2x2).',
    elementPrototypes: [
      ...COMMON_TEXT_PROTOTYPES,
      {
        slot: 'primaryImage',
        defaultType: 'IMAGE',
        zIndex: 10,
        transform: { x: 0.068, y: 0.280, width: 0.420, height: 0.288, rotation: -1.5, scale: 1 },
        style: { polaroidFrame: true, washiTape: true },
      },
      {
        slot: 'secondaryImage',
        defaultType: 'IMAGE',
        zIndex: 11,
        transform: { x: 0.512, y: 0.280, width: 0.420, height: 0.288, rotation: 1.8, scale: 1 },
        style: { polaroidFrame: true, washiTape: true },
      },
      {
        slot: 'tertiaryImage',
        defaultType: 'IMAGE',
        zIndex: 12,
        transform: { x: 0.068, y: 0.585, width: 0.420, height: 0.288, rotation: 1.6, scale: 1 },
        style: { polaroidFrame: true, washiTape: true },
      },
      {
        slot: 'quaternaryImage',
        defaultType: 'IMAGE',
        zIndex: 13,
        transform: { x: 0.512, y: 0.585, width: 0.420, height: 0.288, rotation: -1.7, scale: 1 },
        style: { polaroidFrame: true, washiTape: true },
      },
    ],
  },

  // 7. Diagonal Duo (2 tilted polaroids)
  'diagonal-duo': {
    id: 'diagonal-duo',
    name: 'Diagonal Duo',
    description: 'Bố cục 2 ảnh góc nghiêng chéo so le đè nhẹ nghệ thuật.',
    elementPrototypes: [
      ...COMMON_TEXT_PROTOTYPES,
      {
        slot: 'primaryImage',
        defaultType: 'IMAGE',
        zIndex: 10,
        transform: { x: 0.068, y: 0.280, width: 0.566, height: 0.360, rotation: -2.5, scale: 1 },
        style: { polaroidFrame: true, washiTape: true },
      },
      {
        slot: 'secondaryImage',
        defaultType: 'IMAGE',
        zIndex: 11,
        transform: { x: 0.365, y: 0.540, width: 0.566, height: 0.360, rotation: 2.2, scale: 1 },
        style: { polaroidFrame: true, washiTape: true },
      },
    ],
  },

  // 8. Auto / Custom (Flexible single hero fallback)
  'auto': {
    id: 'auto',
    name: 'Auto Adapt',
    description: 'Tự động dàn trang theo số lượng phương tiện.',
    elementPrototypes: [
      ...COMMON_TEXT_PROTOTYPES,
      {
        slot: 'primaryImage',
        defaultType: 'IMAGE',
        zIndex: 10,
        transform: { x: 0.068, y: 0.280, width: 0.864, height: 0.580, rotation: 0, scale: 1 },
        style: { polaroidFrame: true, washiTape: true },
      },
    ],
  },

  'custom': {
    id: 'custom',
    name: 'Custom Canvas',
    description: 'Trang tự do không theo khuôn mẫu.',
    elementPrototypes: [...COMMON_TEXT_PROTOTYPES],
  },
};

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
