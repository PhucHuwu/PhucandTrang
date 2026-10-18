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
    const captionCount = page.elements.filter(
      (el: any) => el.type === 'TEXT' && (el.data?.variant === 'caption' || el.slot?.endsWith('-caption')),
    ).length;
    unmatched += captionCount - plans.length;
    if (!plans.length) continue;

    for (const plan of plans) {
      console.log(`Trang ${page.pageNumber}: "${plan.text}" -> ${plan.mediaId}`);
    }
    merged += plans.length;
    if (!apply) continue;

    await prisma.$transaction(async (tx) => {
      for (const plan of plans) {
        const media = page.elements.find((el) => el.id === plan.mediaId)!;
        await tx.pageElement.update({
          where: { id: plan.mediaId },
          data: { data: { ...((media.data as any) || {}), caption: plan.text } },
        });
        await tx.pageElement.delete({ where: { id: plan.captionId } });
      }
    });
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
