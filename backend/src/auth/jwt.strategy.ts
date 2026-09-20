import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const isProduction = process.env.NODE_ENV === 'production';
    const secret = config.get<string>('JWT_SECRET');

    if (isProduction && (!secret || secret.includes('super_secret_romantic_jwt_key'))) {
      throw new Error(
        'FATAL SECURITY ERROR: JWT_SECRET environment variable must be properly set in production mode!',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret || 'phuc_and_trang_super_secret_romantic_jwt_key_20221020',
    });
  }

  async validate(payload: any) {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
