export interface CompiledMediaReferences {
  allUrls: string[];
  images: string[];
  videos: Array<{ url: string; thumbnailUrl?: string; caption?: string }>;
  audio: string[];
  backgrounds: string[];
}

export interface CompiledElement {
  id: string;
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'SHAPE' | 'DECORATION';
  slot: string | null;
  order: number;
  zIndex: number; // SINGLE SOURCE OF TRUTH
  opacity: number;
  transform: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    scale: number;
  };
  style: Record<string, any> | null;
  data: Record<string, any>;
  interaction: {
    enabled: boolean;
    action: string;
    target?: string | number;
    title?: string;
    activeArea?: {
      top: number;
      left: number;
      width: number;
      height: number;
    };
  } | null;
}

export interface CompiledPage {
  id: string;
  order: number;
  displayPageNumber: number;
  pageNumber: number;
  side: 'left' | 'right';
  chapter: string | null;
  title: string | null;
  quote: string | null;
  handwriting: string | null;
  layout: string;
  layoutMode: string;
  background: {
    type: string;
    imageUrl?: string;
    color?: string;
    opacity?: number;
    objectFit?: string;
    focalPoint?: { x: number; y: number };
    gradient?: any;
    headerFade?: {
      enabled: boolean;
      color: string;
      height: number;
      startOpacity: number;
      endOpacity: number;
    };
    gutterFade?: {
      enabled: boolean;
      color: string;
      width: number;
      opacity: number;
    };
  };
  elements: CompiledElement[];
  audio?: {
    id: string;
    title: string;
    artist?: string | null;
    src: string;
    mediaId?: string | null;
    volume: number;
    loop: boolean;
    startAt: number;
    fadeIn: number;
    fadeOut: number;
    durationSeconds?: number | null;
    autoPlay: boolean;
  } | null;
}

export interface CompiledBookDocument {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  contentRevision: number;
  couple: {
    he: string;
    she: string;
    anniversaryDate: string;
    proposalQuote: string | null;
  };
  cover: {
    front: {
      backgroundUrl: string;
      mediaId?: string;
      title: string;
      titleFont?: string;
      counterBadge?: {
        enabled: boolean;
        startDate: string;
        subtitle: string;
      };
      elements?: CompiledElement[];
    };
    back: {
      insideBackgroundUrl: string;
      insideMediaId?: string;
      outsideBackgroundUrl: string;
      outsideMediaId?: string;
      elements?: CompiledElement[];
    };
  };
  audio: {
    id?: string;
    title: string;
    artist: string | null;
    src: string;
    mediaId?: string | null;
    autoPlay: boolean;
    loop: boolean;
    volume: number;
    startAt: number;
    fadeIn: number;
    fadeOut: number;
    durationSeconds: number | null;
  } | null;
  settings: Record<string, any>;
  pages: CompiledPage[];
  media: CompiledMediaReferences;
  publishedAt: string;
  version: string;
}
