# VYBE Development Status Tracker

## Phase 1: Monorepo & Database Foundation
- [x] Root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, and `tsconfig.base.json`
- [x] `@vybe/ui` design tokens (`#070B19`, `#7C3AED`, `#06B6D4`)
- [x] `@vybe/shared-types` Zod schemas & Socket.IO event maps
- [x] `@vybe/3d-core` math helpers, avatar presets, starter room templates
- [x] `@vybe/database` Prisma schema (7 models) & generated client + seed script

## Phase 2: NestJS Backend Core (`apps/api`)
- [x] PrismaModule & global validation pipes
- [x] AuthModule (email/password login/register, Supabase JWKS verification for ES256/RS256/HS256)
- [x] UsersModule (profile, avatar update, follow/unfollow)
- [x] PostsModule (2D feed CRUD + linked 3D room snapshots)
- [x] RoomsModule (REST endpoints for creating/listing 3D rooms + scene save)
- [x] MessagesModule (DMs + 3D room invite cards)
- [x] AiModule (Gemini 3.1 Flash Lite room-layout generation with deterministic fallback)
- [x] VoiceModule (LiveKit room-scoped join grants, 15-minute TTL)

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
- [x] Sign-in / sign-up screen with demo shortcuts, persisted session and sign-out
- [x] LiveKit proximity voice: join/leave, live mic mute, participant count

## Phase 5: Mobile Client (`apps/mobile`) & AI Features
- [x] Expo app with shared `@vybe/ui` tokens (feed, rooms, avatar, DMs tabs)
- [x] Mobile Room Portal: virtual joystick, live chat, participant presence on `/spatial`
- [x] Gemini API integration in `apps/api` for room theme generation (deterministic fallback)
- [x] Mobile sign-in screen (email/password + demo accounts)
- [ ] Chat/content moderation (not implemented — see Known Gaps)

## Verification Log
- [x] `pnpm install` — 847 packages, lockfile committed
- [x] `pnpm db:generate` — Prisma Client 7.10.1 generated into `packages/database/src/generated/prisma`
- [x] `pnpm typecheck` — 11/11 Turbo tasks pass across all 7 workspaces
- [x] `pnpm build` — 6/6 Turbo tasks pass (Nest ESM build + Next 16 static/dynamic routes)
- [x] `pnpm db:push` + `pnpm --filter @vybe/database seed` — schema synced and seeded (3 users, 3 rooms, 4 posts)
- [x] REST smoke test — demo login, `/posts/feed`, `/rooms`, `/rooms/:slug`
- [x] Live integrations — 8/8 checks with real credentials: email/password login + register,
      `POST /api/voice/token` (grant scoped to `vybe-<roomId>`), LiveKit `RoomService/ListRooms`
      accepts the project key/secret, Gemini produced a 10-prop layout in 1.9 s (`source=gemini`),
      malformed bearer rejected with 401
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
- [ ] Supabase sign-in UI: the API verifies Supabase ES256 tokens against JWKS, but the project still
      has email confirmation enabled, so a Supabase-issued token could not be obtained to test the
      happy path end-to-end. VYBE's own email/password auth is the wired default.
- [ ] Voice is room-wide rather than distance-attenuated audio (LiveKit audio is not spatialised yet).
- [ ] Moderation, reporting, blocking, and per-user AI quotas.
- [ ] Media uploads (posts accept URLs only).
- [ ] Multi-instance realtime: in-memory presence/gateway; Redis adapter + shared presence pending.
- [ ] Mobile 3D viewport (Room Portal is 2D joystick + chat + presence).
- [ ] Notifications, user search, profile pages, comment pagination.
- [ ] Deployment manifests/secrets for web (Vercel) and API (Railway/Render/Fly).
