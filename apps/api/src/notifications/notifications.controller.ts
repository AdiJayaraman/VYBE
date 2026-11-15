import { Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { NotificationFeed } from '@vybe/shared-types';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { NotificationsService } from './notifications.service.js';

@Controller('notifications')
@UseGuards(ThrottlerGuard, AuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser): Promise<NotificationFeed> {
    return this.notifications.list(user.id);
  }

  @Post('read-all')
  @HttpCode(200)
  async readAll(@CurrentUser() user: AuthenticatedUser): Promise<{ updated: number }> {
    return this.notifications.markAllRead(user.id);
  }

  @Post(':id/read')
  @HttpCode(200)
  async read(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<{ updated: number }> {
    return this.notifications.markRead(user.id, id);
  }
}
