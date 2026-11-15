import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AiModule } from './ai/ai.module.js';
import { AuthModule } from './auth/auth.module.js';
import { HealthController } from './health.controller.js';
import { MessagesModule } from './messages/messages.module.js';
import { PostsModule } from './posts/posts.module.js';
import { PresenceModule } from './presence/presence.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RoomsModule } from './rooms/rooms.module.js';
import { UsersModule } from './users/users.module.js';
import { GatewayModule } from './gateway/gateway.module.js';
import { ModerationModule } from './moderation/moderation.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { UploadsModule } from './uploads/uploads.module.js';
import { VoiceModule } from './voice/voice.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    // Global HTTP rate limit; auth routes tighten this per-route.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    PrismaModule,
    PresenceModule,
    AuthModule,
    UsersModule,
    PostsModule,
    RoomsModule,
    MessagesModule,
    AiModule,
    VoiceModule,
    NotificationsModule,
    ModerationModule,
    UploadsModule,
    GatewayModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
