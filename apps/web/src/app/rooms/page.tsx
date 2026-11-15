'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { STARTER_ROOM_TEMPLATES } from '@vybe/3d-core';
import type { RoomSummary } from '@vybe/shared-types';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';

export default function RoomsDirectoryPage() {
  const { token, status } = useSession();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateId, setTemplateId] = useState<string>(STARTER_ROOM_TEMPLATES[0]!.templateId);
  const [error, setError] = useState<string | null>(null);

  const loadRooms = useCallback(async (): Promise<void> => {
    if (!token) return;
    try {
      setRooms(await api.rooms(token));
      setError(null);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Could not load rooms');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadRooms();
    const timer = window.setInterval(() => void loadRooms(), 12000);
    return () => window.clearInterval(timer);
  }, [loadRooms]);

  const handleCreate = async (): Promise<void> => {
    if (!token || name.trim().length < 3) return;
    setCreating(true);
    setError(null);
    try {
      const room = await api.createRoom(token, {
        name: name.trim(),
        description: description.trim(),
        templateId,
        isPublic: true,
      });
      setRooms((current) => [...current, room]);
      setName('');
      setDescription('');
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Could not create the room');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            Explore{' '}
            <span className="bg-gradient-to-r from-vybe-primary to-vybe-accent bg-clip-text text-transparent">
              3D Rooms
            </span>
          </h1>
          <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-vybe-text-secondary">
            live spatial spaces · walk in with your avatar
          </p>
        </div>
        <div className="hud-chip">
          <span className="live-dot" />
          {rooms.reduce((total, room) => total + room.activeParticipantCount, 0)} online
        </div>
      </header>

      {error ? (
        <div className="glass-panel mb-4 rounded-2xl border-vybe-danger/40 p-3 text-[11px] text-vybe-text-secondary">
          {status === 'error'
            ? 'The VYBE API is offline. Start it with "pnpm --filter @vybe/api dev".'
            : error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading
          ? [0, 1, 2].map((index) => (
              <div key={index} className="glass-panel h-52 animate-pulse rounded-2xl" />
            ))
          : rooms.map((room) => (
              <article key={room.id} className="portal-card flex flex-col rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-[0.24em] text-vybe-accent">
                      {room.themeTag}
                    </span>
                    <h2 className="mt-1 text-lg font-bold text-vybe-text-primary">{room.name}</h2>
                  </div>
                  <span
                    className={`hud-chip ${
                      room.activeParticipantCount > 0
                        ? 'border-vybe-accent/40 text-vybe-accent'
                        : 'text-vybe-text-secondary'
                    }`}
                  >
                    {room.activeParticipantCount > 0 ? <span className="live-dot" /> : null}
                    {room.activeParticipantCount}/{room.maxParticipants}
                  </span>
                </div>

                <p className="mt-2 line-clamp-2 flex-1 text-[11px] leading-relaxed text-vybe-text-secondary">
                  {room.description || 'A custom VYBE space.'}
                </p>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.16em] text-vybe-text-secondary/80">
                    {room.occupantNames.length > 0 ? room.occupantNames.join(', ') : 'empty portal'}
                  </span>
                  <Link href={`/room/${room.slug}`} className="btn-primary px-4 py-1.5 text-[11px]">
                    Enter →
                  </Link>
                </div>
              </article>
            ))}
      </div>

      <section className="glass-panel mt-6 rounded-2xl p-4">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.24em] text-vybe-accent">
          create a custom room
        </h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Room name"
            maxLength={48}
            className="vybe-input"
          />
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Short description"
            maxLength={240}
            className="vybe-input"
          />
          <select
            value={templateId}
            onChange={(event) => setTemplateId(event.target.value)}
            className="vybe-input"
          >
            {STARTER_ROOM_TEMPLATES.map((template) => (
              <option key={template.templateId} value={template.templateId}>
                {template.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={creating || name.trim().length < 3 || !token}
            className="btn-primary"
          >
            {creating ? 'Creating…' : 'Create 3D room'}
          </button>
        </div>
        <p className="mt-2 text-[10px] text-vybe-text-secondary/70">
          The starter layout is cloned from the template scene graph; you can rearrange props inside
          the room.
        </p>
      </section>
    </div>
  );
}
