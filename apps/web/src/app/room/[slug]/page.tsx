'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getRoomTemplate, type Vec3 } from '@vybe/3d-core';
import {
  DEFAULT_AVATAR_CONFIG,
  type ModelType,
  type RoomDetail,
  type RoomLayoutSuggestion,
  type SceneProp,
} from '@vybe/shared-types';
import { SpatialHud } from '@/components/room/SpatialHud';
import { neonPalette } from '@vybe/ui';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { useSpatialRoom } from '@/lib/useSpatialRoom';

const RoomCanvas = dynamic(() => import('@/components/room/RoomCanvas'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center bg-vybe-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-vybe-primary border-t-vybe-accent" />
        <p className="text-[10px] uppercase tracking-[0.28em] text-vybe-text-secondary">
          entering spatial room…
        </p>
      </div>
    </div>
  ),
});

const PROP_SCALE: Record<ModelType, Vec3> = {
  sofa: [1, 1, 1],
  table: [1, 1, 1],
  arcade: [1, 1, 1],
  neon_sign: [1, 1, 1],
  portal: [1.25, 1.25, 1.25],
};

export default function SpatialRoomPage() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params.slug === 'string' ? params.slug : (params.slug?.[0] ?? '');
  const { token, user, status } = useSession();
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !slug) return;
    let cancelled = false;
    void api
      .room(token, slug)
      .then((detail) => {
        if (!cancelled) {
          setRoom(detail);
          setLoadError(null);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setLoadError(caught instanceof Error ? caught.message : 'Could not load this room');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, slug]);

  const template = useMemo(
    () => getRoomTemplate(room?.templateId ?? 'cyber_lounge_v1'),
    [room?.templateId],
  );

  const initialScene = useMemo(() => room?.sceneGraph ?? [], [room]);

  const spatial = useSpatialRoom({
    roomId: room?.id ?? null,
    token,
    initialScene,
  });

  const self = useMemo(
    () => ({
      id: user?.id ?? 'self',
      displayName: user?.displayName ?? 'You',
      avatarConfig: user?.avatarConfig ?? DEFAULT_AVATAR_CONFIG,
    }),
    [user],
  );

  const spawnProp = useCallback(
    (modelType: ModelType): void => {
      const angle = Math.random() * Math.PI * 2;
      const radius = 2.4 + Math.random() * 3.2;
      const paletteIndex = Math.floor(Math.random() * neonPalette.length);
      const sceneProp: SceneProp = {
        id: `${modelType}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
        modelType,
        position: [
          Number((Math.cos(angle) * radius).toFixed(2)),
          0,
          Number((Math.sin(angle) * radius).toFixed(2)),
        ],
        rotation: [0, Number((Math.PI / 2 - angle).toFixed(3)), 0],
        scale: PROP_SCALE[modelType],
        color: neonPalette[paletteIndex] ?? '#06B6D4',
      };
      void spatial.addProps([sceneProp]);
    },
    [spatial],
  );

  const generateLayout = useCallback(
    async (prompt: string): Promise<RoomLayoutSuggestion | null> => {
      if (!token) return null;
      try {
        const suggestion = await api.generateRoomLayout(token, prompt);
        if (suggestion.props.length > 0) {
          await spatial.addProps(suggestion.props);
        }
        return suggestion;
      } catch {
        return null;
      }
    },
    [token, spatial],
  );

  if (status === 'error') {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <div className="glass-panel max-w-md rounded-2xl p-6 text-center">
          <p className="text-sm font-bold text-vybe-text-primary">Spatial engine offline</p>
          <p className="mt-2 text-[11px] leading-relaxed text-vybe-text-secondary">
            The VYBE API must be running to join 3D rooms. Start the database and API, then reload.
          </p>
          <Link href="/" className="btn-primary mt-4">
            Back to feed
          </Link>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <div className="glass-panel max-w-md rounded-2xl p-6 text-center">
          <p className="text-sm font-bold text-vybe-text-primary">Room not found</p>
          <p className="mt-2 text-[11px] leading-relaxed text-vybe-text-secondary">{loadError}</p>
          <Link href="/rooms" className="btn-primary mt-4">
            Explore 3D rooms
          </Link>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="grid min-h-screen place-items-center">
        <p className="text-[10px] uppercase tracking-[0.28em] text-vybe-text-secondary">
          loading room metadata…
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full overflow-hidden lg:h-screen">
      <RoomCanvas
        roomId={room.id}
        template={template}
        sceneGraph={spatial.sceneGraph}
        participants={spatial.participants}
        messages={spatial.messages}
        self={self}
        spawnPosition={template.spawnPoint}
        onMove={spatial.sendMove}
      />

      <SpatialHud
        roomName={room.name}
        themeTag={room.themeTag}
        connected={spatial.connected}
        participants={spatial.participants}
        messages={spatial.messages}
        selfId={self.id}
        onSendChat={spatial.sendChat}
        onEmote={(emote) => void spatial.sendEmote(emote)}
        onSpawnProp={spawnProp}
        onGenerateLayout={generateLayout}
        onLeave={spatial.leave}
      />

      {spatial.error ? (
        <div className="pointer-events-none absolute left-1/2 top-[86px] z-20 -translate-x-1/2">
          <div className="glass-panel-strong rounded-xl border-vybe-danger/40 px-3 py-1.5 text-[10px] text-vybe-danger">
            {spatial.error}
          </div>
        </div>
      ) : null}
    </div>
  );
}
