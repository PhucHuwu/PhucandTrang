import type * as THREE from 'three';

declare global {
  type FlipBookParams = {
    containerEl: HTMLElement;
    pageWidth: number;
    pageHeight: number;
    pageThickness?: number;
    pageRootThickness?: number;
    coverThickness?: number;
    coverMarginX?: number;
    coverMarginY?: number;
    pageEdgeColor: number;
    textureUrls: {
      pages: string[];
      spineInner?: string;
      spineOuter?: string;
      coverEdgeTB?: string;
      coverEdgeLR?: string;
      spineEdgeTB?: string;
      spineEdgeLR?: string;
      desk?: string;
    };
    settings?: Partial<FlipbookSettings>;
    pageActiveAreas?: PageActiveArea[];
  };

  type FlipbookSettings = {
    cameraAngle: number;
    cameraDistance: number;
    cameraFov: number;

    spotLightX: number;
    spotLightY: number;
    spotLightZ: number;
    spotLightColor: number;
    spotLightIntensity: number;
    spotLightAngle: number;
    spotLightPenumbra: number;
    spotLightDecay: number;
    spotLightNearClip: number;
    spotLightFarClip: number;
    spotLightMapSize: number;

    ambientLightColor: number;
    ambientLightIntensity: number;

    showSpotLightHelper: boolean;
    showSpotShadowHelper: boolean;
    showPageCurveHelpers: boolean;
  };

  type PageParams = {
    textureUrls: {
      front: string;
      back: string;
      edgeLR?: string;
      edgeTB?: string;
    };
    edgeColor: number;
    width: number;
    height: number;
    thickness?: number;
    rootThickness?: number;
    isCover?: boolean;
    textureLoader: THREE.TextureLoader;
    isFrontCover: boolean;
  };

  type PageArea = {
    left: number;
    top: number;
    width: number;
    height: number;
  };

  type PageActiveArea = PageArea & {
    faceIndex: number;
    title?: string;
    link?: string | (() => string);
    video?: string;
    zoom?: PageArea;
    preserveDefaultCursor?: boolean;
  };

  type Swipe = {
    touchId: number | null;
    startX: number;
    startY: number;
    prevX: number;
    prevY: number;
    x: number;
    y: number;
    direction: "left" | "right" | null;
  };
}
