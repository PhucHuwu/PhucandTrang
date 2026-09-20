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
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

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

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  @Post('page-elements')
  async create(@Body() dto: CreatePageElementDto) {
    return this.elementsService.create(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  @Put('page-elements/:id')
  async update(@Param('id') id: string, @Body() dto: UpdatePageElementDto) {
    return this.elementsService.update(id, dto, false);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  @Patch('page-elements/:id')
  async patch(@Param('id') id: string, @Body() dto: UpdatePageElementDto) {
    return this.elementsService.update(id, dto, true);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  @Post('page-elements/:id/duplicate')
  async duplicate(@Param('id') id: string, @Body() dto: DuplicateElementDto) {
    return this.elementsService.duplicate(id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  @Put('page-elements/reorder')
  async reorderZIndex(@Body() dto: ReorderElementsDto) {
    return this.elementsService.reorderZIndex(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  @Patch('pages/:pageId/elements/batch')
  async batchUpdatePage(
    @Param('pageId') pageId: string,
    @Body() dto: BatchUpdateElementsDto,
  ) {
    return this.elementsService.batchUpdate(pageId, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('page-elements/:id')
  async remove(@Param('id') id: string) {
    return this.elementsService.remove(id);
  }
}
