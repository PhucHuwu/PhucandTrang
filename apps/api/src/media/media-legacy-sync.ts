import { BadRequestException } from '@nestjs/common';
import { MediaType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isHttpsUrl } from './cloudinary.utils';

/**
 * Bulk import or sync existing legacy cloudinaryUrls.json map into the PostgreSQL Media table.
 */
export async function syncLegacyMediaMap(
  prisma: PrismaService,
  legacyMap: Record<string, string>,
) {
  if (!legacyMap || typeof legacyMap !== 'object' || Array.isArray(legacyMap)) {
    throw new BadRequestException(
      'Dữ liệu đồng bộ phải là một object { key: url }',
    );
  }

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const [key, url] of Object.entries(legacyMap)) {
    if (!url || typeof url !== 'string' || !isHttpsUrl(url)) {
      skippedCount++;
      continue;
    }

    let type: MediaType = MediaType.IMAGE;
    let folder = 'phuc_trang_memories';

    if (key.startsWith('backgrounds/')) {
      type = MediaType.BACKGROUND;
      folder = 'phuc_trang_backgrounds';
    } else if (key.endsWith('.mp4')) {
      type = MediaType.VIDEO;
    } else if (
      key.endsWith('.mp3') ||
      key.endsWith('.wav') ||
      key.endsWith('.m4a')
    ) {
      type = MediaType.AUDIO;
      folder = 'phuc_trang_audio';
    }

    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1];
    const publicId = `${folder}/${filename.replace(/\.[^/.]+$/, '')}`;

    const existing = await prisma.media.findUnique({ where: { url } });

    if (existing) {
      await prisma.media.update({
        where: { id: existing.id },
        data: {
          type,
          publicId: existing.publicId || publicId,
          alt: existing.alt || key,
          metadata: {
            ...((existing.metadata as any) || {}),
            originalKey: key,
            syncedFromLegacy: true,
          },
        },
      });
      updatedCount++;
    } else {
      await prisma.media.create({
        data: {
          type,
          provider: 'CLOUDINARY',
          url,
          publicId,
          alt: key,
          metadata: {
            originalKey: key,
            syncedFromLegacy: true,
          },
        },
      });
      createdCount++;
    }
  }

  return {
    success: true,
    totalProcessed: Object.keys(legacyMap).length,
    createdCount,
    updatedCount,
    skippedCount,
  };
}
