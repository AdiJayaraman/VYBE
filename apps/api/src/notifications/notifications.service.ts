import { Injectable } from '@nestjs/common';
import type { AuthorSummary, NotificationType } from '@vybe/shared-types';
import { parseAvatarConfig } from '@vybe/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';

export interface NotifyInput {
  userId: string;
  actorId?: string | null;
  type: NotificationType;
  message: string;
  postId?: string | null;
  roomId?: string | null;
}

const actorSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarConfig: true,
} as const;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Never notifies yourself, and never fails the caller's write. */
  async notify(input: NotifyInput): Promise<void> {
    if (input.actorId && input.actorId === input.userId) return;
    try {
      await this.prisma.notification.create({
        data: {
          userId: input.userId,
          actorId: input.actorId ?? null,
          type: input.type,
          message: input.message,
          postId: input.postId ?? null,
          roomId: input.roomId ?? null,
        },
      });
    } catch {
      // Notifications are best-effort: a failed insert must not break the action.
    }
  }

  async list(userId: string, limit = 30) {
    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { actor: { select: actorSelect } },
      }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

    return {
      unreadCount,
      items: items.map((item) => {
        const actor: AuthorSummary | null = item.actor
          ? {
              id: item.actor.id,
              username: item.actor.username,
              displayName: item.actor.displayName,
              avatarConfig: parseAvatarConfig(item.actor.avatarConfig),
            }
          : null;
        return {
          id: item.id,
          type: item.type as NotificationType,
          message: item.message,
          actor,
          postId: item.postId,
          roomId: item.roomId,
          readAt: item.readAt ? item.readAt.toISOString() : null,
          createdAt: item.createdAt.toISOString(),
        };
      }),
    };
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  async markRead(userId: string, id: string): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }
}
