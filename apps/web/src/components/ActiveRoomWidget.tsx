'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { RoomSummary } from '@vybe/shared-types';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';

export function ActiveRoomWidget() {
  const { token } = useSession();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const load = async (): Promise<void> => {
      try {
        const list = await api.rooms(token);
        if (!cancelled) setRooms(list);
      } catch {
        // silent: the sidebar widget is decorative when the API is offline
      }
    };

    void load();
    const timer = window.setInterval(() => void load(), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [token]);

  const activeRoom = rooms.find((room) => room.activeParticipantCount > 0) ?? rooms[0];

  return (
    <div className="portal-card rounded-2xl p-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold uppercase tracking-[0.24em] text-vybe-accent">
          active room portal
        </span>
        <span className="live-dot" />
      </div>

      {activeRoom ? (
        <>
          <p className="mt-2 text-sm font-bold text-vybe-text-primary">{activeRoom.name}</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-vybe-text-secondary">
            {activeRoom.themeTag}
          </p>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-vybe-text-secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-vybe-accent" />
            {activeRoom.activeParticipantCount} live · {activeRoom.maxParticipants} max
          </div>
          <Link
            href={`/room/${activeRoom.slug}`}
            className="btn-primary mt-3 w-full py-2 text-[11px]"
          >
            Jump Into 3D Space →
          </Link>
        </>
      ) : (
        <p className="mt-2 text-[11px] leading-relaxed text-vybe-text-secondary">
          No rooms are broadcasting yet. Open Explore 3D to start one.
        </p>
      )}
    </div>
  );
}
