-- AlterTable
ALTER TABLE "books" ADD COLUMN "published_revision" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "published_snapshot" JSONB,
ADD COLUMN "published_at" TIMESTAMP(3);
