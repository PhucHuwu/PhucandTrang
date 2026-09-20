import { Media, MediaType } from '@/types/book';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.origin.includes('localhost')
    ? 'http://localhost:4000/api'
    : '/api');

const TOKEN_STORAGE_KEY = 'phuc_trang_admin_token';
const USER_STORAGE_KEY = 'phuc_trang_admin_user';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
}

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setAdminToken(token: string, user?: AdminUser): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }
}

export function clearAdminToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

export function getAdminUser(): AdminUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Universal authenticated fetch helper for Admin API requests.
 */
export async function adminFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAdminToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearAdminToken();
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/admin/login')) {
      window.location.href = '/admin/login';
    }
    throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  }

  let data: any = null;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const errorMsg =
      (typeof data === 'object' && data?.message) ||
      res.statusText ||
      `Lỗi kết nối máy chủ (${res.status})`;
    throw new Error(Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg);
  }

  return data as T;
}

// ==========================================
// 1. AUTH API
// ==========================================

export async function loginAdmin(email: string, pass: string): Promise<{ accessToken: string; user: AdminUser }> {
  const res = await adminFetch<{ accessToken: string; user: AdminUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, pass }),
  });
  setAdminToken(res.accessToken, res.user);
  return res;
}

// ==========================================
// 2. BOOKS API
// ==========================================

export async function getAdminBooks(): Promise<any[]> {
  return adminFetch<any[]>('/books');
}

export async function getAdminBook(id: string): Promise<any> {
  return adminFetch<any>(`/books/${id}`);
}

export async function createAdminBook(data: any): Promise<any> {
  return adminFetch<any>('/books', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAdminBook(id: string, data: any, isPatch = true): Promise<any> {
  return adminFetch<any>(`/books/${id}`, {
    method: isPatch ? 'PATCH' : 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteAdminBook(id: string): Promise<any> {
  return adminFetch<any>(`/books/${id}`, {
    method: 'DELETE',
  });
}

// ==========================================
// 3. PAGES API
// ==========================================

export async function getAdminPages(bookId: string): Promise<any[]> {
  return adminFetch<any[]>(`/pages/book/${bookId}`);
}

export async function getAdminPage(pageId: string): Promise<any> {
  return adminFetch<any>(`/pages/${pageId}`);
}

export async function createAdminPage(data: any): Promise<any> {
  return adminFetch<any>('/pages', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAdminPage(pageId: string, data: any, isPatch = true): Promise<any> {
  return adminFetch<any>(`/pages/${pageId}`, {
    method: isPatch ? 'PATCH' : 'PUT',
    body: JSON.stringify(data),
  });
}

export async function duplicateAdminPage(pageId: string, insertAfter = false, targetPageNumber?: number): Promise<any> {
  return adminFetch<any>(`/pages/${pageId}/duplicate`, {
    method: 'POST',
    body: JSON.stringify({ insertAfter, targetPageNumber }),
  });
}

export async function reorderAdminPages(bookId: string, items: Array<{ id: string }>): Promise<any> {
  return adminFetch<any>(`/pages/book/${bookId}/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ items }),
  });
}

export async function deleteAdminPage(pageId: string): Promise<any> {
  return adminFetch<any>(`/pages/${pageId}`, {
    method: 'DELETE',
  });
}

// ==========================================
// 4. PAGE ELEMENTS API
// ==========================================

export async function getAdminPageElements(pageId: string): Promise<any[]> {
  return adminFetch<any[]>(`/pages/${pageId}/elements`);
}

export async function getAdminElement(id: string): Promise<any> {
  return adminFetch<any>(`/page-elements/${id}`);
}

export async function createAdminElement(data: any): Promise<any> {
  return adminFetch<any>('/page-elements', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAdminElement(id: string, data: any, isPatch = true): Promise<any> {
  return adminFetch<any>(`/page-elements/${id}`, {
    method: isPatch ? 'PATCH' : 'PUT',
    body: JSON.stringify(data),
  });
}

export async function duplicateAdminElement(id: string, offsetX = 0.02, offsetY = 0.02): Promise<any> {
  return adminFetch<any>(`/page-elements/${id}/duplicate`, {
    method: 'POST',
    body: JSON.stringify({ offsetX, offsetY }),
  });
}

export async function deleteAdminElement(id: string): Promise<any> {
  return adminFetch<any>(`/page-elements/${id}`, {
    method: 'DELETE',
  });
}

export async function batchUpdateElements(pageId: string, elements: any[]): Promise<any> {
  return adminFetch<any>(`/pages/${pageId}/elements/batch`, {
    method: 'PATCH',
    body: JSON.stringify({ elements }),
  });
}

// ==========================================
// 5. LAYOUT TEMPLATES API
// ==========================================

export async function getAdminLayoutTemplates(): Promise<any[]> {
  return adminFetch<any[]>('/layout-templates');
}

export async function getAdminLayoutTemplate(id: string): Promise<any> {
  return adminFetch<any>(`/layout-templates/${id}`);
}

export async function createAdminLayoutTemplate(data: any): Promise<any> {
  return adminFetch<any>('/layout-templates', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAdminLayoutTemplate(id: string, data: any): Promise<any> {
  return adminFetch<any>(`/layout-templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteAdminLayoutTemplate(id: string): Promise<any> {
  return adminFetch<any>(`/layout-templates/${id}`, {
    method: 'DELETE',
  });
}

// ==========================================
// 6. MEDIA LIBRARY API
// ==========================================

export async function getAdminMedia(params: {
  type?: MediaType;
  search?: string;
  provider?: string;
  page?: number;
  limit?: number;
} = {}): Promise<{ items: Media[]; total: number; page: number; totalPages: number }> {
  const query = new URLSearchParams();
  if (params.type) query.set('type', params.type);
  if (params.search) query.set('search', params.search);
  if (params.provider) query.set('provider', params.provider);
  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());

  return adminFetch(`/media?${query.toString()}`);
}

export async function getAdminMediaOne(id: string): Promise<Media> {
  return adminFetch<Media>(`/media/${id}`);
}

export async function getAdminMediaReferences(id: string): Promise<{
  media: Media;
  references: any[];
  isInUse: boolean;
}> {
  return adminFetch(`/media/${id}/references`);
}

export async function deleteAdminMedia(id: string, force = false): Promise<any> {
  return adminFetch(`/media/${id}${force ? '?force=true' : ''}`, {
    method: 'DELETE',
  });
}

export async function requestSignedUpload(type?: MediaType, folder?: string): Promise<any> {
  return adminFetch('/media/signature', {
    method: 'POST',
    body: JSON.stringify({ type, folder }),
  });
}

export async function saveUploadedMediaMetadata(data: {
  type: MediaType;
  url: string;
  publicId?: string;
  width?: number;
  height?: number;
  mimeType?: string;
  size?: number;
  alt?: string;
  metadata?: Record<string, any>;
}): Promise<Media> {
  return adminFetch<Media>('/media', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ==========================================
// 7. AUDIO LIBRARY API
// ==========================================

export async function getAdminAudioTracks(): Promise<any[]> {
  return adminFetch<any[]>('/audio');
}

export async function getAdminAudioTrack(id: string): Promise<any> {
  return adminFetch<any>(`/audio/${id}`);
}

export async function createAdminAudioTrack(data: any): Promise<any> {
  return adminFetch<any>('/audio', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAdminAudioTrack(id: string, data: any): Promise<any> {
  return adminFetch<any>(`/audio/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteAdminAudioTrack(id: string): Promise<any> {
  return adminFetch<any>(`/audio/${id}`, {
    method: 'DELETE',
  });
}

// ==========================================
// 8. VERSIONS API
// ==========================================

export async function getAdminVersions(bookId: string): Promise<any[]> {
  return adminFetch<any[]>(`/versions/book/${bookId}`);
}

export async function createAdminSnapshot(bookId: string, version: string, changelog?: string): Promise<any> {
  return adminFetch<any>(`/versions/book/${bookId}/snapshot`, {
    method: 'POST',
    body: JSON.stringify({ version, changelog }),
  });
}

export async function rollbackAdminSnapshot(bookId: string, versionId: string): Promise<any> {
  return adminFetch<any>(`/versions/book/${bookId}/rollback/${versionId}`, {
    method: 'POST',
  });
}
