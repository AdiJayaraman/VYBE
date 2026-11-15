'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, useSession } from '@/lib/session';
import { ActiveRoomWidget } from './ActiveRoomWidget';

const NAV_ITEMS = [
  { href: '/', label: 'Feed', glyph: '◉', hint: '2D social stream' },
  { href: '/rooms', label: 'Explore 3D', glyph: '⬡', hint: 'Live spatial rooms' },
  { href: '/avatar', label: 'Avatar Studio', glyph: '☻', hint: 'Build your look' },
  { href: '/messages', label: 'Messages', glyph: '✉', hint: 'Direct + room invites' },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { user, status, error, signIn, retry } = useSession();
  const [switching, setSwitching] = useState(false);

  const handleSwitch = async (email: string): Promise<void> => {
    setSwitching(true);
    try {
      await signIn(email, DEMO_PASSWORD);
    } catch {
      // error state is surfaced by the provider
    } finally {
      setSwitching(false);
    }
  };

  return (
    <aside className="glass-panel fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-vybe-border px-5 py-6 lg:flex">
      <Link href="/" className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-vybe-primary to-vybe-accent text-lg font-black text-white shadow-[0_0_28px_-6px_rgba(124,58,237,0.9)]">
          V
        </span>
        <span>
          <span className="block text-lg font-black tracking-[0.22em] text-vybe-text-primary">VYBE</span>
          <span className="block text-[10px] font-semibold uppercase tracking-[0.3em] text-vybe-text-secondary">
            spatial network
          </span>
        </span>
      </Link>

      <nav className="mt-9 flex flex-col gap-1.5">
        {NAV_ITEMS.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                active
                  ? 'border-vybe-primary/60 bg-vybe-primary/15 text-vybe-text-primary shadow-[0_0_28px_-16px_rgba(124,58,237,0.9)]'
                  : 'border-transparent text-vybe-text-secondary hover:border-vybe-border hover:bg-white/[0.03] hover:text-vybe-text-primary'
              }`}
            >
              <span className={`text-base ${active ? 'text-vybe-accent' : 'text-vybe-text-secondary'}`}>
                {item.glyph}
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold">{item.label}</span>
                <span className="text-[10px] uppercase tracking-[0.16em] text-vybe-text-secondary/70">
                  {item.hint}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-8">
        <ActiveRoomWidget />
      </div>

      <div className="mt-auto pt-6">
        {status === 'error' ? (
          <div className="rounded-xl border border-vybe-danger/40 bg-vybe-danger/10 p-3">
            <p className="text-[11px] leading-relaxed text-vybe-text-secondary">{error}</p>
            <button type="button" onClick={retry} className="btn-ghost mt-2 w-full py-1.5 text-[11px]">
              Retry connection
            </button>
          </div>
        ) : null}

        <div className="mt-3 rounded-xl border border-vybe-border bg-white/[0.02] p-3">
          <div className="flex items-center gap-2.5">
            <span
              className="grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-white"
              style={{ background: user ? user.avatarConfig.topColor : '#7C3AED' }}
            >
              {user ? user.displayName.slice(0, 1) : '?'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-vybe-text-primary">
                {user ? user.displayName : 'Connecting…'}
              </p>
              <p className="truncate text-[10px] text-vybe-text-secondary">
                {user ? `@${user.username} · ${user.presence === 'IN_ROOM' ? 'in a 3D room' : 'online'}` : 'demo session'}
              </p>
            </div>
          </div>

          <label className="mt-3 block text-[9px] font-semibold uppercase tracking-[0.24em] text-vybe-text-secondary/70">
            demo account
          </label>
          <select
            className="vybe-input mt-1 py-1.5 text-[11px]"
            value={user ? DEMO_ACCOUNTS.find((account) => account.username === user.username)?.email ?? '' : ''}
            disabled={switching || status === 'loading'}
            onChange={(event) => {
              if (event.target.value) void handleSwitch(event.target.value);
            }}
          >
            {DEMO_ACCOUNTS.map((account) => (
              <option key={account.email} value={account.email}>
                {account.label} (@{account.username})
              </option>
            ))}
          </select>
        </div>
      </div>
    </aside>
  );
}
