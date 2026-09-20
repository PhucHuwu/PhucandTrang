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
} from '@nestjs/common';
import { PagesService } from './pages.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { ReorderPagesDto } from './dto/reorder-pages.dto';
import { DuplicatePageDto } from './dto/duplicate-page.dto';
import { BatchUpdateElementsDto } from '../page-elements/dto/batch-update-elements.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('pages')
export class PagesController {
  constructor(private pagesService: PagesService) {}

  @Get('book/:bookId')
  async findByBook(@Param('bookId') bookId: string) {
    return this.pagesService.findByBook(bookId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.pagesService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(@Body() dto: CreatePageDto) {
    return this.pagesService.create(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePageDto) {
    return this.pagesService.update(id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/duplicate')
  async duplicate(@Param('id') id: string, @Body() dto: DuplicatePageDto) {
    return this.pagesService.duplicate(id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.pagesService.remove(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('book/:bookId/reorder')
  async reorder(
    @Param('bookId') bookId: string,
    @Body() dto: ReorderPagesDto,
  ) {
    return this.pagesService.reorder(bookId, dto);
  }

  /**
   * Batch update multiple elements on a page at once (drag/drop/resize/reorder)
   * Example: PATCH /api/pages/:pageId/elements/batch
   */
  @UseGuards(AuthGuard('jwt'))
  @Patch(':pageId/elements/batch')
  async batchUpdateElements(
    @Param('pageId') pageId: string,
    @Body() dto: BatchUpdateElementsDto,
  ) {
    return this.pagesService.batchUpdateElements(pageId, dto);
  }
}
