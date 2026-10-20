import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLayoutTemplateDto } from './dto/create-layout-template.dto';
import { UpdateLayoutTemplateDto } from './dto/update-layout-template.dto';
import { Role } from '@prisma/client';
import { LAYOUT_PRESETS } from '@phucandtrang/shared';

@Injectable()
export class LayoutTemplatesService implements OnModuleInit {
  private readonly logger = new Logger(LayoutTemplatesService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Seeds the built-in presets once at boot (idempotent). Failures are logged and never
   * block startup: pages still accept preset ids, which are upserted on demand.
   */
  async onModuleInit() {
    try {
      await this.ensureSystemPresets();
    } catch (err) {
      this.logger.error(
        'Không thể khởi tạo layout template hệ thống khi khởi động',
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  async ensureSystemPresets() {
    const result = await this.prisma.layoutTemplate.createMany({
      data: Object.values(LAYOUT_PRESETS).map((preset) => ({
        id: preset.id,
        name: preset.name,
        description: preset.description,
        slots: preset.slots as any,
        prototypes: preset.elementPrototypes as any,
        isSystem: true,
      })),
      skipDuplicates: true,
    });
    if (result?.count) {
      this.logger.log(
        `Đã tạo ${result.count} layout template hệ thống còn thiếu`,
      );
    }
  }

  async findAll() {
    return this.prisma.layoutTemplate.findMany({
      orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.layoutTemplate.findUnique({
      where: { id },
    });
    if (!template)
      throw new NotFoundException(`Layout template not found: ${id}`);
    return template;
  }

  /**
   * Creates a new layout template.
   * Custom templates created from normal editor have isSystem = false.
   * Only ADMIN can create system templates (isSystem = true).
   */
  async create(dto: CreateLayoutTemplateDto, userRole?: Role) {
    const existing = await this.prisma.layoutTemplate.findUnique({
      where: { id: dto.id },
    });
    if (existing) {
      throw new ConflictException(
        `Bố cục với mã "${dto.id}" đã tồn tại. Vui lòng chọn mã khác.`,
      );
    }

    const isSystemRequested = dto.isSystem ?? false;
    if (isSystemRequested && userRole !== Role.ADMIN) {
      throw new ForbiddenException(
        'Chỉ tài khoản ADMIN mới có quyền tạo Layout Template hệ thống.',
      );
    }

    return this.prisma.layoutTemplate.create({
      data: {
        id: dto.id,
        name: dto.name,
        description: dto.description,
        slots: dto.slots as any,
        prototypes: dto.prototypes as any,
        isSystem: isSystemRequested,
      },
    });
  }

  /**
   * Updates an existing layout template.
   * Strictly prevents overwriting system templates from normal editors unless user is ADMIN.
   */
  async update(id: string, dto: UpdateLayoutTemplateDto, userRole?: Role) {
    const existing = await this.findOne(id);

    if (existing.isSystem && userRole !== Role.ADMIN) {
      throw new ForbiddenException(
        `Không thể sửa bố cục hệ thống "${existing.name}". Bố cục hệ thống được bảo vệ và chỉ ADMIN mới có quyền sửa đổi.`,
      );
    }

    return this.prisma.layoutTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        slots: dto.slots ? (dto.slots as any) : undefined,
        prototypes: dto.prototypes ? (dto.prototypes as any) : undefined,
        isSystem:
          userRole === Role.ADMIN && dto.isSystem !== undefined
            ? dto.isSystem
            : existing.isSystem,
      },
    });
  }

  /**
   * Duplicates an existing layout template into a new custom layout template.
   */
  async duplicate(id: string, newId: string, newName?: string) {
    const original = await this.findOne(id);
    const existing = await this.prisma.layoutTemplate.findUnique({
      where: { id: newId },
    });
    if (existing) {
      throw new ConflictException(
        `Mã bố cục "${newId}" đã tồn tại. Vui lòng chọn mã khác.`,
      );
    }

    return this.prisma.layoutTemplate.create({
      data: {
        id: newId,
        name: newName || `${original.name} (Bản sao)`,
        description: original.description
          ? `${original.description} (Sao chép từ ${original.name})`
          : undefined,
        slots: original.slots as any,
        prototypes: original.prototypes as any,
        isSystem: false, // Duplicated templates are always custom
      },
    });
  }

  /**
   * Removes a layout template.
   * Strictly prevents deleting system templates (isSystem = true).
   */
  async remove(id: string, _userRole?: Role) {
    const existing = await this.findOne(id);

    if (existing.isSystem) {
      throw new ForbiddenException(
        `Không thể xóa bố cục hệ thống "${existing.name}". Bố cục hệ thống là mặc định và không được phép xóa.`,
      );
    }

    return this.prisma.layoutTemplate.delete({ where: { id } });
  }
}
