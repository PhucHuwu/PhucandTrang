export const FIRST_COVER_URL =
  'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789904212/phuc_trang_backgrounds/first-cover.jpg';
export const LAST_COVER_URL =
  'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789904216/phuc_trang_backgrounds/last-cover.jpg';

/** Canonical book cover; media ids are resolved from the seeded media catalog. */
export function buildCanonicalCover(
  getMediaId: (keyOrUrl: string) => string | undefined,
) {
  return {
    front: {
      backgroundUrl: FIRST_COVER_URL,
      mediaId: getMediaId(FIRST_COVER_URL),
      title: 'Chúng Mình',
      titleFont: 'SVN-Housttely Signature',
      counterBadge: {
        enabled: true,
        startDate: '2022-10-20',
        subtitle: 'Bên nhau từ ngày {{anniversaryDate}}',
      },
      elements: [
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
          data: { text: 'Chúng Mình', variant: 'title' },
        },
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
          data: {
            text: 'Bên nhau từ ngày {{anniversaryDate}}',
            variant: 'quote',
          },
        },
      ],
    },
    back: {
      insideBackgroundUrl: LAST_COVER_URL,
      insideMediaId: getMediaId(LAST_COVER_URL),
      outsideBackgroundUrl: LAST_COVER_URL,
      outsideMediaId: getMediaId(LAST_COVER_URL),
      elements: [],
    },
  };
}

export type CanonicalCover = ReturnType<typeof buildCanonicalCover>;

export const CANONICAL_SETTINGS = {
  dimensions: {
    pageWidth: 764,
    pageHeight: 1080,
    aspectRatio: 0.707,
    canvasResolution: { width: 1024, height: 1360 },
    pageThickness: 1,
    coverThickness: 5,
    pageRootThickness: 4,
    coverMarginX: 8,
    coverMarginY: 10,
  },
  camera: { fov: 14, distance: 5200, near: 1200, far: 9000 },
  theme: {
    edgeColor: 0xb1a283,
    paperColor: '#F9F5EC',
    textColor: '#292522',
    accentColor: '#94384F',
    champagneGold: '#FFE5B4',
    deskColor: 0x1f1218,
  },
  typography: {
    titleFont: 'SVN-Housttely Signature',
    bodyFont: 'Cormorant Garamond',
    handwritingFont: 'Dancing Script',
    sansFont: 'Montserrat',
  },
  atmospheric: {
    enabled: true,
    butterflyCount: 12,
    petalCount: 34,
    dustCount: 90,
  },
};
