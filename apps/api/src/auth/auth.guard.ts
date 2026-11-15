import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import type { AuthenticatedUser } from './auth.types.js';

export type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

/** Verifies the `Authorization: Bearer <jwt>` header (demo or Supabase token). */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = await this.authService.tryResolveFromHeader(request.headers.authorization);
    if (!user) {
      throw new UnauthorizedException('Missing or invalid access token');
    }
    request.user = user;
    return true;
  }
}
