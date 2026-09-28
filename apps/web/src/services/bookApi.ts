import { Book } from '@/types/book';
import { PHUC_AND_TRANG_BOOK } from '@/data/bookData';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.origin.includes('localhost')
    ? 'http://localhost:4000/api'
    : '/api');

export interface FetchBookResult {
  book: Book;
  source: 'api' | 'fallback';
  error?: string;
}

/**
 * Fetches the compiled published book document from the NestJS Backend API.
 * Endpoint: GET /public/books/:slug
 * 
 * Rules:
 * - In Development: Fallback to local PHUC_AND_TRANG_BOOK if backend is not started.
 * - In Production: Do NOT silently fallback to hardcoded mock data unless NEXT_PUBLIC_ENABLE_LOCAL_BOOK_FALLBACK=true.
 * - Null audio from API is respected: audio is null, no playback occurs.
 */
export async function fetchPublishedBook(
  slug: string = 'phuc-and-trang'
): Promise<FetchBookResult> {
  const url = `${API_BASE_URL}/public/books/${slug}`;
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const allowFallback =
    process.env.NEXT_PUBLIC_ENABLE_LOCAL_BOOK_FALLBACK === 'true' || isDevelopment;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();

      // Audio contract: preserve null if API returned null (do not overwrite with fallback)
      const resolvedAudio = data.audio !== undefined ? data.audio : null;

      // Map API CompiledBookDocument into Book model
      const book: Book = {
        id: data.id,
        title: data.title,
        slug: data.slug,
        description: data.description,
        version: data.version || '2.0.0',
        contentRevision: data.contentRevision || 1,
        couple: data.couple,
        cover: data.cover,
        backgroundMusicId: resolvedAudio?.id || null,
        audio: resolvedAudio,
        settings: data.settings || PHUC_AND_TRANG_BOOK.settings,
        pages: (data.pages || []).map((p: any) => ({
          ...p,
          audioTrackId: p.audio?.id || null,
          audio: p.audio !== undefined ? p.audio : null,
        })),
      };

      console.log(
        `[BookAPI] Successfully loaded book "${slug}" from backend API (revision: ${book.contentRevision}, ${book.pages.length} pages).`
      );
      return { book, source: 'api' };
    } else {
      const errorMsg = `Backend API returned status ${response.status}`;
      console.warn(`[BookAPI] ${errorMsg}`);

      if (allowFallback) {
        console.info('[BookAPI] Using local fallback story data for development.');
        return {
          book: PHUC_AND_TRANG_BOOK,
          source: 'fallback',
          error: errorMsg,
        };
      }

      throw new Error(errorMsg);
    }
  } catch (error: any) {
    const message =
      error.name === 'AbortError' ? 'Connection to Backend timed out' : error.message;

    if (allowFallback) {
      console.info(`[BookAPI] Backend unavailable (${message}). Using local fallback story data.`);
      return {
        book: PHUC_AND_TRANG_BOOK,
        source: 'fallback',
        error: message,
      };
    }

    throw new Error(`Failed to load published book: ${message}`);
  }
}
