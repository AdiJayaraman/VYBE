import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AvatarConfig, UserProfile } from '@vybe/shared-types';
import { PROFILE_INCLUDE, mapUserProfile } from '../common/user-profile.mapper.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface FollowResult {
  following: boolean;
  followerCount: number;
  followingCount: number;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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

    return mapUserProfile(user, isFollowedByMe);
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

    await this.prisma.follow.upsert({
      where: { followerId_followingId: { followerId: viewerId, followingId: targetId } },
      update: {},
      create: { followerId: viewerId, followingId: targetId },
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
