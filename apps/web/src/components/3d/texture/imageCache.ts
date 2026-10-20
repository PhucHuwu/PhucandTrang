import { detectInitialTier } from '../qbject/quality';

/**
 * Loads an HTMLImageElement asynchronously with crossOrigin enabled.
 */
const decodedImages = new Map<string, { image: HTMLImageElement; bytes: number }>();
const pendingImages = new Map<string, Promise<HTMLImageElement>>();
const DEFAULT_DECODED_IMAGE_BUDGET = 128 * 1024 * 1024;
const LOW_TIER_DECODED_IMAGE_BUDGET = 48 * 1024 * 1024;
let decodedImageBudget: number | null = null;
let decodedImageBytes = 0;
// Bumped on clear so loads that were still in flight do not refill the cache afterwards
let decodedImageEpoch = 0;

function getDecodedImageBudget(): number {
  if (decodedImageBudget === null) {
    decodedImageBudget =
      typeof navigator !== 'undefined' && detectInitialTier() === 'low'
        ? LOW_TIER_DECODED_IMAGE_BUDGET
        : DEFAULT_DECODED_IMAGE_BUDGET;
  }
  return decodedImageBudget;
}

function trimDecodedImages(budget: number) {
  while (decodedImageBytes > budget && decodedImages.size) {
    const oldest = decodedImages.entries().next().value!;
    decodedImageBytes -= oldest[1].bytes;
    decodedImages.delete(oldest[0]);
  }
}

/** Drops every decoded image held by the shared cache (call when the viewer unmounts). */
export function clearDecodedImageCache() {
  decodedImageEpoch++;
  pendingImages.clear();
  decodedImages.clear();
  decodedImageBytes = 0;
}

/** Loads and decodes an image into the shared cache used by the page renderer. */
export function preloadDecodedImage(src: string): Promise<HTMLImageElement> {
  return loadImageAsync(src);
}

export function loadImageAsync(src: string): Promise<HTMLImageElement> {
  const cached = decodedImages.get(src);
  if (cached) {
    decodedImages.delete(src);
    decodedImages.set(src, cached);
    return Promise.resolve(cached.image);
  }
  const pending = pendingImages.get(src);
  if (pending) return pending;

  const epoch = decodedImageEpoch;
  const request = new Promise<HTMLImageElement>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = async () => {
      // onload alone does not guarantee decoded pixels are ready for drawImage.
      try { await img.decode(); } catch { /* Loaded images can still be drawable after decode rejection. */ }
      const bytes = img.naturalWidth * img.naturalHeight * 4;
      const budget = getDecodedImageBudget();
      if (epoch === decodedImageEpoch && bytes <= budget && !decodedImages.has(src)) {
        trimDecodedImages(budget - bytes);
        decodedImages.set(src, { image: img, bytes });
        decodedImageBytes += bytes;
      }
      resolve(img);
    };
    img.onerror = () => {
      // Create a 1x1 transparent dummy image on error to prevent crashing
      const fallback = new Image();
      fallback.src =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      fallback.onload = () => resolve(fallback);
      fallback.onerror = () => resolve(fallback);
    };
    img.src = src;
  });
  pendingImages.set(src, request);
  void request.finally(() => {
    if (pendingImages.get(src) === request) pendingImages.delete(src);
  });
  return request;
}
