import { CANONICAL_JOURNAL_SLUG, LEGACY_JOURNAL_SLUG } from '../../shared/journalConfig';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

let cachedUser: AdminUser | null = null;

export function getCachedAdminUser(): AdminUser | null {
  if (cachedUser) return cachedUser;
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('pt_admin_user');
    if (stored) {
      try {
        cachedUser = JSON.parse(stored);
      } catch {
        // Fallback
      }
    }
  }
  return cachedUser;
}

export function setCachedAdminUser(user: AdminUser | null) {
  cachedUser = user;
  if (typeof window !== 'undefined') {
    if (user) {
      localStorage.setItem('pt_admin_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('pt_admin_user');
    }
  }
}

/**
 * Universal fetcher for Admin APIs through Next.js BFF proxy.
 */
async function adminFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const proxyUrl = `/api/admin/proxy/${cleanEndpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(proxyUrl, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    setCachedAdminUser(null);
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/admin/login')) {
      window.location.href = '/admin/login?error=unauthorized';
    }
    throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  }

  if (res.status === 403) {
    throw new Error('Bạn không có quyền thực hiện thao tác này.');
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
// 1. AUTH API (BFF HttpOnly Cookie Flow)
// ==========================================

export async function loginAdmin(
  email: string,
  pass: string
): Promise<{ user: AdminUser }> {
  const res = await fetch('/api/admin/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, pass }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Đăng nhập không thành công');
  }

  setCachedAdminUser(data.user);
  return data;
}

export async function logoutAdmin(): Promise<void> {
  try {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
  } finally {
    setCachedAdminUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/admin/login';
    }
  }
}

export async function checkAdminAuth(): Promise<{ authenticated: boolean; user: AdminUser }> {
  const res = await fetch('/api/admin/auth/me');
  if (!res.ok) {
    setCachedAdminUser(null);
    throw new Error('Chưa đăng nhập');
  }
  const data = await res.json();
  setCachedAdminUser(data.user);
  return data;
}

// ==========================================
// 2. SINGLE JOURNAL CMS API
// ==========================================

export interface ValidationIssue {
  id: string;
  severity: 'ERROR' | 'WARNING';
  code: string;
  message: string;
  location: {
    type: 'BOOK' | 'COVER' | 'PAGE' | 'ELEMENT' | 'AUDIO';
    pageId?: string;
    pageNumber?: number;
    pageOrder?: number;
    elementId?: string;
    elementType?: string;
    mediaId?: string;
  };
  fixLink?: string;
}

export interface ValidationReport {
  isValid: boolean;
  errorCount: number;
  warningCount: number;
  issues: ValidationIssue[];
}

export async function getJournal(): Promise<any> {
  return adminFetch<any>('journal');
}

export async function updateJournal(data: any): Promise<any> {
  return adminFetch<any>('journal', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function previewJournalDraft(): Promise<{
  isDraftPreview: boolean;
  document: any;
}> {
  return adminFetch<{
    isDraftPreview: boolean;
    document: any;
  }>('journal/preview');
}

export async function validateJournalForPublish(): Promise<ValidationReport> {
  return adminFetch<ValidationReport>('journal/validate-publish');
}

export async function publishJournal(changelog?: string): Promise<{
  success: boolean;
  message: string;
  publishedRevision: number;
  publishedAt: string;
  validationReport?: ValidationReport;
  book: any;
}> {
  return adminFetch<{
    success: boolean;
    message: string;
    publishedRevision: number;
    publishedAt: string;
    validationReport?: ValidationReport;
    book: any;
  }>('journal/publish', {
    method: 'POST',
    body: JSON.stringify({ changelog }),
  });
}

// Backward compatibility alias methods
export const getAdminBook = getJournal;
export const updateAdminBook = (_id: string, data: any, _isPatch = true) => updateJournal(data);
export const previewAdminBookDraft = (_id?: string) => previewJournalDraft();
export const validateAdminBookForPublish = (_id?: string) => validateJournalForPublish();
export const publishAdminBook = (_id?: string, changelog?: string) => publishJournal(changelog);

// ==========================================
// 3. PAGES API
// ==========================================

export async function getAdminPages(bookId?: string): Promise<any[]> {
  if (bookId) {
    return adminFetch<any[]>(`pages/book/${bookId}`);
  }
  const journal = await getJournal();
  return adminFetch<any[]>(`pages/book/${journal.id}`);
}

export async function getAdminPage(pageId: string): Promise<any> {
  return adminFetch<any>(`pages/${pageId}`);
}

export async function createAdminPage(data: any): Promise<any> {
  return adminFetch<any>('pages', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAdminPage(pageId: string, data: any, isPatch = true): Promise<any> {
  return adminFetch<any>(`pages/${pageId}`, {
    method: isPatch ? 'PATCH' : 'PUT',
    body: JSON.stringify(data),
  });
}

export async function duplicateAdminPage(pageId: string, insertAfter = false, targetPageNumber?: number): Promise<any> {
  return adminFetch<any>(`pages/${pageId}/duplicate`, {
    method: 'POST',
    body: JSON.stringify({ insertAfter, targetPageNumber }),
  });
}

export async function deleteAdminPage(pageId: string): Promise<any> {
  return adminFetch<any>(`pages/${pageId}`, {
    method: 'DELETE',
  });
}

export async function reorderAdminPages(bookId: string, items: Array<{ id: string; targetOrder?: number }>): Promise<any> {
  return adminFetch<any>(`pages/book/${bookId}/reorder`, {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

// ==========================================
// 4. PAGE ELEMENTS API
// ==========================================

export async function createAdminElement(data: any): Promise<any> {
  return adminFetch<any>('page-elements', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAdminElement(elementId: string, data: any, isPatch = true): Promise<any> {
  return adminFetch<any>(`page-elements/${elementId}`, {
    method: isPatch ? 'PATCH' : 'PUT',
    body: JSON.stringify(data),
  });
}

export async function batchUpdateElements(pageId: string, elements: any[]): Promise<any> {
  return adminFetch<any>(`page-elements/page/${pageId}/batch`, {
    method: 'POST',
    body: JSON.stringify({ elements }),
  });
}

export async function duplicateAdminElement(elementId: string, offsetX = 0.02, offsetY = 0.02): Promise<any> {
  return adminFetch<any>(`page-elements/${elementId}/duplicate`, {
    method: 'POST',
    body: JSON.stringify({ offsetX, offsetY }),
  });
}

export async function deleteAdminElement(elementId: string): Promise<any> {
  return adminFetch<any>(`page-elements/${elementId}`, {
    method: 'DELETE',
  });
}

// ==========================================
// 5. MEDIA LIBRARY & SIGNED UPLOAD API
// ==========================================

export async function getSignedUploadConfig(paramsOrType: any): Promise<{
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  resourceType: string;
  uploadUrl: string;
  params: Record<string, any>;
}> {
  const body = typeof paramsOrType === 'string' ? { type: paramsOrType.toUpperCase() } : paramsOrType;
  return adminFetch<any>('media/signature', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export const requestSignedUpload = getSignedUploadConfig;

export async function getAdminMedia(params?: {
  page?: number;
  limit?: number;
  type?: string;
  search?: string;
}): Promise<{
  items: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.type) query.set('type', params.type);
  if (params?.search) query.set('search', params.search);

  const endpoint = `media${query.toString() ? `?${query.toString()}` : ''}`;
  return adminFetch<any>(endpoint);
}

export async function createAdminMedia(data: any): Promise<any> {
  return adminFetch<any>('media', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export const saveUploadedMediaMetadata = createAdminMedia;

export async function deleteAdminMedia(id: string, force = false): Promise<any> {
  return adminFetch<any>(`media/${id}${force ? '?force=true' : ''}`, {
    method: 'DELETE',
  });
}

export async function checkMediaReferences(id: string): Promise<{
  media: any;
  references: Array<{
    targetType: string;
    field: string;
    description: string;
    pageId?: string;
    elementId?: string;
  }>;
  isInUse: boolean;
}> {
  return adminFetch<any>(`media/${id}/references`);
}

export const getAdminMediaReferences = checkMediaReferences;

// ==========================================
// 6. LAYOUT TEMPLATES API
// ==========================================

export async function getAdminLayoutTemplates(): Promise<any[]> {
  return adminFetch<any[]>('layout-templates');
}

export async function createAdminLayoutTemplate(data: any): Promise<any> {
  return adminFetch<any>('layout-templates', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAdminLayoutTemplate(id: string, data: any): Promise<any> {
  return adminFetch<any>(`layout-templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteAdminLayoutTemplate(id: string): Promise<any> {
  return adminFetch<any>(`layout-templates/${id}`, {
    method: 'DELETE',
  });
}

export async function duplicateAdminLayoutTemplate(id: string, nameOrId?: string, name?: string): Promise<any> {
  const finalName = name || nameOrId;
  return adminFetch<any>(`layout-templates/${id}/duplicate`, {
    method: 'POST',
    body: JSON.stringify({ name: finalName }),
  });
}

// ==========================================
// 7. AUDIO LIBRARY API
// ==========================================

export async function getAdminAudioTracks(): Promise<any[]> {
  return adminFetch<any[]>('audio');
}

export async function getAdminAudioTrack(id: string): Promise<any> {
  return adminFetch<any>(`audio/${id}`);
}

export async function createAdminAudioTrack(data: any): Promise<any> {
  return adminFetch<any>('audio', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAdminAudioTrack(id: string, data: any): Promise<any> {
  return adminFetch<any>(`audio/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteAdminAudioTrack(id: string): Promise<any> {
  return adminFetch<any>(`audio/${id}`, {
    method: 'DELETE',
  });
}

// ==========================================
// 8. VERSIONS API
// ==========================================

export interface BookVersionItem {
  id: string;
  bookId: string;
  version: string;
  changelog?: string;
  createdById?: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  createdAt: string;
  snapshot?: any;
}

export async function getAdminVersions(bookId?: string): Promise<BookVersionItem[]> {
  if (bookId) {
    return adminFetch<BookVersionItem[]>(`versions/book/${bookId}`);
  }
  const journal = await getJournal();
  return adminFetch<BookVersionItem[]>(`versions/book/${journal.id}`);
}

export async function getAdminVersion(id: string): Promise<BookVersionItem> {
  return adminFetch<BookVersionItem>(`versions/${id}`);
}

export async function createAdminSnapshot(bookId: string, version: string, changelog?: string): Promise<any> {
  return adminFetch<any>(`versions/book/${bookId}/snapshot`, {
    method: 'POST',
    body: JSON.stringify({ version, changelog }),
  });
}

export async function rollbackAdminSnapshot(bookId: string, versionId: string): Promise<{
  success: boolean;
  message: string;
  version: string;
}> {
  return adminFetch<{
    success: boolean;
    message: string;
    version: string;
  }>(`versions/book/${bookId}/rollback/${versionId}`, {
    method: 'POST',
  });
}

export const rollbackAdminBookSnapshot = rollbackAdminSnapshot;
