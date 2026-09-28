// Helper to load 2.otf font into document.fonts so Canvas 2D can render it
export async function ensureCustomFontLoaded(): Promise<void> {
  if (typeof window === 'undefined' || typeof FontFace === 'undefined') return;

  try {
    const fontName = 'SVN-Housttely Signature';
    // Check if already loaded
    let exists = false;
    document.fonts.forEach((f) => {
      if (f.family === fontName || f.family === 'Coldwell Bridges') {
        exists = true;
      }
    });

    if (!exists) {
      const fontFace = new FontFace(fontName, 'url(/font/2.otf)', {
        weight: 'normal',
        style: 'normal',
      });
      const loaded = await fontFace.load();
      document.fonts.add(loaded);

      // Also register as "Coldwell Bridges" alias
      const fontFaceAlias = new FontFace('Coldwell Bridges', 'url(/font/2.otf)', {
        weight: 'normal',
        style: 'normal',
      });
      const loadedAlias = await fontFaceAlias.load();
      document.fonts.add(loadedAlias);
    }
    await document.fonts.ready;
  } catch (e) {
    console.error('Failed to load font 2.otf:', e);
  }
}
