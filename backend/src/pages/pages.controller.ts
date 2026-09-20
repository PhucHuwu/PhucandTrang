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
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

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

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  @Post()
  async create(@Body() dto: CreatePageDto) {
    return this.pagesService.create(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePageDto) {
    return this.pagesService.update(id, dto, false);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  @Patch(':id')
  async patch(@Param('id') id: string, @Body() dto: UpdatePageDto) {
    return this.pagesService.update(id, dto, true);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  @Post(':id/duplicate')
  async duplicate(@Param('id') id: string, @Body() dto: DuplicatePageDto) {
    return this.pagesService.duplicate(id, dto?.targetPageNumber);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  @Put('book/:bookId/reorder')
  async reorder(@Param('bookId') bookId: string, @Body() dto: ReorderPagesDto) {
    return this.pagesService.reorder(bookId, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.pagesService.remove(id);
  }
}
