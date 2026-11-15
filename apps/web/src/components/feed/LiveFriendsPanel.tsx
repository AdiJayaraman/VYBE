'use client';

import Link from 'next/link';
import type { RoomSummary } from '@vybe/shared-types';

export function LiveFriendsPanel({ rooms }: { rooms: RoomSummary[] }) {
  const liveRooms = rooms.filter((room) => room.activeParticipantCount > 0);

  return (
    <aside className="glass-panel sticky top-6 hidden w-[320px] shrink-0 flex-col gap-4 rounded-2xl p-4 xl:flex">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.24em] text-vybe-accent">
          live friends in 3d
        </h2>
        <span className="live-dot" />
      </div>

      {liveRooms.length === 0 ? (
        <p className="text-[11px] leading-relaxed text-vybe-text-secondary">
          Nobody is in a spatial room right now. Open a room and your friends will show up here.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {liveRooms.map((room) => (
            <li
              key={room.id}
              className="rounded-xl border border-vybe-border bg-white/[0.02] p-2.5"
            >
              <p className="text-xs font-semibold text-vybe-text-primary">{room.name}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-vybe-text-secondary">
                {room.occupantNames.length > 0 ? room.occupantNames.join(', ') : 'starting up'}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="hud-chip border-vybe-accent/40 text-vybe-accent">
                  {room.activeParticipantCount} live
                </span>
                <Link
                  href={`/room/${room.slug}`}
                  className="text-[10px] font-bold uppercase tracking-[0.18em] text-vybe-primary hover:text-vybe-accent"
                >
                  join →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto rounded-xl border border-vybe-border bg-white/[0.02] p-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-vybe-text-secondary">
          spatial tip
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-vybe-text-secondary">
          Emit <span className="font-mono text-vybe-accent">room:move</span> at 15Hz. Remote avatars
          interpolate with lerp + slerp for smooth 60fps.
        </p>
      </div>
    </aside>
  );
}
