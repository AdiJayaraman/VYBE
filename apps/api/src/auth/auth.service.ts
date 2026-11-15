import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { hashPassword, verifyPassword, type User } from '@vybe/database';
import type {
  AuthSession,
  LoginDto,
  RegisterDto,
  UserProfile,
} from '@vybe/shared-types';
import { DEFAULT_AVATAR_CONFIG, parseAvatarConfig } from '@vybe/shared-types';
import { PROFILE_INCLUDE, mapUserProfile } from '../common/user-profile.mapper.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ACCESS_TOKEN_TTL_SECONDS, DEV_JWT_SECRET, type AuthenticatedUser, type VybeJwtPayload } from './auth.types.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private supabaseJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private get demoSecret(): string {
    return this.config.get<string>('JWT_SECRET') ?? DEV_JWT_SECRET;
  }

  private get supabaseSecret(): string | null {
    return this.config.get<string>('SUPABASE_JWT_SECRET') ?? null;
  }

  /** Supabase moved to asymmetric signing keys (ES256); JWKS is the source of truth. */
  private get supabaseJwksUrl(): string | null {
    const explicit = this.config.get<string>('SUPABASE_JWKS_URL')?.trim();
    if (explicit && explicit.startsWith('https://')) return explicit;
    const base = this.config.get<string>('SUPABASE_URL')?.trim().replace(/\/$/, '');
    return base ? `${base}/auth/v1/.well-known/jwks.json` : null;
  }

  async register(dto: RegisterDto): Promise<AuthSession> {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('An account with that email or username already exists');
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        displayName: dto.displayName,
        passwordHash: hashPassword(dto.password),
        avatarConfig: DEFAULT_AVATAR_CONFIG,
        presence: 'ONLINE',
      },
    });

    return this.buildSession(user);
  }

  async login(dto: LoginDto): Promise<AuthSession> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user?.passwordHash || !verifyPassword(dto.password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { presence: 'ONLINE' } });
    return this.buildSession(user);
  }

  async getSession(userId: string): Promise<AuthSession> {
    const session = await this.buildSessionById(userId);
    return session;
  }

  async buildSessionById(userId: string): Promise<AuthSession> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: PROFILE_INCLUDE,
    });
    const profile = mapUserProfile(user, false);
    return this.signSession(profile);
  }

  async verifyAccessToken(token: string): Promise<AuthenticatedUser> {
    const payload = await this.verifyJwt(token);
    if (!payload) {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    if (payload.provider === 'supabase') {
      const synced = await this.syncSupabaseUser(payload);
      if (!synced) throw new UnauthorizedException('Supabase account is not linked to a VYBE profile');
      return synced;
    }

    const user = await this.findUserByAnyId(payload.sub);
    if (!user) throw new UnauthorizedException('Account no longer exists');
    return { id: user.id, username: user.username, displayName: user.displayName, email: user.email };
  }

  /** Returns `null` instead of throwing — used by optional-auth surfaces. */
  async tryResolveFromHeader(header: string | undefined): Promise<AuthenticatedUser | null> {
    if (!header) return null;
    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
    try {
      return await this.verifyAccessToken(token);
    } catch {
      return null;
    }
  }

  private async verifyJwt(token: string): Promise<VybeJwtPayload | null> {
    const secrets = [this.demoSecret, this.supabaseSecret].filter(
      (secret): secret is string => typeof secret === 'string' && secret.length > 0,
    );

    for (const secret of secrets) {
      try {
        const payload = await this.jwt.verifyAsync<VybeJwtPayload>(token, { secret });
        return payload;
      } catch {
        // try the next configured secret
      }
    }

    return this.verifySupabaseToken(token);
  }

  /**
   * Verifies a Supabase access token against the project's JWKS. Supabase now
   * signs with ES256 P-256 keys (older projects used HS256, still covered above),
   * so both signatures are accepted and the key set is cached for 10 minutes.
   */
  private async verifySupabaseToken(token: string): Promise<VybeJwtPayload | null> {
    const url = this.supabaseJwksUrl;
    if (!url) return null;

    try {
      this.supabaseJwks ??= createRemoteJWKSet(new URL(url), {
        cacheMaxAge: 10 * 60_000,
        cooldownDuration: 30_000,
      });
      const { payload } = await jwtVerify(token, this.supabaseJwks, {
        algorithms: ['ES256', 'RS256'],
      });
      const sub = typeof payload.sub === 'string' ? payload.sub : null;
      if (!sub) return null;

      const metadata = readSupabaseMetadata(payload);
      return {
        sub,
        email: typeof payload.email === 'string' ? payload.email : undefined,
        username: metadata.username,
        provider: 'supabase',
        iat: payload.iat,
        exp: payload.exp,
      };
    } catch (error: unknown) {
      this.logger.debug(`Supabase token rejected: ${String(error)}`);
      return null;
    }
  }

  private async findUserByAnyId(id: string): Promise<User | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      const byId = await this.prisma.user.findUnique({ where: { id } });
      if (byId) return byId;
    }
    return this.prisma.user.findFirst({ where: { OR: [{ supabaseId: id }, { email: id }] } });
  }

  /**
   * Supabase tokens carry `sub` = the Supabase user id. On first sight we link
   * (or provision) the matching VYBE profile.
   */
  private async syncSupabaseUser(payload: VybeJwtPayload): Promise<AuthenticatedUser | null> {
    const existing = await this.prisma.user.findUnique({ where: { supabaseId: payload.sub } });
    if (existing) {
      return {
        id: existing.id,
        username: existing.username,
        displayName: existing.displayName,
        email: existing.email,
      };
    }

    const email = payload.email ?? `${payload.sub}@supabase.local`;
    const byEmail = await this.prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      const linked = await this.prisma.user.update({
        where: { id: byEmail.id },
        data: { supabaseId: payload.sub },
      });
      return {
        id: linked.id,
        username: linked.username,
        displayName: linked.displayName,
        email: linked.email,
      };
    }

    const baseUsername = (payload.username ?? email.split('@')[0] ?? 'vybe').toLowerCase().replace(/[^a-z0-9_]/g, '');
    const username = `${baseUsername || 'vybe'}_${payload.sub.slice(0, 6)}`;

    const created = await this.prisma.user.create({
      data: {
        supabaseId: payload.sub,
        email,
        username,
        displayName: payload.username ?? baseUsername ?? 'VYBE Member',
        avatarConfig: DEFAULT_AVATAR_CONFIG,
        presence: 'ONLINE',
      },
    });

    this.logger.log(`Provisioned VYBE profile for Supabase user ${payload.sub}`);
    return {
      id: created.id,
      username: created.username,
      displayName: created.displayName,
      email: created.email,
    };
  }

  private async buildSession(user: User): Promise<AuthSession> {
    const full = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: PROFILE_INCLUDE,
    });
    const profile = mapUserProfile(full, false);
    return this.signSession(profile);
  }

  private async signSession(profile: UserProfile): Promise<AuthSession> {
    const payload: VybeJwtPayload = {
      sub: profile.id,
      username: profile.username,
      email: `${profile.username}@vybe.space`,
      provider: 'demo',
    };
    const token = await this.jwt.signAsync(payload, {
      secret: this.demoSecret,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    });
    return {
      token,
      user: { ...profile, avatarConfig: parseAvatarConfig(profile.avatarConfig) },
      expiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000).toISOString(),
    };
  }
}

function readSupabaseMetadata(payload: JWTPayload): { username?: string } {
  const raw = payload['user_metadata'];
  if (typeof raw !== 'object' || raw === null) return {};
  const record = raw as Record<string, unknown>;
  const username = record['username'];
  if (typeof username === 'string' && username.trim().length > 0) return { username: username.trim() };
  const fullName = record['full_name'];
  if (typeof fullName === 'string' && fullName.trim().length > 0) return { username: fullName.trim() };
  return {};
}
