import { PrismaClient, Role, BookStatus, LayoutMode } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { cloudinaryUrls } from '@phucandtrang/shared';
import 'dotenv/config';
import { REAL_LAYOUT_PRESETS } from '../src/templates/layout-presets.data';
import { derivePageSideEnum } from '../src/utils/page-utils';
import {
  CANONICAL_AUDIO_TRACK_CREATE,
  CANONICAL_AUDIO_TRACK_ID,
  CANONICAL_AUDIO_TRACK_UPDATE,
} from './seed/audio-track';
import {
  CANONICAL_SETTINGS,
  FIRST_COVER_URL,
  LAST_COVER_URL,
  buildCanonicalCover,
} from './seed/canonical-cover';
import { CANONICAL_PAGES } from './seed/canonical-pages';
import { classifyLegacyMedia } from './seed/media-catalog';
import { buildPageBackground, buildPageElements } from './seed/page-builder';
import { compilePublishedSnapshot } from './seed/published-snapshot';

const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && !process.env.DATABASE_URL) {
  throw new Error(
    'FATAL: DATABASE_URL environment variable is required for production database seeding!',
  );
}

const connectionString =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/phuc_and_trang_db?schema=public';
const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('sslmode=')
    ? { rejectUnauthorized: false }
    : undefined,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log(
    '🌱 Starting comprehensive database seed for Phúc & Trang Love Journey...',
  );

  const forceCanonicalReset = process.env.SEED_FORCE_CANONICAL_BOOK === 'true';

  // Force mode deletes every page of the live journal; never allow it by accident in production.
  if (
    forceCanonicalReset &&
    isProduction &&
    process.env.SEED_CONFIRM_DESTRUCTIVE !== 'yes-wipe-pages'
  ) {
    throw new Error(
      'FATAL: SEED_FORCE_CANONICAL_BOOK=true wipes all CMS pages. In production you must also set ' +
        'SEED_CONFIRM_DESTRUCTIVE=yes-wipe-pages to confirm.',
    );
  }

  // Canonical content (layout templates, pages, version, publishedSnapshot) is only written when the
  // journal does not exist yet or force mode is on; otherwise CMS edits are preserved.
  const journalAlreadyExists = Boolean(
    await prisma.book.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    }),
  );
  const writeCanonicalContent = !journalAlreadyExists || forceCanonicalReset;

  // 1. Seed Admin User
  const enableDevSeed = process.env.ENABLE_DEV_SEED === 'true' || !isProduction;
  const adminEmail =
    process.env.SEED_ADMIN_EMAIL ||
    (enableDevSeed ? 'admin@phucandtrang.love' : undefined);
  const adminPassword =
    process.env.SEED_ADMIN_PASSWORD || process.env.DEV_ADMIN_PASSWORD;

  let admin: any = null;

  // Login is password-only and falls back to any ADMIN, so an existing admin under a different
  // email must be reused rather than shadowed by a second seeded account.
  const existingAdmin =
    (adminEmail
      ? await prisma.user.findUnique({ where: { email: adminEmail } })
      : null) ||
    (await prisma.user.findFirst({
      where: { role: Role.ADMIN },
      orderBy: { createdAt: 'desc' },
    }));

  if (existingAdmin) {
    // Never rotate credentials from the seed; use `npm run admin:set-password` instead
    admin = existingAdmin;
    console.log(
      `ℹ️ Admin user ${admin.email} already exists. Password left unchanged.`,
    );
  } else if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: 'Phúc & Trang Admin',
        role: Role.ADMIN,
      },
    });
    console.log(`✅ Admin user seeded: ${admin.email}`);
  } else {
    throw new Error(
      'FATAL: SEED_ADMIN_PASSWORD or DEV_ADMIN_PASSWORD environment variable is required for seeding!',
    );
  }

  // 2. Seed Legacy Cloudinary Media Catalog
  const mediaUrlToIdMap = new Map<string, string>();
  {
    for (const [key, url] of Object.entries(cloudinaryUrls)) {
      if (typeof url !== 'string') continue;

      const { type, publicId } = classifyLegacyMedia(key, url);

      if (!forceCanonicalReset) {
        // Non-destructive: if media with this URL already exists, preserve its current CMS metadata
        const existingMedia = await prisma.media.findUnique({ where: { url } });
        if (existingMedia) {
          mediaUrlToIdMap.set(url, existingMedia.id);
          mediaUrlToIdMap.set(key, existingMedia.id);
          continue;
        }
      }

      const mediaRecord = await prisma.media.upsert({
        where: { url },
        update: {
          type,
          publicId,
          alt: key,
        },
        create: {
          type,
          provider: 'CLOUDINARY',
          url,
          publicId,
          alt: key,
          metadata: {
            originalKey: key,
            seeded: true,
          },
        },
      });

      mediaUrlToIdMap.set(url, mediaRecord.id);
      mediaUrlToIdMap.set(key, mediaRecord.id);
    }
    console.log(`✅ Seeded ${mediaUrlToIdMap.size} media catalog references.`);
  }

  // Helper to look up mediaId by filename or URL
  const getMediaId = (keyOrUrl: string): string | undefined => {
    return mediaUrlToIdMap.get(keyOrUrl);
  };

  // 3. Seed Main Audio Track (Non-destructive unless forceCanonicalReset)
  let audioTrack: any;
  if (!forceCanonicalReset) {
    const existingTrack = await prisma.audioTrack.findUnique({
      where: { id: CANONICAL_AUDIO_TRACK_ID },
    });
    if (existingTrack) {
      console.log(
        `ℹ️ Preserving existing CMS audio track: "${existingTrack.title}"`,
      );
      audioTrack = existingTrack;
    }
  }

  if (!audioTrack) {
    audioTrack = await prisma.audioTrack.upsert({
      where: { id: CANONICAL_AUDIO_TRACK_ID },
      update: CANONICAL_AUDIO_TRACK_UPDATE,
      create: CANONICAL_AUDIO_TRACK_CREATE,
    });
    console.log(`✅ Audio track seeded: ${audioTrack.title}`);
  }

  // 4. Seed Real Layout Templates (Full slots and element prototypes)
  if (!writeCanonicalContent) {
    console.log(
      'ℹ️ Journal already exists: layout templates left untouched (missing presets are created by the API on boot).',
    );
  } else {
    for (const t of Object.values(REAL_LAYOUT_PRESETS)) {
      await prisma.layoutTemplate.upsert({
        where: { id: t.id },
        update: {
          name: t.name,
          description: t.description,
          slots: t.slots as any,
          prototypes: (t.elementPrototypes || (t as any).prototypes) as any,
        },
        create: {
          id: t.id,
          name: t.name,
          description: t.description,
          slots: t.slots as any,
          prototypes: (t.elementPrototypes || (t as any).prototypes) as any,
          isSystem: true,
        },
      });
    }
    console.log(`✅ Seeded all 9 layout templates with complete prototypes.`);
  }

  // 5. Seed Master Book: "Chúng Mình"
  const firstCoverUrl = FIRST_COVER_URL;
  const lastCoverUrl = LAST_COVER_URL;

  const canonicalCover = buildCanonicalCover(getMediaId);

  const canonicalSettings = CANONICAL_SETTINGS;

  const existingBook = await prisma.book.findFirst({
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { pages: true } } },
  });

  let book: any;
  let shouldSeedPages = false;

  if (existingBook && !forceCanonicalReset) {
    console.log(
      `ℹ️ Master book "${existingBook.title}" already exists with ${existingBook._count.pages} pages.`,
    );
    console.log(
      `ℹ️ Non-destructive mode: Existing CMS book, cover, settings, and pages are preserved.`,
    );
    console.log(
      `ℹ️ (To overwrite and rebuild canonical book and all 21 pages, run with SEED_FORCE_CANONICAL_BOOK=true).`,
    );
    book = existingBook;
  } else {
    if (existingBook && forceCanonicalReset) {
      console.warn(
        '⚠️ FORCE CANONICAL SEED ENABLED: Existing CMS content is being overwritten with canonical source.',
      );
      // The wipe + rebuild itself runs in one transaction below.
      book = existingBook;
    }

    shouldSeedPages = true;
  }

  if (!shouldSeedPages) {
    console.log(
      'ℹ️ Skipped pages, initial BookVersion and publishedSnapshot (journal exists, force mode off). Publish from the Admin UI.',
    );
  }

  if (shouldSeedPages) {
    // 6. Definition of all 21 inside pages
    const pagesData = CANONICAL_PAGES;

    // 7-9. Rebuild pages, version and publishedSnapshot atomically: a failure half-way through a
    // forced rebuild must never leave the live journal with a partial set of pages.
    await prisma.$transaction(
      async (db) => {
        if (existingBook && forceCanonicalReset) {
          // Cleanly remove any existing pages and elements to guarantee exactly canonical 21 pages
          await db.page.deleteMany({ where: { bookId: existingBook.id } });

          book = await db.book.update({
            where: { id: existingBook.id },
            data: {
              title: 'Chúng Mình',
              cover: canonicalCover,
              settings: canonicalSettings,
              backgroundMusicId: audioTrack.id,
              contentRevision: { increment: 1 },
            },
          });
        } else {
          // Created inside the transaction so a failed first seed leaves no half-built journal behind
          book = await db.book.create({
            data: {
              title: 'Chúng Mình',
              description:
                'Cuốn nhật ký tình yêu của hai mình từ ngày 20 tháng 10 năm 2022.',
              status: BookStatus.PUBLISHED,
              heName: 'Phúc',
              sheName: 'Trang',
              anniversaryDate: new Date('2022-10-20T00:00:00Z'),
              proposalQuote: 'Thế cậu đồng ý làm bạn gái tớ không?',
              backgroundMusicId: audioTrack.id,
              contentRevision: 1,
              ownerId: admin.id,
              cover: canonicalCover,
              settings: canonicalSettings,
            },
          });
          console.log(`✅ Book entity created: "${book.title}"`);
        }

        // 7. Insert all 21 pages and elements into PostgreSQL
        for (let i = 0; i < pagesData.length; i++) {
          const p = pagesData[i];
          const order = i;
          const derivedSide = derivePageSideEnum(order);
          const bgMediaId = getMediaId(p.bg);

          const background = buildPageBackground(p.bg, bgMediaId);

          const pageRecord = await db.page.upsert({
            where: {
              bookId_pageNumber: {
                bookId: book.id,
                pageNumber: p.pageNumber,
              },
            },
            update: {
              order,
              side: derivedSide,
              chapter: p.chapter,
              title: p.title,
              quote: p.quote,
              handwriting: p.handwriting,
              layoutTemplateId: p.layout,
              sourceTemplateId: p.layout,
              layoutMode: LayoutMode.PRESET,
              background,
            },
            create: {
              bookId: book.id,
              pageNumber: p.pageNumber,
              order,
              side: derivedSide,
              chapter: p.chapter,
              title: p.title,
              quote: p.quote,
              handwriting: p.handwriting,
              layoutTemplateId: p.layout,
              sourceTemplateId: p.layout,
              layoutMode: LayoutMode.PRESET,
              background,
            },
          });

          // Delete existing elements to ensure idempotent refresh
          await db.pageElement.deleteMany({ where: { pageId: pageRecord.id } });

          const elementsToCreate = buildPageElements(
            p,
            derivedSide,
            getMediaId,
          );

          // Insert all elements for this page
          for (const elem of elementsToCreate) {
            await db.pageElement.create({
              data: {
                pageId: pageRecord.id,
                type: elem.type,
                slot: elem.slot,
                order: elem.order,
                zIndex: elem.zIndex,
                visible: true,
                locked: false,
                opacity: 1.0,
                transform: elem.transform,
                style: elem.style,
                data: elem.data,
                interaction: elem.interaction,
              },
            });
          }
        }
        console.log(`✅ Seeded all 21 pages and elements into PostgreSQL.`);

        // 8. Seed Initial Version Snapshot with full complete pages & elements snapshot
        const fullBookForSnapshot = await db.book.findUnique({
          where: { id: book.id },
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

        await db.bookVersion.upsert({
          where: { id: 'initial-version-200' },
          update: {
            snapshot: fullBookForSnapshot as any,
          },
          create: {
            id: 'initial-version-200',
            bookId: book.id,
            version: '2.0.0',
            snapshot: fullBookForSnapshot as any,
            changelog:
              'Khởi tạo hoàn chỉnh 21 trang với đầy đủ elements, captions, videos, và layout presets.',
            createdById: admin.id,
          },
        });
        console.log(
          '✅ Initial version snapshot 2.0.0 created with complete pages.',
        );

        // 9. Prompt 23: Pre-compile and seed publishedSnapshot for live production site
        const compiledPublishedDoc = compilePublishedSnapshot({
          book,
          audioTrack,
          fullBookForSnapshot,
          canonicalCover,
          canonicalSettings,
          firstCoverUrl,
          lastCoverUrl,
        });

        await db.book.update({
          where: { id: book.id },
          data: {
            publishedSnapshot: compiledPublishedDoc as any,
            publishedRevision: 1,
            publishedAt: new Date(),
          },
        });
        console.log(
          '✅ Canonical publishedSnapshot initialized for production viewers.',
        );
      },
      { timeout: 180_000, maxWait: 30_000 },
    );
  }

  console.log(
    '🎉 Database seeding completed successfully! Ready for production.',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    try {
      await prisma.$disconnect();
    } catch {}
    try {
      await pool.end();
    } catch {}
  });
