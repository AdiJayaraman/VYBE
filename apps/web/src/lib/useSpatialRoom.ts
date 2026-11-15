'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  ChatMessageEvent,
  ClientToServerEvents,
  EmoteType,
  PlayerTransformPayload,
  RoomParticipant,
  SceneProp,
  ServerToClientEvents,
} from '@vybe/shared-types';
import { SOCKET_URL } from './api';

type VybeClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface UseSpatialRoomOptions {
  roomId: string | null;
  token: string | null;
  initialScene: SceneProp[];
}

export interface SpatialRoomApi {
  connected: boolean;
  participants: RoomParticipant[];
  sceneGraph: SceneProp[];
  messages: ChatMessageEvent[];
  error: string | null;
  sendMove: (payload: PlayerTransformPayload) => void;
  sendChat: (content: string) => Promise<boolean>;
  sendEmote: (emote: EmoteType) => Promise<boolean>;
  addProps: (props: SceneProp[]) => Promise<boolean>;
  leave: () => void;
}

/**
 * Connects to the NestJS `/spatial` namespace, mirrors room state into React,
 * and exposes typed emitters. Transform updates stay in the socket layer so the
 * 60fps render loop never re-renders React.
 */
export function useSpatialRoom({ roomId, token, initialScene }: UseSpatialRoomOptions): SpatialRoomApi {
  const socketRef = useRef<VybeClientSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [sceneGraph, setSceneGraph] = useState<SceneProp[]>(initialScene);
  const [messages, setMessages] = useState<ChatMessageEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSceneGraph(initialScene);
  }, [initialScene]);

  useEffect(() => {
    if (!roomId || !token) return;

    const socket: VybeClientSocket = io(`${SOCKET_URL}/spatial`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 8,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setError(null);
      socket.emit('room:join', { roomId }, (response) => {
        if (!response.ok) {
          setError(response.error.message);
        }
      });
    });

    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (caught: Error) => {
      setConnected(false);
      setError(caught.message || 'Spatial connection failed');
    });

    socket.on('room:state_sync', (payload) => {
      setParticipants(payload.participants);
      setSceneGraph(payload.sceneGraph);
    });

    socket.on('room:player_joined', (participant) => {
      setParticipants((current) => [
        ...current.filter((member) => member.userId !== participant.userId),
        participant,
      ]);
    });

    socket.on('room:player_left', (payload) => {
      setParticipants((current) => current.filter((member) => member.userId !== payload.userId));
    });

    socket.on('room:player_moved', (payload) => {
      setParticipants((current) =>
        current.map((member) =>
          member.userId === payload.userId
            ? {
                ...member,
                position: payload.position,
                rotation: payload.rotation,
                animation: payload.animation,
              }
            : member,
        ),
      );
    });

    socket.on('room:chat_message', (message) => {
      setMessages((current) => [...current.slice(-79), message]);
    });

    socket.on('room:emote_triggered', (payload) => {
      setParticipants((current) =>
        current.map((member) =>
          member.userId === payload.userId ? { ...member, animation: payload.animation } : member,
        ),
      );
    });

    socket.on('room:prop_added', (payload) => {
      setSceneGraph(payload.sceneGraph);
    });

    socket.on('room:error', (payload) => setError(payload.message));

    return () => {
      socket.emit('room:leave', { roomId });
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [roomId, token]);

  const sendMove = useCallback((payload: PlayerTransformPayload): void => {
    socketRef.current?.emit('room:move', payload);
  }, []);

  const sendChat = useCallback(async (content: string): Promise<boolean> => {
    const socket = socketRef.current;
    if (!socket || !roomId) return false;
    return new Promise<boolean>((resolve) => {
      socket.emit('room:chat', { roomId, content }, (response) => resolve(response.ok));
    });
  }, [roomId]);

  const sendEmote = useCallback(async (emote: EmoteType): Promise<boolean> => {
    const socket = socketRef.current;
    if (!socket || !roomId) return false;
    return new Promise<boolean>((resolve) => {
      socket.emit('room:emote', { roomId, emote }, (response) => resolve(response.ok));
    });
  }, [roomId]);

  const addProps = useCallback(async (props: SceneProp[]): Promise<boolean> => {
    const socket = socketRef.current;
    if (!socket || !roomId) return false;
    return new Promise<boolean>((resolve) => {
      socket.emit('room:prop_added', { roomId, props }, (response) => resolve(response.ok));
    });
  }, [roomId]);

  const leave = useCallback((): void => {
    if (socketRef.current && roomId) {
      socketRef.current.emit('room:leave', { roomId });
    }
  }, [roomId]);

  return {
    connected,
    participants,
    sceneGraph,
    messages,
    error,
    sendMove,
    sendChat,
    sendEmote,
    addProps,
    leave,
  };
}
