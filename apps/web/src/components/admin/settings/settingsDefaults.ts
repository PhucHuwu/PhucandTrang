import { DEFAULT_BOOK_SETTINGS } from '@phucandtrang/shared';

export type SettingsTab = 'general' | 'theme' | 'typography' | '3d' | 'atmosphere' | 'audio' | 'cover';

const { dimensions: d, camera: c, theme: t, typography: ty, atmospheric: a } = DEFAULT_BOOK_SETTINGS;

/**
 * Initial / "Reset" values of the settings form, derived from the shared book defaults.
 * The form has always saved a slightly different shape than the viewer defaults: no
 * dimensions.aspectRatio / theme.subtleColor, and typography uses headingFont + base sizes
 * instead of sansFont. That shape is kept so Reset + Save writes exactly what it did before.
 */
export const SETTINGS_FORM_DEFAULTS = {
  dimensions: {
    pageWidth: d.pageWidth,
    pageHeight: d.pageHeight,
    pageThickness: d.pageThickness,
    coverThickness: d.coverThickness,
    pageRootThickness: d.pageRootThickness,
    coverMarginX: d.coverMarginX,
    coverMarginY: d.coverMarginY,
    canvasResolution: { width: d.canvasResolution.width, height: d.canvasResolution.height },
  },
  camera: {
    fov: c.fov,
    distance: c.distance,
    near: c.near,
    far: c.far,
  },
  theme: {
    edgeColor: t.edgeColor,
    paperColor: t.paperColor,
    textColor: t.textColor,
    accentColor: t.accentColor,
    champagneGold: t.champagneGold,
    deskColor: t.deskColor,
  },
  typography: {
    titleFont: ty.titleFont,
    bodyFont: ty.bodyFont,
    handwritingFont: ty.handwritingFont,
    headingFont: ty.sansFont,
    baseFontSize: 22,
    baseLineHeight: 1.5,
  },
  atmospheric: {
    enabled: a.enabled,
    butterflyCount: a.butterflyCount,
    petalCount: a.petalCount,
    dustCount: a.dustCount,
  },
};

export type SettingsDimensions = typeof SETTINGS_FORM_DEFAULTS.dimensions;
export type SettingsCamera = typeof SETTINGS_FORM_DEFAULTS.camera;
export type SettingsTheme = typeof SETTINGS_FORM_DEFAULTS.theme;
export type SettingsTypography = typeof SETTINGS_FORM_DEFAULTS.typography;
export type SettingsAtmospheric = typeof SETTINGS_FORM_DEFAULTS.atmospheric;
