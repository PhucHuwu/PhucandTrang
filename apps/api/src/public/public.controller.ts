import { Controller, Get, Req, Res, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { PublicService } from './public.service';
import { Public } from '../auth/admin-access.guard';

export const PUBLIC_JOURNAL_CACHE_CONTROL =
  'public, max-age=30, s-maxage=60, stale-while-revalidate=120';

const stripWeak = (tag: string) => (tag.startsWith('W/') ? tag.slice(2) : tag);

/**
 * If-None-Match uses the weak comparison function: `W/"x"` matches `"x"`, the header may
 * carry a comma-separated list, and `*` matches any current representation.
 */
export function ifNoneMatchMatches(
  header: string | string[] | undefined,
  etag: string,
): boolean {
  if (!header) return false;
  const raw = Array.isArray(header) ? header.join(',') : header;
  const target = stripWeak(etag.trim());
  return raw
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .some((tag) => tag === '*' || stripWeak(tag) === target);
}

@Public()
@Controller('public')
export class PublicController {
  constructor(private publicService: PublicService) {}

  /**
   * Public Journal Endpoint: GET /api/public/journal
   * Returns the published snapshot of the site's single love journal.
   */
  @Get('journal')
  async getPublishedJournal(@Req() req: Request, @Res() res: Response) {
    const { document, etag } = await this.publicService.getPublishedBook();

    res.set({
      'Cache-Control': PUBLIC_JOURNAL_CACHE_CONTROL,
      ETag: etag,
    });

    // Check ETag for 304 Not Modified (weak comparison, list and "*" supported per RFC 9110)
    if (ifNoneMatchMatches(req.headers['if-none-match'], etag)) {
      return res.status(HttpStatus.NOT_MODIFIED).send();
    }

    res.set('Content-Type', 'application/json');

    return res.status(HttpStatus.OK).json(document);
  }
}
