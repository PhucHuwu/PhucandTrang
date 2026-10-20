/**
 * Moves standalone caption TEXT elements into their image/video element (data.caption)
 * and deletes the TEXT element. Draft only; publish afterwards to update the public book.
 *
 *   npx ts-node prisma/merge-captions.ts           # dry run, prints the plan
 *   npx ts-node prisma/merge-captions.ts --apply   # writes changes
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';
import { planCaptionMerge } from '../src/utils/caption-merge';

const apply = process.argv.includes('--apply');
const connectionString =
  process.env.DATABASE_URL_UNPOOLED || process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('sslmode=') ? { rejectUnauthorized: false } : undefined,
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const pages = await prisma.page.findMany({
    include: { elements: true },
    orderBy: { pageNumber: 'asc' },
  });
  let merged = 0;
  let unmatched = 0;

  for (const page of pages) {
    const plans = planCaptionMerge(page.elements as any);
    const captions = page.elements.filter(
      (el: any) => el.type === 'TEXT' && (el.data?.variant === 'caption' || el.slot?.endsWith('-caption')),
    );
    for (const el of captions) {
      if (plans.some((plan) => plan.captionId === el.id)) continue;
      unmatched++;
      console.log(`Trang ${page.pageNumber}: KHÔNG KHỚP "${(el.data as any)?.text ?? ''}" (${el.id}, slot=${(el as any).slot ?? '-'})`);
    }
    if (!plans.length) continue;

    for (const plan of plans) {
      console.log(`Trang ${page.pageNumber}: "${plan.text}" -> ${plan.mediaId}`);
    }
    merged += plans.length;
    if (!apply) continue;

    // Re-read the page inside the transaction so edits made since the dry-run scan are not
    // overwritten, and re-plan from that fresh state.
    const applied = await prisma.$transaction(async (tx) => {
      const fresh = await tx.pageElement.findMany({ where: { pageId: page.id } });
      const freshPlans = planCaptionMerge(fresh as any);
      for (const plan of freshPlans) {
        const media = fresh.find((el) => el.id === plan.mediaId)!;
        await tx.pageElement.update({
          where: { id: plan.mediaId },
          data: { data: { ...((media.data as any) || {}), caption: plan.text } },
        });
        await tx.pageElement.delete({ where: { id: plan.captionId } });
      }
      if (freshPlans.length > 0) {
        // Draft changed: bump contentRevision so caches/preview pick it up
        await tx.book.update({
          where: { id: page.bookId },
          data: { contentRevision: { increment: 1 } },
        });
      }
      return freshPlans.length;
    });
    if (applied !== plans.length) {
      console.log(`Trang ${page.pageNumber}: dữ liệu đã thay đổi, áp dụng ${applied}/${plans.length} theo dữ liệu mới nhất.`);
      merged += applied - plans.length;
    }
  }

  console.log(`${apply ? 'Đã gộp' : 'Sẽ gộp'} ${merged} tiêu đề; ${unmatched} tiêu đề không tìm được ảnh, giữ nguyên.`);
  if (!apply) console.log('Chạy lại với --apply để ghi thay đổi.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
