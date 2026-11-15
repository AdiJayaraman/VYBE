import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { MAX_ROOM_PROPS, getRoomTemplate } from '@vybe/3d-core';
import {
  AddPropPayloadSchema,
  PlayerTransformPayloadSchema,
  RoomJoinPayloadSchema,
  RoomLeavePayloadSchema,
  parseAvatarConfig,
  type AnimationState,
  type ChatMessageEvent,
  type ClientToServerEvents,
  type EmoteType,
  type InterServerEvents,
  type PlayerTransformPayload,
  type RoomEmoteEvent,
  type RoomParticipant,
  type RoomPropAddedEvent,
  type RoomStateSyncPayload,
  type SceneProp,
  type ServerToClientEvents,
  type SocketAckResponse,
  type SocketData,
  type SocketErrorCode,
} from '@vybe/shared-types';
import { z } from 'zod';
import { AuthService } from '../auth/auth.service.js';
import { moderateContent } from '../common/content-filter.js';
import { resolveCorsOrigin } from '../common/cors.js';
import { parseSceneGraph } from '../common/scene.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RoomPresenceStore } from '../presence/room-presence.store.js';

type VybeSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type VybeServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

const ChatPayloadSchema = z.object({
  roomId: z.string().min(1),
  content: z.string().trim().min(1).max(280),
});

const EmotePayloadSchema = z.object({
  roomId: z.string().min(1),
  emote: z.enum(['wave', 'dance', 'sit', 'cyber_pulse']),
});

const ANIMATION_BY_EMOTE: Record<EmoteType, AnimationState> = {
  wave: 'wave',
  dance: 'dance',
  sit: 'sit',
  cyber_pulse: 'dance',
};

const HANDSHAKE_SCHEMA = z.object({ token: z.string().min(1) });

@WebSocketGateway({
  cors: { origin: resolveCorsOrigin(), methods: ['GET', 'POST'] },
  namespace: '/spatial',
})
export class RoomGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RoomGateway.name);

  @WebSocketServer()
  server!: VybeServer;

  constructor(
    private readonly presence: RoomPresenceStore,
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async handleConnection(socket: VybeSocket): Promise<void> {
    try {
      await this.authenticate(socket);
      this.logger.debug(`socket ${socket.id} authenticated as ${socket.data.username}`);
    } catch {
      socket.emit('room:error', {
        code: 'UNAUTHORIZED',
        message: 'Socket handshake requires a valid VYBE access token',
      });
      socket.disconnect(true);
    }
  }

  async handleDisconnect(socket: VybeSocket): Promise<void> {
    await this.leaveRoom(socket, 'disconnect');
  }

  @SubscribeMessage('room:join')
  async handleJoin(
    @ConnectedSocket() socket: VybeSocket,
    @MessageBody() raw: unknown,
  ): Promise<SocketAckResponse<RoomStateSyncPayload>> {
    try {
      const payload = RoomJoinPayloadSchema.parse(raw);
      const identity = await this.authenticate(socket);
      if (!this.presence.consumeRateLimit(`join:${socket.id}`, 8, 0.5)) {
        return this.fail('RATE_LIMITED', 'Too many join attempts, slow down');
      }

      const room = await this.prisma.room.findUnique({
        where: { id: payload.roomId },
        select: {
          id: true,
          templateId: true,
          sceneGraph: true,
          maxParticipants: true,
        },
      });
      if (!room) return this.fail('ROOM_NOT_FOUND', 'That room does not exist');

      const occupant = await this.prisma.user.findUnique({
        where: { id: identity.userId },
        select: { avatarConfig: true, username: true, displayName: true },
      });

      const alreadyPresent = this.presence.getParticipant(room.id, identity.userId);
      if (!alreadyPresent && this.presence.getActiveCount(room.id) >= room.maxParticipants) {
        return this.fail('ROOM_FULL', 'This room is at capacity');
      }

      const spawn = payload.spawnPosition ?? getRoomTemplate(room.templateId).spawnPoint;
      const participant: RoomParticipant = {
        userId: identity.userId,
        username: identity.username,
        displayName: occupant?.displayName ?? identity.displayName,
        avatarConfig: parseAvatarConfig(occupant?.avatarConfig),
        position: spawn,
        rotation: 0,
        animation: 'idle',
        joinedAt: new Date().toISOString(),
        isSpeaking: false,
      };

      const roster = this.presence.addParticipant(room.id, participant, room.maxParticipants);
      if (!roster) return this.fail('ROOM_FULL', 'This room is at capacity');

      const previousBinding = this.presence.getBinding(socket.id);
      if (previousBinding && previousBinding.roomId !== room.id) {
        socket.leave(previousBinding.roomId);
        this.presence.removeParticipant(previousBinding.roomId, previousBinding.userId);
      }

      this.presence.bindSocket(socket.id, { userId: identity.userId, roomId: room.id });
      await socket.join(room.id);

      const stateSync: RoomStateSyncPayload = {
        roomId: room.id,
        sceneGraph: parseSceneGraph(room.sceneGraph, room.templateId),
        participants: roster,
        serverTime: new Date().toISOString(),
      };

      socket.emit('room:state_sync', stateSync);
      socket.to(room.id).emit('room:player_joined', participant);

      void this.persistPresence(identity.userId, room.id, 'IN_ROOM');
      return { ok: true, data: stateSync };
    } catch (error: unknown) {
      return this.failFromError(error);
    }
  }

  @SubscribeMessage('room:leave')
  async handleLeave(
    @ConnectedSocket() socket: VybeSocket,
    @MessageBody() raw: unknown,
  ): Promise<SocketAckResponse<{ roomId: string }>> {
    try {
      const payload = RoomLeavePayloadSchema.parse(raw);
      const binding = this.presence.getBinding(socket.id);
      if (!binding || binding.roomId !== payload.roomId) {
        return this.fail('NOT_IN_ROOM', 'You are not inside that room');
      }

      await this.leaveRoom(socket, 'leave');
      return { ok: true, data: { roomId: payload.roomId } };
    } catch (error: unknown) {
      return this.failFromError(error);
    }
  }

  @SubscribeMessage('room:move')
  async handleMove(
    @ConnectedSocket() socket: VybeSocket,
    @MessageBody() raw: unknown,
  ): Promise<void> {
    const binding = this.presence.getBinding(socket.id);
    if (!binding) return;
    if (!this.presence.canAcceptMove(socket.id)) return;

    const parsed = PlayerTransformPayloadSchema.safeParse(raw);
    if (!parsed.success) {
      socket.emit('room:error', { code: 'INVALID_PAYLOAD', message: 'Invalid room:move payload' });
      return;
    }

    const transform: PlayerTransformPayload = parsed.data;
    if (transform.roomId !== binding.roomId) return;

    const updated = this.presence.updateTransform(binding.roomId, binding.userId, {
      position: transform.position,
      rotation: transform.rotation,
      animation: transform.animation,
    });
    if (!updated) return;

    socket.to(binding.roomId).emit('room:player_moved', {
      roomId: binding.roomId,
      userId: binding.userId,
      position: updated.position,
      rotation: updated.rotation,
      animation: updated.animation,
      serverTime: new Date().toISOString(),
    });
  }

  @SubscribeMessage('room:chat')
  async handleChat(
    @ConnectedSocket() socket: VybeSocket,
    @MessageBody() raw: unknown,
  ): Promise<SocketAckResponse<ChatMessageEvent>> {
    try {
      const payload = ChatPayloadSchema.parse(raw);
      const binding = this.presence.getBinding(socket.id);
      if (!binding || binding.roomId !== payload.roomId) {
        return this.fail('NOT_IN_ROOM', 'Join the room before chatting');
      }
      if (!this.presence.consumeRateLimit(`chat:${socket.id}`, 6, 1.5)) {
        return this.fail('RATE_LIMITED', 'You are chatting too fast');
      }
      const verdict = moderateContent(payload.content);
      if (!verdict.allowed) {
        return this.fail('CONTENT_BLOCKED', verdict.reason ?? 'Message blocked by moderation');
      }

      const message: ChatMessageEvent = {
        id: crypto.randomUUID(),
        roomId: payload.roomId,
        userId: binding.userId,
        username: socket.data.username,
        content: payload.content,
        sentAt: new Date().toISOString(),
      };

      this.server.to(payload.roomId).emit('room:chat_message', message);
      return { ok: true, data: message };
    } catch (error: unknown) {
      return this.failFromError(error);
    }
  }

  @SubscribeMessage('room:emote')
  async handleEmote(
    @ConnectedSocket() socket: VybeSocket,
    @MessageBody() raw: unknown,
  ): Promise<SocketAckResponse<RoomEmoteEvent>> {
    try {
      const payload = EmotePayloadSchema.parse(raw);
      const binding = this.presence.getBinding(socket.id);
      if (!binding || binding.roomId !== payload.roomId) {
        return this.fail('NOT_IN_ROOM', 'Join the room before emoting');
      }
      if (!this.presence.consumeRateLimit(`emote:${socket.id}`, 6, 1)) {
        return this.fail('RATE_LIMITED', 'Too many emotes, slow down');
      }

      const animation = ANIMATION_BY_EMOTE[payload.emote];
      this.presence.updateTransform(binding.roomId, binding.userId, {
        position: this.presence.getParticipant(binding.roomId, binding.userId)?.position ?? [0, 0, 0],
        rotation: this.presence.getParticipant(binding.roomId, binding.userId)?.rotation ?? 0,
        animation,
      });

      const event: RoomEmoteEvent = {
        roomId: binding.roomId,
        userId: binding.userId,
        username: socket.data.username,
        emote: payload.emote,
        animation,
        triggeredAt: new Date().toISOString(),
      };

      this.server.to(binding.roomId).emit('room:emote_triggered', event);
      return { ok: true, data: event };
    } catch (error: unknown) {
      return this.failFromError(error);
    }
  }

  @SubscribeMessage('room:prop_added')
  async handlePropAdded(
    @ConnectedSocket() socket: VybeSocket,
    @MessageBody() raw: unknown,
  ): Promise<SocketAckResponse<RoomPropAddedEvent>> {
    try {
      const payload = AddPropPayloadSchema.parse(raw);
      const binding = this.presence.getBinding(socket.id);
      if (!binding || binding.roomId !== payload.roomId) {
        return this.fail('NOT_IN_ROOM', 'Join the room before spawning props');
      }
      if (!this.presence.consumeRateLimit(`prop:${socket.id}`, 12, 0.5)) {
        return this.fail('RATE_LIMITED', 'Too many props spawned, slow down');
      }

      const room = await this.prisma.room.findUnique({
        where: { id: payload.roomId },
        select: { id: true, templateId: true, sceneGraph: true },
      });
      if (!room) return this.fail('ROOM_NOT_FOUND', 'That room does not exist');

      const existingProps = parseSceneGraph(room.sceneGraph, room.templateId);
      const merged: SceneProp[] = [...existingProps, ...payload.props];
      if (merged.length > MAX_ROOM_PROPS) {
        return this.fail(
          'INVALID_PAYLOAD',
          `Room prop limit reached (${MAX_ROOM_PROPS}). Remove props before adding more.`,
        );
      }

      await this.prisma.room.update({
        where: { id: room.id },
        data: { sceneGraph: merged },
      });

      const event: RoomPropAddedEvent = {
        roomId: room.id,
        props: payload.props,
        addedByUserId: binding.userId,
        sceneGraph: merged,
      };

      this.server.to(room.id).emit('room:prop_added', event);
      return { ok: true, data: event };
    } catch (error: unknown) {
      return this.failFromError(error);
    }
  }

  /** Shared teardown for `room:leave` and transport disconnects. */
  private async leaveRoom(socket: VybeSocket, reason: 'leave' | 'disconnect'): Promise<void> {
    const binding = this.presence.clearSocket(socket.id);
    if (!binding) return;

    if (this.presence.hasOtherSocketForUser(binding.roomId, binding.userId, socket.id)) {
      return;
    }

    const removed = this.presence.removeParticipant(binding.roomId, binding.userId);
    socket.leave(binding.roomId);

    if (removed) {
      this.server.to(binding.roomId).emit('room:player_left', {
        roomId: binding.roomId,
        userId: binding.userId,
        username: removed.username,
        leftAt: new Date().toISOString(),
      });
      this.logger.debug(`${removed.username} ${reason === 'leave' ? 'left' : 'disconnected from'} ${binding.roomId}`);
    }

    void this.persistPresence(binding.userId, null, 'ONLINE');
  }

  private async persistPresence(
    userId: string,
    roomId: string | null,
    presence: 'ONLINE' | 'IN_ROOM',
  ): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { presence, currentRoomId: roomId },
      });
    } catch (error: unknown) {
      this.logger.warn(`Presence persist failed for ${userId}: ${String(error)}`);
    }
  }

  private async authenticate(socket: VybeSocket): Promise<SocketData> {
    if (socket.data.userId) {
      return socket.data;
    }

    const auth = socket.handshake.auth as Record<string, unknown>;
    const fromAuth = HANDSHAKE_SCHEMA.safeParse(auth);
    const headerValue = socket.handshake.headers.authorization;
    const fromHeader =
      typeof headerValue === 'string' && headerValue.startsWith('Bearer ')
        ? headerValue.slice('Bearer '.length)
        : undefined;
    const queryToken = socket.handshake.query.token;
    const fromQuery = typeof queryToken === 'string' ? queryToken : undefined;

    const token = fromAuth.success ? fromAuth.data.token : (fromHeader ?? fromQuery);
    if (!token) {
      throw new Error('Missing socket auth token');
    }

    const user = await this.authService.verifyAccessToken(token);
    socket.data.userId = user.id;
    socket.data.username = user.username;
    socket.data.displayName = user.displayName;
    return socket.data;
  }

  private fail(code: SocketErrorCode, message: string): { ok: false; error: { code: SocketErrorCode; message: string } } {
    return { ok: false, error: { code, message } };
  }

  private failFromError(error: unknown): { ok: false; error: { code: SocketErrorCode; message: string } } {
    if (error instanceof z.ZodError) {
      return this.fail('INVALID_PAYLOAD', error.issues.map((issue) => issue.message).join(', '));
    }
    if (error instanceof Error && error.message.toLowerCase().includes('token')) {
      return this.fail('UNAUTHORIZED', 'Socket authentication failed');
    }
    this.logger.warn(`Gateway error: ${String(error)}`);
    return this.fail('INVALID_PAYLOAD', 'Request could not be processed');
  }
}
