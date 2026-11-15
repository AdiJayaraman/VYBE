import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AvatarConfigSchema, type AvatarConfig, type UserProfile } from '@vybe/shared-types';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import type { FollowResult } from './users.service.js';
import { UsersService } from './users.service.js';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser): Promise<UserProfile> {
    return this.usersService.getProfileById(user.id, user.id);
  }

  @Patch('me/avatar')
  async updateAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(AvatarConfigSchema)) avatarConfig: AvatarConfig,
  ): Promise<UserProfile> {
    return this.usersService.updateAvatar(user.id, avatarConfig);
  }

  @Get(':username')
  async getProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('username') username: string,
  ): Promise<UserProfile> {
    return this.usersService.getProfileByUsername(username, user.id);
  }

  @Post(':id/follow')
  async follow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<FollowResult> {
    return this.usersService.follow(id, user.id);
  }

  @Delete(':id/follow')
  async unfollow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<FollowResult> {
    return this.usersService.unfollow(id, user.id);
  }
}
