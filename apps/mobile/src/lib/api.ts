import type {
  AuthSession,
  ConversationSummary,
  CursorPage,
  DirectMessageView,
  FeedPost,
  LikeResult,
  RoomDetail,
  RoomSummary,
  UserProfile,
  AvatarConfig,
} from '@vybe/shared-types';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';
export const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL ?? API_URL;

export class MobileApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'MobileApiError';
    this.status = status;
  }
}

async function request<TResponse>(
  path: string,
  options: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown; token?: string | null } = {},
): Promise<TResponse> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new MobileApiError(`Cannot reach the VYBE API at ${API_URL}`, 0);
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const parsed = (await response.json()) as { message?: string };
      if (parsed.message) message = parsed.message;
    } catch {
      // keep the status message
    }
    throw new MobileApiError(message, response.status);
  }

  return (await response.json()) as TResponse;
}

export const mobileApi = {
  login(email: string, password: string): Promise<AuthSession> {
    return request<AuthSession>('/auth/login', { method: 'POST', body: { email, password } });
  },
  me(token: string): Promise<UserProfile> {
    return request<UserProfile>('/auth/me', { token });
  },
  feed(token: string): Promise<CursorPage<FeedPost>> {
    return request<CursorPage<FeedPost>>('/posts/feed?limit=12', { token });
  },
  toggleLike(token: string, postId: string): Promise<LikeResult> {
    return request<LikeResult>(`/posts/${postId}/like`, { method: 'POST', token });
  },
  rooms(token: string): Promise<RoomSummary[]> {
    return request<RoomSummary[]>('/rooms', { token });
  },
  room(token: string, slug: string): Promise<RoomDetail> {
    return request<RoomDetail>(`/rooms/${encodeURIComponent(slug)}`, { token });
  },
  updateAvatar(token: string, avatarConfig: AvatarConfig): Promise<UserProfile> {
    return request<UserProfile>('/users/me/avatar', { method: 'PATCH', body: avatarConfig, token });
  },
  conversations(token: string): Promise<ConversationSummary[]> {
    return request<ConversationSummary[]>('/messages/conversations', { token });
  },
  thread(token: string, userId: string): Promise<DirectMessageView[]> {
    return request<DirectMessageView[]>(`/messages/${encodeURIComponent(userId)}`, { token });
  },
  sendMessage(token: string, recipientId: string, content: string): Promise<DirectMessageView> {
    return request<DirectMessageView>('/messages', {
      method: 'POST',
      body: { recipientId, content },
      token,
    });
  },
};
