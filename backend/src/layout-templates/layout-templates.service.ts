import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLayoutTemplateDto } from './dto/create-layout-template.dto';
import { UpdateLayoutTemplateDto } from './dto/update-layout-template.dto';

@Injectable()
export class LayoutTemplatesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.layoutTemplate.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.layoutTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException(`Layout template not found: ${id}`);
    return template;
  }

  async create(dto: CreateLayoutTemplateDto) {
    const existing = await this.prisma.layoutTemplate.findUnique({ where: { id: dto.id } });
    if (existing) {
      throw new ConflictException(`Layout template "${dto.id}" already exists`);
    }

    return this.prisma.layoutTemplate.create({
      data: {
        id: dto.id,
        name: dto.name,
        description: dto.description,
        slots: dto.slots as any,
        prototypes: dto.prototypes as any,
        isSystem: dto.isSystem ?? false,
      },
    });
  }

  async update(id: string, dto: UpdateLayoutTemplateDto) {
    await this.findOne(id);
    return this.prisma.layoutTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        slots: dto.slots ? (dto.slots as any) : undefined,
        prototypes: dto.prototypes ? (dto.prototypes as any) : undefined,
        isSystem: dto.isSystem,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.layoutTemplate.delete({ where: { id } });
  }
}
