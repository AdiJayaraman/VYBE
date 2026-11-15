import { Injectable } from '@nestjs/common';
import type { RoomParticipant } from '@vybe/shared-types';
import { getProximityVolume, type Vec3 } from '@vybe/3d-core';

export interface SocketRoomBinding {
  userId: string;
  roomId: string;
}

/**
 * Ephemeral real-time state. Agreed architecture rule: avatar transforms never
 * touch PostgreSQL — they live here (in-memory) and are broadcast over Socket.IO.
 */
@Injectable()
export class RoomPresenceStore {
  private readonly rooms = new Map<string, Map<string, RoomParticipant>>();
  private readonly socketBindings = new Map<string, SocketRoomBinding>();
  private readonly lastMoveAt = new Map<string, number>();
  /** Token buckets for chat / emote / prop spam protection. */
  private readonly rateBuckets = new Map<string, { tokens: number; updatedAt: number }>();

  getParticipants(roomId: string): RoomParticipant[] {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.values()) : [];
  }

  getParticipant(roomId: string, userId: string): RoomParticipant | undefined {
    return this.rooms.get(roomId)?.get(userId);
  }

  getActiveCount(roomId: string): number {
    return this.rooms.get(roomId)?.size ?? 0;
  }

  /** Room ids -> participant count, used by the room directory + feed portals. */
  getActiveCounts(): Map<string, number> {
    const counts = new Map<string, number>();
    for (const [roomId, participants] of this.rooms) {
      counts.set(roomId, participants.size);
    }
    return counts;
  }

  getOccupantNames(roomId: string, limit = 4): string[] {
    return this.getParticipants(roomId)
      .slice(0, limit)
      .map((participant) => participant.displayName);
  }

  isMember(roomId: string, userId: string): boolean {
    return this.rooms.get(roomId)?.has(userId) ?? false;
  }

  getParticipantCountForRoom(roomId: string): number {
    return this.rooms.get(roomId)?.size ?? 0;
  }

  /**
   * Adds (or replaces) a participant and returns the roster snapshot. Returns
   * `null` when the room is already at capacity.
   */
  addParticipant(
    roomId: string,
    participant: RoomParticipant,
    maxParticipants: number,
  ): RoomParticipant[] | null {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = new Map<string, RoomParticipant>();
      this.rooms.set(roomId, room);
    }

    const existing = room.get(participant.userId);
    if (!existing && room.size >= maxParticipants) {
      return null;
    }

    room.set(participant.userId, existing ? { ...participant, joinedAt: existing.joinedAt } : participant);
    return Array.from(room.values());
  }

  removeParticipant(roomId: string, userId: string): RoomParticipant | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    const removed = room.get(userId);
    room.delete(userId);
    if (room.size === 0) {
      this.rooms.delete(roomId);
    }
    return removed;
  }

  updateTransform(
    roomId: string,
    userId: string,
    transform: Pick<RoomParticipant, 'position' | 'rotation' | 'animation'>,
  ): RoomParticipant | undefined {
    const participant = this.rooms.get(roomId)?.get(userId);
    if (!participant) return undefined;
    const updated: RoomParticipant = {
      ...participant,
      position: transform.position,
      rotation: transform.rotation,
      animation: transform.animation,
    };
    this.rooms.get(roomId)?.set(userId, updated);
    return updated;
  }

  setSpeaking(roomId: string, userId: string, isSpeaking: boolean): RoomParticipant | undefined {
    const participant = this.rooms.get(roomId)?.get(userId);
    if (!participant) return undefined;
    const updated: RoomParticipant = { ...participant, isSpeaking };
    this.rooms.get(roomId)?.set(userId, updated);
    return updated;
  }

  bindSocket(socketId: string, binding: SocketRoomBinding): void {
    this.socketBindings.set(socketId, binding);
  }

  getBinding(socketId: string): SocketRoomBinding | undefined {
    return this.socketBindings.get(socketId);
  }

  /** True when the same member is still connected through another socket/tab. */
  hasOtherSocketForUser(roomId: string, userId: string, excludeSocketId: string): boolean {
    for (const [socketId, binding] of this.socketBindings) {
      if (
        socketId !== excludeSocketId &&
        binding.roomId === roomId &&
        binding.userId === userId
      ) {
        return true;
      }
    }
    return false;
  }

  clearSocket(socketId: string): SocketRoomBinding | undefined {
    const binding = this.socketBindings.get(socketId);
    this.socketBindings.delete(socketId);
    this.lastMoveAt.delete(socketId);
    for (const key of this.rateBuckets.keys()) {
      if (key.endsWith(`:${socketId}`)) this.rateBuckets.delete(key);
    }
    return binding;
  }

  /**
   * Token-bucket check for low-frequency events. `capacity` bursts are allowed,
   * refilling at `refillPerSecond`.
   */
  consumeRateLimit(
    key: string,
    capacity: number,
    refillPerSecond: number,
    now = Date.now(),
  ): boolean {
    const bucket = this.rateBuckets.get(key) ?? { tokens: capacity, updatedAt: now };
    const elapsedSeconds = Math.max(0, (now - bucket.updatedAt) / 1000);
    const tokens = Math.min(capacity, bucket.tokens + elapsedSeconds * refillPerSecond);

    if (tokens < 1) {
      this.rateBuckets.set(key, { tokens, updatedAt: now });
      return false;
    }

    this.rateBuckets.set(key, { tokens: tokens - 1, updatedAt: now });
    return true;
  }

  /** Server-side flood protection for `room:move` (max ~30Hz per socket). */
  canAcceptMove(socketId: string, now = Date.now()): boolean {
    const last = this.lastMoveAt.get(socketId) ?? 0;
    if (now - last < 33) return false;
    this.lastMoveAt.set(socketId, now);
    return true;
  }

  /** Proximity volume (0..1) between two participants in the same room. */
  getProximityVolumeForUsers(roomId: string, listenerId: string, speakerId: string): number {
    const listener = this.getParticipant(roomId, listenerId);
    const speaker = this.getParticipant(roomId, speakerId);
    if (!listener || !speaker) return 0;
    return getProximityVolume(listener.position as Vec3, speaker.position as Vec3);
  }
}
