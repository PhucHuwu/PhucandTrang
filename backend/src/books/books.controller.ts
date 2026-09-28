import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BooksService } from './books.service';
import { UpdateBookDto } from './dto/update-book.dto';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('books')
export class BooksController {
  constructor(private booksService: BooksService) {}

  @Get()
  async findAll() {
    return this.booksService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.booksService.findOne(id);
  }

  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.booksService.findBySlug(slug);
  }

  /**
   * Prompt 34: Run pre-publish validation report without altering database
   */
  @Get(':id/validate-publish')
  async validateForPublish(@Param('id') id: string) {
    return this.booksService.validateForPublish(id);
  }

  /**
   * Prompt 23: Previews current editing draft without affecting public viewers
   */
  @Get(':id/preview')
  async previewDraft(@Param('id') id: string) {
    return this.booksService.previewDraft(id);
  }

  /**
   * Prompt 23, 24 & 34: Publishes current draft to live public site with validation check
   */
  @Post(':id/publish')
  async publishBook(
    @Param('id') id: string,
    @Body() body: { changelog?: string } = {},
    @Request() req: any,
  ) {
    return this.booksService.publishBook(id, body?.changelog, req.user?.id);
  }

  @Post(':id/archive')
  async archiveBook(@Param('id') id: string) {
    return this.booksService.updateStatus(id, 'ARCHIVED' as any);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateBookDto) {
    return this.booksService.update(id, dto, false);
  }

  @Patch(':id')
  async patch(@Param('id') id: string, @Body() dto: UpdateBookDto) {
    return this.booksService.update(id, dto, true);
  }
}
