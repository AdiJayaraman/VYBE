import { Body, Controller, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  CreateRoomDtoSchema,
  UpdateRoomSceneDtoSchema,
  type CreateRoomDto,
  type RoomDetail,
  type RoomSummary,
  type UpdateRoomSceneDto,
} from '@vybe/shared-types';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { RoomsService } from './rooms.service.js';

@Controller('rooms')
@UseGuards(ThrottlerGuard, AuthGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  async listRooms(): Promise<RoomSummary[]> {
    return this.roomsService.listRooms();
  }

  @Post()
  @HttpCode(201)
  async createRoom(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateRoomDtoSchema)) dto: CreateRoomDto,
  ): Promise<RoomDetail> {
    return this.roomsService.createRoom(user.id, dto);
  }

  @Get(':slug')
  async getRoom(@Param('slug') slug: string): Promise<RoomDetail> {
    return this.roomsService.getRoomBySlug(slug);
  }

  @Patch(':slug/scene')
  async updateScene(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(UpdateRoomSceneDtoSchema)) dto: UpdateRoomSceneDto,
  ): Promise<RoomDetail> {
    return this.roomsService.updateScene(slug, dto.sceneGraph, user.id);
  }
}
