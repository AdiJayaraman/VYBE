import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { UserProfile } from '@vybe/shared-types';
import { API_URL, mobileApi } from './api';

export const DEMO_ACCOUNTS = [
  { email: 'nova@vybe.space', label: 'Nova' },
  { email: 'kai@vybe.space', label: 'Kai' },
  { email: 'mira@vybe.space', label: 'Mira' },
] as const;

const DEMO_PASSWORD = 'vybe1234';

interface MobileSession {
  status: 'loading' | 'signed_out' | 'ready' | 'error';
  token: string | null;
  user: UserProfile | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInAs: (email: string) => Promise<void>;
  signOut: () => void;
  setUser: (user: UserProfile) => void;
  retry: () => void;
}

const SessionContext = createContext<MobileSession | null>(null);

export function MobileSessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<MobileSession['status']>('signed_out');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(async (email: string, password: string): Promise<void> => {
    setStatus('loading');
    setError(null);
    try {
      const session = await mobileApi.login(email.trim().toLowerCase(), password);
      setToken(session.token);
      setUser(session.user);
      setStatus('ready');
    } catch (caught: unknown) {
      setStatus('signed_out');
      setError(
        caught instanceof Error
          ? `${caught.message} — API target: ${API_URL}`
          : 'Unable to sign in to VYBE',
      );
      throw caught;
    }
  }, []);

  const signInAs = useCallback(
    async (email: string): Promise<void> => {
      try {
        await signIn(email, DEMO_PASSWORD);
      } catch {
        // surfaced through error state
      }
    },
    [signIn],
  );

  const signOut = useCallback((): void => {
    setToken(null);
    setUser(null);
    setError(null);
    setStatus('signed_out');
  }, []);

  const value = useMemo<MobileSession>(
    () => ({
      status,
      token,
      user,
      error,
      signIn,
      signInAs,
      signOut,
      setUser,
      retry: () => {
        setError(null);
        setStatus('signed_out');
      },
    }),
    [status, token, user, error, signIn, signInAs, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useMobileSession(): MobileSession {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useMobileSession must be used inside MobileSessionProvider');
  return context;
}

export { DEMO_PASSWORD };
