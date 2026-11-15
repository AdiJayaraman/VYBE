import { Injectable, NotFoundException } from '@nestjs/common';
import { cloneTemplateScene, getRoomTemplate } from '@vybe/3d-core';
import {
  parseAvatarConfig,
  type CreateRoomDto,
  type RoomDetail,
  type RoomParticipantView,
  type RoomSummary,
  type SceneProp,
} from '@vybe/shared-types';
import { parseSceneGraph } from '../common/scene.js';
import { RoomPresenceStore } from '../presence/room-presence.store.js';
import { PrismaService } from '../prisma/prisma.service.js';

interface RoomRecord {
  id: string;
  slug: string;
  name: string;
  description: string;
  templateId: string;
  themeTag: string;
  isPublic: boolean;
  maxParticipants: number;
  sceneGraph: unknown;
  createdAt: Date;
  owner: { username: string } | null;
}

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly presence: RoomPresenceStore,
  ) {}

  async listRooms(): Promise<RoomSummary[]> {
    const rooms = await this.prisma.room.findMany({
      where: { isPublic: true },
      orderBy: [{ createdAt: 'asc' }],
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        templateId: true,
        themeTag: true,
        isPublic: true,
        maxParticipants: true,
        createdAt: true,
      },
    });

    return rooms.map((room) => this.toSummary(room));
  }

  async getRoomBySlug(slug: string): Promise<RoomDetail> {
    const room = await this.prisma.room.findUnique({
      where: { slug },
      include: { owner: { select: { username: true } } },
    });
    if (!room) throw new NotFoundException(`Room /${slug} not found`);
    return this.toDetail(room);
  }

  async getRoomById(id: string): Promise<RoomDetail | null> {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: { owner: { select: { username: true } } },
    });
    return room ? this.toDetail(room) : null;
  }

  async createRoom(ownerId: string, dto: CreateRoomDto): Promise<RoomDetail> {
    const template = getRoomTemplate(dto.templateId);
    const sceneGraph: SceneProp[] = dto.sceneGraph ?? cloneTemplateScene(template.templateId);
    const slug = await this.uniqueSlug(dto.name);

    const room = await this.prisma.room.create({
      data: {
        slug,
        name: dto.name,
        description: dto.description,
        templateId: template.templateId,
        themeTag: dto.themeTag ?? template.themeTag,
        isPublic: dto.isPublic,
        maxParticipants: dto.maxParticipants,
        sceneGraph,
        ownerId,
      },
      include: { owner: { select: { username: true } } },
    });

    return this.toDetail(room);
  }

  async updateScene(slug: string, sceneGraph: SceneProp[]): Promise<RoomDetail> {
    const existing = await this.prisma.room.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException(`Room /${slug} not found`);

    const room = await this.prisma.room.update({
      where: { slug },
      data: { sceneGraph },
      include: { owner: { select: { username: true } } },
    });

    return this.toDetail(room);
  }

  private toSummary(room: {
    id: string;
    slug: string;
    name: string;
    description: string;
    templateId: string;
    themeTag: string;
    isPublic: boolean;
    maxParticipants: number;
    createdAt: Date;
  }): RoomSummary {
    return {
      id: room.id,
      slug: room.slug,
      name: room.name,
      description: room.description,
      templateId: room.templateId,
      themeTag: room.themeTag,
      isPublic: room.isPublic,
      maxParticipants: room.maxParticipants,
      activeParticipantCount: this.presence.getActiveCount(room.id),
      occupantNames: this.presence.getOccupantNames(room.id),
      createdAt: room.createdAt.toISOString(),
    };
  }

  private toDetail(room: RoomRecord): RoomDetail {
    const participants: RoomParticipantView[] = this.presence
      .getParticipants(room.id)
      .map((participant) => ({
        userId: participant.userId,
        username: participant.username,
        displayName: participant.displayName,
        avatarConfig: parseAvatarConfig(participant.avatarConfig),
        animation: participant.animation,
      }));

    return {
      ...this.toSummary(room),
      sceneGraph: parseSceneGraph(room.sceneGraph, room.templateId),
      participants,
      ownerUsername: room.owner?.username ?? null,
    };
  }

  private async uniqueSlug(name: string): Promise<string> {
    const base =
      name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 32) || 'room';

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
      const existing = await this.prisma.room.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!existing) return candidate;
    }

    return `${base}-${Date.now().toString(36)}`;
  }
}
