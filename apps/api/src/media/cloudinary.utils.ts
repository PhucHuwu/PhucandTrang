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
    default:
      return 'image';
  }
}

const IMAGE_FORMATS = 'jpg,jpeg,png,webp,gif,avif,heic,heif';
const VIDEO_FORMATS = 'mp4,mov,webm,m4v';
const AUDIO_FORMATS = 'mp3,m4a,aac,wav,ogg,oga,flac,opus';

export function getAllowedFormatsForType(type?: MediaType): string {
  switch (type) {
    case MediaType.VIDEO:
      return VIDEO_FORMATS;
    case MediaType.AUDIO:
      return AUDIO_FORMATS;
    default:
      return IMAGE_FORMATS;
  }
}

export interface CloudinaryCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export interface CloudinaryDestroyResult {
  ok: boolean;
  skipped?: boolean;
  result?: string;
  error?: string;
}

/** Cloudinary resource_type a stored media row lives under (audio is stored as "video"). */
export function getResourceTypeForMedia(media: {
  type?: MediaType | string;
  metadata?: any;
}): string {
  const fromUpload = media.metadata?.resourceType;
  if (fromUpload === 'image' || fromUpload === 'video' || fromUpload === 'raw')
    return fromUpload;
  return getResourceTypeForType(media.type as MediaType);
}

/**
 * Deletes an asset from Cloudinary through the signed Admin upload API. Never throws:
 * failures come back as `{ ok: false, error }` so callers can still finish their own work.
 */
export async function destroyCloudinaryAsset(
  credentials: CloudinaryCredentials,
  publicId: string,
  resourceType: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CloudinaryDestroyResult> {
  const timestamp = Math.floor(Date.now() / 1000);
  const params: Record<string, any> = {
    public_id: publicId,
    timestamp,
    invalidate: true,
  };
  const signature = generateCloudinarySignature(params, credentials.apiSecret);

  const body = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    invalidate: 'true',
    api_key: credentials.apiKey,
    signature,
  });

  try {
    const res = await fetchImpl(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(credentials.cloudName)}/${resourceType}/destroy`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        signal: AbortSignal.timeout(10_000),
      },
    );
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data?.error?.message || `HTTP ${res.status}` };
    }
    // "not found" means the asset is already gone, which is the outcome we wanted
    if (data?.result === 'ok' || data?.result === 'not found') {
      return { ok: true, result: data.result };
    }
    return {
      ok: false,
      result: data?.result,
      error: `Unexpected result: ${data?.result}`,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }
}

/** Only secure URLs served from Cloudinary's delivery host may be registered as media. */
export function isCloudinaryDeliveryUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'res.cloudinary.com';
  } catch {
    return false;
  }
}

export function isHttpsUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}
