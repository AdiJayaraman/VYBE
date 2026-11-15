import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  GenerateRoomLayoutDtoSchema,
  type GenerateRoomLayoutDto,
  type RoomLayoutSuggestion,
} from '@vybe/shared-types';
import { AuthGuard } from '../auth/auth.guard.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { AiService } from './ai.service.js';

@Controller('ai')
@UseGuards(ThrottlerGuard, AuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-room-layout')
  @HttpCode(200)
  // AI calls spend real credits — cap them per client.
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  async generateRoomLayout(
    @Body(new ZodValidationPipe(GenerateRoomLayoutDtoSchema)) dto: GenerateRoomLayoutDto,
  ): Promise<RoomLayoutSuggestion> {
    return this.aiService.generateRoomLayout(dto);
  }
}
