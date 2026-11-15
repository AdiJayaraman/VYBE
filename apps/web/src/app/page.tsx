'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CreatePostDto, FeedPost, RoomSummary } from '@vybe/shared-types';
import { LiveFriendsPanel } from '@/components/feed/LiveFriendsPanel';
import { PostCard } from '@/components/feed/PostCard';
import { PostComposer } from '@/components/feed/PostComposer';
import { ApiError, api } from '@/lib/api';
import { useSession } from '@/lib/session';

export default function FeedPage() {
  const { token, user, status, error: sessionError, retry } = useSession();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFeed = useCallback(
    async (cursor: string | null = null): Promise<void> => {
      if (!token) return;
      try {
        const page = await api.feed(token, cursor);
        setPosts((current) => (cursor ? [...current, ...page.items] : page.items));
        setNextCursor(page.nextCursor);
        setError(null);
      } catch (caught: unknown) {
        setError(caught instanceof ApiError ? caught.message : 'Feed failed to load');
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    void loadFeed(null);
    void api
      .rooms(token)
      .then(setRooms)
      .catch(() => setRooms([]));
  }, [token, loadFeed]);

  const handleCreatePost = async (dto: CreatePostDto): Promise<void> => {
    if (!token) return;
    const created = await api.createPost(token, dto);
    setPosts((current) => [created, ...current]);
    void api.rooms(token).then(setRooms).catch(() => undefined);
  };

  const handleLike = async (postId: string): Promise<void> => {
    if (!token) return;
    const result = await api.toggleLike(token, postId);
    setPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? { ...post, likedByMe: result.liked, likeCount: result.likeCount }
          : post,
      ),
    );
  };

  const handleComment = async (postId: string, content: string): Promise<void> => {
    if (!token) return;
    const comment = await api.addComment(token, postId, { content });
    setPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? {
              ...post,
              commentCount: post.commentCount + 1,
              latestComments: [...post.latestComments, comment].slice(-2),
            }
          : post,
      ),
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-[1180px] gap-6 px-4 py-6 sm:px-6">
      <div className="min-w-0 flex-1">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-vybe-text-primary sm:text-3xl">
              Your <span className="bg-gradient-to-r from-vybe-primary to-vybe-accent bg-clip-text text-transparent">Spatial</span> Feed
            </h1>
            <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-vybe-text-secondary">
              scroll the 2d stream · step into the 3d room
            </p>
          </div>
          <div className="hud-chip">
            <span className="live-dot" />
            {posts.length} posts
          </div>
        </header>

        {status === 'error' ? (
          <div className="glass-panel mb-4 rounded-2xl border-vybe-danger/40 p-4">
            <p className="text-xs font-semibold text-vybe-danger">API connection required</p>
            <p className="mt-1 text-[11px] leading-relaxed text-vybe-text-secondary">
              {sessionError ?? error ?? 'The VYBE API is not reachable.'}
            </p>
            <button type="button" onClick={retry} className="btn-ghost mt-3 px-3 py-1.5 text-[11px]">
              Retry
            </button>
          </div>
        ) : null}

        {user ? (
          <PostComposer
            userDisplayName={user.displayName}
            topColor={user.avatarConfig.topColor}
            rooms={rooms}
            onSubmit={handleCreatePost}
          />
        ) : (
          <div className="glass-panel h-28 animate-pulse rounded-2xl" />
        )}

        <div className="mt-4 flex flex-col gap-4">
          {loading
            ? [0, 1, 2].map((index) => (
                <div key={index} className="glass-panel h-36 animate-pulse rounded-2xl" />
              ))
            : posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={handleLike}
                  onComment={handleComment}
                />
              ))}

          {!loading && posts.length === 0 ? (
            <div className="glass-panel rounded-2xl p-6 text-center">
              <p className="text-sm font-semibold text-vybe-text-primary">The feed is empty</p>
              <p className="mt-1 text-[11px] text-vybe-text-secondary">
                Publish the first post, or seed the demo data with{' '}
                <span className="font-mono text-vybe-accent">pnpm db:seed</span>.
              </p>
            </div>
          ) : null}

          {nextCursor ? (
            <button
              type="button"
              onClick={() => void loadFeed(nextCursor)}
              className="btn-ghost self-center px-5 py-2 text-[11px]"
            >
              Load more
            </button>
          ) : null}
        </div>
      </div>

      <LiveFriendsPanel rooms={rooms} />
    </div>
  );
}
