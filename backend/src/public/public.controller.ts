import {
  Controller,
  Get,
  Param,
  Req,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PublicService } from './public.service';

@Controller('public')
export class PublicController {
  constructor(private publicService: PublicService) {}

  /**
   * Primary Public Book API endpoint
   * GET /api/public/books/:slug
   */
  @Get('books/:slug')
  async getPublishedBook(
    @Param('slug') slug: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { document, etag } = await this.publicService.getPublishedBook(slug);

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

  /**
   * Convenience alias: GET /api/public/book/:slug
   */
  @Get('book/:slug')
  async getPublishedBookAlias(
    @Param('slug') slug: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.getPublishedBook(slug, req, res);
  }

  /**
   * Convenience default endpoint: GET /api/public/book (returns master published book)
   */
  @Get('book')
  async getMasterBook(@Req() req: Request, @Res() res: Response) {
    const { document, etag } = await this.publicService.getMasterBook();

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
