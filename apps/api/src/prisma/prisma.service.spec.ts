import { PrismaService } from './prisma.service';

describe('PrismaService Lifecycle & Hardened Shutdown (Prompt 13.9 Req 2, 11, 12, 14)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Production Fail-Fast', () => {
    it('should throw fatal error during instantiation in production when DATABASE_URL is missing', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.DATABASE_URL;

      expect(() => new PrismaService()).toThrow(
        'FATAL: DATABASE_URL environment variable must be provided in production mode!',
      );
    });

    it('should allow instantiation in development with fallback URL if DATABASE_URL is missing', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.DATABASE_URL;

      expect(() => new PrismaService()).not.toThrow();
    });
  });

  describe('Hardened onModuleDestroy Cleanup', () => {
    it('should disconnect Prisma and close the pool on shutdown', async () => {
      const service = new PrismaService();
      const disconnectSpy = jest.spyOn(service, '$disconnect').mockResolvedValue(undefined as any);
      const poolEndSpy = jest.spyOn((service as any).pool, 'end').mockResolvedValue(undefined as any);

      await service.onModuleDestroy();

      expect(disconnectSpy).toHaveBeenCalledTimes(1);
      expect(poolEndSpy).toHaveBeenCalledTimes(1);
    });

    it('should still close pool even if $disconnect throws an error', async () => {
      const service = new PrismaService();
      const disconnectSpy = jest
        .spyOn(service, '$disconnect')
        .mockRejectedValue(new Error('Network disconnected already'));
      const poolEndSpy = jest.spyOn((service as any).pool, 'end').mockResolvedValue(undefined as any);

      // Should not throw or crash shutdown
      await expect(service.onModuleDestroy()).resolves.not.toThrow();

      expect(disconnectSpy).toHaveBeenCalledTimes(1);
      expect(poolEndSpy).toHaveBeenCalledTimes(1);
    });
  });
});
