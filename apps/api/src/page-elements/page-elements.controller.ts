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
import { PageElementsService } from './page-elements.service';
import { CreatePageElementDto } from './dto/create-page-element.dto';
import { UpdatePageElementDto } from './dto/update-page-element.dto';
import { BatchUpdateElementsDto } from './dto/batch-update-elements.dto';
import { ReorderElementsDto } from './dto/reorder-elements.dto';
import { DuplicateElementDto } from './dto/duplicate-element.dto';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller()
export class PageElementsController {
  constructor(private elementsService: PageElementsService) {}

  @Get('pages/:pageId/elements')
  async findByPage(@Param('pageId') pageId: string) {
    return this.elementsService.findByPage(pageId);
  }

  @Get('page-elements/:id')
  async findOne(@Param('id') id: string) {
    return this.elementsService.findOne(id);
  }

  @Post('page-elements')
  async create(@Body() dto: CreatePageElementDto) {
    return this.elementsService.create(dto);
  }

  @Put('page-elements/:id')
  async update(@Param('id') id: string, @Body() dto: UpdatePageElementDto) {
    return this.elementsService.update(id, dto, false);
  }

  @Patch('page-elements/:id')
  async patch(@Param('id') id: string, @Body() dto: UpdatePageElementDto) {
    return this.elementsService.update(id, dto, true);
  }

  @Post('page-elements/:id/duplicate')
  async duplicate(@Param('id') id: string, @Body() dto: DuplicateElementDto) {
    return this.elementsService.duplicate(id, dto);
  }

  @Put('page-elements/reorder')
  async reorder(@Body() dto: ReorderElementsDto) {
    return this.elementsService.reorderZIndex(dto);
  }

  @Patch('pages/:pageId/elements/batch')
  async batchUpdate(
    @Param('pageId') pageId: string,
    @Body() dto: BatchUpdateElementsDto,
  ) {
    return this.elementsService.batchUpdate(pageId, dto);
  }

  @Delete('page-elements/:id')
  async remove(@Param('id') id: string) {
    return this.elementsService.remove(id);
  }
}
