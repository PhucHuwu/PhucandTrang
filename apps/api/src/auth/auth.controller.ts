import { Controller, Post, Get, Body, HttpCode, HttpStatus, Request, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from './admin-access.guard';

/**
 * Identifies the browser behind a login attempt. Logins arrive through the web BFF, which
 * forwards the end-user IP in `x-client-ip`; direct callers fall back to the proxy chain / socket.
 */
function resolveClient(req: any): { clientId: string; sourceId: string } {
  const header = (name: string): string | undefined => {
    const value = req?.headers?.[name];
    return Array.isArray(value) ? value[0] : value;
  };
  const clean = (value: string | undefined) => (value || '').trim().slice(0, 64) || 'unknown';
  // The connecting address (set by the hosting proxy, not by the caller). For logins through the BFF
  // this is the BFF itself; for direct callers it is the caller, who cannot dodge it by rotating x-client-ip.
  const sourceId = clean(header('x-forwarded-for')?.split(',')[0] || req?.ip || req?.socket?.remoteAddress);
  return { clientId: clean(header('x-client-ip')) === 'unknown' ? sourceId : clean(header('x-client-ip')), sourceId };
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto, @Request() req: any) {
    const { clientId, sourceId } = resolveClient(req);
    return this.authService.login(dto, clientId, sourceId);
  }

  /**
   * Public registration is completely disabled across all environments.
   * Single Journal CMS only admits the single provisioned Administrator.
   */
  @Public()
  @Post('register')
  async register() {
    throw new ForbiddenException(
      'Hệ thống đăng ký công khai đã bị vô hiệu hóa hoàn toàn. Nhật ký tình yêu chỉ dành riêng cho Phúc & Trang.',
    );
  }

  /**
   * Prompt 40.1: Verify JWT token server-side and return authenticated user details
   */
  @Get('me')
  async me(@Request() req: any) {
    return {
      authenticated: true,
      user: req.user,
    };
  }
}
