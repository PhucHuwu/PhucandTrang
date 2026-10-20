import { UnauthorizedException } from '@nestjs/common';
import { validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { resolveClient } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { passwordFingerprint, requireJwtSecret } from './jwt-secret';
import { LoginDto } from './dto/login.dto';

describe('Auth hardening', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('resolveClient (x-client-ip trust)', () => {
    const req = (headers: Record<string, string>) => ({ headers, ip: '10.0.0.1' });

    it('trusts x-client-ip only with the correct x-bff-secret when BFF_SHARED_SECRET is set', () => {
      process.env.BFF_SHARED_SECRET = 'shared-secret-value';
      expect(
        resolveClient(req({ 'x-client-ip': '203.0.113.5', 'x-bff-secret': 'shared-secret-value' })).clientId,
      ).toBe('203.0.113.5');
      expect(resolveClient(req({ 'x-client-ip': '203.0.113.5', 'x-bff-secret': 'wrong' })).clientId).toBe(
        '10.0.0.1',
      );
      expect(resolveClient(req({ 'x-client-ip': '203.0.113.5' })).clientId).toBe('10.0.0.1');
    });

    it('keeps trusting x-client-ip (with a one-time warning) when BFF_SHARED_SECRET is not set', () => {
      delete process.env.BFF_SHARED_SECRET;
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      expect(resolveClient(req({ 'x-client-ip': '203.0.113.5' })).clientId).toBe('203.0.113.5');
      resolveClient(req({ 'x-client-ip': '203.0.113.6' }));
      expect(warn.mock.calls.length).toBeLessThanOrEqual(1);
    });

    it('uses the connecting address as the source id', () => {
      expect(resolveClient(req({ 'x-forwarded-for': '198.51.100.1, 10.0.0.2' })).sourceId).toBe('198.51.100.1');
    });
  });

  describe('JwtStrategy password fingerprint', () => {
    const secret = 'a-sufficiently-long-test-secret-0123456789';
    const makeStrategy = (user: any) => {
      const prisma = { user: { findUnique: jest.fn().mockResolvedValue(user) } };
      const config = { get: jest.fn(() => secret) };
      return new JwtStrategy(config as any, prisma as any);
    };
    const user = { id: 'u1', email: 'a@b.c', name: 'A', role: 'ADMIN', passwordHash: 'hash-v1' };

    it('accepts a token whose pwf matches the current password hash', async () => {
      const result = await makeStrategy(user).validate({ sub: 'u1', pwf: passwordFingerprint('hash-v1', secret) });
      expect(result).toEqual({ id: 'u1', email: 'a@b.c', name: 'A', role: 'ADMIN' });
    });

    it('rejects a token issued before the password changed', async () => {
      await expect(
        makeStrategy({ ...user, passwordHash: 'hash-v2' }).validate({
          sub: 'u1',
          pwf: passwordFingerprint('hash-v1', secret),
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('accepts legacy tokens without pwf', async () => {
      await expect(makeStrategy(user).validate({ sub: 'u1' })).resolves.toMatchObject({ id: 'u1' });
    });

    it('rejects a malformed pwf', async () => {
      await expect(makeStrategy(user).validate({ sub: 'u1', pwf: 'x' })).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('requireJwtSecret', () => {
    it('only warns (does not throw) for a short production secret', () => {
      process.env.NODE_ENV = 'production';
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      expect(requireJwtSecret('short-secret')).toBe('short-secret');
      expect(warn).toHaveBeenCalled();
    });

    it('still rejects a missing or leaked default secret', () => {
      expect(() => requireJwtSecret(undefined)).toThrow();
      expect(() => requireJwtSecret('super_secret_romantic_jwt_key')).toThrow();
    });
  });

  it('LoginDto rejects passwords longer than 256 characters', () => {
    expect(validateSync(plainToInstance(LoginDto, { pass: 'a'.repeat(256) }))).toHaveLength(0);
    expect(validateSync(plainToInstance(LoginDto, { pass: 'a'.repeat(257) })).length).toBeGreaterThan(0);
  });
});
