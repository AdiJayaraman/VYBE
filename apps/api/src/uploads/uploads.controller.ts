import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { diskStorage } from 'multer';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  ALLOWED_UPLOAD_TYPES,
  MAX_UPLOAD_BYTES,
  type UploadView,
} from '@vybe/shared-types';
import { AuthGuard } from '../auth/auth.guard.js';

export const UPLOAD_DIR = join(process.cwd(), 'uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });

const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

@Controller('uploads')
@UseGuards(ThrottlerGuard, AuthGuard)
export class UploadsController {
  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_request, file, callback) => {
          const extension = EXTENSION_BY_TYPE[file.mimetype] ?? '.bin';
          callback(null, `${randomUUID()}${extension}`);
        },
      }),
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
      fileFilter: (_request, file, callback) => {
        if (!(ALLOWED_UPLOAD_TYPES as readonly string[]).includes(file.mimetype)) {
          callback(new BadRequestException(`Unsupported media type: ${file.mimetype}`), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File | undefined): UploadView {
    if (!file) throw new BadRequestException('Attach an image in the `file` field');
    const origin = (process.env.PUBLIC_API_URL ?? `http://localhost:${process.env.PORT ?? 4000}`)
      .replace(/\/$/, '');
    return {
      url: `${origin}/uploads/${file.filename}`,
      bytes: file.size,
      mediaType: file.mimetype,
    };
  }
}
