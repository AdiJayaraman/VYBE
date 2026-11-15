'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { UserSearchResult } from '@vybe/shared-types';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';

export function SearchBox() {
  const { token } = useSession();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token || query.trim().length < 2) {
      setResults([]);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void api
        .searchUsers(token, query.trim())
        .then((list) => {
          setResults(list);
          setOpen(true);
        })
        .catch(() => setResults([]));
    }, 220);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, token]);

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Find people…"
        className="vybe-input py-1.5 text-[11px]"
      />
      {open && results.length > 0 ? (
        <div className="glass-panel-strong absolute z-30 mt-1 w-full rounded-xl p-1.5">
          {results.map((result) => (
            <Link
              key={result.id}
              href={`/u/${result.username}`}
              onClick={() => {
                setOpen(false);
                setQuery('');
              }}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-white/[0.06]"
            >
              <span
                className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold text-white"
                style={{ background: result.avatarConfig.topColor }}
              >
                {result.displayName.slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-semibold text-vybe-text-primary">
                  {result.displayName}
                </span>
                <span className="block truncate text-[9px] text-vybe-text-secondary">
                  @{result.username} · {result.followerCount} followers
                </span>
              </span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
