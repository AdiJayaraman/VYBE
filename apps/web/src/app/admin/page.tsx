'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { ReportStatus, ReportView } from '@vybe/shared-types';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { useSession } from '@/lib/session';

const TABS: (ReportStatus | 'ALL')[] = ['OPEN', 'RESOLVED', 'DISMISSED', 'ALL'];

export default function AdminPage() {
  const { token, user } = useSession();
  const [tab, setTab] = useState<ReportStatus | 'ALL'>('OPEN');
  const [reports, setReports] = useState<ReportView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (): Promise<void> => {
    if (!token) return;
    setLoading(true);
    try {
      setReports(await api.adminReports(token, tab));
      setError(null);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Could not load reports');
    } finally {
      setLoading(false);
    }
  }, [token, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const resolve = async (id: string, status: ReportStatus): Promise<void> => {
    if (!token) return;
    try {
      await api.resolveReport(token, id, status);
      setReports((current) => current.filter((report) => report.id !== id || tab === 'ALL'));
      if (tab === 'ALL') void load();
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Could not update the report');
    }
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-16">
        <div className="glass-panel rounded-2xl p-6 text-center">
          <p className="text-sm font-bold text-vybe-text-primary">Moderators only</p>
          <p className="mt-2 text-[11px] text-vybe-text-secondary">
            The demo moderator is <span className="font-mono">nova@vybe.space</span>.
          </p>
          <Link href="/" className="btn-primary mt-4">
            Back to feed
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[900px] px-4 py-6 sm:px-6">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            Moderation{' '}
            <span className="bg-gradient-to-r from-vybe-primary to-vybe-accent bg-clip-text text-transparent">
              Queue
            </span>
          </h1>
          <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-vybe-text-secondary">
            reports · resolve or dismiss
          </p>
        </div>
        <div className="flex gap-1">
          {TABS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTab(option)}
              className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] transition ${
                tab === option
                  ? 'border-vybe-primary/60 bg-vybe-primary/15 text-vybe-text-primary'
                  : 'border-vybe-border text-vybe-text-secondary hover:text-vybe-text-primary'
              }`}
            >
              {option.toLowerCase()}
            </button>
          ))}
        </div>
      </header>

      {error ? (
        <div className="glass-panel mb-3 rounded-2xl border-vybe-danger/40 p-3 text-[11px] text-vybe-text-secondary">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        {loading ? (
          [0, 1].map((index) => <div key={index} className="glass-panel h-24 animate-pulse rounded-2xl" />)
        ) : reports.length === 0 ? (
          <div className="glass-panel rounded-2xl p-6 text-center text-[11px] text-vybe-text-secondary">
            No {tab.toLowerCase()} reports.
          </div>
        ) : (
          reports.map((report) => (
            <article key={report.id} className="glass-panel rounded-2xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="hud-chip border-vybe-danger/40 text-vybe-danger">{report.reason}</span>
                    <span className="hud-chip">{report.targetType}</span>
                    <span className="text-[9px] uppercase tracking-[0.2em] text-vybe-text-secondary/70">
                      {timeAgo(report.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-[12px] leading-relaxed text-vybe-text-primary/90">
                    {report.targetLabel}
                  </p>
                  {report.details ? (
                    <p className="mt-1 text-[11px] text-vybe-text-secondary">“{report.details}”</p>
                  ) : null}
                  <p className="mt-1 text-[10px] text-vybe-text-secondary/70">
                    reported by{' '}
                    <span className="font-semibold text-vybe-text-secondary">@{report.reporter.username}</span>
                  </p>
                </div>

                {report.status === 'OPEN' ? (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => void resolve(report.id, 'RESOLVED')}
                      className="btn-primary px-3 py-1.5 text-[10px]"
                    >
                      Resolve
                    </button>
                    <button
                      type="button"
                      onClick={() => void resolve(report.id, 'DISMISSED')}
                      className="btn-ghost px-3 py-1.5 text-[10px]"
                    >
                      Dismiss
                    </button>
                  </div>
                ) : (
                  <span className="hud-chip text-vybe-text-secondary">{report.status}</span>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
