import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  parseAvatarConfig,
  type AuthorSummary,
  type ConversationSummary,
  type DirectMessageView,
  type SendMessageDto,
} from '@vybe/shared-types';
import { assertCleanContent } from '../common/content-filter.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const authorSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarConfig: true,
} as const;

type MessageRecord = {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: Date;
  readAt: Date | null;
  roomInvite: { id: string; slug: string; name: string; themeTag: string } | null;
};

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private async assertNotBlocked(a: string, b: string): Promise<void> {
    const blocked = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: a, blockedId: b },
          { blockerId: b, blockedId: a },
        ],
      },
      select: { id: true },
    });
    if (blocked) throw new BadRequestException('This conversation is blocked');
  }

  async getThread(viewerId: string, otherUserId: string): Promise<DirectMessageView[]> {
    const other = await this.prisma.user.findUnique({
      where: { id: otherUserId },
      select: { id: true },
    });
    if (!other) throw new NotFoundException('Conversation partner not found');
    await this.assertNotBlocked(viewerId, otherUserId);

    await this.prisma.directMessage.updateMany({
      where: { senderId: otherUserId, recipientId: viewerId, readAt: null },
      data: { readAt: new Date() },
    });

    const messages = await this.prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: viewerId, recipientId: otherUserId },
          { senderId: otherUserId, recipientId: viewerId },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
      include: {
        roomInvite: { select: { id: true, slug: true, name: true, themeTag: true } },
      },
    });

    return messages.map((message) => this.toView(message));
  }

  async sendMessage(senderId: string, dto: SendMessageDto): Promise<DirectMessageView> {
    if (senderId === dto.recipientId) {
      throw new BadRequestException('You cannot message yourself');
    }
    assertCleanContent(dto.content);
    await this.assertNotBlocked(senderId, dto.recipientId);

    const recipient = await this.prisma.user.findUnique({
      where: { id: dto.recipientId },
      select: { id: true },
    });
    if (!recipient) throw new NotFoundException('Recipient not found');

    if (dto.roomInviteId) {
      const room = await this.prisma.room.findUnique({
        where: { id: dto.roomInviteId },
        select: { id: true },
      });
      if (!room) throw new BadRequestException('roomInviteId does not match any 3D room');
    }

    const created = await this.prisma.directMessage.create({
      data: {
        senderId,
        recipientId: dto.recipientId,
        content: dto.content,
        roomInviteId: dto.roomInviteId ?? null,
      },
      include: {
        roomInvite: { select: { id: true, slug: true, name: true, themeTag: true } },
      },
    });

    const actor = await this.prisma.user.findUnique({
      where: { id: senderId },
      select: { displayName: true },
    });
    await this.notifications.notify({
      userId: dto.recipientId,
      actorId: senderId,
      type: dto.roomInviteId ? 'ROOM_INVITE' : 'MESSAGE',
      message: dto.roomInviteId
        ? `${actor?.displayName ?? 'Someone'} invited you to a 3D room`
        : `${actor?.displayName ?? 'Someone'} sent you a message`,
      roomId: dto.roomInviteId ?? null,
    });

    return this.toView(created);
  }

  /** Latest message per conversation partner, for the mobile/web inbox rails. */
  async listConversations(viewerId: string): Promise<ConversationSummary[]> {
    const messages = await this.prisma.directMessage.findMany({
      where: { OR: [{ senderId: viewerId }, { recipientId: viewerId }] },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        roomInvite: { select: { id: true, slug: true, name: true, themeTag: true } },
        sender: { select: authorSelect },
        recipient: { select: authorSelect },
      },
    });

    const conversations = new Map<string, ConversationSummary>();

    for (const message of messages) {
      const counterpart = message.senderId === viewerId ? message.recipient : message.sender;
      const existing = conversations.get(counterpart.id);
      const unreadIncrement =
        message.recipientId === viewerId && message.readAt === null ? 1 : 0;

      if (!existing) {
        const author: AuthorSummary = {
          id: counterpart.id,
          username: counterpart.username,
          displayName: counterpart.displayName,
          avatarConfig: parseAvatarConfig(counterpart.avatarConfig),
        };
        conversations.set(counterpart.id, {
          user: author,
          lastMessage: this.toView(message),
          unreadCount: unreadIncrement,
        });
      } else if (unreadIncrement > 0) {
        existing.unreadCount += unreadIncrement;
      }
    }

    return Array.from(conversations.values());
  }

  private toView(message: MessageRecord): DirectMessageView {
    return {
      id: message.id,
      senderId: message.senderId,
      recipientId: message.recipientId,
      content: message.content,
      roomInvite: message.roomInvite,
      createdAt: message.createdAt.toISOString(),
      readAt: message.readAt ? message.readAt.toISOString() : null,
    };
  }
}
