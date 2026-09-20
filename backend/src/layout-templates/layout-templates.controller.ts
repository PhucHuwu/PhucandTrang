import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { LayoutTemplatesService } from './layout-templates.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateLayoutTemplateDto } from './dto/create-layout-template.dto';
import { UpdateLayoutTemplateDto } from './dto/update-layout-template.dto';

@Controller('layout-templates')
export class LayoutTemplatesController {
  constructor(private templatesService: LayoutTemplatesService) {}

  @Get()
  async findAll() {
    return this.templatesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  async create(@Body() dto: CreateLayoutTemplateDto) {
    return this.templatesService.create(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateLayoutTemplateDto) {
    return this.templatesService.update(id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.templatesService.remove(id);
  }
}
