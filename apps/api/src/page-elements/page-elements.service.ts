import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePageElementDto } from './dto/create-page-element.dto';
import { UpdatePageElementDto } from './dto/update-page-element.dto';
import { BatchUpdateElementsDto } from './dto/batch-update-elements.dto';
import { ReorderElementsDto } from './dto/reorder-elements.dto';
import { DuplicateElementDto } from './dto/duplicate-element.dto';
import { PublicCacheService } from '../public/public-cache.service';
import { safeDeepMerge } from '@phucandtrang/shared';
import { canonicalizeMediaData } from '../common/media-data';
import { nullableJson, requiredJson } from '../common/prisma-json';
import { touchPageGuarded } from '../common/page-concurrency';

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
    if (!el)
      throw new NotFoundException(`Không tìm thấy phần tử với ID: ${id}`);
    return el;
  }

  async create(dto: CreatePageElementDto) {
    const element = await this.prisma.$transaction(async (tx) => {
      const page = await tx.page.findUnique({ where: { id: dto.pageId } });
      if (!page) throw new NotFoundException(`Page not found: ${dto.pageId}`);

      // If zIndex is not provided, place on top
      let zIndex = dto.zIndex;
      if (zIndex === undefined) {
        const maxEl = await tx.pageElement.findFirst({
          where: { pageId: dto.pageId },
          orderBy: { zIndex: 'desc' },
          select: { zIndex: true },
        });
        zIndex = (maxEl?.zIndex ?? 0) + 1;
      }

      // Clean transform: strip any accidental duplicate zIndex in transform object
      const { zIndex: _ignore, ...cleanTransform } =
        (dto.transform as any) || {};

      const created = await tx.pageElement.create({
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
          style: nullableJson(dto.style),
          data: requiredJson(canonicalizeMediaData(dto.type, dto.data)),
          interaction: nullableJson(dto.interaction),
        },
      });

      const pageUpdatedAt = await touchPageGuarded(
        tx,
        dto.pageId,
        { isCustomized: true },
        dto.baseUpdatedAt,
      );

      return { ...created, pageUpdatedAt };
    });

    await this.cacheService.touchByPageId(dto.pageId);
    return element;
  }

  async update(
    id: string,
    dto: UpdatePageElementDto,
    isPatch: boolean = false,
  ) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const el = await tx.pageElement.findUnique({ where: { id } });
      if (!el)
        throw new NotFoundException(`Không tìm thấy phần tử với ID: ${id}`);

      // PATCH deep-merges partial JSON objects; an explicit null inside the patch deletes that key.
      const mergeOptions = { nullDeletes: true };

      let transform: any = undefined;
      if (dto.transform) {
        const { zIndex: _ignore, ...cleanDtoTransform } =
          (dto.transform as any) || {};
        transform = isPatch
          ? safeDeepMerge(
              (el.transform as any) || {},
              cleanDtoTransform,
              mergeOptions,
            )
          : cleanDtoTransform;
      }

      const style =
        isPatch && dto.style
          ? safeDeepMerge((el.style as any) || {}, dto.style, mergeOptions)
          : dto.style;

      const mergedData =
        isPatch && dto.data
          ? safeDeepMerge((el.data as any) || {}, dto.data, mergeOptions)
          : dto.data;
      const data = mergedData
        ? canonicalizeMediaData(dto.type || el.type, mergedData)
        : undefined;

      const interaction =
        isPatch && dto.interaction
          ? safeDeepMerge(
              (el.interaction as any) || {},
              dto.interaction,
              mergeOptions,
            )
          : dto.interaction;

      const result = await tx.pageElement.update({
        where: { id },
        data: {
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          ...(dto.slot !== undefined ? { slot: dto.slot } : {}),
          ...(dto.order !== undefined ? { order: dto.order } : {}),
          ...(dto.zIndex !== undefined ? { zIndex: dto.zIndex } : {}),
          ...(dto.visible !== undefined ? { visible: dto.visible } : {}),
          ...(dto.locked !== undefined ? { locked: dto.locked } : {}),
          ...(dto.opacity !== undefined ? { opacity: dto.opacity } : {}),
          ...(transform !== undefined
            ? { transform: requiredJson(transform) }
            : {}),
          ...(style !== undefined ? { style: nullableJson(style) } : {}),
          ...(data !== undefined ? { data: requiredJson(data) } : {}),
          ...(interaction !== undefined
            ? { interaction: nullableJson(interaction) }
            : {}),
        },
      });

      // Mark parent page as customized
      await tx.page.update({
        where: { id: el.pageId },
        data: { isCustomized: true },
      });

      return result;
    });

    await this.cacheService.touchByPageId(updated.pageId);
    return updated;
  }

  async duplicate(id: string, dto?: DuplicateElementDto) {
    const duplicate = await this.prisma.$transaction(async (tx) => {
      const original = await tx.pageElement.findUnique({ where: { id } });
      if (!original)
        throw new NotFoundException(`Không tìm thấy phần tử với ID: ${id}`);

      // Get max zIndex on page
      const maxEl = await tx.pageElement.findFirst({
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
        x: Math.min(
          0.95 - (originalTransform.width || 0.1),
          Math.max(0, (originalTransform.x || 0) + offsetX),
        ),
        y: Math.min(
          0.95 - (originalTransform.height || 0.1),
          Math.max(0, (originalTransform.y || 0) + offsetY),
        ),
      };

      const created = await tx.pageElement.create({
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
          style: nullableJson(original.style),
          data: requiredJson(original.data),
          interaction: nullableJson(original.interaction),
        },
      });

      const pageUpdatedAt = await touchPageGuarded(
        tx,
        original.pageId,
        { isCustomized: true },
        dto?.baseUpdatedAt,
      );

      return { ...created, pageUpdatedAt };
    });

    await this.cacheService.touchByPageId(duplicate.pageId);
    return duplicate;
  }

  async remove(id: string, baseUpdatedAt?: string) {
    if (
      baseUpdatedAt !== undefined &&
      Number.isNaN(Date.parse(baseUpdatedAt))
    ) {
      throw new BadRequestException('baseUpdatedAt không hợp lệ.');
    }
    const result = await this.prisma.$transaction(async (tx) => {
      const el = await tx.pageElement.findUnique({ where: { id } });
      if (!el)
        throw new NotFoundException(`Không tìm thấy phần tử với ID: ${id}`);

      // Guard first so a conflicting delete leaves nothing behind
      const pageUpdatedAt = await touchPageGuarded(
        tx,
        el.pageId,
        { isCustomized: true },
        baseUpdatedAt,
      );
      const deleted = await tx.pageElement.delete({ where: { id } });
      return { ...deleted, pageUpdatedAt };
    });

    await this.cacheService.touchByPageId(result.pageId);
    return result;
  }

  /**
   * Re-stacks elements of a single page. All ids must exist and belong to the same page
   * (derived from the first element), otherwise the whole request is rejected with 400.
   */
  async reorderZIndex(dto: ReorderElementsDto) {
    if (dto.items.length === 0) return [];

    const ids = dto.items.map((item) => item.id);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(
        'Danh sách sắp xếp chứa ID phần tử bị trùng lặp.',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const first = await tx.pageElement.findUnique({
        where: { id: ids[0] },
        select: { pageId: true },
      });
      if (!first) {
        throw new BadRequestException(`Phần tử không tồn tại: ${ids[0]}`);
      }

      const owned = await tx.pageElement.findMany({
        where: { id: { in: ids }, pageId: first.pageId },
        select: { id: true },
      });
      if (owned.length !== ids.length) {
        throw new BadRequestException(
          'Tất cả phần tử cần sắp xếp phải tồn tại và thuộc cùng một trang.',
        );
      }

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

    await this.cacheService.touchByPageId(result[0].pageId);
    return result;
  }

  /**
   * Batch element update used by the editor autosave. The client always sends complete
   * style / data / interaction objects, so they replace the stored value wholesale (no deep
   * merge — stale keys must not resurrect). Transforms are merged so partial ones stay valid. Elements that do not exist or belong to another
   * page are skipped and reported via `skippedElementIds`.
   *
   * Use `batchUpdate` for the legacy array-only result.
   */
  async batchUpdateWithReport(pageId: string, dto: BatchUpdateElementsDto) {
    const { elements, skippedElementIds } = await this.prisma.$transaction(
      async (tx) => {
        const page = await tx.page.findUnique({ where: { id: pageId } });
        if (!page) throw new NotFoundException(`Page not found: ${pageId}`);

        const ids = dto.elements.map((item) => item.id);
        const existingList = ids.length
          ? await tx.pageElement.findMany({
              where: { id: { in: ids }, pageId },
              select: { id: true, type: true, transform: true },
            })
          : [];
        const existingMap = new Map<
          string,
          { id: string; type: string; transform: any }
        >(existingList.map((el: any) => [el.id, el]));

        const results = [];
        const skipped: string[] = [];
        for (const item of dto.elements) {
          const existing = existingMap.get(item.id);
          if (!existing) {
            skipped.push(item.id);
            continue;
          }

          const { zIndex: _ignore, ...cleanTransform } =
            (item.transform as any) || {};

          const updated = await tx.pageElement.update({
            where: { id: item.id },
            data: {
              ...(item.zIndex !== undefined ? { zIndex: item.zIndex } : {}),
              ...(item.order !== undefined ? { order: item.order } : {}),
              ...(item.visible !== undefined ? { visible: item.visible } : {}),
              ...(item.locked !== undefined ? { locked: item.locked } : {}),
              ...(item.opacity !== undefined ? { opacity: item.opacity } : {}),
              // Transforms may be partial (validated leniently), so they are still merged.
              ...(item.transform !== undefined
                ? {
                    transform: safeDeepMerge(
                      (existing.transform as any) || {},
                      cleanTransform,
                    ),
                  }
                : {}),
              ...(item.style !== undefined
                ? { style: nullableJson(item.style) }
                : {}),
              ...(item.data !== undefined
                ? {
                    data: requiredJson(
                      canonicalizeMediaData(existing.type, item.data),
                    ),
                  }
                : {}),
              ...(item.interaction !== undefined
                ? { interaction: nullableJson(item.interaction) }
                : {}),
            },
          });
          results.push(updated);
        }

        await tx.page.update({
          where: { id: pageId },
          data: { isCustomized: true },
        });

        return { elements: results, skippedElementIds: skipped };
      },
    );

    await this.cacheService.touchByPageId(pageId);
    return { elements, skippedElementIds };
  }

  async batchUpdate(pageId: string, dto: BatchUpdateElementsDto) {
    const { elements } = await this.batchUpdateWithReport(pageId, dto);
    return elements;
  }
}
