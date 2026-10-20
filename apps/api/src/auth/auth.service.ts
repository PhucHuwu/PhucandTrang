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
import { passwordFingerprint } from './jwt-secret';

interface LoginAttemptRecord {
  attempts: number;
  windowStartedAt: number;
  blockedUntil?: number;
}

interface AccountBackoffState {
  failures: number;
  lastFailureAt: number;
}

@Injectable()
export class AuthService {
  // In-memory, per-instance rate limiting. On serverless platforms (Vercel) every instance keeps
  // its own counters and they vanish on cold start, so this is a best-effort brute-force brake
  // only; a shared store would be needed for strict global limits.
  private loginAttempts = new Map<string, LoginAttemptRecord>();

  // Per client (end-user IP): max 5 failed attempts in 5 minutes -> lock that client for 15 minutes
  private readonly MAX_ATTEMPTS = 5;
  private readonly BLOCK_DURATION_MS = 15 * 60 * 1000;
  private readonly ATTEMPT_WINDOW_MS = 5 * 60 * 1000;
  // Per connecting address: the BFF shares one address across all browsers, so it gets far more
  // room and only blocks until its 5-minute window ends. A long block here would let anyone lock
  // the real admin out by failing on purpose.
  private readonly MAX_SOURCE_ATTEMPTS = 100;
  private readonly MAX_TRACKED_CLIENTS = 5000;

  // Per account (there is a single admin): after this many failures from anywhere, each further
  // attempt must wait an exponentially growing delay, capped so the admin is never locked out for long.
  private accountBackoff: AccountBackoffState = {
    failures: 0,
    lastFailureAt: 0,
  };
  private readonly ACCOUNT_FREE_FAILURES = 10;
  private readonly ACCOUNT_BASE_DELAY_MS = 1000;
  private readonly ACCOUNT_MAX_DELAY_MS = 60 * 1000;
  private readonly ACCOUNT_RESET_AFTER_MS = 15 * 60 * 1000;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private isSourceKey(key: string) {
    return key.startsWith('source:');
  }

  /** Returns the live record for a client, dropping it once its block or window has expired. */
  private getActiveRecord(
    key: string,
    now: number,
  ): LoginAttemptRecord | undefined {
    const record = this.loginAttempts.get(key);
    if (!record) return undefined;

    const blockExpired =
      record.blockedUntil !== undefined && record.blockedUntil <= now;
    const windowExpired =
      record.blockedUntil === undefined &&
      now - record.windowStartedAt > this.ATTEMPT_WINDOW_MS;
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
    const record = this.getActiveRecord(key, now) || {
      attempts: 0,
      windowStartedAt: now,
    };

    record.attempts++;
    if (this.isSourceKey(key)) {
      if (record.attempts >= this.MAX_SOURCE_ATTEMPTS) {
        record.blockedUntil = record.windowStartedAt + this.ATTEMPT_WINDOW_MS;
      }
    } else if (record.attempts >= this.MAX_ATTEMPTS) {
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

  /** Delay the account currently requires between attempts (0 while under the free-failure budget). */
  private accountDelayMs(now: number): number {
    const state = this.accountBackoff;
    if (
      state.failures > 0 &&
      now - state.lastFailureAt > this.ACCOUNT_RESET_AFTER_MS
    ) {
      this.accountBackoff = { failures: 0, lastFailureAt: 0 };
      return 0;
    }
    if (state.failures < this.ACCOUNT_FREE_FAILURES) return 0;
    const exponent = Math.min(state.failures - this.ACCOUNT_FREE_FAILURES, 16);
    return Math.min(
      this.ACCOUNT_BASE_DELAY_MS * 2 ** exponent,
      this.ACCOUNT_MAX_DELAY_MS,
    );
  }

  private checkAccountBackoff() {
    const now = Date.now();
    const delay = this.accountDelayMs(now);
    const retryAt = this.accountBackoff.lastFailureAt + delay;
    if (delay > 0 && now < retryAt) {
      const seconds = Math.max(1, Math.ceil((retryAt - now) / 1000));
      throw new HttpException(
        `Có quá nhiều lần đăng nhập sai. Vui lòng thử lại sau ${seconds} giây.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private recordAccountFailure() {
    const now = Date.now();
    this.accountDelayMs(now); // drops a stale streak before counting
    this.accountBackoff = {
      failures: this.accountBackoff.failures + 1,
      lastFailureAt: now,
    };
  }

  /** Finds the account login checks and returns it (with hash) only if the password matches. */
  private async authenticate(pass: string) {
    const canonicalAdminEmail =
      process.env.ADMIN_EMAIL ||
      process.env.SEED_ADMIN_EMAIL ||
      'admin@phucandtrang.love';

    // 1. Look up deterministic canonical administrator account by email
    let user = await this.prisma.user.findUnique({
      where: { email: canonicalAdminEmail },
    });

    // 2. Fallback to latest admin account if canonical email is not found (never to a non-admin)
    if (!user) {
      user = await this.prisma.user.findFirst({
        where: { role: Role.ADMIN },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      return user;
    }
    return null;
  }

  async validateUser(pass: string): Promise<any> {
    const user = await this.authenticate(pass);
    if (!user) return null;
    const { passwordHash: _passwordHash, ...result } = user;
    return result;
  }

  async login(dto: LoginDto, clientId = 'unknown', sourceId = clientId) {
    const rateLimitKey = `login:${clientId}`;
    const sourceKey = `source:${sourceId}`;
    this.checkRateLimit(rateLimitKey);
    this.checkRateLimit(sourceKey);
    this.checkAccountBackoff();

    const account = await this.authenticate(dto.pass);
    if (!account) {
      this.recordFailedAttempt(rateLimitKey);
      this.recordFailedAttempt(sourceKey);
      this.recordAccountFailure();
      throw new UnauthorizedException('Mật khẩu không chính xác');
    }

    // Login successful: reset failed attempt counters
    this.clearFailedAttempts(rateLimitKey);
    this.accountBackoff = { failures: 0, lastFailureAt: 0 };

    const { passwordHash, ...user } = account;
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name || 'Phúc & Trang Admin',
      role: user.role,
      pwf: passwordFingerprint(passwordHash, process.env.JWT_SECRET),
    };
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

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
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
