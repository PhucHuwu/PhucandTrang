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
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('books')
export class BooksController {
  constructor(private booksService: BooksService) {}

  @Roles(Role.ADMIN, Role.EDITOR, Role.VIEWER)
  @Get()
  async findAll() {
    return this.booksService.findAll();
  }

  @Roles(Role.ADMIN, Role.EDITOR, Role.VIEWER)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.booksService.findOne(id);
  }

  @Roles(Role.ADMIN, Role.EDITOR, Role.VIEWER)
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.booksService.findBySlug(slug);
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Post()
  async create(@Body() dto: CreateBookDto, @Request() req: any) {
    return this.booksService.create(dto, req.user?.id);
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateBookDto) {
    return this.booksService.update(id, dto, false);
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Patch(':id')
  async patch(@Param('id') id: string, @Body() dto: UpdateBookDto) {
    return this.booksService.update(id, dto, true);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.booksService.remove(id);
  }
}
