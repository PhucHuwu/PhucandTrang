import { PublicController, ifNoneMatchMatches, PUBLIC_JOURNAL_CACHE_CONTROL } from './public.controller';

describe('PublicController ETag / caching', () => {
  const etag = '"book-1-rev4-1790000000000"';

  describe('ifNoneMatchMatches', () => {
    it('matches an exact strong tag', () => {
      expect(ifNoneMatchMatches(etag, etag)).toBe(true);
    });

    it('matches a weak tag (W/ prefix) using weak comparison', () => {
      expect(ifNoneMatchMatches(`W/${etag}`, etag)).toBe(true);
    });

    it('matches inside a comma-separated list', () => {
      expect(ifNoneMatchMatches(`"other", W/${etag} , "third"`, etag)).toBe(true);
    });

    it('matches the * wildcard', () => {
      expect(ifNoneMatchMatches('*', etag)).toBe(true);
    });

    it('does not match different or missing tags', () => {
      expect(ifNoneMatchMatches('"other"', etag)).toBe(false);
      expect(ifNoneMatchMatches(undefined, etag)).toBe(false);
      expect(ifNoneMatchMatches('', etag)).toBe(false);
    });
  });

  function mockRes() {
    const res: any = {};
    res.set = jest.fn().mockReturnValue(res);
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  }

  it('returns 304 with ETag + Cache-Control for a weak If-None-Match', async () => {
    const publicService: any = {
      getPublishedBook: jest.fn().mockResolvedValue({ document: { id: 'book-1' }, etag }),
    };
    const controller = new PublicController(publicService);
    const res = mockRes();

    await controller.getPublishedJournal({ headers: { 'if-none-match': `W/${etag}` } } as any, res);

    expect(res.status).toHaveBeenCalledWith(304);
    expect(res.json).not.toHaveBeenCalled();
    expect(res.set).toHaveBeenCalledWith({ 'Cache-Control': PUBLIC_JOURNAL_CACHE_CONTROL, ETag: etag });
  });

  it('returns 200 with the document and the short cache policy otherwise', async () => {
    const publicService: any = {
      getPublishedBook: jest.fn().mockResolvedValue({ document: { id: 'book-1' }, etag }),
    };
    const controller = new PublicController(publicService);
    const res = mockRes();

    await controller.getPublishedJournal({ headers: {} } as any, res);

    expect(PUBLIC_JOURNAL_CACHE_CONTROL).toBe('public, max-age=30, s-maxage=60, stale-while-revalidate=120');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ id: 'book-1' });
  });
});
