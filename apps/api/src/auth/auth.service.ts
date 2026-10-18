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
  windowStartedAt: number;
  blockedUntil?: number;
}

@Injectable()
export class AuthService {
  // In-memory, per-instance rate limiting keyed by client. On serverless platforms each
  // instance keeps its own counters, so this is a best-effort brute-force brake only.
  private loginAttempts = new Map<string, LoginAttemptRecord>();

  // Thresholds: max 5 failed attempts in 5 minutes -> lock that client for 15 minutes
  private readonly MAX_ATTEMPTS = 5;
  private readonly BLOCK_DURATION_MS = 15 * 60 * 1000;
  private readonly ATTEMPT_WINDOW_MS = 5 * 60 * 1000;
  private readonly MAX_TRACKED_CLIENTS = 5000;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /** Returns the live record for a client, dropping it once its block or window has expired. */
  private getActiveRecord(key: string, now: number): LoginAttemptRecord | undefined {
    const record = this.loginAttempts.get(key);
    if (!record) return undefined;

    const blockExpired = record.blockedUntil !== undefined && record.blockedUntil <= now;
    const windowExpired =
      record.blockedUntil === undefined && now - record.windowStartedAt > this.ATTEMPT_WINDOW_MS;
    if (blockExpired || windowExpired) {
      this.loginAttempts.delete(key);
      return undefined;
    }
    return record;
  }

  private checkRateLimit(key: string) {
    const now = Date.now();
    const record = this.getActiveRecord(key, now);
    if (record?.blockedUntil && record.blockedUntil > now) {
      const remainingMinutes = Math.ceil((record.blockedUntil - now) / 60000);
      throw new HttpException(
        `Tài khoản tạm thời bị khóa do nhập sai mật khẩu quá nhiều lần. Vui lòng thử lại sau ${remainingMinutes} phút.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private recordFailedAttempt(key: string) {
    const now = Date.now();
    const record = this.getActiveRecord(key, now) || { attempts: 0, windowStartedAt: now };

    record.attempts++;
    if (record.attempts >= this.MAX_ATTEMPTS) {
      record.blockedUntil = now + this.BLOCK_DURATION_MS;
    }
    this.loginAttempts.set(key, record);
    this.pruneExpiredRecords(now);
  }

  private pruneExpiredRecords(now: number) {
    if (this.loginAttempts.size <= this.MAX_TRACKED_CLIENTS) return;
    for (const key of [...this.loginAttempts.keys()]) {
      this.getActiveRecord(key, now);
    }
  }

  private clearFailedAttempts(key: string) {
    this.loginAttempts.delete(key);
  }

  async validateUser(pass: string): Promise<any> {
    const canonicalAdminEmail =
      process.env.ADMIN_EMAIL ||
      process.env.SEED_ADMIN_EMAIL ||
      'admin@phucandtrang.love';

    // 1. Look up deterministic canonical administrator account by email
    let user = await this.prisma.user.findUnique({
      where: { email: canonicalAdminEmail },
    });

    // 2. Fallback to latest admin account if canonical email is not found
    if (!user) {
      user = await this.prisma.user.findFirst({
        where: { role: Role.ADMIN },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!user) {
      user = await this.prisma.user.findFirst({
        orderBy: { createdAt: 'desc' },
      });
    }

    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(dto: LoginDto, clientId = 'unknown') {
    const rateLimitKey = `login:${clientId}`;
    this.checkRateLimit(rateLimitKey);

    const user = await this.validateUser(dto.pass);
    if (!user) {
      this.recordFailedAttempt(rateLimitKey);
      throw new UnauthorizedException('Mật khẩu không chính xác');
    }

    // Login successful: reset failed attempt counter
    this.clearFailedAttempts(rateLimitKey);

    const payload = { sub: user.id, email: user.email, name: user.name || 'Phúc & Trang Admin', role: user.role };
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
