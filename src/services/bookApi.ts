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
 * Resilience Features:
 * - 3.5s timeout abort controller (avoids freezing UI if local backend is not started).
 * - Graceful fallback to local data (PHUC_AND_TRANG_BOOK) when backend is offline or returns error.
 * - Normalized mapping matching PageTextureGenerator & Flipbook requirements.
 */
export async function fetchPublishedBook(
  slug: string = 'phuc-and-trang'
): Promise<FetchBookResult> {
  const url = `${API_BASE_URL}/public/books/${slug}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      // Map API CompiledBookDocument into Book model
      const book: Book = {
        id: data.id,
        title: data.title,
        slug: data.slug,
        description: data.description,
        version: data.version || '2.0.0',
        couple: data.couple,
        cover: data.cover,
        backgroundMusicId: data.audio?.id || data.backgroundMusicId || PHUC_AND_TRANG_BOOK.backgroundMusicId,
        audio: data.audio || PHUC_AND_TRANG_BOOK.audio,
        settings: data.settings || PHUC_AND_TRANG_BOOK.settings,
        pages: (data.pages || []).map((p: any) => ({
          ...p,
          audioTrackId: p.audio?.id || p.audioTrackId,
          audio: p.audio || null,
        })),
      };

      console.log(`[BookAPI] Successfully loaded book "${slug}" from backend API (${book.pages.length} pages).`);
      return { book, source: 'api' };
    } else {
      console.warn(`[BookAPI] Backend returned status ${response.status} for "${slug}". Falling back to local data.`);
      return {
        book: PHUC_AND_TRANG_BOOK,
        source: 'fallback',
        error: `HTTP ${response.status}`,
      };
    }
  } catch (error: any) {
    const message = error.name === 'AbortError' ? 'Connection timed out' : error.message;
    console.info(`[BookAPI] Backend unavailable (${message}). Using local fallback story data.`);
    return {
      book: PHUC_AND_TRANG_BOOK,
      source: 'fallback',
      error: message,
    };
  }
}
