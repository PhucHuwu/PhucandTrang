import {
  Controller,
  Get,
  Req,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PublicService } from './public.service';
import { Public } from '../auth/admin-access.guard';

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

    // Check ETag for 304 Not Modified
    const clientEtag = req.headers['if-none-match'];
    if (clientEtag && clientEtag === etag) {
      return res.status(HttpStatus.NOT_MODIFIED).send();
    }

    res.set({
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
      ETag: etag,
    });

    return res.status(HttpStatus.OK).json(document);
  }
}
