/**
 * Canonicalizes media-backed element data before persistence.
 * When a mediaId/posterMediaId exists, URLs are runtime-only and are resolved
 * from the Media table by the Admin/Public compilers.
 */
export function canonicalizeMediaData<
  T extends Record<string, any> | null | undefined,
>(type: string, data: T): T {
  if (!data) return data;
  const canonical: Record<string, any> = { ...data };

  if ((type === 'IMAGE' || type === 'VIDEO') && canonical.mediaId) {
    delete canonical.src;
    delete canonical.url;
  }

  if (type === 'VIDEO' && canonical.posterMediaId) {
    delete canonical.thumbnailUrl;
    delete canonical.posterUrl;
  }

  return canonical as T;
}
