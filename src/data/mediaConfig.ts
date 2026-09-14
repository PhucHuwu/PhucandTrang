import cloudinaryUrls from '@/data/cloudinaryUrls.json';

// Helper to resolve Cloudinary URL with fallback
export function getMediaUrl(filename: string): string {
  const map = cloudinaryUrls as Record<string, string>;
  if (map[filename]) {
    return map[filename];
  }
  // Try lowercase / alternative
  const found = Object.keys(map).find(k => k.toLowerCase() === filename.toLowerCase());
  if (found && map[found]) {
    return map[found];
  }
  return `/memories/${filename}`;
}

export default cloudinaryUrls;
