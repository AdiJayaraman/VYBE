import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { parseAvatarConfig, type AvatarConfig, type UserProfile, type UserSearchResult } from '@vybe/shared-types';
import { PROFILE_INCLUDE, mapUserProfile } from '../common/user-profile.mapper.js';
import { ModerationService } from '../moderation/moderation.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface FollowResult {
  following: boolean;
  followerCount: number;
  followingCount: number;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moderation: ModerationService,
    private readonly notifications: NotificationsService,
  ) {}

  async search(rawQuery: string, viewerId: string): Promise<UserSearchResult[]> {
    const query = rawQuery.trim();
    if (query.length < 2) return [];
    const hidden = await this.moderation.hiddenUserIds(viewerId);

    const users = await this.prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { username: { contains: query, mode: 'insensitive' } },
              { displayName: { contains: query, mode: 'insensitive' } },
            ],
          },
          hidden.length > 0 ? { id: { notIn: hidden } } : {},
        ],
      },
      take: 8,
      include: { _count: { select: { followers: true } } },
      orderBy: { username: 'asc' },
    });

    const followed = await this.prisma.follow.findMany({
      where: { followerId: viewerId, followingId: { in: users.map((user) => user.id) } },
      select: { followingId: true },
    });
    const followedIds = new Set(followed.map((row) => row.followingId));

    return users.map((user) => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarConfig: parseAvatarConfig(user.avatarConfig),
      followerCount: user._count.followers,
      presence: user.presence,
      isFollowedByMe: followedIds.has(user.id),
    }));
  }

  async getProfileByUsername(username: string, viewerId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: PROFILE_INCLUDE,
    });
    if (!user) throw new NotFoundException(`No VYBE profile for @${username}`);

    const isFollowedByMe =
      user.id === viewerId
        ? false
        : Boolean(
            await this.prisma.follow.findUnique({
              where: { followerId_followingId: { followerId: viewerId, followingId: user.id } },
              select: { id: true },
            }),
          );

    const isBlockedByMe =
      user.id !== viewerId &&
      Boolean(
        await this.prisma.block.findUnique({
          where: { blockerId_blockedId: { blockerId: viewerId, blockedId: user.id } },
          select: { id: true },
        }),
      );

    return mapUserProfile(user, isFollowedByMe, isBlockedByMe);
  }

  async getProfileById(userId: string, viewerId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: PROFILE_INCLUDE,
    });
    if (!user) throw new NotFoundException('User not found');
    return mapUserProfile(user, false);
  }

  async updateAvatar(userId: string, avatarConfig: AvatarConfig): Promise<UserProfile> {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarConfig },
      include: PROFILE_INCLUDE,
    });
    return mapUserProfile(updated, false);
  }

  async follow(targetId: string, viewerId: string): Promise<FollowResult> {
    if (targetId === viewerId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    const target = await this.prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!target) throw new NotFoundException('User not found');

    const blocked = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: viewerId, blockedId: targetId },
          { blockerId: targetId, blockedId: viewerId },
        ],
      },
      select: { id: true },
    });
    if (blocked) throw new BadRequestException('Unblock this account before following');

    await this.prisma.follow.upsert({
      where: { followerId_followingId: { followerId: viewerId, followingId: targetId } },
      update: {},
      create: { followerId: viewerId, followingId: targetId },
    });

    const actor = await this.prisma.user.findUnique({
      where: { id: viewerId },
      select: { displayName: true },
    });
    await this.notifications.notify({
      userId: targetId,
      actorId: viewerId,
      type: 'FOLLOW',
      message: `${actor?.displayName ?? 'Someone'} started following you`,
    });

    return this.followCounts(targetId, viewerId);
  }

  async unfollow(targetId: string, viewerId: string): Promise<FollowResult> {
    await this.prisma.follow.deleteMany({
      where: { followerId: viewerId, followingId: targetId },
    });
    return this.followCounts(targetId, viewerId);
  }

  private async followCounts(targetId: string, viewerId: string): Promise<FollowResult> {
    const [followerCount, followingCount, viewerFollowing] = await Promise.all([
      this.prisma.follow.count({ where: { followingId: targetId } }),
      this.prisma.follow.count({ where: { followerId: targetId } }),
      this.prisma.follow.count({ where: { followerId: viewerId, followingId: targetId } }),
    ]);
    return { following: viewerFollowing > 0, followerCount, followingCount };
  }
}
