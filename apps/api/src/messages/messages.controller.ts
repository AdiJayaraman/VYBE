import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  SendMessageDtoSchema,
  type ConversationSummary,
  type DirectMessageView,
  type SendMessageDto,
} from '@vybe/shared-types';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { MessagesService } from './messages.service.js';

@Controller('messages')
@UseGuards(ThrottlerGuard, AuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('conversations')
  async listConversations(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ConversationSummary[]> {
    return this.messagesService.listConversations(user.id);
  }

  @Get(':userId')
  async getThread(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
  ): Promise<DirectMessageView[]> {
    return this.messagesService.getThread(user.id, userId);
  }

  @Post()
  @HttpCode(201)
  async sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(SendMessageDtoSchema)) dto: SendMessageDto,
  ): Promise<DirectMessageView> {
    return this.messagesService.sendMessage(user.id, dto);
  }
}
