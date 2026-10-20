import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Request,
} from '@nestjs/common';
import { BooksService } from './books.service';
import { UpdateBookDto } from './dto/update-book.dto';
import { PublishBookDto } from './dto/publish-book.dto';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

/**
 * JournalController
 * =====================
 * Single Love Journal CMS Endpoint (/api/journal)
 * Directly manages the single canonical journal for Phúc & Trang without multi-book routing.
 */
@Controller('journal')
export class JournalController {
  constructor(private booksService: BooksService) {}

  @Get()
  async getJournal() {
    return this.booksService.getCanonicalJournal();
  }

  @Patch()
  async updateJournal(@Body() dto: UpdateBookDto) {
    const journalId = await this.booksService.getCanonicalJournalId();
    return this.booksService.update(journalId, dto, true);
  }

  @Get('preview')
  async previewJournal() {
    const journalId = await this.booksService.getCanonicalJournalId();
    return this.booksService.previewDraft(journalId);
  }

  @Get('validate-publish')
  async validateJournalForPublish() {
    const journalId = await this.booksService.getCanonicalJournalId();
    return this.booksService.validateForPublish(journalId);
  }

  @Roles(Role.ADMIN)
  @Post('publish')
  async publishJournal(
    @Body() body: PublishBookDto = {},
    @Request() req: any,
  ) {
    const journalId = await this.booksService.getCanonicalJournalId();
    return this.booksService.publishBook(journalId, body?.changelog, req.user?.id);
  }

  @Roles(Role.ADMIN)
  @Post('archive')
  async archiveJournal() {
    const journalId = await this.booksService.getCanonicalJournalId();
    return this.booksService.updateStatus(journalId, 'ARCHIVED' as any);
  }
}
