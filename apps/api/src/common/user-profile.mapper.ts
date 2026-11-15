import { parseAvatarConfig, type UserProfile } from '@vybe/shared-types';

export interface ProfileSourceUser {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarConfig: unknown;
  presence: UserProfile['presence'];
  currentRoom: { id: string; slug: string; name: string } | null;
  _count: { followers: number; following: number; posts: number };
}

export function mapUserProfile(user: ProfileSourceUser, isFollowedByMe: boolean): UserProfile {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    avatarConfig: parseAvatarConfig(user.avatarConfig),
    presence: user.presence,
    currentRoom: user.currentRoom,
    followerCount: user._count.followers,
    followingCount: user._count.following,
    postCount: user._count.posts,
    isFollowedByMe,
  };
}

export const PROFILE_INCLUDE = {
  currentRoom: { select: { id: true, slug: true, name: true } },
  _count: { select: { followers: true, following: true, posts: true } },
} as const;
