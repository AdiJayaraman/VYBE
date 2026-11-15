'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { UserProfile } from '@vybe/shared-types';
import { ApiError, api } from './api';

const TOKEN_STORAGE_KEY = 'vybe.token';

export interface DemoAccount {
  email: string;
  label: string;
  username: string;
}

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  { email: 'nova@vybe.space', username: 'nova', label: 'Nova Reyes' },
  { email: 'kai@vybe.space', username: 'kai', label: 'Kai Mori' },
  { email: 'mira@vybe.space', username: 'mira', label: 'Mira Sol' },
];

const DEMO_PASSWORD = 'vybe1234';

export type SessionStatus = 'loading' | 'signed_out' | 'ready' | 'error';

export interface RegisterInput {
  email: string;
  password: string;
  username: string;
  displayName: string;
}

interface SessionContextValue {
  status: SessionStatus;
  token: string | null;
  user: UserProfile | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: RegisterInput) => Promise<void>;
  signOut: () => void;
  setUser: (user: UserProfile) => void;
  retry: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap(): Promise<void> {
      setStatus('loading');
      setError(null);

      const stored =
        typeof window === 'undefined' ? null : window.localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!stored) {
        if (!cancelled) setStatus('signed_out');
        return;
      }

      try {
        const profile = await api.me(stored);
        if (cancelled) return;
        setToken(stored);
        setUser(profile);
        setStatus('ready');
      } catch (caught: unknown) {
        if (cancelled) return;
        if (caught instanceof ApiError && caught.status === 401) {
          window.localStorage.removeItem(TOKEN_STORAGE_KEY);
          setStatus('signed_out');
          return;
        }
        setError(
          caught instanceof ApiError
            ? `${caught.message} Start the API (\`pnpm api\`) and try again.`
            : 'Unable to reach the VYBE API',
        );
        setStatus('error');
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const signIn = useCallback(async (email: string, password: string): Promise<void> => {
    setStatus('loading');
    setError(null);
    try {
      const session = await api.login(email, password);
      window.localStorage.setItem(TOKEN_STORAGE_KEY, session.token);
      setToken(session.token);
      setUser(session.user);
      setStatus('ready');
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Sign in failed');
      setStatus('signed_out');
      throw caught;
    }
  }, []);

  const signUp = useCallback(async (input: RegisterInput): Promise<void> => {
    setStatus('loading');
    setError(null);
    try {
      const session = await api.register(
        input.email,
        input.password,
        input.username,
        input.displayName,
      );
      window.localStorage.setItem(TOKEN_STORAGE_KEY, session.token);
      setToken(session.token);
      setUser(session.user);
      setStatus('ready');
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Could not create that account');
      setStatus('signed_out');
      throw caught;
    }
  }, []);

  const signOut = useCallback((): void => {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setError(null);
    setStatus('signed_out');
  }, []);

  const retry = useCallback((): void => {
    setAttempt((value) => value + 1);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({ status, token, user, error, signIn, signUp, signOut, setUser, retry }),
    [status, token, user, error, signIn, signUp, signOut, retry],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used inside <SessionProvider>');
  }
  return context;
}

/** Throws a helpful error when a component requires a live session. */
export function useSessionToken(): string {
  const { token } = useSession();
  if (!token) {
    throw new Error('VYBE session token is not ready yet');
  }
  return token;
}

export { DEMO_PASSWORD };
