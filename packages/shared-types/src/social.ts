import { z } from 'zod';
import type { AvatarConfig } from './avatar';
import type { SceneGraph } from './spatial';

/** Feed / social DTOs. */
export const CreatePostDtoSchema = z
  .object({
    content: z.string().trim().max(1000).default(''),
    mediaUrls: z.array(z.string().url()).max(4).default([]),
    linkedRoomId: z.string().min(1).optional(),
  })
  .refine((value) => value.content.length > 0 || value.mediaUrls.length > 0 || Boolean(value.linkedRoomId), {
    message: 'A post needs text, media, or a linked 3D room',
  });
export type CreatePostDto = z.infer<typeof CreatePostDtoSchema>;

export const CreateCommentDtoSchema = z.object({
  content: z.string().trim().min(1).max(280),
});
export type CreateCommentDto = z.infer<typeof CreateCommentDtoSchema>;

export const FeedQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(30).default(10),
});
export type FeedQuery = z.infer<typeof FeedQuerySchema>;

export const SendMessageDtoSchema = z.object({
  recipientId: z.string().min(1),
  content: z.string().trim().min(1).max(1000),
  roomInviteId: z.string().min(1).optional(),
});
export type SendMessageDto = z.infer<typeof SendMessageDtoSchema>;

export const LoginDtoSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
});
export type LoginDto = z.infer<typeof LoginDtoSchema>;

export const RegisterDtoSchema = LoginDtoSchema.extend({
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-z0-9_]+$/, 'Lowercase letters, numbers and underscores only'),
  displayName: z.string().min(2).max(48),
});
export type RegisterDto = z.infer<typeof RegisterDtoSchema>;

export const GenerateRoomLayoutDtoSchema = z.object({
  prompt: z.string().trim().min(6).max(400),
  templateId: z.string().min(1).max(48).optional(),
  seed: z.number().int().optional(),
});
export type GenerateRoomLayoutDto = z.infer<typeof GenerateRoomLayoutDtoSchema>;

/** Envelope every REST route returns so clients never guess a shape. */
export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, string | number | boolean>;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export interface LikeResult {
  liked: boolean;
  likeCount: number;
}

export interface FollowResult {
  following: boolean;
  followerCount: number;
  followingCount: number;
}

export interface AuthorSummary {
  id: string;
  username: string;
  displayName: string;
  avatarConfig: AvatarConfig;
}

export interface LinkedRoomSummary {
  id: string;
  slug: string;
  name: string;
  themeTag: string;
  templateId: string;
  activeParticipantCount: number;
  maxParticipants: number;
}

export interface FeedPost {
  id: string;
  content: string;
  mediaUrls: string[];
  createdAt: string;
  author: AuthorSummary;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  linkedRoom: LinkedRoomSummary | null;
  latestComments: FeedComment[];
}

export interface FeedComment {
  id: string;
  content: string;
  createdAt: string;
  author: AuthorSummary;
}

export interface RoomSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  templateId: string;
  themeTag: string;
  isPublic: boolean;
  maxParticipants: number;
  activeParticipantCount: number;
  occupantNames: string[];
  createdAt: string;
}

export interface RoomDetail extends RoomSummary {
  sceneGraph: SceneGraph;
  participants: RoomParticipantView[];
  ownerUsername: string | null;
}

export interface RoomParticipantView {
  userId: string;
  username: string;
  displayName: string;
  avatarConfig: AuthorSummary['avatarConfig'];
  animation: string;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarConfig: AuthorSummary['avatarConfig'];
  presence: 'OFFLINE' | 'ONLINE' | 'IN_ROOM';
  currentRoom: { id: string; slug: string; name: string } | null;
  followerCount: number;
  followingCount: number;
  postCount: number;
  isFollowedByMe: boolean;
}

export interface DirectMessageView {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  roomInvite: { id: string; slug: string; name: string; themeTag: string } | null;
  createdAt: string;
  readAt: string | null;
}

export interface ConversationSummary {
  user: AuthorSummary;
  lastMessage: DirectMessageView;
  unreadCount: number;
}

export interface AuthSession {
  token: string;
  user: UserProfile;
  expiresAt: string;
}

export interface RoomLayoutSuggestion {
  templateId: string;
  themeTag: string;
  summary: string;
  source: 'gemini' | 'fallback';
  props: SceneGraph;
}

/** Shared placeholder used when a user has no custom avatar yet. */
export const FALLBACK_AVATAR: AuthorSummary['avatarConfig'] = {
  skinTone: 'honey',
  hairStyleId: 'shag',
  hairColor: '#0F172A',
  topId: 'hoodie',
  topColor: '#7C3AED',
  bottomId: 'cargo_pants',
  bottomColor: '#0F1629',
  shoesId: 'sneakers',
  accessoryId: 'visor',
  accessoryColor: '#06B6D4',
};
