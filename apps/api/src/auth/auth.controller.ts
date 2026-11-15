import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  LoginDtoSchema,
  RegisterDtoSchema,
  type AuthSession,
  type LoginDto,
  type RegisterDto,
  type UserProfile,
} from '@vybe/shared-types';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './current-user.decorator.js';
import type { AuthenticatedUser } from './auth.types.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(201)
  async register(
    @Body(new ZodValidationPipe(RegisterDtoSchema)) dto: RegisterDto,
  ): Promise<AuthSession> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body(new ZodValidationPipe(LoginDtoSchema)) dto: LoginDto): Promise<AuthSession> {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@CurrentUser() user: AuthenticatedUser): Promise<UserProfile> {
    const session = await this.authService.getSession(user.id);
    return session.user;
  }
}
