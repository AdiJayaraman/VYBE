export interface AuthenticatedUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
}

export interface VybeJwtPayload {
  sub: string;
  username?: string;
  email?: string;
  provider?: 'demo' | 'supabase';
  iat?: number;
  exp?: number;
}

export const DEV_JWT_SECRET = 'vybe-dev-secret-change-me';
export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
