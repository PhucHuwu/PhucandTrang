/**
 * Book & CMS Unified TypeScript Schema
 * 
 * This schema is 100% platform-agnostic (pure TypeScript definitions without DOM/Three.js/React dependencies).
 * Can be shared seamlessly across:
 * - Next.js Frontend (3D & 2D Renderers)
 * - Headless CMS / Admin Dashboard (Layout Builder & Content Editor)
 * - Backend APIs / Databases (PostgreSQL / MongoDB / Prisma / REST / GraphQL)
 */

// ==========================================
// 1. Core Primitives & Normalized Coordinate Types
// ==========================================

/**
 * Normalized 2D coordinate system independent of canvas render resolution (1024x1360).
 * All coordinates, widths, and heights range from 0.0 to 1.0 relative to page bounding box:
 * - x: 0.0 (left edge) -> 1.0 (right edge)
 * - y: 0.0 (top edge) -> 1.0 (bottom edge)
 * - width: 0.0 -> 1.0 (fraction of total page width)
 * - height: 0.0 -> 1.0 (fraction of total page height)
 */
export interface ElementTransform {
  /** Normalized X position (0.0 to 1.0) */
  x: number;
  /** Normalized Y position (0.0 to 1.0) */
  y: number;
  /** Normalized width (0.0 to 1.0) */
  width: number;
  /** Normalized height (0.0 to 1.0) */
  height: number;
  /** Rotation angle in degrees (-180 to 180). Default: 0 */
  rotation: number;
  /** Scale multiplier. Default: 1.0 */
  scale: number;
  /** Layer stacking index. Default: 1 */
  zIndex: number;
}

// ==========================================
// 2. Styling & Interaction Contracts
// ==========================================

export interface ShadowStyle {
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
}

export interface ElementStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | '300' | '400' | '500' | '600' | '700';
  fontStyle?: 'normal' | 'italic';
  letterSpacing?: number;
  lineHeight?: number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number;
  shadow?: ShadowStyle;
  /** Whether to draw polaroid white photo card border */
  polaroidFrame?: boolean;
  /** Whether to place decorative masking/washi tape on top */
  washiTape?: boolean;
}

export interface NormalizedRect {
  /** Normalized top position (0.0 to 1.0) */
  top: number;
  /** Normalized left position (0.0 to 1.0) */
  left: number;
  /** Normalized width (0.0 to 1.0) */
  width: number;
  /** Normalized height (0.0 to 1.0) */
  height: number;
}

export interface ElementInteraction {
  enabled: boolean;
  action: 'none' | 'open-video' | 'zoom' | 'navigate-page' | 'open-link';
  /** Target parameter (video URL, external link URL, page number, etc.) */
  target?: string | number;
  /** Hover tooltip title or accessibility label */
  title?: string;
  /** Normalized 3D raycaster active hit zone (0.0 to 1.0) */
  activeArea?: NormalizedRect;
}

// ==========================================
// 3. Media & Audio Contracts
// ==========================================

export type MediaType =
  | 'IMAGE'
  | 'VIDEO'
  | 'AUDIO'
  | 'BACKGROUND'
  | 'TEXTURE'
  | 'DECORATION'
  | 'image'
  | 'video'
  | 'audio';

export interface Media {
  id: string;
  type: MediaType;
  provider?: string;
  /** Canonical URL (Cloudinary CDN, S3, or public path) */
  url: string;
  /** Cloudinary Public ID */
  publicId?: string;
  /** Natural pixel width from file metadata */
  width?: number;
  /** Natural pixel height from file metadata */
  height?: number;
  mimeType?: string;
  size?: number;
  alt?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
  /** Legacy fields for backward compatibility */
  thumbnailUrl?: string;
  aspectRatio?: number;
  duration?: number;
  sizeBytes?: number;
  altText?: string;
}

export interface AudioTrack {
  id: string;
  title: string;
  artist?: string;
  src: string;
  mediaId?: string;
  durationSeconds?: number;
  autoPlay?: boolean;
  loop?: boolean;
  volume?: number; // 0.0 to 1.0
  startAt?: number; // offset in seconds
  fadeIn?: number; // fade in duration in seconds
  fadeOut?: number; // fade out duration in seconds
}

export interface PageMediaItem {
  src: string;
  caption?: string;
  isVideo?: boolean;
  aspectRatio?: number;
}

// ==========================================
// 4. Layout Templates
// ==========================================

export type LayoutTemplate =
  | 'auto'
  | 'single-hero'          // 1 large prominent image or portrait
  | 'dual-stacked'         // 2 horizontal/landscape photos stacked vertically
  | 'dual-columns'         // 2 vertical/portrait photos standing side-by-side
  | 'asymmetric-featured'  // 1 large featured hero + 2 smaller secondary photos
  | 'scrapbook-trio'       // 3 photos staggered artistically
  | 'quad-gallery'         // 2x2 grid of 4 polaroid cards
  | 'diagonal-duo'         // 2 cards tilted with soft diagonal overlap
  | 'custom';              // Freeform element positioning

export type PageLayoutType = LayoutTemplate;

/**
 * Layout editing mode for a page:
 * - 'PRESET': Started from a structured layout template. Elements are placed in initial slots.
 * - 'FREEFORM': Elements are positioned and manipulated completely freely without preset constraints.
 */
export type PageLayoutMode = 'PRESET' | 'FREEFORM';

export interface PageMetadata {
  /** Current layout mode */
  layoutMode?: PageLayoutMode;
  /** ID of the template originally used to generate this page */
  sourceTemplateId?: LayoutTemplate | null;
  /** Set to true if any element has been moved, resized, restyled, added or removed */
  isCustomized?: boolean;
  [key: string]: unknown;
}

export interface LayoutSlot {
  name: string;
  defaultTransform: ElementTransform;
  allowedTypes: PageElementType[];
}

export interface LayoutTemplateConfig {
  id: LayoutTemplate;
  name: string;
  description: string;
  slots: LayoutSlot[];
}

// ==========================================
// 5. Page Element Specific Payloads
// ==========================================

export type PageElementType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'SHAPE' | 'DECORATION';

export interface TextElementData {
  text: string;
  variant: 'title' | 'chapter-label' | 'quote' | 'body' | 'handwriting' | 'caption';
  multiline?: boolean;
  textLines?: string[];
}

export interface ImageElementData {
  mediaId?: string;
  src: string;
  alt?: string;
  caption?: string;
  aspectRatio?: number;
  objectFit?: 'contain' | 'cover' | 'fill';
}

export interface VideoElementData {
  mediaId?: string;
  src: string;
  thumbnailUrl: string;
  caption?: string;
  aspectRatio?: number;
  duration?: number;
  muted?: boolean;
  autoPlay?: boolean;
}

export interface ShapeElementData {
  shapeType: 'rectangle' | 'circle' | 'line' | 'wreath' | 'badge' | 'heart';
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  strokeDashArray?: number[];
}

export interface DecorationElementData {
  decorationType: 'washi-tape' | 'stamp' | 'wax-seal' | 'ribbon' | 'corner-ornament' | 'flourish' | 'flower';
  icon?: string;
  assetUrl?: string;
}

// ==========================================
// 6. Generic & Discriminated PageElement Types
// ==========================================

export interface BasePageElement<TType extends PageElementType, TData> {
  id: string;
  type: TType;
  slot?: string;
  transform: ElementTransform;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0.0 to 1.0
  data: TData;
  style?: ElementStyle;
  interaction?: ElementInteraction;
}

export type TextElement = BasePageElement<'TEXT', TextElementData>;
export type ImageElement = BasePageElement<'IMAGE', ImageElementData>;
export type VideoElement = BasePageElement<'VIDEO', VideoElementData>;
export type ShapeElement = BasePageElement<'SHAPE', ShapeElementData>;
export type DecorationElement = BasePageElement<'DECORATION', DecorationElementData>;

/**
 * Discriminated Union of all supported page element types.
 */
export type PageElement =
  | TextElement
  | ImageElement
  | VideoElement
  | ShapeElement
  | DecorationElement;

// ==========================================
// 7. Page & PageBackground Contracts
// ==========================================

export interface HeaderFadeConfig {
  enabled: boolean;
  color: string;       // e.g. '#F9F5EC'
  height: number;      // normalized 0.0 to 1.0 (e.g. 0.35)
  startOpacity: number;// e.g. 0.92
  endOpacity: number;  // e.g. 0.0
}

export interface GutterFadeConfig {
  enabled: boolean;
  color: string;       // e.g. '#F9F5EC'
  width: number;       // normalized 0.0 to 1.0 (e.g. 0.15)
  opacity: number;     // e.g. 0.28
}

export interface PageBackground {
  type: 'color' | 'image' | 'gradient';
  color?: string;      // e.g. '#F9F5EC'
  imageUrl?: string;
  opacity?: number;    // 0.0 to 1.0
  headerFade?: HeaderFadeConfig;
  gutterFade?: GutterFadeConfig;
}

export interface Page {
  id: string;
  /** Physical sequence in book: 0 for prologue, 1..N for leaves */
  pageNumber: number;
  /** Side in two-page spread: 'right' (front face) or 'left' (back face) */
  side: 'left' | 'right';
  chapter?: string;
  title?: string;
  quote?: string;
  textLines?: string[];
  handwriting?: string;
  layout: LayoutTemplate;
  /** Layout mode: 'PRESET' (started from preset) or 'FREEFORM' (freeform canvas) */
  layoutMode?: PageLayoutMode;
  /** Template ID that initially generated this page */
  sourceTemplateId?: LayoutTemplate | null;
  /** True if any element was modified, repositioned, resized, added or deleted after applying template */
  isCustomized?: boolean;
  background: PageBackground;
  audioTrackId?: string;
  audio?: AudioTrack | null;
  elements: PageElement[];
  metadata?: PageMetadata;
}

// ==========================================
// 8. Book Settings & Global Atmosphere
// ==========================================

export interface CanvasResolution {
  width: number;  // e.g. 1024
  height: number; // e.g. 1360
}

export interface BookPhysicalDimensions {
  /** 3D world page width (default: 764) */
  pageWidth: number;
  /** 3D world page height (default: 1080) */
  pageHeight: number;
  /** Calculated page aspect ratio (191:270 ≈ 0.707) */
  aspectRatio: number;
  /** Canvas 2D texture baking resolution (default: 1024x1360) */
  canvasResolution: CanvasResolution;
  pageThickness: number;
  coverThickness: number;
  pageRootThickness: number;
  coverMarginX: number;
  coverMarginY: number;
}

export interface CameraConfig {
  fov: number;      // e.g. 14
  distance: number; // e.g. 5200
  near: number;     // e.g. 1200
  far: number;      // e.g. 9000
}

export interface BookThemePalette {
  edgeColor: number;    // e.g. 0xb1a283
  paperColor: string;   // e.g. '#F9F5EC'
  textColor: string;    // e.g. '#292522'
  accentColor: string;  // e.g. '#94384F'
  subtleColor: string;  // e.g. '#C99A9A'
  champagneGold: string;// e.g. '#FFE5B4'
  deskColor?: number;   // e.g. 0x1F1218
}

export interface BookFontTypography {
  titleFont: string;       // e.g. "SVN-Housttely Signature", "Coldwell Bridges"
  bodyFont: string;        // e.g. "Cormorant Garamond"
  handwritingFont: string; // e.g. "Dancing Script"
  sansFont: string;        // e.g. "Montserrat"
}

export interface AtmosphericConfig {
  enabled: boolean;
  butterflyCount: number;  // e.g. 12 on desktop, 6 on mobile
  petalCount: number;      // e.g. 34 on desktop, 16 on mobile
  dustCount: number;       // e.g. 90 on desktop, 35 on mobile
}

export interface BookSettings {
  dimensions: BookPhysicalDimensions;
  camera: CameraConfig;
  theme: BookThemePalette;
  typography: BookFontTypography;
  atmospheric: AtmosphericConfig;
}

// ==========================================
// 9. Book Root Contract (Book -> Pages -> Elements)
// ==========================================

export interface CoupleInfo {
  he: string;                 // e.g. "Phúc"
  she: string;                // e.g. "Trang"
  anniversaryDate: string;    // ISO 8601 string, e.g. "2022-10-20T00:00:00"
  proposalQuote?: string;     // e.g. "Thế cậu đồng ý làm bạn gái tớ không?"
}

export interface BookCoverConfig {
  front: {
    backgroundUrl: string;
    title: string;            // e.g. "Chúng Mình"
    titleFont: string;        // e.g. "SVN-Housttely Signature"
    counterBadge: {
      enabled: boolean;
      startDate: string;      // "2022-10-20"
      subtitle: string;       // "Bên nhau từ ngày 20.10.2022"
    };
    elements?: PageElement[];
  };
  back: {
    insideBackgroundUrl: string;
    outsideBackgroundUrl: string;
    elements?: PageElement[];
  };
}

/**
 * Root Book Entity containing complete content, settings, and pages.
 * This is the primary payload exchanged between Backend/CMS API and Client Application.
 */
export interface Book {
  id: string;
  title: string;
  slug: string;
  description?: string;
  version: string;
  couple: CoupleInfo;
  cover: BookCoverConfig;
  backgroundMusicId?: string;
  audio: AudioTrack;
  settings: BookSettings;
  pages: Page[];
  createdAt?: string;
  updatedAt?: string;
}
