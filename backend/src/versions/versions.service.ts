import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VersionsService {
  constructor(private prisma: PrismaService) {}

  async findByBook(bookId: string) {
    return this.prisma.bookVersion.findMany({
      where: { bookId },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const version = await this.prisma.bookVersion.findUnique({
      where: { id },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    });
    if (!version) throw new NotFoundException(`Version not found: ${id}`);
    return version;
  }

  async createSnapshot(bookId: string, versionTag: string, changelog?: string, userId?: string) {
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
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
    if (!book) throw new NotFoundException(`Book not found: ${bookId}`);

    return this.prisma.bookVersion.create({
      data: {
        bookId,
        version: versionTag,
        snapshot: book as any,
        changelog,
        createdById: userId,
      },
    });
  }

  async rollbackToSnapshot(bookId: string, versionId: string) {
    const version = await this.findOne(versionId);
    const snapshot = version.snapshot as any;
    if (!snapshot) throw new NotFoundException('Snapshot data is empty');

    // Update book settings & pages from snapshot
    await this.prisma.$transaction(async (tx) => {
      // 1. Delete current pages (cascade deletes elements)
      await tx.page.deleteMany({ where: { bookId } });

      // 2. Update book fields
      await tx.book.update({
        where: { id: bookId },
        data: {
          title: snapshot.title,
          cover: snapshot.cover,
          settings: snapshot.settings,
          heName: snapshot.heName,
          sheName: snapshot.sheName,
          anniversaryDate: snapshot.anniversaryDate,
          proposalQuote: snapshot.proposalQuote,
        },
      });

      // 3. Re-create pages and elements from snapshot
      if (Array.isArray(snapshot.pages)) {
        for (const page of snapshot.pages) {
          await tx.page.create({
            data: {
              bookId,
              pageNumber: page.pageNumber,
              side: page.side,
              order: page.order,
              chapter: page.chapter,
              title: page.title,
              quote: page.quote,
              handwriting: page.handwriting,
              layoutMode: page.layoutMode,
              sourceTemplateId: page.sourceTemplateId,
              isCustomized: page.isCustomized,
              background: page.background,
              elements: {
                create: (page.elements || []).map((el: any) => ({
                  type: el.type,
                  slot: el.slot,
                  order: el.order,
                  zIndex: el.zIndex,
                  visible: el.visible,
                  locked: el.locked,
                  opacity: el.opacity,
                  transform: el.transform,
                  style: el.style,
                  data: el.data,
                  interaction: el.interaction,
                })),
              },
            },
          });
        }
      }
    });

    return { success: true, message: `Rolled back to version ${version.version}` };
  }
}
