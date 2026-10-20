import { BadRequestException } from '@nestjs/common';
import { safeDeepMerge, LAYOUT_PRESETS } from '@phucandtrang/shared';
import { derivePageSideEnum } from '../utils/page-utils';
import { nullableJson, requiredJson } from '../common/prisma-json';
import { canonicalizeMediaData } from '../common/media-data';
import { SaveElementItemDto, SavePageFieldsDto } from './dto/save-page.dto';

export const PAGE_DETAIL_INCLUDE = {
  elements: { orderBy: { zIndex: 'asc' as const } },
  layoutTemplate: true,
  audioTrack: true,
};

/** Replaces element `src` / `thumbnailUrl` with the current URL of their referenced Media rows. */
export async function resolveElementMediaUrls<T extends { elements?: any[] }>(
  prisma: any,
  page: T,
): Promise<T> {
  const ids = new Set<string>();
  for (const el of page.elements || []) {
    const data = (el.data as any) || {};
    if (data.mediaId) ids.add(data.mediaId);
    if (data.posterMediaId) ids.add(data.posterMediaId);
  }

  if (ids.size === 0) return page;

  const media = await prisma.media.findMany({
    where: { id: { in: Array.from(ids) } },
    select: { id: true, url: true, alt: true },
  });
  const mediaMap = new Map<string, { id: string; url: string; alt: any }>(
    media.map((item: any) => [item.id, item]),
  );

  return {
    ...page,
    elements: (page.elements || []).map((el) => {
      const data = { ...((el.data as any) || {}) };
      const source = data.mediaId ? mediaMap.get(data.mediaId) : undefined;
      const poster = data.posterMediaId
        ? mediaMap.get(data.posterMediaId)
        : undefined;

      if (source) {
        data.src = source.url;
        data.alt = data.alt || source.alt;
      }
      if (poster) {
        data.thumbnailUrl = poster.url;
      }

      return { ...el, data };
    }),
  } as T;
}

/**
 * Rejects unknown layout template ids with a 400 instead of letting the FK constraint
 * surface as a 500. `undefined`/`null` (no template) is always accepted.
 */
export async function assertLayoutTemplateExists(
  client: any,
  layoutTemplateId?: string | null,
) {
  if (layoutTemplateId === undefined || layoutTemplateId === null) return;
  const preset = LAYOUT_PRESETS[layoutTemplateId];
  if (preset) {
    // Built-in presets are valid even if boot-time seeding has not inserted the row yet.
    await client.layoutTemplate.upsert({
      where: { id: preset.id },
      create: {
        id: preset.id,
        name: preset.name,
        description: preset.description,
        slots: preset.slots as any,
        prototypes: preset.elementPrototypes as any,
        isSystem: true,
      },
      update: {},
    });
    return;
  }
  const tpl = await client.layoutTemplate.findUnique({
    where: { id: layoutTemplateId },
    select: { id: true },
  });
  if (!tpl) {
    throw new BadRequestException(
      `Layout template không tồn tại: ${layoutTemplateId}`,
    );
  }
}

/**
 * Renumbers the physical sequence of a book's pages: order = 0..N-1, side = derivePageSideEnum(order).
 * Display pageNumber is never touched.
 */
export async function renumberBookPages(tx: any, bookId: string) {
  const pages = await tx.page.findMany({
    where: { bookId },
    orderBy: [{ order: 'asc' }, { pageNumber: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, order: true, side: true, pageNumber: true },
  });

  // Update physical order and side; strictly preserve display pageNumber
  for (let i = 0; i < pages.length; i++) {
    const side = derivePageSideEnum(i);
    await tx.page.update({
      where: { id: pages[i].id },
      data: {
        order: i,
        side,
      },
    });
  }
}

/** Element create payload instantiated from a layout prototype for a new page. */
export function buildElementFromPrototype(
  pageId: string,
  proto: any,
  text: { title?: string; chapter?: string; quote?: string },
) {
  const { zIndex: _ignore, ...cleanTransform } = proto.transform || {};
  const elementData: any = { ...(proto.defaultData || {}) };
  if (proto.slot === 'title' && text.title) {
    elementData.text = text.title;
  } else if (proto.slot === 'subtitle' && text.chapter) {
    elementData.text = text.chapter;
  } else if (proto.slot === 'quote' && text.quote) {
    elementData.text = text.quote;
  }

  return {
    pageId,
    type: proto.defaultType,
    slot: proto.slot,
    zIndex: proto.zIndex,
    order: proto.zIndex,
    visible: true,
    locked: false,
    opacity: 1.0,
    transform: cleanTransform,
    style: proto.style || {},
    data: elementData,
  };
}

/** Nested element create payload copying an existing element (page duplication). */
export function buildDuplicatedElement(el: any) {
  return {
    type: el.type,
    slot: el.slot,
    order: el.order,
    zIndex: el.zIndex,
    visible: el.visible,
    locked: el.locked,
    opacity: el.opacity,
    transform: requiredJson(el.transform),
    style: nullableJson(el.style),
    // findOne resolves media URLs at runtime; never persist them back
    data: requiredJson(canonicalizeMediaData(el.type, el.data as any)),
    interaction: nullableJson(el.interaction),
  };
}

/** Element create payload for apply-layout. */
export function buildAppliedLayoutElement(pageId: string, el: any) {
  const { zIndex: _ignore, ...cleanTransform } = el.transform || {};
  return {
    pageId,
    type: el.type,
    slot: el.slot || null,
    zIndex: el.zIndex,
    order: el.order !== undefined ? el.order : el.zIndex,
    visible: el.visible !== false,
    locked: Boolean(el.locked),
    opacity: el.opacity !== undefined ? el.opacity : 1.0,
    transform: cleanTransform,
    style: el.style || {},
    data: requiredJson(canonicalizeMediaData(el.type, el.data)),
    interaction: nullableJson(el.interaction ?? null),
  };
}

/** Page column updates for an atomic save; only fields present in the payload are written. */
export function buildSavePageData(
  fields: SavePageFieldsDto,
): Record<string, any> {
  return {
    ...(fields.title !== undefined ? { title: fields.title } : {}),
    ...(fields.chapter !== undefined ? { chapter: fields.chapter } : {}),
    ...(fields.quote !== undefined ? { quote: fields.quote } : {}),
    ...(fields.handwriting !== undefined
      ? { handwriting: fields.handwriting }
      : {}),
    ...(fields.background !== undefined
      ? { background: requiredJson(fields.background) }
      : {}),
    ...(fields.audioTrackId !== undefined
      ? { audioTrackId: fields.audioTrackId }
      : {}),
    ...(fields.layoutTemplateId !== undefined
      ? { layoutTemplateId: fields.layoutTemplateId }
      : {}),
    ...(fields.sourceTemplateId !== undefined
      ? { sourceTemplateId: fields.sourceTemplateId }
      : {}),
    ...(fields.layoutMode !== undefined
      ? { layoutMode: fields.layoutMode }
      : {}),
    ...(fields.isCustomized !== undefined
      ? { isCustomized: fields.isCustomized }
      : {}),
    // Always bump so every save yields a fresh baseUpdatedAt for the client
    updatedAt: new Date(),
  };
}

/** Strips the stray `zIndex` some clients put inside `transform`. */
export function cleanElementTransform(transform: unknown): Record<string, any> {
  const { zIndex: _ignore, ...cleanTransform } = (transform as any) || {};
  return cleanTransform;
}

/** Partial update payload for an existing element in an atomic save. */
export function buildSavedElementUpdate(
  item: SaveElementItemDto,
  found: { type: string; transform: any },
  cleanTransform: Record<string, any>,
) {
  return {
    ...(item.slot !== undefined ? { slot: item.slot } : {}),
    ...(item.zIndex !== undefined ? { zIndex: item.zIndex } : {}),
    ...(item.order !== undefined ? { order: item.order } : {}),
    ...(item.visible !== undefined ? { visible: item.visible } : {}),
    ...(item.locked !== undefined ? { locked: item.locked } : {}),
    ...(item.opacity !== undefined ? { opacity: item.opacity } : {}),
    // Transforms may be partial (validated leniently), so they are merged.
    ...(item.transform !== undefined
      ? {
          transform: safeDeepMerge(
            (found.transform as any) || {},
            cleanTransform,
          ),
        }
      : {}),
    ...(item.style !== undefined ? { style: nullableJson(item.style) } : {}),
    ...(item.data !== undefined
      ? {
          data: requiredJson(canonicalizeMediaData(found.type, item.data)),
        }
      : {}),
    ...(item.interaction !== undefined
      ? { interaction: nullableJson(item.interaction) }
      : {}),
  };
}

/** Create payload re-creating a missing element (e.g. undo of a delete) with its original id. */
export function buildRecreatedElement(
  pageId: string,
  item: SaveElementItemDto,
  cleanTransform: Record<string, any>,
) {
  const zIndex = item.zIndex ?? 1;
  return {
    id: item.id,
    pageId,
    type: item.type,
    slot: item.slot ?? null,
    zIndex,
    order: item.order ?? zIndex,
    visible: item.visible ?? true,
    locked: item.locked ?? false,
    opacity: item.opacity ?? 1.0,
    transform: requiredJson(cleanTransform),
    style: nullableJson(item.style),
    data: requiredJson(canonicalizeMediaData(item.type, item.data)),
    interaction: nullableJson(item.interaction),
  };
}
