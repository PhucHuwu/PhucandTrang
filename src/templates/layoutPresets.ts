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
 */
export interface TemplateElementPrototype {
  slot: string;
  defaultType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'SHAPE' | 'DECORATION';
  transform: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    scale: number;
    zIndex: number;
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
 * Common text prototypes used across templates
 */
const COMMON_TEXT_PROTOTYPES: TemplateElementPrototype[] = [
  {
    slot: 'subtitle',
    defaultType: 'TEXT',
    transform: { x: 0.078, y: 0.062, width: 0.844, height: 0.022, rotation: 0, scale: 1, zIndex: 1 },
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
    transform: { x: 0.078, y: 0.077, width: 0.844, height: 0.0015, rotation: 0, scale: 1, zIndex: 2 },
    defaultData: {
      shapeType: 'line',
      strokeColor: 'rgba(201, 154, 154, 0.3)',
      strokeWidth: 1.5,
    },
  },
  {
    slot: 'title',
    defaultType: 'TEXT',
    transform: { x: 0.078, y: 0.118, width: 0.844, height: 0.032, rotation: 0, scale: 1, zIndex: 3 },
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
    transform: { x: 0.078, y: 0.150, width: 0.844, height: 0.028, rotation: 0, scale: 1, zIndex: 4 },
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
    transform: { x: 0.078, y: 0.912, width: 0.844, height: 0.030, rotation: 0, scale: 1, zIndex: 90 },
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
        transform: { x: 0.068, y: 0.280, width: 0.864, height: 0.580, rotation: 0, scale: 1, zIndex: 10 },
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
        transform: { x: 0.068, y: 0.280, width: 0.420, height: 0.590, rotation: -1.5, scale: 1, zIndex: 10 },
        style: { polaroidFrame: true, washiTape: true },
      },
      {
        slot: 'secondaryImage',
        defaultType: 'IMAGE',
        transform: { x: 0.512, y: 0.280, width: 0.420, height: 0.590, rotation: 1.8, scale: 1, zIndex: 11 },
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
        transform: { x: 0.078, y: 0.280, width: 0.844, height: 0.280, rotation: -1.2, scale: 1, zIndex: 10 },
        style: { polaroidFrame: true, washiTape: true },
      },
      {
        slot: 'secondaryImage',
        defaultType: 'IMAGE',
        transform: { x: 0.078, y: 0.585, width: 0.844, height: 0.280, rotation: 1.4, scale: 1, zIndex: 11 },
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
        transform: { x: 0.078, y: 0.260, width: 0.844, height: 0.325, rotation: 0.6, scale: 1, zIndex: 10 },
        style: { polaroidFrame: true, washiTape: true },
      },
      {
        slot: 'secondaryImage',
        defaultType: 'IMAGE',
        transform: { x: 0.078, y: 0.605, width: 0.412, height: 0.275, rotation: -1.8, scale: 1, zIndex: 11 },
        style: { polaroidFrame: true, washiTape: true },
      },
      {
        slot: 'tertiaryImage',
        defaultType: 'IMAGE',
        transform: { x: 0.510, y: 0.605, width: 0.412, height: 0.275, rotation: 1.9, scale: 1, zIndex: 12 },
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
        transform: { x: 0.068, y: 0.260, width: 0.527, height: 0.290, rotation: -2.0, scale: 1, zIndex: 10 },
        style: { polaroidFrame: true, washiTape: true },
      },
      {
        slot: 'secondaryImage',
        defaultType: 'IMAGE',
        transform: { x: 0.404, y: 0.380, width: 0.527, height: 0.290, rotation: 2.5, scale: 1, zIndex: 11 },
        style: { polaroidFrame: true, washiTape: true },
      },
      {
        slot: 'tertiaryImage',
        defaultType: 'IMAGE',
        transform: { x: 0.156, y: 0.630, width: 0.605, height: 0.290, rotation: -1.0, scale: 1, zIndex: 12 },
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
        transform: { x: 0.068, y: 0.280, width: 0.420, height: 0.288, rotation: -1.5, scale: 1, zIndex: 10 },
        style: { polaroidFrame: true, washiTape: true },
      },
      {
        slot: 'secondaryImage',
        defaultType: 'IMAGE',
        transform: { x: 0.512, y: 0.280, width: 0.420, height: 0.288, rotation: 1.8, scale: 1, zIndex: 11 },
        style: { polaroidFrame: true, washiTape: true },
      },
      {
        slot: 'tertiaryImage',
        defaultType: 'IMAGE',
        transform: { x: 0.068, y: 0.585, width: 0.420, height: 0.288, rotation: 1.6, scale: 1, zIndex: 12 },
        style: { polaroidFrame: true, washiTape: true },
      },
      {
        slot: 'quaternaryImage',
        defaultType: 'IMAGE',
        transform: { x: 0.512, y: 0.585, width: 0.420, height: 0.288, rotation: -1.7, scale: 1, zIndex: 13 },
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
        transform: { x: 0.068, y: 0.280, width: 0.566, height: 0.360, rotation: -2.5, scale: 1, zIndex: 10 },
        style: { polaroidFrame: true, washiTape: true },
      },
      {
        slot: 'secondaryImage',
        defaultType: 'IMAGE',
        transform: { x: 0.365, y: 0.540, width: 0.566, height: 0.360, rotation: 2.2, scale: 1, zIndex: 11 },
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
        transform: { x: 0.068, y: 0.280, width: 0.864, height: 0.580, rotation: 0, scale: 1, zIndex: 10 },
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
 * 
 * Flow:
 * 1. Clones the prototype elements from the layout template (ensuring elements can be freely mutated afterward).
 * 2. Populates slots:
 *    - 'title': sets title text
 *    - 'subtitle': sets chapter / subtitle text
 *    - 'quote': sets quote text
 *    - 'primaryImage': sets image or video element
 *    - 'secondaryImage': sets image or video element
 *    - 'tertiaryImage', 'quaternaryImage': sets subsequent images
 *    - 'handwriting': sets signature text
 * 3. Dynamically handles any additional media beyond preset slots.
 * 4. Returns the updated Page with fully populated PageElement[].
 * 
 * Note: Layout is purely the STARTING POINT. Once applied, each PageElement
 * can be freely resized, moved, restyled, or deleted without restrictions.
 */
export function applyLayoutTemplate(
  page: Partial<Page> & { pageNumber: number; side: 'left' | 'right' },
  templateId: LayoutTemplate,
  slotData?: SlotData
): Page {
  const preset = LAYOUT_PRESETS[templateId] || LAYOUT_PRESETS['auto'];
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

    // Subtitle / Chapter Label
    if (slot === 'subtitle') {
      const text = slotData?.chapter || slotData?.subtitle || page.chapter;
      if (text) {
        elements.push({
          id: `el-sub-${pageNum}`,
          type: 'TEXT',
          slot: 'subtitle',
          transform: { ...proto.transform },
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
        transform: { ...proto.transform },
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
          transform: { ...proto.transform },
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
          transform: { ...proto.transform },
          visible: true,
          locked: false,
          opacity: 1,
          data: {
            text: `"${text}"`,
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
          transform: {
            ...proto.transform,
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

    // Image Slots: primaryImage, secondaryImage, tertiaryImage, quaternaryImage
    if (
      slot === 'primaryImage' ||
      slot === 'secondaryImage' ||
      slot === 'tertiaryImage' ||
      slot === 'quaternaryImage'
    ) {
      const mediaItem = mediaList[imageSlotIndex++];
      if (mediaItem) {
        if (mediaItem.isVideo) {
          elements.push({
            id: `el-video-${pageNum}-${imageSlotIndex}`,
            type: 'VIDEO',
            slot,
            transform: { ...proto.transform },
            visible: true,
            locked: false,
            opacity: 1,
            data: {
              src: mediaItem.src,
              thumbnailUrl: mediaItem.src,
              caption: mediaItem.caption,
              aspectRatio: mediaItem.aspectRatio,
            },
            style: { polaroidFrame: true, washiTape: true },
            interaction: {
              enabled: true,
              action: 'open-video',
              target: mediaItem.src,
              title: mediaItem.caption,
              activeArea: { top: 0.1, left: 0.05, width: 0.9, height: 0.85 },
            },
          } as VideoElement);
        } else {
          elements.push({
            id: `el-img-${pageNum}-${imageSlotIndex}`,
            type: 'IMAGE',
            slot,
            transform: { ...proto.transform },
            visible: true,
            locked: false,
            opacity: 1,
            data: {
              src: mediaItem.src,
              caption: mediaItem.caption,
              aspectRatio: mediaItem.aspectRatio,
              objectFit: 'cover',
            },
            style: { polaroidFrame: true, washiTape: true },
          } as ImageElement);
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
      transform: {
        x: 0.078,
        y: 0.190,
        width: 0.844,
        height: totalHeight,
        rotation: 0,
        scale: 1,
        zIndex: 5,
      },
      visible: true,
      locked: false,
      opacity: 1,
      data: {
        text: '',
        variant: 'body',
        multiline: true,
        textLines,
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

  // 3. Assemble and return full Page (starting in PRESET mode, uncustomized)
  const metadata = {
    ...(page.metadata || {}),
    layoutMode: 'PRESET' as const,
    sourceTemplateId: templateId,
    isCustomized: false,
  };

  return {
    id: page.id || `page-${pageNum}`,
    pageNumber: pageNum,
    side,
    chapter: slotData?.chapter || page.chapter,
    title: slotData?.title || page.title,
    quote: slotData?.quote || page.quote,
    textLines,
    handwriting: slotData?.handwriting || page.handwriting,
    layout: templateId,
    layoutMode: 'PRESET',
    sourceTemplateId: templateId,
    isCustomized: false,
    background: page.background || {
      type: 'color',
      color: '#F9F5EC',
    },
    elements,
    metadata,
  };
}

/**
 * Marks a page as customized, converting it to FREEFORM if desired or keeping sourceTemplateId recorded.
 */
function markPageCustomized(page: Page): void {
  page.isCustomized = true;
  if (!page.metadata) {
    page.metadata = {};
  }
  page.metadata.isCustomized = true;
}

/**
 * Updates an element on a page (moving position, resizing, changing rotation, zIndex, styles, data).
 * Setting isCustomized = true automatically.
 */
export function updatePageElement(
  page: Page,
  elementId: string,
  patch: Partial<PageElement>
): Page {
  const index = page.elements.findIndex((el) => el.id === elementId);
  if (index === -1) return page;

  const current = page.elements[index];
  const updated: PageElement = {
    ...current,
    ...patch,
    transform: {
      ...current.transform,
      ...(patch.transform || {}),
    },
    style: {
      ...(current.style || {}),
      ...(patch.style || {}),
    },
    data: {
      ...(current.data as any),
      ...(patch.data as any),
    },
  } as PageElement;

  page.elements[index] = updated;
  markPageCustomized(page);
  return page;
}

/**
 * Adds a new element to a page (even outside preset slots).
 * Setting isCustomized = true automatically.
 */
export function addPageElement(page: Page, element: PageElement): Page {
  page.elements.push(element);
  markPageCustomized(page);
  return page;
}

/**
 * Removes an element from a page.
 * Setting isCustomized = true automatically.
 */
export function removePageElement(page: Page, elementId: string): Page {
  page.elements = page.elements.filter((el) => el.id !== elementId);
  markPageCustomized(page);
  return page;
}

/**
 * Converts a page from PRESET to FREEFORM mode.
 * The layout template is detached and isCustomized is set to true.
 */
export function convertPageToFreeform(page: Page): Page {
  page.layoutMode = 'FREEFORM';
  markPageCustomized(page);
  if (page.metadata) {
    page.metadata.layoutMode = 'FREEFORM';
  }
  return page;
}

/**
 * Creates an entirely freeform page from scratch with no template.
 */
export function createFreeformPage(params: {
  id?: string;
  pageNumber: number;
  side: 'left' | 'right';
  background?: Page['background'];
  elements?: PageElement[];
  metadata?: Record<string, unknown>;
}): Page {
  return {
    id: params.id || `page-${params.pageNumber}`,
    pageNumber: params.pageNumber,
    side: params.side,
    layout: 'custom',
    layoutMode: 'FREEFORM',
    sourceTemplateId: null,
    isCustomized: true,
    background: params.background || {
      type: 'color',
      color: '#F9F5EC',
    },
    elements: params.elements || [],
    metadata: {
      ...(params.metadata || {}),
      layoutMode: 'FREEFORM',
      sourceTemplateId: null,
      isCustomized: true,
    },
  };
}
