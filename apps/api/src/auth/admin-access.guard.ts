import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';

export const IS_PUBLIC_KEY = 'isPublic';
/** Opts a route out of the global login requirement. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Global guard: every route needs a valid admin token unless marked @Public().
 * Reads are open to any signed-in role, writes need EDITOR or ADMIN,
 * and routes marked @Roles(...) need one of those roles (ADMIN always passes).
 */
@Injectable()
export class AdminAccessGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets))
      return true;

    await super.canActivate(context);

    const request = context.switchToHttp().getRequest();
    const role: Role | undefined = request.user?.role;
    if (role === Role.ADMIN) return true;

    const required = this.reflector.getAllAndOverride<Role[]>(
      ROLES_KEY,
      targets,
    );
    const allowed = required?.length
      ? required
      : READ_METHODS.has(request.method)
        ? [Role.ADMIN, Role.EDITOR, Role.VIEWER]
        : [Role.ADMIN, Role.EDITOR];
    if (!role || !allowed.includes(role)) {
      throw new ForbiddenException(
        'Tài khoản của bạn không có quyền thực hiện thao tác này.',
      );
    }
    return true;
  }
}
