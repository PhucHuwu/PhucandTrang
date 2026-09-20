export interface LayoutSlotData {
  name: string;
  defaultTransform: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    scale: number;
  };
  allowedTypes: string[];
}

export interface TemplateElementPrototypeData {
  slot: string;
  defaultType: string;
  zIndex: number;
  transform: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    scale: number;
  };
  style?: Record<string, any>;
  defaultData?: Record<string, any>;
}

export interface LayoutPresetData {
  id: string;
  name: string;
  description: string;
  slots: LayoutSlotData[];
  prototypes: TemplateElementPrototypeData[];
}

const COMMON_TEXT_PROTOTYPES: TemplateElementPrototypeData[] = [
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

function buildPreset(
  id: string,
  name: string,
  description: string,
  imagePrototypes: TemplateElementPrototypeData[],
): LayoutPresetData {
  const prototypes = [...COMMON_TEXT_PROTOTYPES, ...imagePrototypes];
  const slots: LayoutSlotData[] = prototypes.map((p) => ({
    name: p.slot,
    defaultTransform: p.transform,
    allowedTypes: [p.defaultType],
  }));

  return { id, name, description, slots, prototypes };
}

export const REAL_LAYOUT_PRESETS: Record<string, LayoutPresetData> = {
  'single-hero': buildPreset(
    'single-hero',
    'Single Hero',
    'Bố cục 1 ảnh lớn tràn trang trang nhã với tỷ lệ tối ưu.',
    [
      {
        slot: 'primaryImage',
        defaultType: 'IMAGE',
        zIndex: 10,
        transform: { x: 0.068, y: 0.280, width: 0.864, height: 0.580, rotation: 0, scale: 1 },
        style: { polaroidFrame: true, washiTape: true },
      },
    ],
  ),
  'dual-columns': buildPreset(
    'dual-columns',
    'Dual Columns',
    'Bố cục 2 ảnh dọc thanh mảnh đứng cạnh nhau song song.',
    [
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
  ),
  'dual-stacked': buildPreset(
    'dual-stacked',
    'Dual Stacked',
    'Bố cục 2 ảnh ngang hoặc video poster xếp trên dưới.',
    [
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
  ),
  'asymmetric-featured': buildPreset(
    'asymmetric-featured',
    'Asymmetric Featured',
    'Bố cục bất đối xứng: 1 ảnh chủ đạo trên + 2 ảnh nhỏ bên dưới.',
    [
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
  ),
  'scrapbook-trio': buildPreset(
    'scrapbook-trio',
    'Scrapbook Trio',
    'Bố cục scrapbook 3 ảnh so le ngẫu hứng nghệ thuật.',
    [
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
  ),
  'quad-gallery': buildPreset(
    'quad-gallery',
    'Quad Gallery',
    'Lưới 4 ảnh polaroid thanh lịch (2x2).',
    [
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
  ),
  'diagonal-duo': buildPreset(
    'diagonal-duo',
    'Diagonal Duo',
    'Bố cục 2 ảnh góc nghiêng chéo so le đè nhẹ nghệ thuật.',
    [
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
  ),
  'auto': buildPreset(
    'auto',
    'Auto Adapt',
    'Tự động dàn trang theo số lượng phương tiện.',
    [
      {
        slot: 'primaryImage',
        defaultType: 'IMAGE',
        zIndex: 10,
        transform: { x: 0.068, y: 0.280, width: 0.864, height: 0.580, rotation: 0, scale: 1 },
        style: { polaroidFrame: true, washiTape: true },
      },
    ],
  ),
  'custom': {
    id: 'custom',
    name: 'Custom Canvas',
    description: 'Trang tự do không theo khuôn mẫu.',
    slots: COMMON_TEXT_PROTOTYPES.map((p) => ({
      name: p.slot,
      defaultTransform: p.transform,
      allowedTypes: [p.defaultType],
    })),
    prototypes: [...COMMON_TEXT_PROTOTYPES],
  },
};
