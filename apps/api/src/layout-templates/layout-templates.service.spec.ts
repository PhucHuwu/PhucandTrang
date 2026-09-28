import { Test, TestingModule } from '@nestjs/testing';
import { LayoutTemplatesService } from './layout-templates.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { ForbiddenException, ConflictException } from '@nestjs/common';

describe('LayoutTemplatesService (Prompt 17 — Custom Layout Templates)', () => {
  let service: LayoutTemplatesService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      layoutTemplate: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LayoutTemplatesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<LayoutTemplatesService>(LayoutTemplatesService);
  });

  const mockSystemTemplate = {
    id: 'single-hero',
    name: 'Single Hero',
    description: 'System layout',
    slots: [],
    prototypes: [],
    isSystem: true,
  };

  const mockCustomTemplate = {
    id: 'my-custom-layout-1',
    name: 'My Custom Layout',
    description: 'Custom user layout',
    slots: [],
    prototypes: [],
    isSystem: false,
  };

  it('should allow EDITOR to create custom layout with isSystem = false', async () => {
    prisma.layoutTemplate.findUnique.mockResolvedValue(null);
    prisma.layoutTemplate.create.mockResolvedValue(mockCustomTemplate);

    const dto = {
      id: 'my-custom-layout-1',
      name: 'My Custom Layout',
      description: 'Custom user layout',
      slots: [],
      prototypes: [],
      isSystem: false,
    };

    const result = await service.create(dto, Role.EDITOR);

    expect(result).toEqual(mockCustomTemplate);
    expect(prisma.layoutTemplate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: 'my-custom-layout-1',
        isSystem: false,
      }),
    });
  });

  it('should prevent EDITOR from creating isSystem = true layout', async () => {
    prisma.layoutTemplate.findUnique.mockResolvedValue(null);

    const dto = {
      id: 'unauthorized-system-tpl',
      name: 'Fake System Template',
      slots: [],
      prototypes: [],
      isSystem: true, // Not allowed for EDITOR!
    };

    await expect(service.create(dto, Role.EDITOR)).rejects.toThrow(ForbiddenException);
    expect(prisma.layoutTemplate.create).not.toHaveBeenCalled();
  });

  it('should prevent EDITOR from updating isSystem = true template', async () => {
    prisma.layoutTemplate.findUnique.mockResolvedValue(mockSystemTemplate);

    const updateDto = {
      name: 'Hacked System Template',
    };

    await expect(service.update('single-hero', updateDto, Role.EDITOR)).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.layoutTemplate.update).not.toHaveBeenCalled();
  });

  it('should strictly prevent deleting isSystem = true template even by ADMIN', async () => {
    prisma.layoutTemplate.findUnique.mockResolvedValue(mockSystemTemplate);

    await expect(service.remove('single-hero', Role.ADMIN)).rejects.toThrow(ForbiddenException);
    expect(prisma.layoutTemplate.delete).not.toHaveBeenCalled();
  });

  it('should allow deleting custom template (isSystem = false)', async () => {
    prisma.layoutTemplate.findUnique.mockResolvedValue(mockCustomTemplate);
    prisma.layoutTemplate.delete.mockResolvedValue(mockCustomTemplate);

    const result = await service.remove('my-custom-layout-1', Role.EDITOR);

    expect(result).toEqual(mockCustomTemplate);
    expect(prisma.layoutTemplate.delete).toHaveBeenCalledWith({
      where: { id: 'my-custom-layout-1' },
    });
  });

  it('should duplicate template into custom template (isSystem = false)', async () => {
    prisma.layoutTemplate.findUnique
      .mockResolvedValueOnce(mockSystemTemplate) // for findOne(id)
      .mockResolvedValueOnce(null); // for existing check with newId

    prisma.layoutTemplate.create.mockResolvedValue({
      ...mockCustomTemplate,
      id: 'duplicated-layout-1',
      name: 'Single Hero (Bản sao)',
      isSystem: false,
    });

    const result = await service.duplicate('single-hero', 'duplicated-layout-1');

    expect(result.id).toBe('duplicated-layout-1');
    expect(prisma.layoutTemplate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: 'duplicated-layout-1',
        isSystem: false,
      }),
    });
  });
});
