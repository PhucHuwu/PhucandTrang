import { Book } from '@/types/book';
import { DEFAULT_BOOK_SETTINGS } from '@/data/defaultBookSettings';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.origin.includes('localhost')
    ? 'http://localhost:4000/api'
    : '/api');

const REQUEST_TIMEOUT_MS = 4000;

export interface FetchBookResult {
  book: Book;
  source: 'api' | 'fallback';
  error?: string;
}

/**
 * - not-published: the API answered 404, i.e. no journal has been published yet.
 * - timeout / network: the API could not be reached in time.
 * - server: any other non-OK HTTP status.
 * - invalid: the API answered but the payload is not a usable book.
 */
export type BookFetchErrorKind = 'not-published' | 'timeout' | 'network' | 'server' | 'invalid';

export class BookFetchError extends Error {
  constructor(public readonly kind: BookFetchErrorKind, message: string, public readonly status?: number) {
    super(message);
    this.name = 'BookFetchError';
  }
}

export function isBookFetchError(error: unknown): error is BookFetchError {
  return error instanceof BookFetchError;
}

async function loadLocalFallbackBook(): Promise<Book> {
  // Legacy offline book: only downloaded when the fallback is actually needed.
  const { PHUC_AND_TRANG_BOOK } = await import('@/data/bookData');
  return PHUC_AND_TRANG_BOOK;
}

function mapApiBook(data: any): Book {
  if (!data || typeof data !== 'object') {
    throw new BookFetchError('invalid', 'Backend API returned an empty journal payload');
  }
  if (!Array.isArray(data.pages)) {
    throw new BookFetchError('invalid', 'Backend API journal payload has no pages array');
  }
  if (!data.cover || typeof data.cover !== 'object') {
    throw new BookFetchError('invalid', 'Backend API journal payload has no cover object');
  }

  // Audio contract: preserve null if API returned null (do not overwrite with fallback)
  const resolvedAudio = data.audio !== undefined ? data.audio : null;

  const settings =
    data.settings && typeof data.settings === 'object'
      ? {
          ...data.settings,
          dimensions: { ...DEFAULT_BOOK_SETTINGS.dimensions, ...(data.settings.dimensions || {}) },
        }
      : DEFAULT_BOOK_SETTINGS;

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    version: data.version || '2.0.0',
    contentRevision: data.contentRevision || 1,
    couple: data.couple,
    cover: data.cover,
    backgroundMusicId: resolvedAudio?.id || null,
    audio: resolvedAudio,
    playlist: Array.isArray(data.playlist) ? data.playlist : resolvedAudio ? [resolvedAudio] : [],
    settings,
    pages: data.pages.map((p: any) => ({
      ...p,
      elements: Array.isArray(p?.elements) ? p.elements : [],
      audioTrackId: p?.audio?.id || null,
      audio: p?.audio !== undefined ? p.audio : null,
    })),
  };
}

/**
 * Fetches the compiled published book document from the NestJS Backend API.
 * Endpoint: GET /public/journal
 *
 * Rules:
 * - In Development: Fallback to local PHUC_AND_TRANG_BOOK if backend is not started.
 * - In Production: Do NOT silently fallback to hardcoded mock data unless NEXT_PUBLIC_ENABLE_LOCAL_BOOK_FALLBACK=true.
 * - Null audio from API is respected: audio is null, no playback occurs.
 * - Failures throw a BookFetchError whose `kind` tells "not published yet" (404) apart from network problems.
 */
export async function fetchPublishedBook(): Promise<FetchBookResult> {
  const url = `${API_BASE_URL}/public/journal`;
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const allowFallback =
    process.env.NEXT_PUBLIC_ENABLE_LOCAL_BOOK_FALLBACK === 'true' || isDevelopment;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorMsg = `Backend API returned status ${response.status}`;
      throw new BookFetchError(response.status === 404 ? 'not-published' : 'server', errorMsg, response.status);
    }

    // Still covered by the timeout: the abort signal also cancels reading the body.
    let data: unknown;
    try {
      data = await response.json();
    } catch (error: any) {
      if (error?.name === 'AbortError') throw error;
      throw new BookFetchError('invalid', 'Backend API returned malformed JSON');
    }
    const book = mapApiBook(data);

    console.log(
      `[BookAPI] Successfully loaded journal from backend API (revision: ${book.contentRevision}, ${book.pages.length} pages).`
    );
    return { book, source: 'api' };
  } catch (error: any) {
    const failure = isBookFetchError(error)
      ? error
      : error?.name === 'AbortError'
      ? new BookFetchError('timeout', 'Connection to Backend timed out')
      : new BookFetchError('network', error?.message || 'Network error');

    console.warn(`[BookAPI] ${failure.message}`);

    if (allowFallback) {
      console.info(`[BookAPI] Backend unavailable (${failure.message}). Using local fallback story data.`);
      return {
        book: await loadLocalFallbackBook(),
        source: 'fallback',
        error: failure.message,
      };
    }

    throw new BookFetchError(
      failure.kind,
      `Failed to load published book: ${failure.message}`,
      failure.status
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
