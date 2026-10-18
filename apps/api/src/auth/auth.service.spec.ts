import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

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
});
