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
import { API_URL, mobileApi } from './api';

export const DEMO_ACCOUNTS = [
  { email: 'nova@vybe.space', label: 'Nova' },
  { email: 'kai@vybe.space', label: 'Kai' },
  { email: 'mira@vybe.space', label: 'Mira' },
] as const;

const DEMO_PASSWORD = 'vybe1234';

interface MobileSession {
  status: 'loading' | 'ready' | 'error';
  token: string | null;
  user: UserProfile | null;
  error: string | null;
  signInAs: (email: string) => Promise<void>;
  setUser: (user: UserProfile) => void;
  retry: () => void;
}

const SessionContext = createContext<MobileSession | null>(null);

export function MobileSessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<MobileSession['status']>('loading');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const signInAs = useCallback(async (email: string): Promise<void> => {
    setStatus('loading');
    try {
      const session = await mobileApi.login(email, DEMO_PASSWORD);
      setToken(session.token);
      setUser(session.user);
      setStatus('ready');
      setError(null);
    } catch (caught: unknown) {
      setStatus('error');
      setError(
        caught instanceof Error
          ? `${caught.message} — API target: ${API_URL}`
          : 'Unable to sign in to VYBE',
      );
    }
  }, []);

  useEffect(() => {
    void signInAs(DEMO_ACCOUNTS[0].email);
  }, [signInAs, attempt]);

  const value = useMemo<MobileSession>(
    () => ({
      status,
      token,
      user,
      error,
      signInAs,
      setUser,
      retry: () => setAttempt((current) => current + 1),
    }),
    [status, token, user, error, signInAs],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useMobileSession(): MobileSession {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useMobileSession must be used inside MobileSessionProvider');
  return context;
}
