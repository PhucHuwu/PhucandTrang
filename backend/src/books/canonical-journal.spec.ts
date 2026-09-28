import { Test, TestingModule } from '@nestjs/testing';
import { BooksService } from './books.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublicCacheService } from '../public/public-cache.service';
import { PublicService } from '../public/public.service';
import { PublishValidationService } from './publish-validation.service';
import { NotFoundException } from '@nestjs/common';
import { CANONICAL_JOURNAL_SLUG } from '../../../shared/journalConfig';

describe('BooksService Canonical Single Love Journal (Prompt 40.2 Architecture)', () => {
  let service: BooksService;
  let prisma: any;
  let cacheService: any;
  let publicService: any;
  let publishValidationService: any;

  beforeEach(async () => {
    prisma = {
      book: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    cacheService = {
      touchBook: jest.fn(),
      invalidateBookCache: jest.fn(),
    };

    publicService = {
      collectAndResolveMedia: jest.fn(),
      compileBookDocument: jest.fn(),
    };

    publishValidationService = {
      validateBookForPublish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        { provide: PrismaService, useValue: prisma },
        { provide: PublicCacheService, useValue: cacheService },
        { provide: PublicService, useValue: publicService },
        { provide: PublishValidationService, useValue: publishValidationService },
      ],
    }).compile();

    service = module.get<BooksService>(BooksService);
  });

  const mockJournal = {
    id: 'journal-phuc-and-trang',
    slug: CANONICAL_JOURNAL_SLUG,
    title: 'Chúng Mình',
    heName: 'Phúc',
    sheName: 'Trang',
    pages: [],
  };

  it('getCanonicalJournal: strictly resolves the canonical single journal by slug phuc-and-trang', async () => {
    prisma.book.findFirst.mockResolvedValue(mockJournal);

    const journal = await service.getCanonicalJournal();
    expect(journal.id).toBe('journal-phuc-and-trang');
    expect(journal.slug).toBe('phuc-and-trang');
    expect(prisma.book.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { slug: 'phuc-and-trang' },
            { slug: 'chung-minh' },
          ],
        },
      }),
    );
  });

  it('getCanonicalJournal: falls back to the earliest created book if slug not found', async () => {
    prisma.book.findFirst
      .mockResolvedValueOnce(null) // first query with slug returns null
      .mockResolvedValueOnce(mockJournal); // fallback query returns earliest book

    const journal = await service.getCanonicalJournal();
    expect(journal.id).toBe('journal-phuc-and-trang');
  });

  it('getCanonicalJournal: throws NotFoundException when no journal exists in database', async () => {
    prisma.book.findFirst.mockResolvedValue(null);

    await expect(service.getCanonicalJournal()).rejects.toThrow(NotFoundException);
  });

  it('getCanonicalJournalId: returns the ID of the single canonical journal', async () => {
    prisma.book.findFirst.mockResolvedValue(mockJournal);

    const id = await service.getCanonicalJournalId();
    expect(id).toBe('journal-phuc-and-trang');
  });
});
