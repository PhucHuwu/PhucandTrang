-- Indexes for foreign keys used in lookups and ON DELETE SET NULL / CASCADE,
-- plus version history ordering. Additive only; no data changes.

-- CreateIndex
CREATE INDEX IF NOT EXISTS "books_background_music_id_idx" ON "books"("background_music_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pages_layoutTemplateId_idx" ON "pages"("layoutTemplateId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pages_audio_track_id_idx" ON "pages"("audio_track_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audio_tracks_media_id_idx" ON "audio_tracks"("media_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "book_versions_bookId_createdAt_idx" ON "book_versions"("bookId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "book_versions_createdById_idx" ON "book_versions"("createdById");
