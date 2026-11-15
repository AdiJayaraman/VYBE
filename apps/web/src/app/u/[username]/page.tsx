'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { FeedPost, UserProfile } from '@vybe/shared-types';
import { PostCard } from '@/components/feed/PostCard';
import { ReportButton } from '@/components/ReportButton';
import { api } from '@/lib/api';
import { initials } from '@/lib/format';
import { useSession } from '@/lib/session';

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const username = typeof params.username === 'string' ? params.username : (params.username?.[0] ?? '');
  const { token, user: me } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    if (!token || !username) return;
    try {
      const [found, page] = await Promise.all([
        api.profile(token, username),
        api.userPosts(token, username),
      ]);
      setProfile(found);
      setPosts(page.items);
      setNextCursor(page.nextCursor);
      setError(null);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Could not load this profile');
    }
  }, [token, username]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleFollow = async (): Promise<void> => {
    if (!token || !profile || busy) return;
    setBusy(true);
    try {
      const result = profile.isFollowedByMe
        ? await api.unfollow(token, profile.id)
        : await api.follow(token, profile.id);
      setProfile({
        ...profile,
        isFollowedByMe: result.following,
        followerCount: result.followerCount,
        followingCount: result.followingCount,
      });
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Could not update follow');
    } finally {
      setBusy(false);
    }
  };

  const toggleBlock = async (): Promise<void> => {
    if (!token || !profile || busy) return;
    setBusy(true);
    try {
      const result = profile.isBlockedByMe
        ? await api.unblockUser(token, profile.id)
        : await api.blockUser(token, profile.id);
      setProfile({ ...profile, isBlockedByMe: result.blocked, isFollowedByMe: false });
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Could not update block');
    } finally {
      setBusy(false);
    }
  };

  const like = async (postId: string): Promise<void> => {
    if (!token) return;
    const result = await api.toggleLike(token, postId);
    setPosts((current) =>
      current.map((post) =>
        post.id === postId ? { ...post, likedByMe: result.liked, likeCount: result.likeCount } : post,
      ),
    );
  };

  const comment = async (postId: string, content: string): Promise<void> => {
    if (!token) return;
    const created = await api.addComment(token, postId, { content });
    setPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? {
              ...post,
              commentCount: post.commentCount + 1,
              latestComments: [...post.latestComments, created].slice(-2),
            }
          : post,
      ),
    );
  };

  if (error && !profile) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-16 text-center">
        <div className="glass-panel rounded-2xl p-6">
          <p className="text-sm font-bold text-vybe-text-primary">Profile unavailable</p>
          <p className="mt-2 text-[11px] text-vybe-text-secondary">{error}</p>
          <Link href="/" className="btn-primary mt-4">
            Back to the feed
          </Link>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <div className="glass-panel h-48 animate-pulse rounded-2xl" />
      </div>
    );
  }

  const isMe = profile.id === me?.id;

  return (
    <div className="mx-auto w-full max-w-[860px] px-4 py-6 sm:px-6">
      <section className="glass-panel rounded-2xl p-5">
        <div className="flex flex-wrap items-center gap-4">
          <span
            className="grid h-16 w-16 place-items-center rounded-2xl text-xl font-black text-white"
            style={{ background: profile.avatarConfig.topColor }}
          >
            {initials(profile.displayName)}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-black text-vybe-text-primary">{profile.displayName}</h1>
            <p className="text-[11px] text-vybe-text-secondary">
              @{profile.username} · {profile.presence === 'IN_ROOM' ? 'in a 3D room' : profile.presence.toLowerCase()}
            </p>
            {profile.bio ? (
              <p className="mt-2 text-[12px] leading-relaxed text-vybe-text-primary/80">{profile.bio}</p>
            ) : null}
          </div>

          {!isMe ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void toggleFollow()}
                disabled={busy || profile.isBlockedByMe}
                className={profile.isFollowedByMe ? 'btn-ghost px-4 py-1.5 text-[11px]' : 'btn-primary px-4 py-2 text-[11px]'}
              >
                {profile.isFollowedByMe ? 'Following' : 'Follow'}
              </button>
              <button
                type="button"
                onClick={() => void toggleBlock()}
                disabled={busy}
                className="rounded-lg border border-vybe-border px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-vybe-text-secondary transition hover:border-vybe-danger/60 hover:text-vybe-danger"
              >
                {profile.isBlockedByMe ? 'Unblock' : 'Block'}
              </button>
              <ReportButton targetType="USER" targetId={profile.id} label="Report" />
            </div>
          ) : (
            <Link href="/avatar" className="btn-ghost px-4 py-1.5 text-[11px]">
              Edit avatar
            </Link>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-4 border-t border-vybe-border pt-3 text-[11px] text-vybe-text-secondary">
          <span>
            <strong className="text-vybe-text-primary">{profile.postCount}</strong> posts
          </span>
          <span>
            <strong className="text-vybe-text-primary">{profile.followerCount}</strong> followers
          </span>
          <span>
            <strong className="text-vybe-text-primary">{profile.followingCount}</strong> following
          </span>
          {profile.currentRoom ? (
            <Link href={`/room/${profile.currentRoom.slug}`} className="hud-chip border-vybe-accent/40 text-vybe-accent">
              <span className="live-dot" /> {profile.currentRoom.name}
            </Link>
          ) : null}
        </div>

        {profile.isBlockedByMe ? (
          <p className="mt-3 rounded-xl border border-vybe-danger/30 bg-vybe-danger/10 px-3 py-2 text-[10px] text-vybe-text-secondary">
            You blocked this account — their posts are hidden from your feed and DMs are disabled.
          </p>
        ) : null}
      </section>

      <div className="mt-4 flex flex-col gap-4">
        {posts.length === 0 ? (
          <div className="glass-panel rounded-2xl p-6 text-center text-[11px] text-vybe-text-secondary">
            No posts yet.
          </div>
        ) : (
          posts.map((post) => (
            <PostCard key={post.id} post={post} onLike={like} onComment={comment} />
          ))
        )}
        {nextCursor ? (
          <button
            type="button"
            onClick={() => {
              if (!token) return;
              void api.userPosts(token, profile.username, nextCursor).then((page) => {
                setPosts((current) => [...current, ...page.items]);
                setNextCursor(page.nextCursor);
              });
            }}
            className="btn-ghost self-center px-5 py-2 text-[11px]"
          >
            Load more
          </button>
        ) : null}
      </div>
    </div>
  );
}
