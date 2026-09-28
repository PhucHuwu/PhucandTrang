import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService Security Hardening (Prompt 35: Brute-Force Rate Limiting)', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;

  beforeEach(async () => {
    prisma = {
      user: {
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

    const loginDto = { email: 'attacker@example.com', pass: 'wrong-pass' };

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

  it('should reset failed attempt counter upon successful login', async () => {
    const passwordHash = await bcrypt.hash('correct-pass', 10);
    const mockUser = {
      id: 'user-1',
      email: 'admin@example.com',
      passwordHash,
      name: 'Admin',
      role: 'ADMIN',
    };

    prisma.user.findUnique.mockResolvedValue(mockUser);

    const res = await service.login({ email: 'admin@example.com', pass: 'correct-pass' });
    expect(res.accessToken).toBe('mock-jwt-token');
    expect(res.user.email).toBe('admin@example.com');
  });
});
