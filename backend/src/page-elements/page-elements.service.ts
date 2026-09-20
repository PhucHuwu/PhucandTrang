import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePageElementDto } from './dto/create-page-element.dto';
import { UpdatePageElementDto } from './dto/update-page-element.dto';
import { BatchUpdateElementsDto } from './dto/batch-update-elements.dto';
import { ReorderElementsDto } from './dto/reorder-elements.dto';
import { DuplicateElementDto } from './dto/duplicate-element.dto';
import { PublicCacheService } from '../public/public-cache.service';
import { safeDeepMerge } from '../utils/safe-merge';

@Injectable()
export class PageElementsService {
  constructor(
    private prisma: PrismaService,
    private cacheService: PublicCacheService,
  ) {}

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

    // Clean transform: strip any accidental duplicate zIndex in transform object
    const { zIndex: _ignore, ...cleanTransform } = (dto.transform as any) || {};

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
        transform: cleanTransform,
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

    await this.cacheService.touchByPageId(dto.pageId);
    return element;
  }

  async update(id: string, dto: UpdatePageElementDto, isPatch: boolean = false) {
    const el = await this.findOne(id);

    // Safe merge for partial JSON objects if PATCH
    let transform = dto.transform;
    if (dto.transform) {
      const { zIndex: _ignore, ...cleanDtoTransform } = (dto.transform as any) || {};
      transform = isPatch
        ? safeDeepMerge(el.transform as any, cleanDtoTransform)
        : cleanDtoTransform;
    }

    const style = isPatch && dto.style
      ? safeDeepMerge((el.style as any) || {}, dto.style)
      : dto.style;

    const data = isPatch && dto.data
      ? safeDeepMerge((el.data as any) || {}, dto.data)
      : dto.data;

    const interaction = isPatch && dto.interaction
      ? safeDeepMerge((el.interaction as any) || {}, dto.interaction)
      : dto.interaction;

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
        ...(transform !== undefined ? { transform } : {}),
        ...(style !== undefined ? { style } : {}),
        ...(data !== undefined ? { data } : {}),
        ...(interaction !== undefined ? { interaction } : {}),
      },
    });

    // Mark parent page as customized
    await this.prisma.page.update({
      where: { id: el.pageId },
      data: { isCustomized: true },
    });

    await this.cacheService.touchByPageId(el.pageId);
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
    const originalTransform = (original.transform as any) || {
      x: 0.1,
      y: 0.1,
      width: 0.3,
      height: 0.3,
      rotation: 0,
      scale: 1,
    };
    const offsetX = dto?.offsetX !== undefined ? dto.offsetX : 0.02;
    const offsetY = dto?.offsetY !== undefined ? dto.offsetY : 0.02;

    const { zIndex: _ignore, ...restTransform } = originalTransform;
    const duplicatedTransform = {
      ...restTransform,
      x: Math.min(0.95 - (originalTransform.width || 0.1), Math.max(0, originalTransform.x + offsetX)),
      y: Math.min(0.95 - (originalTransform.height || 0.1), Math.max(0, originalTransform.y + offsetY)),
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

    await this.cacheService.touchByPageId(original.pageId);
    return duplicate;
  }

  async remove(id: string) {
    const el = await this.findOne(id);
    const result = await this.prisma.pageElement.delete({ where: { id } });

    await this.prisma.page.update({
      where: { id: el.pageId },
      data: { isCustomized: true },
    });

    await this.cacheService.touchByPageId(el.pageId);
    return result;
  }

  async reorderZIndex(dto: ReorderElementsDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const updatedList = [];
      for (const item of dto.items) {
        const updated = await tx.pageElement.update({
          where: { id: item.id },
          data: {
            zIndex: item.zIndex,
            order: item.order !== undefined ? item.order : item.zIndex,
          },
          select: { id: true, zIndex: true, order: true, pageId: true },
        });
        updatedList.push(updated);
      }
      return updatedList;
    });

    if (result.length > 0) {
      await this.cacheService.touchByPageId(result[0].pageId);
    }

    return result;
  }

  async batchUpdate(pageId: string, dto: BatchUpdateElementsDto) {
    const page = await this.prisma.page.findUnique({ where: { id: pageId } });
    if (!page) throw new NotFoundException(`Page not found: ${pageId}`);

    const updatedElements = await this.prisma.$transaction(async (tx) => {
      const results = [];
      for (const item of dto.elements) {
        const existing = await tx.pageElement.findUnique({ where: { id: item.id } });
        if (!existing || existing.pageId !== pageId) {
          continue;
        }

        const { zIndex: _ignore, ...cleanTransform } = (item.transform as any) || {};

        const transform = item.transform
          ? safeDeepMerge(existing.transform as any, cleanTransform)
          : undefined;
        const style = item.style
          ? safeDeepMerge((existing.style as any) || {}, item.style)
          : undefined;
        const data = item.data
          ? safeDeepMerge((existing.data as any) || {}, item.data)
          : undefined;
        const interaction = item.interaction
          ? safeDeepMerge((existing.interaction as any) || {}, item.interaction)
          : undefined;

        const updated = await tx.pageElement.update({
          where: { id: item.id },
          data: {
            ...(item.zIndex !== undefined ? { zIndex: item.zIndex } : {}),
            ...(item.order !== undefined ? { order: item.order } : {}),
            ...(item.visible !== undefined ? { visible: item.visible } : {}),
            ...(item.locked !== undefined ? { locked: item.locked } : {}),
            ...(item.opacity !== undefined ? { opacity: item.opacity } : {}),
            ...(transform !== undefined ? { transform } : {}),
            ...(style !== undefined ? { style } : {}),
            ...(data !== undefined ? { data } : {}),
            ...(interaction !== undefined ? { interaction } : {}),
          },
        });
        results.push(updated);
      }

      await tx.page.update({
        where: { id: pageId },
        data: { isCustomized: true },
      });

      return results;
    });

    await this.cacheService.touchByPageId(pageId);
    return updatedElements;
  }
}
