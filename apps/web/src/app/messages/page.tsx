'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  ConversationSummary,
  DirectMessageView,
  RoomSummary,
  UserProfile,
} from '@vybe/shared-types';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { useSession } from '@/lib/session';

export default function MessagesPage() {
  const { token, user } = useSession();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [thread, setThread] = useState<DirectMessageView[]>([]);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [draft, setDraft] = useState('');
  const [inviteRoomId, setInviteRoomId] = useState('');
  const [startUsername, setStartUsername] = useState('');
  const [error, setError] = useState<string | null>(null);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.user.id === activeUserId) ?? null,
    [conversations, activeUserId],
  );

  const loadConversations = useCallback(async (): Promise<void> => {
    if (!token) return;
    try {
      const list = await api.conversations(token);
      setConversations(list);
      setActiveUserId((current) => current ?? list[0]?.user.id ?? null);
      setError(null);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Could not load conversations');
    }
  }, [token]);

  useEffect(() => {
    void loadConversations();
    if (!token) return;
    void api.rooms(token).then(setRooms).catch(() => setRooms([]));
  }, [token, loadConversations]);

  useEffect(() => {
    if (!token || !activeUserId) {
      setThread([]);
      return;
    }
    let cancelled = false;
    void api
      .thread(token, activeUserId)
      .then((messages) => {
        if (!cancelled) setThread(messages);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'Could not load thread');
      });
    return () => {
      cancelled = true;
    };
  }, [token, activeUserId]);

  const send = async (): Promise<void> => {
    if (!token || !activeUserId || draft.trim().length === 0) return;
    try {
      const message = await api.sendMessage(token, {
        recipientId: activeUserId,
        content: draft.trim(),
        ...(inviteRoomId ? { roomInviteId: inviteRoomId } : {}),
      });
      setThread((current) => [...current, message]);
      setDraft('');
      setInviteRoomId('');
      void loadConversations();
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Message failed to send');
    }
  };

  const startConversation = async (): Promise<void> => {
    if (!token || !startUsername.trim()) return;
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/users/${encodeURIComponent(
          startUsername.trim().replace(/^@/, ''),
        )}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok) throw new Error('No VYBE member with that username');
      const found = (await response.json()) as UserProfile;
      if (found.id === user?.id) throw new Error('That is your own profile');
      setConversations((current) =>
        current.some((conversation) => conversation.user.id === found.id)
          ? current
          : [
              {
                user: {
                  id: found.id,
                  username: found.username,
                  displayName: found.displayName,
                  avatarConfig: found.avatarConfig,
                },
                lastMessage: {
                  id: 'pending',
                  senderId: found.id,
                  recipientId: found.id,
                  content: 'New conversation',
                  roomInvite: null,
                  createdAt: new Date().toISOString(),
                  readAt: null,
                },
                unreadCount: 0,
              },
              ...current,
            ],
      );
      setActiveUserId(found.id);
      setStartUsername('');
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Could not start that conversation');
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            Direct{' '}
            <span className="bg-gradient-to-r from-vybe-primary to-vybe-accent bg-clip-text text-transparent">
              Messages
            </span>
          </h1>
          <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-vybe-text-secondary">
            chat · send a 3d room invite card
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={startUsername}
            onChange={(event) => setStartUsername(event.target.value)}
            placeholder="@username"
            className="vybe-input w-36 py-1.5 text-[11px]"
          />
          <button
            type="button"
            onClick={() => void startConversation()}
            className="btn-ghost px-3 py-1.5 text-[11px]"
          >
            New chat
          </button>
        </div>
      </header>

      {error ? (
        <div className="glass-panel rounded-2xl border-vybe-danger/40 p-3 text-[11px] text-vybe-text-secondary">
          {error}
        </div>
      ) : null}

      <div className="grid min-h-[520px] gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="glass-panel flex flex-col gap-1.5 rounded-2xl p-3">
          <p className="px-1 pb-1 text-[9px] font-bold uppercase tracking-[0.24em] text-vybe-text-secondary/80">
            conversations
          </p>
          {conversations.length === 0 ? (
            <p className="px-1 text-[11px] leading-relaxed text-vybe-text-secondary">
              No conversations yet. Start one with a username above, or seed demo data.
            </p>
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation.user.id}
                type="button"
                onClick={() => setActiveUserId(conversation.user.id)}
                className={`flex items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition ${
                  conversation.user.id === activeUserId
                    ? 'border-vybe-primary/60 bg-vybe-primary/15'
                    : 'border-transparent hover:border-vybe-border hover:bg-white/[0.03]'
                }`}
              >
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
                  style={{ background: conversation.user.avatarConfig.topColor }}
                >
                  {conversation.user.displayName.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-vybe-text-primary">
                    {conversation.user.displayName}
                  </span>
                  <span className="block truncate text-[10px] text-vybe-text-secondary">
                    {conversation.lastMessage.content}
                  </span>
                </span>
                {conversation.unreadCount > 0 ? (
                  <span className="rounded-full bg-vybe-accent/20 px-1.5 py-0.5 text-[9px] font-bold text-vybe-accent">
                    {conversation.unreadCount}
                  </span>
                ) : null}
              </button>
            ))
          )}
        </aside>

        <section className="glass-panel flex min-h-[420px] flex-col rounded-2xl p-4">
          {activeConversation ? (
            <>
              <div className="flex items-center justify-between border-b border-vybe-border pb-3">
                <div>
                  <p className="text-sm font-semibold text-vybe-text-primary">
                    {activeConversation.user.displayName}
                  </p>
                  <p className="text-[10px] text-vybe-text-secondary">
                    @{activeConversation.user.username}
                  </p>
                </div>
                <span className="hud-chip">dm</span>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto py-3">
                {thread.length === 0 ? (
                  <p className="text-[11px] text-vybe-text-secondary">
                    No messages yet — say hi or send a room invite.
                  </p>
                ) : (
                  thread.map((message) => {
                    const mine = message.senderId === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex flex-col gap-1 ${mine ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[78%] rounded-2xl px-3 py-2 text-[12px] leading-relaxed ${
                            mine
                              ? 'bg-vybe-primary/25 text-vybe-text-primary'
                              : 'bg-white/[0.05] text-vybe-text-primary/90'
                          }`}
                        >
                          {message.content}
                          {message.roomInvite ? (
                            <Link
                              href={`/room/${message.roomInvite.slug}`}
                              className="portal-card mt-2 block rounded-xl p-2.5"
                            >
                              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-vybe-accent">
                                3d room invite
                              </span>
                              <span className="mt-1 block text-xs font-bold text-vybe-text-primary">
                                {message.roomInvite.name}
                              </span>
                              <span className="mt-1 block text-[10px] uppercase tracking-[0.16em] text-vybe-text-secondary">
                                {message.roomInvite.themeTag} · tap to join →
                              </span>
                            </Link>
                          ) : null}
                        </div>
                        <span className="text-[9px] uppercase tracking-[0.18em] text-vybe-text-secondary/60">
                          {timeAgo(message.createdAt)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t border-vybe-border pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={inviteRoomId}
                    onChange={(event) => setInviteRoomId(event.target.value)}
                    className="vybe-input w-full max-w-[210px] py-1.5 text-[11px]"
                  >
                    <option value="">Attach a 3D room invite</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                      </option>
                    ))}
                  </select>
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void send();
                      }
                    }}
                    maxLength={1000}
                    placeholder="Message…"
                    className="vybe-input min-w-[160px] flex-1 py-1.5 text-[12px]"
                  />
                  <button
                    type="button"
                    onClick={() => void send()}
                    disabled={!draft.trim()}
                    className="btn-primary px-4 py-2 text-[11px]"
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="grid flex-1 place-items-center">
              <p className="text-[11px] uppercase tracking-[0.2em] text-vybe-text-secondary">
                select a conversation
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
