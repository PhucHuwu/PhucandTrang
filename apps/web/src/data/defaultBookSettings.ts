import { BookSettings } from '@/types/book';

/**
 * Default physical/visual settings for the 3D book.
 * Kept separate from the legacy bookData fallback so the public bundle does not
 * pull in the whole offline book just to read these defaults.
 */
export function createDefaultBookSettings(): BookSettings {
  return {
    dimensions: {
      pageWidth: 764,
      pageHeight: 1080,
      aspectRatio: 764 / 1080,
      canvasResolution: {
        width: 1024,
        height: 1360,
      },
      pageThickness: 1,
      coverThickness: 5,
      pageRootThickness: 4,
      coverMarginX: 8,
      coverMarginY: 10,
    },
    camera: {
      fov: 14,
      distance: 5200,
      near: 1200,
      far: 9000,
    },
    theme: {
      edgeColor: 0xb1a283,
      paperColor: '#F9F5EC',
      textColor: '#292522',
      accentColor: '#94384F',
      subtleColor: '#C99A9A',
      champagneGold: '#FFE5B4',
      deskColor: 0x1F1218,
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
}

export const DEFAULT_BOOK_SETTINGS: BookSettings = createDefaultBookSettings();
