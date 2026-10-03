// Canvas 2D never waits for webfonts: a face that is not loaded when the draw happens is
// silently replaced by the next family in the stack (the generic `cursive` → Comic Sans MS on
// Windows). The @font-face rules in globals.css only *declare* the custom face — it stays
// `unloaded` until something awaits document.fonts.load() — so every rasterizer has to await
// this module before painting text with these families.

export const CUSTOM_FONT_FAMILIES = [
  'SVN-Housttely Signature',
  'Coldwell Bridges',
  'SVN-Honeyguide Caps',
  'Baby Doll',
];
export const CUSTOM_FONT_URLS: Record<string, string> = {
  'SVN-Housttely Signature': '/font/2.otf',
  'Coldwell Bridges': '/font/2.otf',
  'SVN-Honeyguide Caps': '/font/1.otf',
  'Baby Doll': '/font/1.otf',
};
export const CUSTOM_FONT_URL = '/font/2.otf';

/**
 * Canvas font shorthands for text rasterized outside the element flow (video captions,
 * decoration glyphs, page-number footers). Shared by every rasterizer so the pre-draw load
 * always mirrors what is actually painted.
 */
export const CAPTION_FONT = 'italic 19px "Dancing Script", cursive';
export const DECORATION_GLYPH_FONT = '24px "Dancing Script", cursive';
export const PAGE_NUMBER_FONT = 'italic 16px "Cormorant Garamond", Georgia, serif';

// The sample drives which subset faces `document.fonts.load(spec, sample)` fetches: a face is
// only loaded when the text intersects its unicode-range, and next/font serves the Vietnamese and
// latin-ext faces as separate files. A latin-only sample would leave those unloaded, so canvas
// text with Vietnamese diacritics would rasterize those glyphs in a system fallback.
const SAMPLE_TEXT = 'Chúng Mình Ăn Được ơ ư ạ ế ộ ữ ỳ ỹ';
const LOAD_TIMEOUT_MS = 8000;

const GENERIC_FAMILIES = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  'math',
  'emoji',
  'fangsong',
  'inherit',
  'initial',
  'unset',
  'revert',
]);

let customFontLoad: Promise<void> | null = null;

/**
 * Resolves once the promise settles or the timeout elapses. A slow or failing font fetch must
 * degrade to a fallback glyph run, never block the flipbook from rendering.
 */
function withTimeout(promise: Promise<unknown>, ms: number): Promise<void> {
  return Promise.race([
    promise.then(
      () => undefined,
      () => undefined
    ),
    new Promise<void>((resolve) => setTimeout(resolve, ms)),
  ]);
}

/** `italic bold 19px "Dancing Script", cursive` → prefix `italic bold 19px`, families without generics. */
function parseFontStack(fontStack: string): { prefix: string; families: string[] } {
  const match = /^(.*?\d+(?:\.\d+)?px)\s+(.+)$/.exec(fontStack.trim());
  const prefix = match ? match[1] : '';
  const list = match ? match[2] : fontStack;

  const families = list
    .split(',')
    .map((part) => part.trim().replace(/^["']|["']$/g, ''))
    .filter((family) => family.length > 0 && !GENERIC_FAMILIES.has(family.toLowerCase()));

  return { prefix, families };
}

function safeFontLoad(spec: string, sampleText: string): Promise<unknown> {
  try {
    return document.fonts.load(spec, sampleText);
  } catch {
    // Malformed shorthand (e.g. no size) — nothing to load.
    return Promise.resolve();
  }
}

async function loadCustomFonts(): Promise<void> {
  // globals.css declares both faces; register them here only if that rule ever goes missing.
  CUSTOM_FONT_FAMILIES.forEach((family) => {
    const declared = Array.from(document.fonts).some((face) => face.family === family);
    if (declared) return;

    try {
      const url = CUSTOM_FONT_URLS[family] || CUSTOM_FONT_URL;
      document.fonts.add(
        new FontFace(family, `url(${url})`, {
          weight: 'normal',
          style: 'normal',
          display: 'swap',
        })
      );
    } catch {
      // FontFace unavailable for this source — callers fall back as they did before.
    }
  });

  await withTimeout(
    Promise.all(
      CUSTOM_FONT_FAMILIES.map((family) =>
        safeFontLoad(`normal normal 400 16px "${family}"`, SAMPLE_TEXT)
      )
    ),
    LOAD_TIMEOUT_MS
  );
}

/**
 * Loads 2.otf so Canvas 2D can rasterize it. Idempotent: the first call starts the fetch,
 * later calls await the same promise so N concurrent rasterizers share one download.
 */
export function ensureCustomFontLoaded(): Promise<void> {
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    typeof FontFace === 'undefined'
  ) {
    return Promise.resolve();
  }

  if (!customFontLoad) {
    customFontLoad = loadCustomFonts();
  }

  return customFontLoad;
}

/**
 * Loads every webfont family referenced by a canvas font shorthand (the string assigned to
 * `ctx.font`), keeping the shorthand's own style/weight/size so the exact face the draw will
 * pick is the one fetched. Generic and unknown families resolve immediately.
 */
export async function ensureCanvasFontLoaded(
  fontShorthand?: string | null,
  sampleText: string = SAMPLE_TEXT
): Promise<void> {
  if (!fontShorthand || typeof document === 'undefined' || typeof document.fonts === 'undefined') {
    return;
  }

  const { prefix, families } = parseFontStack(fontShorthand);
  if (families.length === 0) return;

  await withTimeout(
    Promise.all(
      families.map((family) =>
        safeFontLoad(prefix ? `${prefix} "${family}"` : `16px "${family}"`, sampleText)
      )
    ),
    LOAD_TIMEOUT_MS
  );
}
