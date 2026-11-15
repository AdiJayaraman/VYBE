# VYBE Development Status Tracker

## Phase 1: Monorepo & Database Foundation
- [x] Root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, and `tsconfig.base.json`
- [x] `@vybe/ui` design tokens (`#070B19`, `#7C3AED`, `#06B6D4`)
- [x] `@vybe/shared-types` Zod schemas & Socket.IO event maps
- [x] `@vybe/3d-core` math helpers, avatar presets, starter room templates
- [x] `@vybe/database` Prisma schema (7 models) & generated client + seed script

## Phase 2: NestJS Backend Core (`apps/api`)
- [x] PrismaModule & global validation pipes
- [x] AuthModule (Supabase JWT verification + demo login/register)
- [x] UsersModule (profile, avatar update, follow/unfollow)
- [x] PostsModule (2D feed CRUD + linked 3D room snapshots)
- [x] RoomsModule (REST endpoints for creating/listing 3D rooms + scene save)
- [x] MessagesModule (DMs + 3D room invite cards)
- [x] AiModule (Gemini room-layout generation with deterministic fallback)

## Phase 3: Real-Time Multiplayer Gateway (`apps/api`)
- [x] `RoomGateway` Socket.IO server (`room:join`, `room:leave`, `room:move`, `room:chat`, `room:emote`, `room:prop_added`)
- [x] Ephemeral in-memory room participant map & disconnect cleanup
- [x] Presence persistence limited to `currentRoomId` / `presence` (never transforms)

## Phase 4: Web Client — 2D Social + 3D R3F Canvas (`apps/web`)
- [x] Next.js App Router layout with `#070B19` dark spatial theme
- [x] 2D Social Feed with "Join 3D Room" live snapshot cards
- [x] Avatar Customizer modal (skin, hair, outfit color/mesh config)
- [x] Multiplayer 3D Room Canvas (`@react-three/fiber` + local WASD controller + remote player `lerp`/`slerp` interpolation + HUD overlay)
- [x] Glassmorphic HUD: chat drawer, emote wheel, prop spawner, AI Room Builder

## Phase 5: Mobile Client (`apps/mobile`) & AI Features
- [x] Expo app with shared `@vybe/ui` tokens (feed, rooms, avatar, DMs tabs)
- [x] Mobile Room Portal: virtual joystick, live chat, participant presence on `/spatial`
- [x] Gemini API integration in `apps/api` for room theme generation (deterministic fallback)
- [ ] Chat/content moderation (not implemented — see Known Gaps)

## Verification Log
- [x] `pnpm install` — 847 packages, lockfile committed
- [x] `pnpm db:generate` — Prisma Client 7.10.1 generated into `packages/database/src/generated/prisma`
- [x] `pnpm typecheck` — 11/11 Turbo tasks pass across all 7 workspaces
- [x] `pnpm build` — 6/6 Turbo tasks pass (Nest ESM build + Next 16 static/dynamic routes)
- [x] `pnpm db:push` + `pnpm --filter @vybe/database seed` — schema synced and seeded (3 users, 3 rooms, 4 posts)
- [x] REST smoke test — demo login, `/posts/feed`, `/rooms`, `/rooms/:slug`, `/ai/generate-room-layout` (deterministic fallback)
- [x] Two-client Socket.IO session — 13/13 checks: auth rejection, join/state sync, player joined,
      move broadcast, chat, emote, live prop add, sceneGraph persistence, occupancy, disconnect cleanup,
      presence persisted to PostgreSQL
- [x] `pnpm test` — 32 unit tests pass (3d-core math/layouts, shared contracts, scrypt passwords)
- [x] Baseline migration `20261115120000_init` applied to a fresh database (`prisma migrate deploy`,
      `prisma migrate status` reports up to date)
- [x] Hardening runtime checks — 6/6: helmet headers, demo login, non-owner scene save rejected (403),
      owner scene save allowed (200), socket chat throttled (6 ok / 4 RATE_LIMITED), login throttled (429)
- [x] `docker compose up -d` (PostgreSQL 16 + Redis 7) and GitHub Actions CI workflow added

> Runtime verification was performed against a local PGlite (PostgreSQL-compatible) server on port
> 5432 with `VYBE_PG_POOL_MAX=1`; the project itself targets standard PostgreSQL (see README).

## Known Gaps (not yet production-complete)
- [ ] Real auth UX: no sign-in/up screens; web + mobile auto-login demo users. Supabase tokens are
      verified server-side (HS256) but no client is wired and RS256/JWKS is unsupported.
- [ ] Proximity voice: the HUD toggle plays local ambience only; no WebRTC/LiveKit audio transport.
- [ ] Moderation, reporting, blocking, and per-user AI quotas.
- [ ] Media uploads (posts accept URLs only).
- [ ] Multi-instance realtime: in-memory presence/gateway; Redis adapter + shared presence pending.
- [ ] Mobile 3D viewport (Room Portal is 2D joystick + chat + presence).
- [ ] Notifications, user search, profile pages, comment pagination.
- [ ] Deployment manifests/secrets for web (Vercel) and API (Railway/Render/Fly).
