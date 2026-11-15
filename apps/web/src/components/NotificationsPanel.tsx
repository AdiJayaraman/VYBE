'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { NotificationFeed } from '@vybe/shared-types';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { useSession } from '@/lib/session';

export function NotificationsPanel() {
  const { token } = useSession();
  const [feed, setFeed] = useState<NotificationFeed>({ items: [], unreadCount: 0 });
  const [open, setOpen] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    if (!token) return;
    try {
      setFeed(await api.notifications(token));
    } catch {
      // keep the previous feed on transient failures
    }
  }, [token]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const markAll = async (): Promise<void> => {
    if (!token) return;
    await api.markAllNotificationsRead(token).catch(() => undefined);
    void load();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between rounded-xl border border-vybe-border bg-white/[0.02] px-3 py-2 text-[11px] font-semibold text-vybe-text-secondary transition hover:border-vybe-accent/40 hover:text-vybe-text-primary"
      >
        <span>🔔 Notifications</span>
        <span
          className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
            feed.unreadCount > 0 ? 'bg-vybe-accent/20 text-vybe-accent' : 'text-vybe-text-secondary/60'
          }`}
        >
          {feed.unreadCount}
        </span>
      </button>

      {open ? (
        <div className="glass-panel-strong absolute bottom-full left-0 z-30 mb-2 max-h-80 w-[248px] overflow-y-auto rounded-xl p-2">
          <div className="flex items-center justify-between px-1 pb-1.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-vybe-accent">
              activity
            </p>
            <button
              type="button"
              onClick={() => void markAll()}
              className="text-[9px] text-vybe-text-secondary hover:text-vybe-text-primary"
            >
              mark all read
            </button>
          </div>
          {feed.items.length === 0 ? (
            <p className="px-1 py-2 text-[10px] leading-relaxed text-vybe-text-secondary">
              Nothing yet — follows, likes, comments and room invites land here.
            </p>
          ) : (
            feed.items.map((item) => (
              <div
                key={item.id}
                className={`rounded-lg px-2 py-1.5 text-[10px] leading-relaxed ${
                  item.readAt ? 'text-vybe-text-secondary' : 'bg-vybe-primary/10 text-vybe-text-primary'
                }`}
              >
                <div className="flex items-start gap-2">
                  {item.actor ? (
                    <Link
                      href={`/u/${item.actor.username}`}
                      className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[9px] font-bold text-white"
                      style={{ background: item.actor.avatarConfig.topColor }}
                    >
                      {item.actor.displayName.slice(0, 1)}
                    </Link>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{item.message}</p>
                    <p className="text-[9px] text-vybe-text-secondary/60">{timeAgo(item.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
