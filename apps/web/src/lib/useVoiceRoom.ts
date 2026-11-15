'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Room, RoomEvent } from 'livekit-client';
import { api } from './api';

export type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'error';

export interface VoiceRoomApi {
  status: VoiceStatus;
  muted: boolean;
  participants: number;
  error: string | null;
  join: () => Promise<void>;
  leave: () => void;
  toggleMute: () => Promise<void>;
}

/**
 * Proximity voice via LiveKit. The API mints a short-lived grant per room, so
 * the browser only ever holds a scoped token — never the API secret.
 */
export function useVoiceRoom({
  roomSlug,
  token,
}: {
  roomSlug: string | null;
  token: string | null;
}): VoiceRoomApi {
  const roomRef = useRef<Room | null>(null);
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [muted, setMuted] = useState(true);
  const [participants, setParticipants] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      const room = roomRef.current;
      roomRef.current = null;
      if (room) room.disconnect();
    };
  }, []);

  const leave = useCallback((): void => {
    const room = roomRef.current;
    roomRef.current = null;
    if (room) room.disconnect();
    setStatus('idle');
    setParticipants(0);
    setMuted(true);
  }, []);

  const join = useCallback(async (): Promise<void> => {
    if (!roomSlug || !token || roomRef.current) return;
    setStatus('connecting');
    setError(null);

    try {
      const grant = await api.voiceToken(token, roomSlug);
      const room = new Room({ adaptiveStream: true, dynacast: true });

      const sync = (): void => setParticipants(room.numParticipants);
      room.on(RoomEvent.ParticipantConnected, sync);
      room.on(RoomEvent.ParticipantDisconnected, sync);
      room.on(RoomEvent.Disconnected, () => {
        roomRef.current = null;
        setStatus('idle');
        setParticipants(0);
        setMuted(true);
      });
      room.on(RoomEvent.MediaDevicesError, (caught: Error) => {
        setError(caught.message || 'Microphone unavailable');
      });

      await room.connect(grant.url, grant.token);
      await room.localParticipant.setMicrophoneEnabled(true);

      roomRef.current = room;
      setParticipants(room.numParticipants);
      setMuted(false);
      setStatus('connected');
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Voice connection failed');
      setStatus('error');
    }
  }, [roomSlug, token]);

  const toggleMute = useCallback(async (): Promise<void> => {
    const room = roomRef.current;
    if (!room) return;
    const next = !room.localParticipant.isMicrophoneEnabled;
    try {
      await room.localParticipant.setMicrophoneEnabled(next);
      setMuted(!next);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Could not toggle the microphone');
    }
  }, []);

  return { status, muted, participants, error, join, leave, toggleMute };
}
