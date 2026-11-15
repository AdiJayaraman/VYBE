import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { prisma, type PrismaClient } from '@vybe/database';

/**
 * Thin, DI-friendly wrapper around the `@vybe/database` singleton.
 *
 * Model accessors are exposed directly (`this.prisma.user`) while the raw client
 * remains available for transactions.
 */
@Injectable()
export class PrismaService implements OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  readonly client: PrismaClient = prisma;

  get user() {
    return this.client.user;
  }

  get follow() {
    return this.client.follow;
  }

  get room() {
    return this.client.room;
  }

  get post() {
    return this.client.post;
  }

  get like() {
    return this.client.like;
  }

  get comment() {
    return this.client.comment;
  }

  get directMessage() {
    return this.client.directMessage;
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.$disconnect();
    } catch (error: unknown) {
      this.logger.warn(`Prisma disconnect failed: ${String(error)}`);
    }
  }
}
