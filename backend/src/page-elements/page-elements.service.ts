import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePageElementDto } from './dto/create-page-element.dto';
import { UpdatePageElementDto } from './dto/update-page-element.dto';
import { BatchUpdateElementsDto } from './dto/batch-update-elements.dto';
import { ReorderElementsDto } from './dto/reorder-elements.dto';
import { DuplicateElementDto } from './dto/duplicate-element.dto';

@Injectable()
export class PageElementsService {
  constructor(private prisma: PrismaService) {}

  async findByPage(pageId: string) {
    const page = await this.prisma.page.findUnique({ where: { id: pageId } });
    if (!page) throw new NotFoundException(`Page not found: ${pageId}`);

    return this.prisma.pageElement.findMany({
      where: { pageId },
      orderBy: { zIndex: 'asc' },
    });
  }

  async findOne(id: string) {
    const el = await this.prisma.pageElement.findUnique({ where: { id } });
    if (!el) throw new NotFoundException(`Không tìm thấy phần tử với ID: ${id}`);
    return el;
  }

  async create(dto: CreatePageElementDto) {
    const page = await this.prisma.page.findUnique({ where: { id: dto.pageId } });
    if (!page) throw new NotFoundException(`Page not found: ${dto.pageId}`);

    // If zIndex is not provided, place on top
    let zIndex = dto.zIndex;
    if (zIndex === undefined) {
      const maxEl = await this.prisma.pageElement.findFirst({
        where: { pageId: dto.pageId },
        orderBy: { zIndex: 'desc' },
        select: { zIndex: true },
      });
      zIndex = (maxEl?.zIndex ?? 0) + 1;
    }

    const element = await this.prisma.pageElement.create({
      data: {
        pageId: dto.pageId,
        type: dto.type,
        slot: dto.slot,
        order: dto.order !== undefined ? dto.order : zIndex,
        zIndex,
        visible: dto.visible !== undefined ? dto.visible : true,
        locked: dto.locked !== undefined ? dto.locked : false,
        opacity: dto.opacity !== undefined ? dto.opacity : 1.0,
        transform: dto.transform,
        style: dto.style,
        data: dto.data,
        interaction: dto.interaction,
      },
    });

    // Mark parent page as customized
    await this.prisma.page.update({
      where: { id: dto.pageId },
      data: { isCustomized: true },
    });

    return element;
  }

  async update(id: string, dto: UpdatePageElementDto) {
    const el = await this.findOne(id);

    const updated = await this.prisma.pageElement.update({
      where: { id },
      data: {
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.slot !== undefined ? { slot: dto.slot } : {}),
        ...(dto.order !== undefined ? { order: dto.order } : {}),
        ...(dto.zIndex !== undefined ? { zIndex: dto.zIndex } : {}),
        ...(dto.visible !== undefined ? { visible: dto.visible } : {}),
        ...(dto.locked !== undefined ? { locked: dto.locked } : {}),
        ...(dto.opacity !== undefined ? { opacity: dto.opacity } : {}),
        ...(dto.transform !== undefined ? { transform: dto.transform } : {}),
        ...(dto.style !== undefined ? { style: dto.style } : {}),
        ...(dto.data !== undefined ? { data: dto.data } : {}),
        ...(dto.interaction !== undefined ? { interaction: dto.interaction } : {}),
      },
    });

    // Mark parent page as customized
    await this.prisma.page.update({
      where: { id: el.pageId },
      data: { isCustomized: true },
    });

    return updated;
  }

  async duplicate(id: string, dto?: DuplicateElementDto) {
    const original = await this.findOne(id);

    // Get max zIndex on page
    const maxEl = await this.prisma.pageElement.findFirst({
      where: { pageId: original.pageId },
      orderBy: { zIndex: 'desc' },
      select: { zIndex: true },
    });
    const newZIndex = (maxEl?.zIndex ?? 0) + 1;

    // Offset coordinates slightly so duplicate is visibly distinct
    const originalTransform = (original.transform as any) || { x: 0.1, y: 0.1, width: 0.3, height: 0.3, rotation: 0, scale: 1 };
    const offsetX = dto?.offsetX !== undefined ? dto.offsetX : 0.02;
    const offsetY = dto?.offsetY !== undefined ? dto.offsetY : 0.02;

    const duplicatedTransform = {
      ...originalTransform,
      x: Math.min(0.95 - (originalTransform.width || 0.1), Math.max(0, originalTransform.x + offsetX)),
      y: Math.min(0.95 - (originalTransform.height || 0.1), Math.max(0, originalTransform.y + offsetY)),
      zIndex: newZIndex,
    };

    const duplicate = await this.prisma.pageElement.create({
      data: {
        pageId: original.pageId,
        type: original.type,
        slot: undefined, // Cleared because it is an independent clone
        order: newZIndex,
        zIndex: newZIndex,
        visible: original.visible,
        locked: false,
        opacity: original.opacity,
        transform: duplicatedTransform,
        style: original.style as any,
        data: original.data as any,
        interaction: original.interaction as any,
      },
    });

    // Mark parent page as customized
    await this.prisma.page.update({
      where: { id: original.pageId },
      data: { isCustomized: true },
    });

    return duplicate;
  }

  async remove(id: string) {
    const el = await this.findOne(id);
    await this.prisma.pageElement.delete({ where: { id } });

    // Mark parent page as customized
    await this.prisma.page.update({
      where: { id: el.pageId },
      data: { isCustomized: true },
    });

    return { success: true, message: `Đã xóa element ${id}` };
  }

  async reorderZIndex(pageId: string, dto: ReorderElementsDto) {
    const page = await this.prisma.page.findUnique({ where: { id: pageId } });
    if (!page) throw new NotFoundException(`Page not found: ${pageId}`);

    const results = await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.pageElement.update({
          where: { id: item.id },
          data: {
            zIndex: item.zIndex,
            ...(item.order !== undefined ? { order: item.order } : { order: item.zIndex }),
          },
        }),
      ),
    );

    // Mark parent page as customized
    await this.prisma.page.update({
      where: { id: pageId },
      data: { isCustomized: true },
    });

    return results;
  }

  async batchUpdate(dto: BatchUpdateElementsDto) {
    if (!dto.elements || dto.elements.length === 0) return [];

    return this.prisma.$transaction(async (tx) => {
      const results = [];
      const touchedPageIds = new Set<string>();

      for (const item of dto.elements) {
        const updated = await tx.pageElement.update({
          where: { id: item.id },
          data: {
            ...(item.transform !== undefined ? { transform: item.transform } : {}),
            ...(item.style !== undefined ? { style: item.style } : {}),
            ...(item.data !== undefined ? { data: item.data } : {}),
            ...(item.interaction !== undefined ? { interaction: item.interaction } : {}),
            ...(item.zIndex !== undefined ? { zIndex: item.zIndex } : {}),
            ...(item.order !== undefined ? { order: item.order } : {}),
            ...(item.visible !== undefined ? { visible: item.visible } : {}),
            ...(item.locked !== undefined ? { locked: item.locked } : {}),
            ...(item.opacity !== undefined ? { opacity: item.opacity } : {}),
          },
        });
        results.push(updated);
        touchedPageIds.add(updated.pageId);
      }

      // Mark all touched pages as customized
      for (const pageId of touchedPageIds) {
        await tx.page.update({
          where: { id: pageId },
          data: { isCustomized: true },
        });
      }

      return results;
    });
  }
}
