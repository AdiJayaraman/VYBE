import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  CreateReportDtoSchema,
  ResolveReportDtoSchema,
  type BlockResult,
  type CreateReportDto,
  type ReportStatus,
  type ReportView,
  type ResolveReportDto,
  type UserSearchResult,
} from '@vybe/shared-types';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { AdminGuard } from './admin.guard.js';
import { ModerationService } from './moderation.service.js';

@Controller()
@UseGuards(ThrottlerGuard, AuthGuard)
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  @Post('reports')
  @HttpCode(201)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async report(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateReportDtoSchema)) dto: CreateReportDto,
  ): Promise<ReportView> {
    return this.moderation.createReport(user.id, dto);
  }

  @Get('admin/reports')
  @UseGuards(AdminGuard)
  async listReports(@Query('status') status?: string): Promise<ReportView[]> {
    const normalized = status === 'ALL' || status === 'RESOLVED' || status === 'DISMISSED'
      ? status
      : 'OPEN';
    return this.moderation.listReports(normalized as ReportStatus | 'ALL');
  }

  @Patch('admin/reports/:id')
  @UseGuards(AdminGuard)
  async resolve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ResolveReportDtoSchema)) dto: ResolveReportDto,
  ): Promise<ReportView> {
    return this.moderation.resolveReport(id, user.id, dto.status);
  }

  @Post('users/:id/block')
  @HttpCode(200)
  async block(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<BlockResult> {
    return this.moderation.block(user.id, id);
  }

  @Delete('users/:id/block')
  async unblock(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<BlockResult> {
    return this.moderation.unblock(user.id, id);
  }

  @Get('users/me/blocked')
  async blocked(@CurrentUser() user: AuthenticatedUser): Promise<UserSearchResult[]> {
    return this.moderation.listBlocked(user.id);
  }
}
