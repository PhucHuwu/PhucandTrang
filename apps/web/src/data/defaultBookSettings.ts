import { BookSettings } from '@/types/book';
import { createDefaultBookSettings as createSharedDefaultBookSettings } from '@phucandtrang/shared';

/**
 * Default physical/visual settings for the 3D book.
 * Kept separate from the legacy bookData fallback so the public bundle does not
 * pull in the whole offline book just to read these defaults.
 * Values live in @phucandtrang/shared (bookSettingsDefaults.ts).
 */
export function createDefaultBookSettings(): BookSettings {
  return createSharedDefaultBookSettings();
}

/** Mutable copy (the shared constant is deep-frozen); consumers may hand it out as `book.settings`. */
export const DEFAULT_BOOK_SETTINGS: BookSettings = createDefaultBookSettings();
