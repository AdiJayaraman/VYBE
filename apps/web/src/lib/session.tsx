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

export type SessionStatus = 'loading' | 'ready' | 'error';

interface SessionContextValue {
  status: SessionStatus;
  token: string | null;
  user: UserProfile | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
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

      const stored = typeof window === 'undefined' ? null : window.localStorage.getItem(TOKEN_STORAGE_KEY);
      if (stored) {
        try {
          const profile = await api.me(stored);
          if (cancelled) return;
          setToken(stored);
          setUser(profile);
          setStatus('ready');
          return;
        } catch (caught: unknown) {
          if (caught instanceof ApiError && caught.status !== 401) {
            if (cancelled) return;
            setError(caught.message);
            setStatus('error');
            return;
          }
          window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
      }

      try {
        const session = await api.login(DEMO_ACCOUNTS[0]!.email, DEMO_PASSWORD);
        if (cancelled) return;
        window.localStorage.setItem(TOKEN_STORAGE_KEY, session.token);
        setToken(session.token);
        setUser(session.user);
        setStatus('ready');
      } catch (caught: unknown) {
        if (cancelled) return;
        setError(
          caught instanceof ApiError
            ? `${caught.message} Seed the database with "pnpm db:seed" and start the API.`
            : 'Unable to start a VYBE session',
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
      setStatus('error');
      throw caught;
    }
  }, []);

  const signOut = useCallback((): void => {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setStatus('error');
    setError('Signed out');
  }, []);

  const retry = useCallback((): void => {
    setAttempt((value) => value + 1);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({ status, token, user, error, signIn, signOut, setUser, retry }),
    [status, token, user, error, signIn, signOut, retry],
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
