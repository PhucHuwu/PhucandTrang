import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { requireJwtSecret } from './jwt-secret';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: requireJwtSecret(config.get<string>('JWT_SECRET')),
      algorithms: ['HS256'],
    });
  }

  // Re-read the account on every request so a deleted or demoted user loses access immediately
  async validate(payload: any) {
    const user = payload?.sub
      ? await this.prisma.user.findUnique({
          where: { id: payload.sub },
          select: { id: true, email: true, name: true, role: true },
        })
      : null;
    if (!user) throw new UnauthorizedException();
    return { id: user.id, email: user.email, name: user.name || 'Phúc & Trang Admin', role: user.role };
  }
}
