import { DESIGN_CANVAS_HEIGHT, DESIGN_CANVAS_WIDTH } from './coordinateConversion';

export interface BookSettingsDefaults {
  dimensions: {
    pageWidth: number;
    pageHeight: number;
    aspectRatio: number;
    canvasResolution: { width: number; height: number };
    pageThickness: number;
    coverThickness: number;
    pageRootThickness: number;
    coverMarginX: number;
    coverMarginY: number;
  };
  camera: {
    fov: number;
    distance: number;
    near: number;
    far: number;
  };
  theme: {
    edgeColor: number;
    paperColor: string;
    textColor: string;
    accentColor: string;
    subtleColor: string;
    champagneGold: string;
    deskColor: number;
  };
  typography: {
    titleFont: string;
    bodyFont: string;
    handwritingFont: string;
    sansFont: string;
  };
  atmospheric: {
    enabled: boolean;
    butterflyCount: number;
    petalCount: number;
    dustCount: number;
  };
}

export type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

function deepFreeze<T>(value: T): DeepReadonly<T> {
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) deepFreeze((value as any)[key]);
    Object.freeze(value);
  }
  return value as DeepReadonly<T>;
}

/**
 * Single source of truth for the physical / visual defaults of the 3D book
 * (the values the public viewer falls back to).
 */
export const DEFAULT_BOOK_SETTINGS: DeepReadonly<BookSettingsDefaults> = deepFreeze({
  dimensions: {
    pageWidth: 764,
    pageHeight: 1080,
    aspectRatio: 764 / 1080,
    canvasResolution: {
      width: DESIGN_CANVAS_WIDTH,
      height: DESIGN_CANVAS_HEIGHT,
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
});

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isPlainObject(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneDeep<T>(value: T): T {
  if (Array.isArray(value)) return value.map(cloneDeep) as unknown as T;
  if (isPlainObject(value)) {
    const out: Record<string, any> = {};
    for (const key of Object.keys(value)) out[key] = cloneDeep(value[key]);
    return out as T;
  }
  return value;
}

function mergeInto(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
  for (const key of Object.keys(source)) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    const val = source[key];
    if (val === undefined) continue;
    target[key] =
      isPlainObject(val) && isPlainObject(target[key]) ? mergeInto(target[key], val) : cloneDeep(val);
  }
  return target;
}

/** A fresh, mutable deep copy of {@link DEFAULT_BOOK_SETTINGS}. */
export function createDefaultBookSettings(): BookSettingsDefaults {
  return cloneDeep(DEFAULT_BOOK_SETTINGS) as BookSettingsDefaults;
}

/**
 * Pure deep merge of (possibly partial) stored settings over {@link DEFAULT_BOOK_SETTINGS}.
 * Plain objects merge recursively, arrays and scalars from `settings` replace the default,
 * `undefined` values are ignored and unknown keys are kept. Inputs are never mutated and the
 * result shares no references with them.
 */
export function withBookSettingsDefaults<T extends Record<string, any>>(
  settings?: T | null,
): BookSettingsDefaults & T {
  const result = createDefaultBookSettings() as Record<string, any>;
  if (isPlainObject(settings)) mergeInto(result, settings);
  return result as BookSettingsDefaults & T;
}
