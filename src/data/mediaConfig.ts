import cloudinaryUrls from '@/data/cloudinaryUrls.json';

// In-memory dynamic registry populated from Backend Database / Media API
const dynamicMediaRegistry = new Map<string, string>();

/**
 * Register media items dynamically fetched from the database
 * to decouple the frontend from static cloudinaryUrls.json.
 */
export function registerDynamicMedia(
  items: Array<{ id?: string; url: string; alt?: string; publicId?: string; metadata?: any }>,
) {
  for (const item of items) {
    if (!item.url) continue;
    if (item.id) dynamicMediaRegistry.set(item.id, item.url);
    if (item.alt) dynamicMediaRegistry.set(item.alt.toLowerCase(), item.url);
    if (item.publicId) dynamicMediaRegistry.set(item.publicId.toLowerCase(), item.url);
    if (item.metadata?.originalKey) {
      dynamicMediaRegistry.set(item.metadata.originalKey.toLowerCase(), item.url);
    }
  }
}

/**
 * Resolves media URL with multi-tiered resolution:
 * 1. Dynamic Backend Registry (populated from Database)
 * 2. Static Cloudinary mapping (gradual fallback)
 * 3. Local fallback path (/memories/...)
 */
export function getMediaUrl(filename: string): string {
  if (!filename) return '';

  // If already a full http/https URL, return directly
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename;
  }

  // 1. Check dynamic database registry
  const lower = filename.toLowerCase();
  if (dynamicMediaRegistry.has(lower)) {
    return dynamicMediaRegistry.get(lower)!;
  }

  // 2. Check static cloudinaryUrls.json mapping
  const map = cloudinaryUrls as Record<string, string>;
  if (map[filename]) {
    return map[filename];
  }

  const found = Object.keys(map).find((k) => k.toLowerCase() === lower);
  if (found && map[found]) {
    return map[found];
  }

  // 3. Fallback to public folder
  return filename.startsWith('/') ? filename : `/memories/${filename}`;
}

export default cloudinaryUrls;
