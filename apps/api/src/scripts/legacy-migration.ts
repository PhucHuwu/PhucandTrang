import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * PROMPT 25: One-Time Canonical Import / Migration Script
 *
 * Audits covers, page backgrounds and elements of the journal and assigns canonical
 * mediaId / posterMediaId wherever a raw URL exactly matches a Media record.
 *
 * Safety:
 * - Dry run by default: only prints the planned changes. Pass `--apply` to write.
 * - Exact URL matching only (after trimming); no substring/fuzzy matching.
 * - All writes run in one transaction and bump Book.contentRevision once.
 * - Never touches publishedSnapshot: the admin must review the draft and Publish from the UI.
 */

export interface MigrationChange {
  kind: 'cover' | 'page-background' | 'element';
  id: string;
  description: string;
}

export interface MigrationPlan {
  cover: any | null;
  pageBackgrounds: Array<{ pageId: string; background: any }>;
  elements: Array<{ elementId: string; data: any }>;
  changes: MigrationChange[];
}

export function buildExactUrlLookup(
  media: Array<{ id: string; url?: string | null }>,
) {
  const map = new Map<string, string>();
  for (const m of media) {
    if (m.url) map.set(m.url.trim(), m.id);
  }
  return (url?: unknown): string | null => {
    if (typeof url !== 'string' || !url.trim()) return null;
    return map.get(url.trim()) ?? null;
  };
}

/** Pure planning step: computes the writes without touching the database. */
export function planLegacyMigration(
  book: {
    id: string;
    cover: any;
    pages: Array<{
      id: string;
      background: any;
      elements: Array<{ id: string; data: any }>;
    }>;
  },
  findMediaIdForUrl: (url?: unknown) => string | null,
): MigrationPlan {
  const plan: MigrationPlan = {
    cover: null,
    pageBackgrounds: [],
    elements: [],
    changes: [],
  };

  const cover = JSON.parse(JSON.stringify(book.cover || {}));
  let coverModified = false;
  const assignCover = (
    side: any,
    urlKey: string,
    idKey: string,
    label: string,
  ) => {
    if (!side) return;
    const id = findMediaIdForUrl(side[urlKey]);
    if (id && side[idKey] !== id) {
      side[idKey] = id;
      coverModified = true;
      plan.changes.push({
        kind: 'cover',
        id: book.id,
        description: `${label}.${idKey} = ${id}`,
      });
    }
  };
  assignCover(cover.front, 'backgroundUrl', 'mediaId', 'cover.front');
  assignCover(cover.back, 'insideBackgroundUrl', 'insideMediaId', 'cover.back');
  assignCover(
    cover.back,
    'outsideBackgroundUrl',
    'outsideMediaId',
    'cover.back',
  );
  if (coverModified) plan.cover = cover;

  for (const page of book.pages) {
    const bg = { ...((page.background as any) || {}) };
    if (bg.imageUrl && !bg.mediaId) {
      const bgMediaId = findMediaIdForUrl(bg.imageUrl);
      if (bgMediaId) {
        bg.mediaId = bgMediaId;
        plan.pageBackgrounds.push({ pageId: page.id, background: bg });
        plan.changes.push({
          kind: 'page-background',
          id: page.id,
          description: `background.mediaId = ${bgMediaId}`,
        });
      }
    }

    for (const el of page.elements) {
      const data = { ...((el.data as any) || {}) };
      const notes: string[] = [];

      if (data.src && !data.mediaId) {
        const matchedId = findMediaIdForUrl(data.src);
        if (matchedId) {
          data.mediaId = matchedId;
          notes.push(`mediaId = ${matchedId}`);
        }
      }
      if (data.thumbnailUrl && !data.posterMediaId) {
        const matchedPosterId = findMediaIdForUrl(data.thumbnailUrl);
        if (matchedPosterId) {
          data.posterMediaId = matchedPosterId;
          notes.push(`posterMediaId = ${matchedPosterId}`);
        }
      }

      if (notes.length > 0) {
        plan.elements.push({ elementId: el.id, data });
        plan.changes.push({
          kind: 'element',
          id: el.id,
          description: notes.join(', '),
        });
      }
    }
  }

  return plan;
}

async function main() {
  const apply = process.argv.includes('--apply');
  console.log(
    '🚀 Running Prompt 25 Legacy Content Migration & Canonical Media Mapping...',
  );
  console.log(
    apply
      ? '✍️  Mode: APPLY (changes will be written)'
      : '🔍 Mode: DRY RUN (no writes; pass --apply to write)',
  );

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
    const allMedia = await prisma.media.findMany({
      select: { id: true, url: true },
    });
    console.log(
      `📦 Loaded ${allMedia.length} Media records from PostgreSQL library.`,
    );
    const findMediaIdForUrl = buildExactUrlLookup(allMedia);

    const book = await prisma.book.findFirst({
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      include: {
        pages: {
          orderBy: { order: 'asc' },
          include: { elements: { orderBy: { zIndex: 'asc' } } },
        },
      },
    });

    if (!book) {
      console.error('❌ No journal found in the database.');
      return;
    }

    console.log(
      `📖 Auditing book "${book.title}" (${book.pages.length} pages)...`,
    );
    const plan = planLegacyMigration(book as any, findMediaIdForUrl);

    if (plan.changes.length === 0) {
      console.log(
        '✅ Nothing to migrate: all references already canonical (or no exact URL match).',
      );
      return;
    }

    for (const change of plan.changes) {
      console.log(`  • [${change.kind}] ${change.id}: ${change.description}`);
    }
    console.log(
      `📋 Planned: cover=${plan.cover ? 1 : 0}, backgrounds=${plan.pageBackgrounds.length}, elements=${plan.elements.length}`,
    );

    if (!apply) {
      console.log(
        '🔍 Dry run complete. Re-run with --apply to write these changes.',
      );
      return;
    }

    await prisma.$transaction(
      async (tx) => {
        if (plan.cover) {
          await tx.book.update({
            where: { id: book.id },
            data: { cover: plan.cover },
          });
        }
        for (const bg of plan.pageBackgrounds) {
          await tx.page.update({
            where: { id: bg.pageId },
            data: { background: bg.background },
          });
        }
        for (const el of plan.elements) {
          await tx.pageElement.update({
            where: { id: el.elementId },
            data: { data: el.data },
          });
        }
        await tx.book.update({
          where: { id: book.id },
          data: { contentRevision: { increment: 1 } },
        });
      },
      { timeout: 120_000, maxWait: 15_000 },
    );

    console.log(
      `✅ Applied ${plan.changes.length} canonical mediaId changes to the draft.`,
    );
    console.log(
      'ℹ️ publishedSnapshot was NOT modified. Review the draft in the Admin preview, then Publish from the Admin UI to go live.',
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error('Fatal error during migration:', e);
    process.exit(1);
  });
}
