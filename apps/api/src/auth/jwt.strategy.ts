import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { passwordFingerprint, requireJwtSecret } from './jwt-secret';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly secret: string;

  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    const secret = requireJwtSecret(config.get<string>('JWT_SECRET'));
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      algorithms: ['HS256'],
    });
    this.secret = secret;
  }

  // Re-read the account on every request so a deleted or demoted user loses access immediately
  async validate(payload: any) {
    const user = payload?.sub
      ? await this.prisma.user.findUnique({
          where: { id: payload.sub },
          select: { id: true, email: true, name: true, role: true, passwordHash: true },
        })
      : null;
    if (!user) throw new UnauthorizedException();

    // Tokens issued before `pwf` existed carry no fingerprint and are still accepted;
    // rotating JWT_SECRET retires them.
    if (payload.pwf !== undefined) {
      const expected = Buffer.from(passwordFingerprint(user.passwordHash, this.secret));
      const actual = Buffer.from(String(payload.pwf));
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
        throw new UnauthorizedException();
      }
    }

    return { id: user.id, email: user.email, name: user.name || 'Phúc & Trang Admin', role: user.role };
  }
}
