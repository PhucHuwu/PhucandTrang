import { Test, TestingModule } from '@nestjs/testing';
import { BooksService } from './books.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublicCacheService } from '../public/public-cache.service';

describe('BooksService Nullable Audio Semantics (Prompt 13.9 Req 3, 4, 9)', () => {
  let service: BooksService;
  let prisma: any;
  let cacheService: any;

  beforeEach(async () => {
    prisma = {
      book: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    cacheService = {
      touchBook: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        { provide: PrismaService, useValue: prisma },
        { provide: PublicCacheService, useValue: cacheService },
      ],
    }).compile();

    service = module.get<BooksService>(BooksService);
  });

  const mockExistingBook = {
    id: 'book-1',
    slug: 'phuc-and-trang',
    title: 'Chúng Mình',
    backgroundMusicId: 'track-1',
    cover: {},
    settings: {},
  };

  it('Case A: PATCH backgroundMusicId = null should set backgroundMusicId to null (disable music)', async () => {
    prisma.book.findUnique.mockResolvedValue(mockExistingBook);
    prisma.book.update.mockResolvedValue({ ...mockExistingBook, backgroundMusicId: null });

    const patchDto = { backgroundMusicId: null };
    await service.update('book-1', patchDto, true);

    expect(prisma.book.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'book-1' },
        data: expect.objectContaining({
          backgroundMusicId: null,
        }),
      }),
    );
    expect(cacheService.touchBook).toHaveBeenCalledWith('book-1');
  });

  it('Case B: PATCH backgroundMusicId = "track-2" should switch backgroundMusicId to "track-2"', async () => {
    prisma.book.findUnique.mockResolvedValue(mockExistingBook);
    prisma.book.update.mockResolvedValue({ ...mockExistingBook, backgroundMusicId: 'track-2' });

    const patchDto = { backgroundMusicId: 'track-2' };
    await service.update('book-1', patchDto, true);

    expect(prisma.book.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'book-1' },
        data: expect.objectContaining({
          backgroundMusicId: 'track-2',
        }),
      }),
    );
    expect(cacheService.touchBook).toHaveBeenCalledWith('book-1');
  });

  it('Case C: PATCH { title: "Updated" } without audio fields must NOT touch backgroundMusicId in Prisma update', async () => {
    prisma.book.findUnique.mockResolvedValue(mockExistingBook);
    prisma.book.update.mockResolvedValue({ ...mockExistingBook, title: 'Updated' });

    const patchDto = { title: 'Updated' };
    await service.update('book-1', patchDto, true);

    const updateCall = prisma.book.update.mock.calls[0][0];
    expect(updateCall.data.title).toBe('Updated');
    expect('backgroundMusicId' in updateCall.data).toBe(false);
    expect(cacheService.touchBook).toHaveBeenCalledWith('book-1');
  });
});
