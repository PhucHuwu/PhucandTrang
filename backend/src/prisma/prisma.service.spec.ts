import { PrismaService } from './prisma.service';

describe('PrismaService Production Fail-Fast (Req 14)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

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
