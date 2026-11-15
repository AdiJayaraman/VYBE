'use client';

import { useState } from 'react';
import {
  REPORT_REASONS,
  type ReportReason,
  type ReportTargetType,
} from '@vybe/shared-types';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';

interface ReportButtonProps {
  targetType: ReportTargetType;
  targetId: string;
  label?: string;
}

export function ReportButton({ targetType, targetId, label = 'Report' }: ReportButtonProps) {
  const { token } = useSession();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('SPAM');
  const [details, setDetails] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (): Promise<void> => {
    if (!token || state === 'sending') return;
    setState('sending');
    setMessage(null);
    try {
      await api.report(token, { targetType, targetId, reason, details: details.trim() });
      setState('sent');
      setMessage('Report sent to moderators');
      setOpen(false);
      setDetails('');
    } catch (caught: unknown) {
      setState('error');
      setMessage(caught instanceof Error ? caught.message : 'Could not file that report');
    }
  };

  if (state === 'sent') {
    return (
      <span className="text-[9px] uppercase tracking-[0.16em] text-vybe-accent">
        reported ✓
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="text-[9px] uppercase tracking-[0.16em] text-vybe-text-secondary/70 transition hover:text-vybe-danger"
      >
        ⚠ {label}
      </button>

      {open ? (
        <div className="glass-panel-strong absolute bottom-full right-0 z-20 mb-2 w-64 rounded-xl p-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-vybe-accent">
            report {targetType.toLowerCase()}
          </p>
          <select
            value={reason}
            onChange={(event) => setReason(event.target.value as ReportReason)}
            className="vybe-input mt-2 py-1.5 text-[11px]"
          >
            {REPORT_REASONS.map((option) => (
              <option key={option} value={option}>
                {option.toLowerCase()}
              </option>
            ))}
          </select>
          <textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Context for moderators (optional)"
            className="vybe-input mt-1.5 resize-none py-1.5 text-[11px]"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => void submit()}
              disabled={state === 'sending'}
              className="btn-primary px-3 py-1.5 text-[10px]"
            >
              {state === 'sending' ? 'Sending…' : 'Send report'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost px-2 py-1.5 text-[10px]">
              Cancel
            </button>
          </div>
          {message ? <p className="mt-2 text-[10px] text-vybe-danger">{message}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
