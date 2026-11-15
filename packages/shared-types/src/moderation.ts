import { z } from 'zod';
import type { AuthorSummary } from './social';

export const REPORT_REASONS = ['SPAM', 'HARASSMENT', 'HATE', 'NSFW', 'SCAM', 'OTHER'] as const;
export const ReportReasonSchema = z.enum(REPORT_REASONS);
export type ReportReason = z.infer<typeof ReportReasonSchema>;

export const REPORT_TARGET_TYPES = ['POST', 'COMMENT', 'USER', 'ROOM'] as const;
export const ReportTargetTypeSchema = z.enum(REPORT_TARGET_TYPES);
export type ReportTargetType = z.infer<typeof ReportTargetTypeSchema>;

export const REPORT_STATUSES = ['OPEN', 'RESOLVED', 'DISMISSED'] as const;
export const ReportStatusSchema = z.enum(REPORT_STATUSES);
export type ReportStatus = z.infer<typeof ReportStatusSchema>;

export const CreateReportDtoSchema = z.object({
  targetType: ReportTargetTypeSchema,
  targetId: z.string().min(1),
  reason: ReportReasonSchema,
  details: z.string().trim().max(500).default(''),
});
export type CreateReportDto = z.infer<typeof CreateReportDtoSchema>;

export const ResolveReportDtoSchema = z.object({
  status: ReportStatusSchema,
});
export type ResolveReportDto = z.infer<typeof ResolveReportDtoSchema>;

export interface ReportView {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details: string;
  status: ReportStatus;
  createdAt: string;
  reviewedAt: string | null;
  reporter: AuthorSummary;
  /** Human-readable description of what was reported (post excerpt, @handle, …). */
  targetLabel: string;
}

export const NOTIFICATION_TYPES = [
  'FOLLOW',
  'LIKE',
  'COMMENT',
  'ROOM_INVITE',
  'MESSAGE',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotificationView {
  id: string;
  type: NotificationType;
  message: string;
  actor: AuthorSummary | null;
  postId: string | null;
  roomId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationFeed {
  items: NotificationView[];
  unreadCount: number;
}

export interface BlockResult {
  blocked: boolean;
}

export interface UserSearchResult {
  id: string;
  username: string;
  displayName: string;
  avatarConfig: AuthorSummary['avatarConfig'];
  followerCount: number;
  presence: 'OFFLINE' | 'ONLINE' | 'IN_ROOM';
  isFollowedByMe: boolean;
}

export interface UploadView {
  url: string;
  bytes: number;
  mediaType: string;
}

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ALLOWED_UPLOAD_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
] as const;
