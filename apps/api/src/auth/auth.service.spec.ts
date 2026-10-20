import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { passwordFingerprint } from './jwt-secret';

describe('AuthService Security Hardening (Prompt 35 & Single Password Login)', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should lock account after 5 consecutive failed login attempts (Brute-Force Protection)', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue(null);

    const loginDto = { pass: 'wrong-pass' };

    // 1st to 5th attempt must throw UnauthorizedException
    for (let i = 0; i < 5; i++) {
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    }

    // 6th attempt must trigger Rate Limiter with 429 TOO_MANY_REQUESTS
    try {
      await service.login(loginDto);
      fail('Expected 429 TOO_MANY_REQUESTS');
    } catch (err: any) {
      expect(err).toBeInstanceOf(HttpException);
      expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(err.message).toContain('Tài khoản tạm thời bị khóa');
    }
  });

  it('should not lock out other clients when one client exceeds the attempt limit', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue(null);

    for (let i = 0; i < 5; i++) {
      await expect(service.login({ pass: 'wrong-pass' }, '203.0.113.9')).rejects.toThrow(
        UnauthorizedException,
      );
    }
    await expect(service.login({ pass: 'wrong-pass' }, '203.0.113.9')).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });

    // A different client is still evaluated on its password, not blocked
    await expect(service.login({ pass: 'wrong-pass' }, '198.51.100.7')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should fully reset the counter once the lock expires', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue(null);
    const nowSpy = jest.spyOn(Date, 'now');
    try {
      let now = 1_000_000;
      nowSpy.mockImplementation(() => now);

      for (let i = 0; i < 5; i++) {
        await expect(service.login({ pass: 'wrong-pass' }, 'client-a')).rejects.toThrow(
          UnauthorizedException,
        );
      }
      await expect(service.login({ pass: 'wrong-pass' }, 'client-a')).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
      });

      // After 15 minutes a single wrong guess must not re-lock the client
      now += 15 * 60 * 1000 + 1;
      await expect(service.login({ pass: 'wrong-pass' }, 'client-a')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login({ pass: 'wrong-pass' }, 'client-a')).rejects.toThrow(
        UnauthorizedException,
      );
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('should authenticate single admin solely with password and reset failed attempt counter', async () => {
    const passwordHash = await bcrypt.hash('test-only-password', 10);
    const mockAdminUser = {
      id: 'admin-1',
      email: 'admin@phucandtrang.love',
      passwordHash,
      name: 'Phúc & Trang Admin',
      role: 'ADMIN',
    };

    prisma.user.findUnique.mockResolvedValue(mockAdminUser);
    prisma.user.findFirst.mockResolvedValue(mockAdminUser);

    const res = await service.login({ pass: 'test-only-password' });
    expect(res.accessToken).toBe('mock-jwt-token');
    expect(res.user.email).toBe('admin@phucandtrang.love');
    expect(res.user.role).toBe('ADMIN');
  });

  it('embeds a password fingerprint (pwf) in the issued token', async () => {
    const previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'unit-test-secret-unit-test-secret-1234';
    const passwordHash = await bcrypt.hash('test-only-password', 4);
    const admin = { id: 'admin-1', email: 'a@b.c', passwordHash, name: 'Admin', role: 'ADMIN' };
    prisma.user.findUnique.mockResolvedValue(admin);

    const res = await service.login({ pass: 'test-only-password' });
    const payload = jwtService.sign.mock.calls[0][0];
    expect(payload.pwf).toBe(passwordFingerprint(passwordHash, process.env.JWT_SECRET));
    expect(payload.pwf).toMatch(/^[0-9a-f]{16}$/);
    expect((res.user as any).passwordHash).toBeUndefined();
    process.env.JWT_SECRET = previousSecret;
  });

  it('does not hard-block the shared BFF source after 30 failures from different clients', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue(null);
    const nowSpy = jest.spyOn(Date, 'now');
    try {
      let now = 5_000_000;
      nowSpy.mockImplementation(() => now);
      for (let i = 0; i < 40; i++) {
        now += 61_000; // stay clear of the per-account backoff
        await expect(service.login({ pass: 'wrong' }, `client-${i}`, 'bff')).rejects.toThrow(
          UnauthorizedException,
        );
      }
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('blocks the shared source only until its 5-minute window ends once 100 failures are reached', async () => {
    const internals = service as any;
    const nowSpy = jest.spyOn(Date, 'now');
    try {
      let now = 9_000_000;
      nowSpy.mockImplementation(() => now);
      for (let i = 0; i < 100; i++) internals.recordFailedAttempt('source:bff');
      expect(() => internals.checkRateLimit('source:bff')).toThrow(HttpException);

      now += 5 * 60 * 1000 + 1;
      expect(() => internals.checkRateLimit('source:bff')).not.toThrow();
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('applies a capped, growing per-account delay after repeated failures and lets the admin back in', async () => {
    const passwordHash = await bcrypt.hash('right-password', 4);
    const admin = { id: 'admin-1', email: 'a@b.c', passwordHash, name: 'Admin', role: 'ADMIN' };
    prisma.user.findUnique.mockResolvedValue(admin);
    const nowSpy = jest.spyOn(Date, 'now');
    try {
      let now = 20_000_000;
      nowSpy.mockImplementation(() => now);

      // 10 free failures from distinct clients
      for (let i = 0; i < 10; i++) {
        await expect(service.login({ pass: 'wrong' }, `c-${i}`, `s-${i}`)).rejects.toThrow(
          UnauthorizedException,
        );
      }
      // Now even the right password must wait the backoff delay
      await expect(service.login({ pass: 'right-password' }, 'admin-ip', 'admin-src')).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
      });

      // Many more failures, each after waiting: delay never exceeds 60s
      for (let i = 0; i < 20; i++) {
        now += 60_001;
        await expect(service.login({ pass: 'wrong' }, `d-${i}`, `t-${i}`)).rejects.toThrow(
          UnauthorizedException,
        );
      }
      expect((service as any).accountDelayMs(now)).toBe(60_000);

      // After the capped delay the real admin can log in
      now += 60_001;
      const res = await service.login({ pass: 'right-password' }, 'admin-ip', 'admin-src');
      expect(res.accessToken).toBe('mock-jwt-token');
      expect((service as any).accountDelayMs(now)).toBe(0);
    } finally {
      nowSpy.mockRestore();
    }
  });
});
