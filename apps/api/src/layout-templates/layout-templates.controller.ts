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
import { CreateLayoutTemplateDto } from './dto/create-layout-template.dto';
import { UpdateLayoutTemplateDto } from './dto/update-layout-template.dto';

@UseGuards(AuthGuard('jwt'))
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

  @Post()
  async create(@Body() dto: CreateLayoutTemplateDto, @Request() req: any) {
    return this.templatesService.create(dto, req.user?.role || 'ADMIN');
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLayoutTemplateDto,
    @Request() req: any,
  ) {
    return this.templatesService.update(id, dto, req.user?.role || 'ADMIN');
  }

  @Post(':id/duplicate')
  async duplicate(
    @Param('id') id: string,
    @Body() body: { newId: string; newName?: string },
  ) {
    return this.templatesService.duplicate(id, body.newId, body.newName);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.templatesService.remove(id, req.user?.role || 'ADMIN');
  }
}
