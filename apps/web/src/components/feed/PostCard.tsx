'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { FeedPost } from '@vybe/shared-types';
import { initials, timeAgo } from '@/lib/format';

interface PostCardProps {
  post: FeedPost;
  onLike: (postId: string) => Promise<void>;
  onComment: (postId: string, content: string) => Promise<void>;
}

export function PostCard({ post, onLike, onComment }: PostCardProps) {
  const [commentDraft, setCommentDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const submitComment = async (): Promise<void> => {
    const content = commentDraft.trim();
    if (!content || busy) return;
    setBusy(true);
    try {
      await onComment(post.id, content);
      setCommentDraft('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="glass-panel animate-rise rounded-2xl p-4">
      <header className="flex items-center gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
          style={{ background: post.author.avatarConfig.topColor }}
        >
          {initials(post.author.displayName)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-vybe-text-primary">
            {post.author.displayName}
          </p>
          <p className="text-[11px] text-vybe-text-secondary">
            @{post.author.username} · {timeAgo(post.createdAt)}
          </p>
        </div>
        {post.linkedRoom ? (
          <span className="hud-chip ml-auto border-vybe-accent/40 text-vybe-accent">
            <span className="live-dot" /> live 3d
          </span>
        ) : null}
      </header>

      {post.content ? (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-vybe-text-primary/90">
          {post.content}
        </p>
      ) : null}

      {post.mediaUrls.length > 0 ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-vybe-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.mediaUrls[0]}
            alt="Post media"
            className="max-h-72 w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : null}

      {post.linkedRoom ? (
        <div className="portal-card mt-3 rounded-xl p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-[0.24em] text-vybe-accent">
                3d room snapshot
              </span>
              <p className="mt-1 text-base font-bold text-vybe-text-primary">
                {post.linkedRoom.name}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="hud-chip">{post.linkedRoom.themeTag}</span>
                <span className="hud-chip border-vybe-accent/40 text-vybe-accent">
                  <span className="live-dot" />
                  {post.linkedRoom.activeParticipantCount}/{post.linkedRoom.maxParticipants} inside
                </span>
              </div>
            </div>
            <div className="hidden h-16 w-24 shrink-0 rounded-lg border border-vybe-primary/40 bg-[radial-gradient(circle_at_30%_20%,rgba(124,58,237,0.55),rgba(6,182,212,0.18)_60%,transparent_75%)] sm:block">
              <div className="grid h-full place-items-center text-[9px] font-bold uppercase tracking-[0.2em] text-vybe-text-primary/80">
                portal
              </div>
            </div>
          </div>

          <Link href={`/room/${post.linkedRoom.slug}`} className="btn-primary mt-3 w-full py-2">
            Jump Into 3D Space →
          </Link>
        </div>
      ) : null}

      <footer className="mt-3 flex items-center gap-4 border-t border-vybe-border pt-3 text-[11px] text-vybe-text-secondary">
        <button
          type="button"
          onClick={() => void onLike(post.id)}
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 transition hover:bg-white/5 ${
            post.likedByMe ? 'text-vybe-primary' : 'text-vybe-text-secondary'
          }`}
        >
          <span className="text-sm">{post.likedByMe ? '♥' : '♡'}</span>
          {post.likeCount}
        </button>
        <span className="flex items-center gap-1.5">
          <span className="text-sm">💬</span>
          {post.commentCount}
        </span>
        <span className="ml-auto text-[9px] uppercase tracking-[0.2em]">{timeAgo(post.createdAt)}</span>
      </footer>

      {post.latestComments.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {post.latestComments.map((comment) => (
            <li key={comment.id} className="text-[11px] leading-relaxed text-vybe-text-secondary">
              <span className="font-semibold text-vybe-text-primary/90">
                {comment.author.displayName}
              </span>{' '}
              {comment.content}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-2 flex gap-2">
        <input
          value={commentDraft}
          onChange={(event) => setCommentDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void submitComment();
            }
          }}
          maxLength={280}
          placeholder="Reply in the feed…"
          className="vybe-input py-1.5 text-[11px]"
        />
        <button
          type="button"
          onClick={() => void submitComment()}
          disabled={busy || commentDraft.trim().length === 0}
          className="btn-ghost px-3 py-1.5 text-[11px]"
        >
          Send
        </button>
      </div>
    </article>
  );
}
