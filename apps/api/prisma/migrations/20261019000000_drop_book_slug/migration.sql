-- The site hosts a single journal, so books are no longer addressed by slug.
DROP INDEX IF EXISTS "books_slug_idx";
DROP INDEX IF EXISTS "books_slug_key";

-- AlterTable
ALTER TABLE "books" DROP COLUMN "slug";
