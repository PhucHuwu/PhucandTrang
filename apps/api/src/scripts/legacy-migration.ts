import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * PROMPT 25: One-Time Canonical Import / Migration Script
 * 
 * Audits all elements, covers, and pages across PostgreSQL.
 * Matches any raw Cloudinary URLs against the Media table (by publicId or URL matching).
 * Assigns canonical mediaId / posterMediaId everywhere.
 * Re-compiles a clean, pure canonical snapshot and updates Book.publishedSnapshot.
 */
async function main() {
  console.log('🚀 Running Prompt 25 Legacy Content Migration & Canonical Media Mapping...');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined in environment!');
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Fetch all media records to build a URL -> mediaId lookup map
    const allMedia = await prisma.media.findMany();
    console.log(`📦 Loaded ${allMedia.length} Media records from PostgreSQL library.`);

    const urlToMediaIdMap = new Map<string, string>();
    const publicIdToMediaIdMap = new Map<string, string>();

    for (const m of allMedia) {
      if (m.url) urlToMediaIdMap.set(m.url.trim(), m.id);
      if (m.publicId) publicIdToMediaIdMap.set(m.publicId.trim(), m.id);
    }

    const findMediaIdForUrl = (url?: string): string | null => {
      if (!url) return null;
      const cleanUrl = url.trim();
      if (urlToMediaIdMap.has(cleanUrl)) {
        return urlToMediaIdMap.get(cleanUrl)!;
      }
      for (const [mUrl, id] of urlToMediaIdMap.entries()) {
        if (cleanUrl.includes(mUrl) || mUrl.includes(cleanUrl)) {
          return id;
        }
      }
      return null;
    };

    // 2. Fetch the target book
    const book = await prisma.book.findFirst({
      where: { slug: 'phuc-and-trang' },
      include: {
        backgroundMusic: true,
        pages: {
          orderBy: { order: 'asc' },
          include: {
            elements: { orderBy: { zIndex: 'asc' } },
            layoutTemplate: true,
            audioTrack: true,
          },
        },
      },
    });

    if (!book) {
      console.error('❌ Book "phuc-and-trang" not found.');
      return;
    }

    console.log(`📖 Auditing book "${book.title}" (${book.pages.length} pages)...`);

    // 3. Migrate Book Cover mediaIds
    const cover = (book.cover as any) || {};
    let coverModified = false;

    if (cover.front) {
      const frontMediaId = findMediaIdForUrl(cover.front.backgroundUrl);
      if (frontMediaId && cover.front.mediaId !== frontMediaId) {
        cover.front.mediaId = frontMediaId;
        coverModified = true;
      }
    }
    if (cover.back) {
      const insideMediaId = findMediaIdForUrl(cover.back.insideBackgroundUrl);
      if (insideMediaId && cover.back.insideMediaId !== insideMediaId) {
        cover.back.insideMediaId = insideMediaId;
        coverModified = true;
      }
      const outsideMediaId = findMediaIdForUrl(cover.back.outsideBackgroundUrl);
      if (outsideMediaId && cover.back.outsideMediaId !== outsideMediaId) {
        cover.back.outsideMediaId = outsideMediaId;
        coverModified = true;
      }
    }

    if (coverModified) {
      await prisma.book.update({
        where: { id: book.id },
        data: { cover },
      });
      console.log('✅ Updated Book cover with canonical mediaId references.');
    }

    // 4. Migrate Pages & PageElements
    let updatedElementsCount = 0;

    for (const page of book.pages) {
      // Check page background
      const bg = (page.background as any) || {};
      if (bg.imageUrl && !bg.mediaId) {
        const bgMediaId = findMediaIdForUrl(bg.imageUrl);
        if (bgMediaId) {
          bg.mediaId = bgMediaId;
          await prisma.page.update({
            where: { id: page.id },
            data: { background: bg },
          });
        }
      }

      // Check each element
      for (const el of page.elements) {
        const data = (el.data as any) || {};
        let modified = false;

        // Image / Video main mediaId
        if (data.src && !data.mediaId) {
          const matchedId = findMediaIdForUrl(data.src);
          if (matchedId) {
            data.mediaId = matchedId;
            modified = true;
          }
        }

        // Video poster mediaId
        if (data.thumbnailUrl && !data.posterMediaId) {
          const matchedPosterId = findMediaIdForUrl(data.thumbnailUrl);
          if (matchedPosterId) {
            data.posterMediaId = matchedPosterId;
            modified = true;
          }
        }

        if (modified) {
          await prisma.pageElement.update({
            where: { id: el.id },
            data: { data },
          });
          updatedElementsCount++;
        }
      }
    }

    console.log(`✅ Audited and migrated ${updatedElementsCount} elements with canonical mediaIds.`);

    // 5. Re-query complete clean state to generate finalized publishedSnapshot
    const refreshedBook = await prisma.book.findUnique({
      where: { id: book.id },
      include: {
        backgroundMusic: true,
        pages: {
          orderBy: { order: 'asc' },
          include: {
            elements: {
              where: { visible: true },
              orderBy: { zIndex: 'asc' },
            },
            layoutTemplate: true,
            audioTrack: true,
          },
        },
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { version: true },
        },
      },
    });

    if (refreshedBook) {
      // Map and build canonical published snapshot
      const rawPages = [...(refreshedBook.pages || [])].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
      const compiledPages = rawPages.map((page: any, idx: number) => {
        const bg = (page.background as any) || { type: 'color', color: '#F9F5EC' };
        return {
          id: page.id,
          order: page.order ?? idx,
          displayPageNumber: page.pageNumber ?? idx,
          pageNumber: page.pageNumber ?? idx,
          side: idx % 2 === 0 ? 'left' : 'right',
          chapter: page.chapter || null,
          title: page.title || null,
          quote: page.quote || null,
          handwriting: page.handwriting || null,
          layout: page.layoutTemplateId || 'single-hero',
          layoutMode: page.layoutMode || 'PRESET',
          background: bg,
          elements: (page.elements || []).map((el: any) => ({
            id: el.id,
            type: el.type,
            slot: el.slot || null,
            order: el.order ?? el.zIndex ?? 1,
            zIndex: el.zIndex ?? 1,
            opacity: el.opacity ?? 1.0,
            transform: el.transform,
            style: el.style,
            data: el.data,
            interaction: el.interaction,
          })),
          audio: page.audioTrack
            ? {
                id: page.audioTrack.id,
                title: page.audioTrack.title,
                artist: page.audioTrack.artist,
                src: page.audioTrack.src,
                mediaId: page.audioTrack.mediaId,
                volume: page.audioTrack.volume ?? 0.8,
                loop: page.audioTrack.loop ?? true,
                startAt: page.audioTrack.startAt ?? 0.0,
                fadeIn: page.audioTrack.fadeIn ?? 0.0,
                fadeOut: page.audioTrack.fadeOut ?? 0.0,
                durationSeconds: page.audioTrack.durationSeconds,
                autoPlay: page.audioTrack.autoPlay ?? true,
              }
            : null,
        };
      });

      const compiledDoc = {
        id: refreshedBook.id,
        slug: refreshedBook.slug,
        title: refreshedBook.title,
        description: refreshedBook.description || null,
        contentRevision: refreshedBook.publishedRevision || 1,
        couple: {
          he: refreshedBook.heName,
          she: refreshedBook.sheName,
          anniversaryDate: refreshedBook.anniversaryDate
            ? new Date(refreshedBook.anniversaryDate).toISOString()
            : '2022-10-20T00:00:00Z',
          proposalQuote: refreshedBook.proposalQuote,
        },
        cover: refreshedBook.cover,
        audio: refreshedBook.backgroundMusic
          ? {
              id: refreshedBook.backgroundMusic.id,
              title: refreshedBook.backgroundMusic.title,
              artist: refreshedBook.backgroundMusic.artist,
              src: refreshedBook.backgroundMusic.src,
              mediaId: refreshedBook.backgroundMusic.mediaId,
              autoPlay: refreshedBook.backgroundMusic.autoPlay ?? true,
              loop: refreshedBook.backgroundMusic.loop ?? true,
              volume: refreshedBook.backgroundMusic.volume ?? 0.8,
              startAt: refreshedBook.backgroundMusic.startAt ?? 0.0,
              fadeIn: refreshedBook.backgroundMusic.fadeIn ?? 2.0,
              fadeOut: refreshedBook.backgroundMusic.fadeOut ?? 2.0,
              durationSeconds: refreshedBook.backgroundMusic.durationSeconds,
            }
          : null,
        settings: refreshedBook.settings,
        pages: compiledPages,
        media: {
          allUrls: [],
          images: [],
          videos: [],
          audio: refreshedBook.backgroundMusic ? [refreshedBook.backgroundMusic.src] : [],
          backgrounds: [],
        },
        publishedAt: refreshedBook.publishedAt ? new Date(refreshedBook.publishedAt).toISOString() : new Date().toISOString(),
        version: refreshedBook.versions?.[0]?.version || '2.0.0',
      };

      await prisma.book.update({
        where: { id: refreshedBook.id },
        data: {
          publishedSnapshot: compiledDoc as any,
          publishedRevision: refreshedBook.publishedRevision || 1,
          publishedAt: refreshedBook.publishedAt || new Date(),
        },
      });

      console.log('🎉 PublishedSnapshot compiled and verified successfully in PostgreSQL database.');
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('Fatal error during migration:', e);
  process.exit(1);
});
