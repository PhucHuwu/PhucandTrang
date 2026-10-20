import { MediaType } from '@prisma/client';

/** Derives media type and Cloudinary publicId for a legacy cloudinaryUrls entry. */
export function classifyLegacyMedia(
  key: string,
  url: string,
): { type: MediaType; publicId: string } {
  let type: MediaType = MediaType.IMAGE;
  let folder = 'phuc_trang_memories';

  if (key.startsWith('backgrounds/')) {
    type = MediaType.BACKGROUND;
    folder = 'phuc_trang_backgrounds';
  } else if (key.endsWith('.mp4')) {
    type = MediaType.VIDEO;
  } else if (key.endsWith('.mp3') || key.endsWith('.wav')) {
    type = MediaType.AUDIO;
    folder = 'phuc_trang_audio';
  }

  const filename = url.split('/').pop() || key;
  const publicId = `${folder}/${filename.replace(/\.[^/.]+$/, '')}`;

  return { type, publicId };
}
