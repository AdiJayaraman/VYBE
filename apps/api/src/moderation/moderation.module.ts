import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AdminGuard } from './admin.guard.js';
import { ModerationController } from './moderation.controller.js';
import { ModerationService } from './moderation.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ModerationController],
  providers: [ModerationService, AdminGuard],
  exports: [ModerationService],
})
export class ModerationModule {}
