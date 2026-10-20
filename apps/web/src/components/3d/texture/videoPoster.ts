/**
 * Cloudinary can render a still frame of a video: /video/upload/so_0/<id>.jpg.
 * Returns null for any other URL, which must not be loaded as an image.
 */
export function deriveVideoPosterUrl(videoUrl?: string): string | null {
  if (!videoUrl) return null;
  try {
    const url = new URL(videoUrl);
    if (!/(^|\.)cloudinary\.com$/i.test(url.hostname) || !url.pathname.includes('/video/upload/')) {
      return null;
    }
    url.pathname = url.pathname
      .replace('/video/upload/', '/video/upload/so_0/')
      .replace(/\.[a-z0-9]+$/i, '.jpg');
    if (!url.pathname.endsWith('.jpg')) url.pathname += '.jpg';
    return url.toString();
  } catch {
    return null;
  }
}

/** Poster image for a VIDEO element: explicit thumbnail first, then a Cloudinary frame. */
export function resolveVideoPosterUrl(data: { thumbnailUrl?: string; src?: string }): string | null {
  return data.thumbnailUrl || deriveVideoPosterUrl(data.src);
}
