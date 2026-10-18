import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';

/**
 * Identifies the browser behind a login attempt. Logins arrive through the web BFF, which
 * forwards the end-user IP in `x-client-ip`; direct callers fall back to the proxy chain / socket.
 */
function resolveClientId(req: any): string {
  const header = (name: string): string | undefined => {
    const value = req?.headers?.[name];
    return Array.isArray(value) ? value[0] : value;
  };
  const candidate =
    header('x-client-ip') ||
    header('x-forwarded-for')?.split(',')[0] ||
    req?.ip ||
    req?.socket?.remoteAddress;
  return (candidate || 'unknown').trim().slice(0, 64) || 'unknown';
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto, @Request() req: any) {
    return this.authService.login(dto, resolveClientId(req));
  }

  /**
   * Public registration is completely disabled across all environments.
   * Single Journal CMS only admits the single provisioned Administrator.
   */
  @Post('register')
  async register() {
    throw new ForbiddenException(
      'Hệ thống đăng ký công khai đã bị vô hiệu hóa hoàn toàn. Nhật ký tình yêu chỉ dành riêng cho Phúc & Trang.',
    );
  }

  /**
   * Prompt 40.1: Verify JWT token server-side and return authenticated user details
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async me(@Request() req: any) {
    return {
      authenticated: true,
      user: req.user,
    };
  }
}
