import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  parseAvatarConfig,
  type CursorPage,
  type FeedComment,
  type FeedPost,
  type CreateCommentDto,
  type CreatePostDto,
  type FeedQuery,
} from '@vybe/shared-types';
import { RoomPresenceStore } from '../presence/room-presence.store.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface LikeResult {
  liked: boolean;
  likeCount: number;
}

const authorSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarConfig: true,
} as const;

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly presence: RoomPresenceStore,
  ) {}

  async getFeed(viewerId: string, query: FeedQuery): Promise<CursorPage<FeedPost>> {
    const limit = query.limit;
    const posts = await this.prisma.post.findMany({
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        author: { select: authorSelect },
        linkedRoom: {
          select: {
            id: true,
            slug: true,
            name: true,
            themeTag: true,
            templateId: true,
            maxParticipants: true,
          },
        },
        likes: { where: { userId: viewerId }, select: { id: true } },
        _count: { select: { likes: true, comments: true } },
        comments: {
          take: 2,
          orderBy: { createdAt: 'desc' },
          include: { author: { select: authorSelect } },
        },
      },
    });

    const hasMore = posts.length > limit;
    const page = hasMore ? posts.slice(0, limit) : posts;
    const last = page[page.length - 1];

    const items: FeedPost[] = page.map((post) => {
      const comments: FeedComment[] = post.comments
        .map((comment) => ({
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt.toISOString(),
          author: {
            id: comment.author.id,
            username: comment.author.username,
            displayName: comment.author.displayName,
            avatarConfig: parseAvatarConfig(comment.author.avatarConfig),
          },
        }))
        .reverse();

      return {
        id: post.id,
        content: post.content,
        mediaUrls: post.mediaUrls,
        createdAt: post.createdAt.toISOString(),
        author: {
          id: post.author.id,
          username: post.author.username,
          displayName: post.author.displayName,
          avatarConfig: parseAvatarConfig(post.author.avatarConfig),
        },
        likeCount: post._count.likes,
        commentCount: post._count.comments,
        likedByMe: post.likes.length > 0,
        linkedRoom: post.linkedRoom
          ? {
              id: post.linkedRoom.id,
              slug: post.linkedRoom.slug,
              name: post.linkedRoom.name,
              themeTag: post.linkedRoom.themeTag,
              templateId: post.linkedRoom.templateId,
              activeParticipantCount: this.presence.getActiveCount(post.linkedRoom.id),
              maxParticipants: post.linkedRoom.maxParticipants,
            }
          : null,
        latestComments: comments,
      };
    });

    return { items, nextCursor: hasMore && last ? last.id : null };
  }

  async createPost(authorId: string, dto: CreatePostDto): Promise<FeedPost> {
    if (dto.linkedRoomId) {
      const room = await this.prisma.room.findUnique({
        where: { id: dto.linkedRoomId },
        select: { id: true },
      });
      if (!room) throw new BadRequestException('linkedRoomId does not match any 3D room');
    }

    const created = await this.prisma.post.create({
      data: {
        authorId,
        content: dto.content,
        mediaUrls: dto.mediaUrls,
        linkedRoomId: dto.linkedRoomId ?? null,
      },
      include: {
        author: { select: authorSelect },
        linkedRoom: {
          select: {
            id: true,
            slug: true,
            name: true,
            themeTag: true,
            templateId: true,
            maxParticipants: true,
          },
        },
        _count: { select: { likes: true, comments: true } },
      },
    });

    return {
      id: created.id,
      content: created.content,
      mediaUrls: created.mediaUrls,
      createdAt: created.createdAt.toISOString(),
      author: {
        id: created.author.id,
        username: created.author.username,
        displayName: created.author.displayName,
        avatarConfig: parseAvatarConfig(created.author.avatarConfig),
      },
      likeCount: created._count.likes,
      commentCount: created._count.comments,
      likedByMe: false,
      linkedRoom: created.linkedRoom
        ? {
            id: created.linkedRoom.id,
            slug: created.linkedRoom.slug,
            name: created.linkedRoom.name,
            themeTag: created.linkedRoom.themeTag,
            templateId: created.linkedRoom.templateId,
            activeParticipantCount: this.presence.getActiveCount(created.linkedRoom.id),
            maxParticipants: created.linkedRoom.maxParticipants,
          }
        : null,
      latestComments: [],
    };
  }

  async toggleLike(postId: string, userId: string): Promise<LikeResult> {
    const post = await this.prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) throw new NotFoundException('Post not found');

    const existing = await this.prisma.like.findUnique({
      where: { postId_userId: { postId, userId } },
      select: { id: true },
    });

    if (existing) {
      await this.prisma.like.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.like.create({ data: { postId, userId } });
    }

    const likeCount = await this.prisma.like.count({ where: { postId } });
    return { liked: !existing, likeCount };
  }

  async addComment(
    postId: string,
    authorId: string,
    dto: CreateCommentDto,
  ): Promise<FeedComment> {
    const post = await this.prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) throw new NotFoundException('Post not found');

    const comment = await this.prisma.comment.create({
      data: { postId, authorId, content: dto.content },
      include: { author: { select: authorSelect } },
    });

    return {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      author: {
        id: comment.author.id,
        username: comment.author.username,
        displayName: comment.author.displayName,
        avatarConfig: parseAvatarConfig(comment.author.avatarConfig),
      },
    };
  }
}
