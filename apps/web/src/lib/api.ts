import type {
  AuthSession,
  ConversationSummary,
  CreateCommentDto,
  CreatePostDto,
  CursorPage,
  DirectMessageView,
  FeedComment,
  FeedPost,
  FollowResult,
  LikeResult,
  RoomDetail,
  RoomLayoutSuggestion,
  RoomSummary,
  SendMessageDto,
  UserProfile,
  VoiceTokenResponse,
  CreateReportDto,
  NotificationFeed,
  ReportStatus,
  ReportView,
  UploadView,
  UserSearchResult,
} from '@vybe/shared-types';
import type { AvatarConfig, SceneProp } from '@vybe/shared-types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? API_URL;

export interface ApiErrorIssue {
  path: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly issues: ApiErrorIssue[];

  constructor(message: string, status: number, issues: ApiErrorIssue[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.issues = issues;
  }
}

interface ErrorBody {
  message?: string;
  issues?: ApiErrorIssue[];
}

async function request<TResponse>(
  path: string,
  options: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown; token?: string | null } = {},
): Promise<TResponse> {
  const { method = 'GET', body, token } = options;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(`Cannot reach the VYBE API at ${API_URL}. Is it running?`, 0);
  }

  if (!response.ok) {
    let parsed: ErrorBody = {};
    try {
      parsed = (await response.json()) as ErrorBody;
    } catch {
      parsed = {};
    }
    throw new ApiError(parsed.message ?? `Request failed (${response.status})`, response.status, parsed.issues ?? []);
  }

  if (response.status === 204) return undefined as TResponse;
  return (await response.json()) as TResponse;
}

export const api = {
  login(email: string, password: string): Promise<AuthSession> {
    return request<AuthSession>('/auth/login', { method: 'POST', body: { email, password } });
  },

  register(email: string, password: string, username: string, displayName: string): Promise<AuthSession> {
    return request<AuthSession>('/auth/register', {
      method: 'POST',
      body: { email, password, username, displayName },
    });
  },

  me(token: string): Promise<UserProfile> {
    return request<UserProfile>('/auth/me', { token });
  },

  feed(token: string, cursor?: string | null, limit = 10): Promise<CursorPage<FeedPost>> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    return request<CursorPage<FeedPost>>(`/posts/feed?${params.toString()}`, { token });
  },

  createPost(token: string, dto: CreatePostDto): Promise<FeedPost> {
    return request<FeedPost>('/posts', { method: 'POST', body: dto, token });
  },

  toggleLike(token: string, postId: string): Promise<LikeResult> {
    return request<LikeResult>(`/posts/${postId}/like`, { method: 'POST', token });
  },

  addComment(token: string, postId: string, dto: CreateCommentDto): Promise<FeedComment> {
    return request<FeedComment>(`/posts/${postId}/comments`, { method: 'POST', body: dto, token });
  },

  rooms(token: string): Promise<RoomSummary[]> {
    return request<RoomSummary[]>('/rooms', { token });
  },

  room(token: string, slug: string): Promise<RoomDetail> {
    return request<RoomDetail>(`/rooms/${encodeURIComponent(slug)}`, { token });
  },

  createRoom(
    token: string,
    dto: { name: string; description?: string; templateId?: string; isPublic?: boolean },
  ): Promise<RoomDetail> {
    return request<RoomDetail>('/rooms', { method: 'POST', body: dto, token });
  },

  updateScene(token: string, slug: string, sceneGraph: SceneProp[]): Promise<RoomDetail> {
    return request<RoomDetail>(`/rooms/${encodeURIComponent(slug)}/scene`, {
      method: 'PATCH',
      body: { sceneGraph },
      token,
    });
  },

  updateAvatar(token: string, avatarConfig: AvatarConfig): Promise<UserProfile> {
    return request<UserProfile>('/users/me/avatar', { method: 'PATCH', body: avatarConfig, token });
  },

  follow(token: string, userId: string): Promise<FollowResult> {
    return request<FollowResult>(`/users/${userId}/follow`, { method: 'POST', token });
  },

  unfollow(token: string, userId: string): Promise<FollowResult> {
    return request<FollowResult>(`/users/${userId}/follow`, { method: 'DELETE', token });
  },

  conversations(token: string): Promise<ConversationSummary[]> {
    return request<ConversationSummary[]>('/messages/conversations', { token });
  },

  thread(token: string, userId: string): Promise<DirectMessageView[]> {
    return request<DirectMessageView[]>(`/messages/${encodeURIComponent(userId)}`, { token });
  },

  sendMessage(token: string, dto: SendMessageDto): Promise<DirectMessageView> {
    return request<DirectMessageView>('/messages', { method: 'POST', body: dto, token });
  },

  voiceToken(token: string, roomSlug: string): Promise<VoiceTokenResponse> {
    return request<VoiceTokenResponse>('/voice/token', {
      method: 'POST',
      body: { roomSlug },
      token,
    });
  },

  generateRoomLayout(token: string, prompt: string): Promise<RoomLayoutSuggestion> {
    return request<RoomLayoutSuggestion>('/ai/generate-room-layout', {
      method: 'POST',
      body: { prompt },
      token,
    });
  },

  profile(token: string, username: string): Promise<UserProfile> {
    return request<UserProfile>(`/users/${encodeURIComponent(username)}`, { token });
  },

  searchUsers(token: string, q: string): Promise<UserSearchResult[]> {
    return request<UserSearchResult[]>(`/users/search?q=${encodeURIComponent(q)}`, { token });
  },

  userPosts(token: string, username: string, cursor?: string | null): Promise<CursorPage<FeedPost>> {
    const params = new URLSearchParams({ limit: '10' });
    if (cursor) params.set('cursor', cursor);
    return request<CursorPage<FeedPost>>(
      `/posts/author/${encodeURIComponent(username)}?${params.toString()}`,
      { token },
    );
  },

  comments(token: string, postId: string, cursor?: string | null): Promise<CursorPage<FeedComment>> {
    const params = new URLSearchParams({ limit: '20' });
    if (cursor) params.set('cursor', cursor);
    return request<CursorPage<FeedComment>>(
      `/posts/${encodeURIComponent(postId)}/comments?${params.toString()}`,
      { token },
    );
  },

  report(token: string, dto: CreateReportDto): Promise<ReportView> {
    return request<ReportView>('/reports', { method: 'POST', body: dto, token });
  },

  adminReports(token: string, status: ReportStatus | 'ALL' = 'OPEN'): Promise<ReportView[]> {
    return request<ReportView[]>(`/admin/reports?status=${status}`, { token });
  },

  resolveReport(token: string, id: string, status: ReportStatus): Promise<ReportView> {
    return request<ReportView>(`/admin/reports/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: { status },
      token,
    });
  },

  blockUser(token: string, userId: string): Promise<{ blocked: boolean }> {
    return request<{ blocked: boolean }>(`/users/${encodeURIComponent(userId)}/block`, {
      method: 'POST',
      token,
    });
  },

  unblockUser(token: string, userId: string): Promise<{ blocked: boolean }> {
    return request<{ blocked: boolean }>(`/users/${encodeURIComponent(userId)}/block`, {
      method: 'DELETE',
      token,
    });
  },

  blockedUsers(token: string): Promise<UserSearchResult[]> {
    return request<UserSearchResult[]>('/users/me/blocked', { token });
  },

  notifications(token: string): Promise<NotificationFeed> {
    return request<NotificationFeed>('/notifications', { token });
  },

  markAllNotificationsRead(token: string): Promise<{ updated: number }> {
    return request<{ updated: number }>('/notifications/read-all', { method: 'POST', token });
  },

  markNotificationRead(token: string, id: string): Promise<{ updated: number }> {
    return request<{ updated: number }>(`/notifications/${encodeURIComponent(id)}/read`, {
      method: 'POST',
      token,
    });
  },

  async uploadImage(token: string, file: File): Promise<UploadView> {
    const form = new FormData();
    form.append('file', file);
    let response: Response;
    try {
      response = await fetch(`${API_URL}/api/uploads`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
    } catch {
      throw new ApiError(`Cannot reach the VYBE API at ${API_URL}. Is it running?`, 0);
    }
    if (!response.ok) {
      let parsed: ErrorBody = {};
      try {
        parsed = (await response.json()) as ErrorBody;
      } catch {
        parsed = {};
      }
      throw new ApiError(parsed.message ?? `Upload failed (${response.status})`, response.status);
    }
    return (await response.json()) as UploadView;
  },
};
