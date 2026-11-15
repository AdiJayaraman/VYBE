'use client';

import { useState, type FormEvent } from 'react';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, useSession } from '@/lib/session';

type Mode = 'sign_in' | 'sign_up';

export function AuthPanel() {
  const { status, error, signIn, signUp, retry } = useSession();
  const [mode, setMode] = useState<Mode>('sign_in');
  const [email, setEmail] = useState('nova@vybe.space');
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);

  const offline = status === 'error';

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === 'sign_in') {
        await signIn(email.trim().toLowerCase(), password);
      } else {
        await signUp({
          email: email.trim().toLowerCase(),
          password,
          username: username.trim().toLowerCase(),
          displayName: displayName.trim(),
        });
      }
    } catch {
      // surfaced through session error state
    } finally {
      setBusy(false);
    }
  };

  const demo = async (demoEmail: string): Promise<void> => {
    setBusy(true);
    try {
      await signIn(demoEmail, DEMO_PASSWORD);
    } catch {
      // surfaced through session error state
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-vybe-primary to-vybe-accent text-lg font-black text-white shadow-[0_0_28px_-6px_rgba(124,58,237,0.9)]">
            V
          </span>
          <div>
            <p className="text-lg font-black tracking-[0.22em] text-vybe-text-primary">VYBE</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-vybe-text-secondary">
              spatial network
            </p>
          </div>
        </div>

        <div className="glass-panel-strong mt-6 rounded-2xl p-5">
          <div className="flex gap-1 rounded-xl border border-vybe-border p-1">
            <button
              type="button"
              onClick={() => setMode('sign_in')}
              className={`flex-1 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] transition ${
                mode === 'sign_in'
                  ? 'bg-vybe-primary/20 text-vybe-text-primary'
                  : 'text-vybe-text-secondary hover:text-vybe-text-primary'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode('sign_up')}
              className={`flex-1 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] transition ${
                mode === 'sign_up'
                  ? 'bg-vybe-primary/20 text-vybe-text-primary'
                  : 'text-vybe-text-secondary hover:text-vybe-text-primary'
              }`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={(event) => void submit(event)} className="mt-4 flex flex-col gap-2.5">
            <label className="text-[9px] font-semibold uppercase tracking-[0.24em] text-vybe-text-secondary/70">
              email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="vybe-input"
              placeholder="you@vybe.space"
            />

            {mode === 'sign_up' ? (
              <>
                <label className="text-[9px] font-semibold uppercase tracking-[0.24em] text-vybe-text-secondary/70">
                  username
                </label>
                <input
                  required
                  minLength={3}
                  maxLength={24}
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="vybe-input"
                  placeholder="lowercase_handle"
                />
                <label className="text-[9px] font-semibold uppercase tracking-[0.24em] text-vybe-text-secondary/70">
                  display name
                </label>
                <input
                  required
                  minLength={2}
                  maxLength={48}
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="vybe-input"
                  placeholder="Your name in the room"
                />
              </>
            ) : null}

            <label className="text-[9px] font-semibold uppercase tracking-[0.24em] text-vybe-text-secondary/70">
              password
            </label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete={mode === 'sign_in' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="vybe-input"
              placeholder="at least 8 characters"
            />

            <button type="submit" disabled={busy || offline} className="btn-primary mt-1 py-2.5">
              {busy
                ? 'Connecting…'
                : mode === 'sign_in'
                  ? 'Enter VYBE'
                  : 'Create my space'}
            </button>
          </form>

          {error ? (
            <div className="mt-3 rounded-xl border border-vybe-danger/40 bg-vybe-danger/10 p-3">
              <p className="text-[11px] leading-relaxed text-vybe-text-secondary">{error}</p>
              {offline ? (
                <button type="button" onClick={retry} className="btn-ghost mt-2 w-full py-1.5 text-[11px]">
                  Retry connection
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="mt-5 border-t border-vybe-border pt-4">
            <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-vybe-text-secondary/70">
              or jump in with a demo account
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  disabled={busy}
                  onClick={() => void demo(account.email)}
                  className="rounded-lg border border-vybe-border bg-white/[0.03] px-2.5 py-1.5 text-[10px] font-semibold text-vybe-text-secondary transition hover:border-vybe-accent/60 hover:text-vybe-text-primary"
                >
                  {account.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-vybe-text-secondary/70">
              Demo password is <span className="font-mono">{DEMO_PASSWORD}</span>. Accounts come from
              <span className="font-mono"> pnpm db:seed</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
