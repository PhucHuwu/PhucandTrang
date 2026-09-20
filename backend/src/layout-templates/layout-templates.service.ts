import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

  async create(data: any) {
    return this.prisma.layoutTemplate.create({ data });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.layoutTemplate.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.layoutTemplate.delete({ where: { id } });
  }
}
