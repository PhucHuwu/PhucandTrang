-- AlterTable
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'VIEWER';

-- AlterTable
ALTER TABLE "books" ADD COLUMN "content_revision" INTEGER NOT NULL DEFAULT 1;
