import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
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
