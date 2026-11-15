import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  CommentsQuerySchema,
  CreateCommentDtoSchema,
  CreatePostDtoSchema,
  FeedQuerySchema,
  type CommentsQuery,
  type CreateCommentDto,
  type CreatePostDto,
  type CursorPage,
  type FeedComment,
  type FeedPost,
  type FeedQuery,
} from '@vybe/shared-types';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { PostsService, type LikeResult } from './posts.service.js';

@Controller('posts')
@UseGuards(ThrottlerGuard, AuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get('feed')
  async getFeed(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(FeedQuerySchema)) query: FeedQuery,
  ): Promise<CursorPage<FeedPost>> {
    return this.postsService.getFeed(user.id, query);
  }

  @Get('author/:username')
  async authorFeed(
    @CurrentUser() user: AuthenticatedUser,
    @Param('username') username: string,
    @Query(new ZodValidationPipe(FeedQuerySchema)) query: FeedQuery,
  ): Promise<CursorPage<FeedPost>> {
    return this.postsService.getUserPosts(username, user.id, query);
  }

  @Get(':id/comments')
  async comments(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(CommentsQuerySchema)) query: CommentsQuery,
  ): Promise<CursorPage<FeedComment>> {
    return this.postsService.getComments(id, query);
  }

  @Post()
  @HttpCode(201)
  async createPost(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreatePostDtoSchema)) dto: CreatePostDto,
  ): Promise<FeedPost> {
    return this.postsService.createPost(user.id, dto);
  }

  @Post(':id/like')
  @HttpCode(200)
  async toggleLike(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<LikeResult> {
    return this.postsService.toggleLike(id, user.id);
  }

  @Post(':id/comments')
  @HttpCode(201)
  async addComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateCommentDtoSchema)) dto: CreateCommentDto,
  ): Promise<FeedComment> {
    return this.postsService.addComment(id, user.id, dto);
  }
}
