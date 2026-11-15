import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  VoiceTokenRequestSchema,
  type VoiceTokenRequest,
  type VoiceTokenResponse,
} from '@vybe/shared-types';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { VoiceService } from './voice.service.js';

@Controller('voice')
@UseGuards(ThrottlerGuard, AuthGuard)
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Post('token')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async token(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(VoiceTokenRequestSchema)) dto: VoiceTokenRequest,
  ): Promise<VoiceTokenResponse> {
    return this.voiceService.createToken(user, dto.roomSlug);
  }
}
