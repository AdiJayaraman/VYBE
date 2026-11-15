import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  parseAvatarConfig,
  type CommentsQuery,
  type CreateCommentDto,
  type CursorPage,
  type FeedComment,
  type FeedPost,
  type FeedQuery,
  type CreatePostDto,
} from '@vybe/shared-types';
import { assertCleanContent } from '../common/content-filter.js';
import { ModerationService } from '../moderation/moderation.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
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

const postInclude = {
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
  likes: { select: { id: true } },
  _count: { select: { likes: true, comments: true } },
  comments: {
    take: 2,
    orderBy: { createdAt: 'desc' },
    include: { author: { select: authorSelect } },
  },
} as const;

type PostRecord = {
  id: string;
  content: string;
  mediaUrls: string[];
  createdAt: Date;
  author: { id: string; username: string; displayName: string; avatarConfig: unknown };
  linkedRoom: {
    id: string;
    slug: string;
    name: string;
    themeTag: string;
    templateId: string;
    maxParticipants: number;
  } | null;
  likes: { id: string }[];
  _count: { likes: number; comments: number };
  comments: {
    id: string;
    content: string;
    createdAt: Date;
    author: { id: string; username: string; displayName: string; avatarConfig: unknown };
  }[];
};

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly presence: RoomPresenceStore,
    private readonly moderation: ModerationService,
    private readonly notifications: NotificationsService,
  ) {}

  async getFeed(viewerId: string, query: FeedQuery): Promise<CursorPage<FeedPost>> {
    const hidden = await this.moderation.hiddenUserIds(viewerId);
    return this.pagePosts(hidden.length > 0 ? { authorId: { notIn: hidden } } : {}, viewerId, query);
  }

  async getUserPosts(
    username: string,
    viewerId: string,
    query: FeedQuery,
  ): Promise<CursorPage<FeedPost>> {
    const author = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!author) throw new NotFoundException(`No VYBE profile for @${username}`);
    return this.pagePosts({ authorId: author.id }, viewerId, query);
  }

  private async pagePosts(
    where: { authorId?: { notIn: string[] } | string },
    viewerId: string,
    query: FeedQuery,
  ): Promise<CursorPage<FeedPost>> {
    const limit = query.limit;
    const posts = (await this.prisma.post.findMany({
      take: limit + 1,
      where,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        ...postInclude,
        likes: { where: { userId: viewerId }, select: { id: true } },
      },
    })) as PostRecord[];

    const hasMore = posts.length > limit;
    const page = hasMore ? posts.slice(0, limit) : posts;
    const last = page[page.length - 1];

    return {
      items: page.map((post) => this.toFeedPost(post)),
      nextCursor: hasMore && last ? last.id : null,
    };
  }

  async getComments(postId: string, query: CommentsQuery): Promise<CursorPage<FeedComment>> {
    const post = await this.prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) throw new NotFoundException('Post not found');

    const comments = await this.prisma.comment.findMany({
      where: { postId },
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: { author: { select: authorSelect } },
    });

    const hasMore = comments.length > query.limit;
    const page = hasMore ? comments.slice(0, query.limit) : comments;
    const last = page[page.length - 1];

    return {
      // Oldest-first for display; pagination still walks backwards in time.
      items: page
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
        .reverse(),
      nextCursor: hasMore && last ? last.id : null,
    };
  }

  async createPost(authorId: string, dto: CreatePostDto): Promise<FeedPost> {
    assertCleanContent(dto.content);

    if (dto.linkedRoomId) {
      const room = await this.prisma.room.findUnique({
        where: { id: dto.linkedRoomId },
        select: { id: true },
      });
      if (!room) throw new BadRequestException('linkedRoomId does not match any 3D room');
    }

    const created = (await this.prisma.post.create({
      data: {
        authorId,
        content: dto.content,
        mediaUrls: dto.mediaUrls,
        linkedRoomId: dto.linkedRoomId ?? null,
      },
      include: {
        ...postInclude,
        likes: { where: { userId: authorId }, select: { id: true } },
      },
    })) as PostRecord;

    return this.toFeedPost({ ...created, comments: [] });
  }

  async toggleLike(postId: string, userId: string): Promise<LikeResult> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });
    if (!post) throw new NotFoundException('Post not found');

    const existing = await this.prisma.like.findUnique({
      where: { postId_userId: { postId, userId } },
      select: { id: true },
    });

    if (existing) {
      await this.prisma.like.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.like.create({ data: { postId, userId } });
      const actor = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { displayName: true },
      });
      await this.notifications.notify({
        userId: post.authorId,
        actorId: userId,
        type: 'LIKE',
        message: `${actor?.displayName ?? 'Someone'} liked your post`,
        postId,
      });
    }

    const likeCount = await this.prisma.like.count({ where: { postId } });
    return { liked: !existing, likeCount };
  }

  async addComment(
    postId: string,
    authorId: string,
    dto: CreateCommentDto,
  ): Promise<FeedComment> {
    assertCleanContent(dto.content);

    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });
    if (!post) throw new NotFoundException('Post not found');

    const comment = await this.prisma.comment.create({
      data: { postId, authorId, content: dto.content },
      include: { author: { select: authorSelect } },
    });

    const actor = await this.prisma.user.findUnique({
      where: { id: authorId },
      select: { displayName: true },
    });
    await this.notifications.notify({
      userId: post.authorId,
      actorId: authorId,
      type: 'COMMENT',
      message: `${actor?.displayName ?? 'Someone'} commented: "${dto.content.slice(0, 60)}"`,
      postId,
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

  private toFeedPost(post: PostRecord): FeedPost {
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
      latestComments: post.comments
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
        .reverse(),
    };
  }
}
