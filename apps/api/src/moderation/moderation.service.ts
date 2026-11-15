import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { parseAvatarConfig } from '@vybe/shared-types';
import type {
  BlockResult,
  CreateReportDto,
  ReportReason,
  ReportStatus,
  ReportTargetType,
  ReportView,
  UserSearchResult,
} from '@vybe/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';

const authorSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarConfig: true,
} as const;

@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  async createReport(reporterId: string, dto: CreateReportDto): Promise<ReportView> {
    const label = await this.describeTarget(dto.targetType, dto.targetId);

    const duplicate = await this.prisma.report.findFirst({
      where: {
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        status: 'OPEN',
      },
      select: { id: true },
    });
    if (duplicate) throw new ConflictException('You already have an open report for this');

    const report = await this.prisma.report.create({
      data: {
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
        details: dto.details,
      },
      include: { reporter: { select: authorSelect } },
    });

    return this.toView(report, label);
  }

  async listReports(status: ReportStatus | 'ALL' = 'OPEN'): Promise<ReportView[]> {
    const reports = await this.prisma.report.findMany({
      where: status === 'ALL' ? {} : { status },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { reporter: { select: authorSelect } },
    });

    return Promise.all(
      reports.map(async (report) =>
        this.toView(
          report,
          await this.describeTarget(report.targetType as ReportTargetType, report.targetId),
        ),
      ),
    );
  }

  async resolveReport(
    id: string,
    reviewerId: string,
    status: ReportStatus,
  ): Promise<ReportView> {
    if (status === 'OPEN') throw new BadRequestException('Choose RESOLVED or DISMISSED');
    const report = await this.prisma.report.update({
      where: { id },
      data: { status, reviewedAt: new Date(), reviewedById: reviewerId },
      include: { reporter: { select: authorSelect } },
    });
    return this.toView(
      report,
      await this.describeTarget(report.targetType as ReportTargetType, report.targetId),
    );
  }

  async block(blockerId: string, blockedId: string): Promise<BlockResult> {
    if (blockerId === blockedId) throw new BadRequestException('You cannot block yourself');
    const target = await this.prisma.user.findUnique({
      where: { id: blockedId },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('User not found');

    await this.prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      update: {},
      create: { blockerId, blockedId },
    });
    // Blocking also severs follows in both directions.
    await this.prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: blockerId, followingId: blockedId },
          { followerId: blockedId, followingId: blockerId },
        ],
      },
    });
    return { blocked: true };
  }

  async unblock(blockerId: string, blockedId: string): Promise<BlockResult> {
    await this.prisma.block.deleteMany({ where: { blockerId, blockedId } });
    return { blocked: false };
  }

  async listBlocked(userId: string): Promise<UserSearchResult[]> {
    const blocks = await this.prisma.block.findMany({
      where: { blockerId: userId },
      include: { blocked: { include: { _count: { select: { followers: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    return blocks.map((block) => ({
      id: block.blocked.id,
      username: block.blocked.username,
      displayName: block.blocked.displayName,
      avatarConfig: parseAvatarConfig(block.blocked.avatarConfig),
      followerCount: block.blocked._count.followers,
      presence: block.blocked.presence,
      isFollowedByMe: false,
    }));
  }

  /** Users that must be hidden from `viewerId` (either direction). */
  async hiddenUserIds(viewerId: string): Promise<string[]> {
    const blocks = await this.prisma.block.findMany({
      where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
      select: { blockerId: true, blockedId: true },
    });
    const ids = new Set<string>();
    for (const block of blocks) {
      ids.add(block.blockerId === viewerId ? block.blockedId : block.blockerId);
    }
    return [...ids];
  }

  private async describeTarget(
    targetType: ReportTargetType,
    targetId: string,
  ): Promise<string> {
    if (targetType === 'POST') {
      const post = await this.prisma.post.findUnique({
        where: { id: targetId },
        select: { content: true, author: { select: { username: true } } },
      });
      if (!post) throw new NotFoundException('Reported post not found');
      return `Post by @${post.author.username}: "${post.content.slice(0, 80)}"`;
    }
    if (targetType === 'COMMENT') {
      const comment = await this.prisma.comment.findUnique({
        where: { id: targetId },
        select: { content: true, author: { select: { username: true } } },
      });
      if (!comment) throw new NotFoundException('Reported comment not found');
      return `Comment by @${comment.author.username}: "${comment.content.slice(0, 80)}"`;
    }
    if (targetType === 'USER') {
      const user = await this.prisma.user.findUnique({
        where: { id: targetId },
        select: { username: true, displayName: true },
      });
      if (!user) throw new NotFoundException('Reported user not found');
      return `@${user.username} (${user.displayName})`;
    }
    const room = await this.prisma.room.findUnique({
      where: { id: targetId },
      select: { name: true, slug: true },
    });
    if (!room) throw new NotFoundException('Reported room not found');
    return `Room /${room.slug} (${room.name})`;
  }

  private toView(
    report: {
      id: string;
      targetType: string;
      targetId: string;
      reason: ReportReason;
      details: string;
      status: ReportStatus;
      createdAt: Date;
      reviewedAt: Date | null;
      reporter: {
        id: string;
        username: string;
        displayName: string;
        avatarConfig: unknown;
      };
    },
    targetLabel: string,
  ): ReportView {
    return {
      id: report.id,
      targetType: report.targetType as ReportTargetType,
      targetId: report.targetId,
      reason: report.reason,
      details: report.details,
      status: report.status,
      createdAt: report.createdAt.toISOString(),
      reviewedAt: report.reviewedAt ? report.reviewedAt.toISOString() : null,
      reporter: {
        id: report.reporter.id,
        username: report.reporter.username,
        displayName: report.reporter.displayName,
        avatarConfig: parseAvatarConfig(report.reporter.avatarConfig),
      },
      targetLabel,
    };
  }
}
