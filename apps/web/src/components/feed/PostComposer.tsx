'use client';

import { useState } from 'react';
import type { CreatePostDto, RoomSummary } from '@vybe/shared-types';

interface PostComposerProps {
  userDisplayName: string;
  topColor: string;
  rooms: RoomSummary[];
  onSubmit: (dto: CreatePostDto) => Promise<void>;
}

export function PostComposer({ userDisplayName, topColor, rooms, onSubmit }: PostComposerProps) {
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [linkedRoomId, setLinkedRoomId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = content.trim().length > 0 || mediaUrl.trim().length > 0 || Boolean(linkedRoomId);

  const handleSubmit = async (): Promise<void> => {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        content: content.trim(),
        mediaUrls: mediaUrl.trim() ? [mediaUrl.trim()] : [],
        ...(linkedRoomId ? { linkedRoomId } : {}),
      });
      setContent('');
      setMediaUrl('');
      setLinkedRoomId('');
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Could not publish this post');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="glass-panel rounded-2xl p-4">
      <div className="flex gap-3">
        <span
          className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
          style={{ background: topColor }}
        >
          {userDisplayName.slice(0, 1)}
        </span>

        <div className="min-w-0 flex-1">
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="What is happening in your space?"
            className="vybe-input resize-none bg-transparent"
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={mediaUrl}
              onChange={(event) => setMediaUrl(event.target.value)}
              placeholder="Media URL (optional)"
              className="vybe-input w-full max-w-[220px] py-1.5 text-[11px]"
            />

            <select
              value={linkedRoomId}
              onChange={(event) => setLinkedRoomId(event.target.value)}
              className="vybe-input w-full max-w-[220px] py-1.5 text-[11px]"
            >
              <option value="">Attach a Live 3D Room Portal</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} · {room.themeTag}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!canSubmit || busy}
              className="btn-primary ml-auto px-5 py-2"
            >
              {busy ? 'Publishing…' : 'Publish'}
            </button>
          </div>

          {linkedRoomId ? (
            <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-vybe-accent">
              portal attached — this post becomes a jump-in card
            </p>
          ) : null}
          {error ? <p className="mt-2 text-[11px] text-vybe-danger">{error}</p> : null}
        </div>
      </div>
    </section>
  );
}
