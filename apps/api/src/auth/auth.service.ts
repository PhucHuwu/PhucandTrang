import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

interface LoginAttemptRecord {
  attempts: number;
  blockedUntil?: number;
}

@Injectable()
export class AuthService {
  // In-memory rate limiting map for login brute-force mitigation
  private loginAttempts = new Map<string, LoginAttemptRecord>();

  // Thresholds: max 5 failed attempts in 5 minutes -> lock for 15 minutes
  private readonly MAX_ATTEMPTS = 5;
  private readonly BLOCK_DURATION_MS = 15 * 60 * 1000;
  private readonly ATTEMPT_WINDOW_MS = 5 * 60 * 1000;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private checkRateLimit(email: string) {
    const key = email.toLowerCase().trim();
    const record = this.loginAttempts.get(key);
    if (!record) return;

    const now = Date.now();
    if (record.blockedUntil && record.blockedUntil > now) {
      const remainingMinutes = Math.ceil((record.blockedUntil - now) / 60000);
      throw new HttpException(
        `Tài khoản tạm thời bị khóa do nhập sai mật khẩu quá nhiều lần. Vui lòng thử lại sau ${remainingMinutes} phút.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private recordFailedAttempt(email: string) {
    const key = email.toLowerCase().trim();
    const now = Date.now();
    const record = this.loginAttempts.get(key) || { attempts: 0 };

    record.attempts++;
    if (record.attempts >= this.MAX_ATTEMPTS) {
      record.blockedUntil = now + this.BLOCK_DURATION_MS;
    }
    this.loginAttempts.set(key, record);

    // Auto cleanup window
    const timer = setTimeout(() => {
      const current = this.loginAttempts.get(key);
      if (current && (!current.blockedUntil || current.blockedUntil <= Date.now())) {
        this.loginAttempts.delete(key);
      }
    }, this.ATTEMPT_WINDOW_MS);
    if (timer.unref) timer.unref();
  }

  private clearFailedAttempts(email: string) {
    this.loginAttempts.delete(email.toLowerCase().trim());
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(dto: LoginDto) {
    this.checkRateLimit(dto.email);

    const user = await this.validateUser(dto.email, dto.pass);
    if (!user) {
      this.recordFailedAttempt(dto.email);
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    // Login successful: reset failed attempt counter
    this.clearFailedAttempts(dto.email);

    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user,
    };
  }

  async register(dto: RegisterDto) {
    // Project is a private CMS: Public registration is strictly disabled in production
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException(
        'Đăng ký tài khoản công khai bị vô hiệu hóa trên môi trường production. Vui lòng liên hệ quản trị viên hệ thống.',
      );
    }

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email này đã được sử dụng');
    }
    const passwordHash = await bcrypt.hash(dto.pass, 10);

    // Registration in dev always forces VIEWER role
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        role: Role.VIEWER,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
    return user;
  }
}
