import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    PrismaModule,
    PresenceModule,
    AuthModule,
    UsersModule,
    PostsModule,
    RoomsModule,
    MessagesModule,
    AiModule,
    GatewayModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
