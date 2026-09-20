import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

describe('RolesGuard (Req 24 & 25)', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockContext = (user: any): ExecutionContext => {
    return {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as any;
  };

  it('should allow access if no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
    const context = createMockContext(null);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if user is not authenticated', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    const context = createMockContext(null);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow ADMIN user unconditionally', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.EDITOR]);
    const context = createMockContext({ role: Role.ADMIN });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow EDITOR user if EDITOR role is required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN, Role.EDITOR]);
    const context = createMockContext({ role: Role.EDITOR });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should block VIEWER user from mutation requiring ADMIN or EDITOR', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN, Role.EDITOR]);
    const context = createMockContext({ role: Role.VIEWER });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
