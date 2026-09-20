import * as crypto from 'crypto';
import { MediaType } from '@prisma/client';

export interface CloudinarySignedConfig {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  resourceType: string;
  uploadUrl: string;
  params: Record<string, any>;
}

export function generateCloudinarySignature(
  params: Record<string, any>,
  apiSecret: string,
): string {
  if (!apiSecret) {
    // Return empty signature if secret is not set yet
    return '';
  }

  // Sort parameter keys alphabetically
  const sortedKeys = Object.keys(params)
    .filter(
      (key) =>
        params[key] !== undefined &&
        params[key] !== null &&
        params[key] !== '' &&
        key !== 'file' &&
        key !== 'cloud_name' &&
        key !== 'resource_type' &&
        key !== 'api_key',
    )
    .sort();

  const serialized = sortedKeys
    .map((key) => {
      const value = Array.isArray(params[key])
        ? params[key].join(',')
        : params[key];
      return `${key}=${value}`;
    })
    .join('&');

  return crypto
    .createHash('sha1')
    .update(serialized + apiSecret)
    .digest('hex');
}

export function getUploadFolderForType(type?: MediaType): string {
  switch (type) {
    case MediaType.BACKGROUND:
      return 'phuc_trang_backgrounds';
    case MediaType.AUDIO:
      return 'phuc_trang_audio';
    case MediaType.TEXTURE:
      return 'phuc_trang_textures';
    case MediaType.DECORATION:
      return 'phuc_trang_decorations';
    case MediaType.IMAGE:
    case MediaType.VIDEO:
    default:
      return 'phuc_trang_memories';
  }
}

export function getResourceTypeForType(type?: MediaType): string {
  switch (type) {
    case MediaType.VIDEO:
      return 'video';
    case MediaType.AUDIO:
      return 'video'; // Cloudinary handles audio files under video resource_type
    case MediaType.BACKGROUND:
    case MediaType.IMAGE:
    case MediaType.TEXTURE:
    case MediaType.DECORATION:
      return 'image';
    default:
      return 'auto';
  }
}
