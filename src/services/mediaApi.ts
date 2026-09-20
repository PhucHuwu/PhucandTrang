import { Media, MediaType } from '@/types/book';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.origin.includes('localhost')
    ? 'http://localhost:4000/api'
    : '/api');

export interface SignedUploadConfig {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  resourceType: string;
  uploadUrl: string;
  params: Record<string, any>;
}

export interface MediaReferenceItem {
  targetType: 'BOOK_COVER' | 'PAGE_BACKGROUND' | 'PAGE_ELEMENT' | 'AUDIO_TRACK';
  bookId?: string;
  bookTitle?: string;
  bookSlug?: string;
  pageId?: string;
  pageNumber?: number;
  chapter?: string;
  elementId?: string;
  elementType?: string;
  slot?: string;
  field: string;
  description: string;
}

export interface CheckReferencesResult {
  media: Media;
  references: MediaReferenceItem[];
  isInUse: boolean;
}

export interface DeleteMediaResult {
  success: boolean;
  message: string;
  deletedId?: string;
  forceDeleted?: boolean;
  inUse?: boolean;
  referencesCount?: number;
  references?: MediaReferenceItem[];
}

export interface QueryMediaParams {
  type?: MediaType;
  search?: string;
  provider?: string;
  page?: number;
  limit?: number;
}

export interface QueryMediaResult {
  items: Media[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Request signed upload configuration from NestJS backend.
 * No file bytes are sent to the server.
 */
export async function requestSignedUploadConfig(params: {
  type?: MediaType;
  folder?: string;
  publicId?: string;
  tags?: string[];
}): Promise<SignedUploadConfig> {
  const res = await fetch(`${API_BASE_URL}/media/signature`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    throw new Error(`Failed to obtain signed upload config: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Upload file directly to Cloudinary CDN from client browser.
 * NestJS backend is completely bypassed during heavy file transfer.
 */
export async function uploadDirectToCloudinary(
  file: File | Blob,
  config: SignedUploadConfig,
  onProgress?: (percent: number) => void,
): Promise<{
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
  resourceType?: string;
  rawResponse: Record<string, any>;
}> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', config.apiKey);
    formData.append('timestamp', config.timestamp.toString());
    formData.append('signature', config.signature);

    if (config.params) {
      for (const [key, value] of Object.entries(config.params)) {
        if (key !== 'timestamp' && value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      }
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', config.uploadUrl);

    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          resolve({
            url: res.secure_url || res.url,
            publicId: res.public_id,
            width: res.width,
            height: res.height,
            bytes: res.bytes,
            format: res.format,
            resourceType: res.resource_type,
            rawResponse: res,
          });
        } catch (e) {
          reject(new Error('Invalid JSON response from Cloudinary'));
        }
      } else {
        reject(
          new Error(
            `Cloudinary upload error (${xhr.status}): ${xhr.responseText}`,
          ),
        );
      }
    };

    xhr.onerror = () => reject(new Error('Network error during Cloudinary upload'));
    xhr.send(formData);
  });
}

/**
 * Store uploaded media metadata into PostgreSQL via NestJS backend.
 */
export async function saveMediaMetadata(data: {
  type: MediaType;
  provider?: string;
  url: string;
  publicId?: string;
  width?: number;
  height?: number;
  mimeType?: string;
  size?: number;
  alt?: string;
  metadata?: Record<string, any>;
}): Promise<Media> {
  const res = await fetch(`${API_BASE_URL}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error(`Failed to save media metadata: ${res.statusText}`);
  }

  return res.json();
}

/**
 * End-to-end Direct Upload Flow:
 * 1. Request signature from Backend
 * 2. Upload file directly to Cloudinary
 * 3. Save metadata to Backend
 */
export async function performDirectUpload(
  file: File,
  type: MediaType,
  alt?: string,
  onProgress?: (percent: number) => void,
): Promise<Media> {
  // Step 1: Request signature
  const config = await requestSignedUploadConfig({ type });

  // Step 2: Direct upload to Cloudinary
  const result = await uploadDirectToCloudinary(file, config, onProgress);

  // Step 3: Save metadata in database
  return saveMediaMetadata({
    type,
    provider: 'CLOUDINARY',
    url: result.url,
    publicId: result.publicId,
    width: result.width,
    height: result.height,
    mimeType: file.type || `image/${result.format}`,
    size: result.bytes || file.size,
    alt: alt || file.name,
    metadata: {
      format: result.format,
      resourceType: result.resourceType,
      originalFilename: file.name,
    },
  });
}

/**
 * Queries media items with search and filters.
 */
export async function queryMedia(
  params: QueryMediaParams = {},
): Promise<QueryMediaResult> {
  const searchParams = new URLSearchParams();
  if (params.type) searchParams.set('type', params.type);
  if (params.search) searchParams.set('search', params.search);
  if (params.provider) searchParams.set('provider', params.provider);
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());

  const res = await fetch(`${API_BASE_URL}/media?${searchParams.toString()}`);
  if (!res.ok) throw new Error('Failed to query media');
  return res.json();
}

/**
 * Inspects all pages, elements, covers, and audio tracks where this media is being used.
 */
export async function checkMediaReferences(
  mediaId: string,
): Promise<CheckReferencesResult> {
  const res = await fetch(`${API_BASE_URL}/media/${mediaId}/references`);
  if (!res.ok) throw new Error('Failed to check media references');
  return res.json();
}

/**
 * Safely deletes a media item.
 * If media is currently in use, the backend rejects deletion unless force is true.
 */
export async function deleteMedia(
  mediaId: string,
  force: boolean = false,
): Promise<DeleteMediaResult> {
  const res = await fetch(
    `${API_BASE_URL}/media/${mediaId}${force ? '?force=true' : ''}`,
    {
      method: 'DELETE',
    },
  );

  const data = await res.json();

  if (res.status === 409) {
    return {
      success: false,
      message: data.message,
      inUse: true,
      referencesCount: data.referencesCount,
      references: data.references,
    };
  }

  if (!res.ok) {
    throw new Error(data.message || 'Failed to delete media');
  }

  return data;
}

/**
 * Look up media by legacy filename or URL.
 */
export async function lookupMedia(filenameOrUrl: string): Promise<Media | null> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/media/lookup?q=${encodeURIComponent(filenameOrUrl)}`,
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
