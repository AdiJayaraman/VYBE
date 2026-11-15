import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';

interface ErrorBody {
  statusCode: number;
  error: string;
  message: string;
  issues?: unknown;
}

/** Normalises every thrown error into the JSON envelope clients expect. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      if (typeof payload === 'string') {
        response.status(status).json({ statusCode: status, error: exception.name, message: payload });
        return;
      }
      const record = payload as Record<string, unknown>;
      const body: ErrorBody = {
        statusCode: status,
        error: typeof record.error === 'string' ? record.error : exception.name,
        message: Array.isArray(record.message)
          ? record.message.join(', ')
          : typeof record.message === 'string'
            ? record.message
            : exception.message,
        ...(record.issues === undefined ? {} : { issues: record.issues }),
      };
      response.status(status).json(body);
      return;
    }

    this.logger.error('Unhandled exception', exception instanceof Error ? exception.stack : String(exception));
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'InternalServerError',
      message: 'Unexpected server error',
    });
  }
}
