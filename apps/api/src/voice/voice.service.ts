import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken } from 'livekit-server-sdk';
import {
  VOICE_TOKEN_TTL_SECONDS,
  type VoiceTokenResponse,
} from '@vybe/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

interface VoiceSettings {
  url: string;
  apiKey: string;
  apiSecret: string;
}

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private get settings(): VoiceSettings | null {
    const url = this.config.get<string>('LIVEKIT_URL')?.trim();
    const apiKey = this.config.get<string>('LIVEKIT_API_KEY')?.trim();
    const apiSecret = this.config.get<string>('LIVEKIT_API_SECRET')?.trim();
    if (!url || !apiKey || !apiSecret) return null;
    return { url, apiKey, apiSecret };
  }

  /**
   * Mints a LiveKit join token scoped to one VYBE room. The browser never sees
   * the API secret — it only receives a 15 minute grant for this room.
   */
  async createToken(user: AuthenticatedUser, roomSlug: string): Promise<VoiceTokenResponse> {
    const settings = this.settings;
    if (!settings) {
      throw new ServiceUnavailableException(
        'Proximity voice is not configured. Set LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET.',
      );
    }

    const room = await this.prisma.room.findUnique({
      where: { slug: roomSlug },
      select: { id: true },
    });
    if (!room) throw new NotFoundException(`Room /${roomSlug} not found`);

    const roomName = `vybe-${room.id}`;
    const accessToken = new AccessToken(settings.apiKey, settings.apiSecret, {
      identity: user.id,
      name: user.displayName,
      ttl: VOICE_TOKEN_TTL_SECONDS,
      metadata: JSON.stringify({ username: user.username, roomSlug }),
    });
    accessToken.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await accessToken.toJwt();
    this.logger.log(`Issued voice grant for ${user.username} in ${roomName}`);

    return {
      url: settings.url,
      token,
      roomName,
      expiresAt: new Date(Date.now() + VOICE_TOKEN_TTL_SECONDS * 1000).toISOString(),
      canPublish: true,
    };
  }
}
