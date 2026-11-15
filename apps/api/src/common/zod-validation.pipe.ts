import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import { z } from 'zod';

export interface ZodIssueSummary {
  path: string;
  message: string;
}

/**
 * Validates request bodies/queries with the exact Zod schema the clients use,
 * so `@vybe/shared-types` stays the single contract definition.
 */
@Injectable()
export class ZodValidationPipe<TSchema extends z.ZodType> implements PipeTransform {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown): z.infer<TSchema> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const issues: ZodIssueSummary[] = result.error.issues.map((issue) => ({
        path: issue.path.join('.') || '(root)',
        message: issue.message,
      }));
      throw new BadRequestException({
        statusCode: 400,
        error: 'ValidationError',
        message: 'Request payload failed schema validation',
        issues,
      });
    }
    return result.data;
  }
}
