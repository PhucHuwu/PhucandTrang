import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { LayoutTemplatesService } from './layout-templates.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateLayoutTemplateDto } from './dto/create-layout-template.dto';
import { UpdateLayoutTemplateDto } from './dto/update-layout-template.dto';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('layout-templates')
export class LayoutTemplatesController {
  constructor(private templatesService: LayoutTemplatesService) {}

  @Roles(Role.ADMIN, Role.EDITOR, Role.VIEWER)
  @Get()
  async findAll() {
    return this.templatesService.findAll();
  }

  @Roles(Role.ADMIN, Role.EDITOR, Role.VIEWER)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Post()
  async create(@Body() dto: CreateLayoutTemplateDto, @Request() req: any) {
    return this.templatesService.create(dto, req.user?.role);
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLayoutTemplateDto,
    @Request() req: any,
  ) {
    return this.templatesService.update(id, dto, req.user?.role);
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Post(':id/duplicate')
  async duplicate(
    @Param('id') id: string,
    @Body() body: { newId: string; newName?: string },
  ) {
    return this.templatesService.duplicate(id, body.newId, body.newName);
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.templatesService.remove(id, req.user?.role);
  }
}
