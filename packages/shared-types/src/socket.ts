import type {
  AddPropPayload,
  PlayerTransformPayload,
  RoomChatMessage,
  RoomEmoteEvent,
  RoomJoinPayload,
  RoomLeavePayload,
  RoomParticipant,
  RoomPropAddedEvent,
  RoomStateSyncPayload,
} from './spatial';

/** Acknowledgement shape for every Socket.IO event that supports an ack. */
export type SocketAck<T> = (response: SocketAckResponse<T>) => void;

export type SocketAckResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: SocketErrorCode; message: string } };

export type SocketErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'NOT_IN_ROOM'
  | 'INVALID_PAYLOAD'
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED';

export interface RoomPlayerMovedEvent {
  roomId: string;
  userId: string;
  position: PlayerTransformPayload['position'];
  rotation: PlayerTransformPayload['rotation'];
  animation: PlayerTransformPayload['animation'];
  serverTime: string;
}

export interface RoomPlayerLeftEvent {
  roomId: string;
  userId: string;
  username: string;
  leftAt: string;
}

export interface ChatMessageEvent extends RoomChatMessage {
  roomId: string;
}

/**
 * Events emitted by the NestJS `RoomGateway` to clients.
 * Always import this interface — never redeclare event names in an app.
 */
export interface ServerToClientEvents {
  'room:state_sync': (payload: RoomStateSyncPayload) => void;
  'room:player_joined': (participant: RoomParticipant) => void;
  'room:player_left': (payload: RoomPlayerLeftEvent) => void;
  'room:player_moved': (payload: RoomPlayerMovedEvent) => void;
  'room:chat_message': (message: ChatMessageEvent) => void;
  'room:emote_triggered': (payload: RoomEmoteEvent) => void;
  'room:prop_added': (payload: RoomPropAddedEvent) => void;
  'room:error': (payload: { code: SocketErrorCode; message: string }) => void;
}

/** Events clients may emit into the `/spatial` namespace. */
export interface ClientToServerEvents {
  'room:join': (payload: RoomJoinPayload, ack?: SocketAck<RoomStateSyncPayload>) => void;
  'room:leave': (payload: RoomLeavePayload, ack?: SocketAck<{ roomId: string }>) => void;
  'room:move': (payload: PlayerTransformPayload) => void;
  'room:chat': (
    payload: { roomId: string; content: string },
    ack?: SocketAck<ChatMessageEvent>,
  ) => void;
  'room:emote': (
    payload: { roomId: string; emote: RoomEmoteEvent['emote'] },
    ack?: SocketAck<RoomEmoteEvent>,
  ) => void;
  'room:prop_added': (payload: AddPropPayload, ack?: SocketAck<RoomPropAddedEvent>) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId: string;
  username: string;
  displayName: string;
}

/** The JWT accepted by the gateway during the Socket.IO handshake. */
export const SOCKET_AUTH_TOKEN_KEY = 'token';
export const SOCKET_NAMESPACE = '/spatial';
