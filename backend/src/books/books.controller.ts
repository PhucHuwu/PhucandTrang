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

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  @Post()
  async create(@Body() dto: CreateBookDto, @Request() req: any) {
    return this.booksService.create(dto, req.user?.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateBookDto) {
    return this.booksService.update(id, dto, false);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  @Patch(':id')
  async patch(@Param('id') id: string, @Body() dto: UpdateBookDto) {
    return this.booksService.update(id, dto, true);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.booksService.remove(id);
  }
}
