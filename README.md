# VYBE — Hybrid 2D/3D Virtual Social Network

VYBE is a spatial social network: a familiar 2D feed where every post can carry a **Live 3D Room
Portal**, plus a real-time multiplayer 3D room engine (procedural avatars, WASD/click-to-walk
movement, 15 Hz transform sync, lerp/slerp interpolation, glassmorphic HUD, AI room builder).

Built as a **pnpm + Turborepo** monorepo with shared, strictly-typed contracts.

```
.
├── apps
│   ├── api        NestJS REST + Socket.IO gateway (ESM, Prisma 7, Gemini)
│   ├── web        Next.js 16 App Router client (2D feed + R3F 3D rooms)
│   └── mobile     Expo / React Native companion (tabs, joystick portal, chat)
├── packages
│   ├── ui             Design tokens (dark spatial theme)
│   ├── shared-types   Zod schemas, DTOs, typed Socket.IO events
│   ├── 3d-core        Deterministic 3D math, avatar presets, room templates
│   └── database       Prisma schema, generated client, seed
├── AGENTS.md              Architecture + engineering rules
├── DEVELOPMENT_STATUS.md  Phase tracker
├── tsconfig.base.json     Strict shared TypeScript config
├── turbo.json             Task graph
└── pnpm-workspace.yaml    Workspace + approved native builds
```

## Requirements

- Node.js 20.11+ (tested on Node 26)
- pnpm 10 (`npm i -g pnpm@10` if missing)
- PostgreSQL 14+ (Docker is the fastest option)

## 1. Install

```bash
pnpm install
```

## 2. Start PostgreSQL (and optional Redis)

```bash
docker compose up -d
```

That starts PostgreSQL 16 on `5432` (and Redis 7 on `6379`, reserved for multi-instance
realtime scaling). Prefer a single container?

```bash
docker run --name vybe-postgres -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=vybe -p 5432:5432 -d postgres:16
```

Connection strings already live in `packages/database/.env`:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/vybe?schema=public"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/vybe?schema=public"
```

## 3. Generate the Prisma client

```bash
pnpm db:generate
```

## 4. Create the schema

A baseline migration already exists at `packages/database/prisma/migrations`:

```bash
pnpm --filter @vybe/database exec prisma migrate deploy   # apply migrations (dev and prod)
```

For schema changes during development use `pnpm db:migrate` (creates a new migration) or
`pnpm db:push` for a throwaway database.

## 5. Seed demo data

```bash
pnpm --filter @vybe/database seed
```

Seeds **3 demo users**, **3 public 3D rooms** (`cyber-lounge`, `neon-rooftop`, `creator-plaza`) and a
populated feed with room-portal posts, comments, likes, follows and DMs.

Demo accounts (password `vybe1234` for all):

| Email              | Username | Persona            |
| ------------------ | -------- | ------------------ |
| `nova@vybe.space`  | `nova`   | Spatial DJ         |
| `kai@vybe.space`   | `kai`    | Arcade collector   |
| `mira@vybe.space`  | `mira`   | 3D room architect  |

The web client opens on a real sign-in screen (email + password, or one-click demo accounts) and
keeps the JWT in `localStorage`. The sidebar has an account switcher and a sign-out button, so you can
open two browser windows as two different people and meet in a room. The mobile app has the same
sign-in screen with demo shortcuts.

## 6. Launch the full stack

```bash
pnpm dev
```

Turborepo starts every workspace (`@vybe/api`, `@vybe/web`, `@vybe/mobile`) after building the shared
packages. Prefer separate terminals? Run:

```bash
pnpm --filter @vybe/api dev      # http://localhost:4000/api  (socket namespace /spatial)
pnpm --filter @vybe/web dev      # http://localhost:3000
pnpm --filter @vybe/mobile start # Expo dev server
```

Mobile points at the API via `EXPO_PUBLIC_API_URL` (defaults to `http://localhost:4000`; use your
machine's LAN IP when testing on a physical device):

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.20:4000 pnpm --filter @vybe/mobile start
```

## Environment variables

`apps/api/.env` (copy from `apps/api/.env.example`):

| Variable              | Purpose                                                        |
| --------------------- | -------------------------------------------------------------- |
| `PORT`                | API port (default `4000`)                                       |
| `DATABASE_URL`        | PostgreSQL connection string                                    |
| `JWT_SECRET`          | Demo/access token secret (change in production)                 |
| `SUPABASE_JWT_SECRET` | Optional: legacy HS256 secret for Supabase-signed tokens       |
| `SUPABASE_URL`        | Supabase project URL (used to derive the JWKS endpoint)         |
| `SUPABASE_JWKS_URL`   | Optional: explicit JWKS URL for ES256/RS256 Supabase tokens     |
| `GEMINI_API_KEY`      | Enables Gemini room layouts (deterministic fallback without it) |
| `LIVEKIT_URL`         | LiveKit Cloud websocket URL (`wss://…`) for proximity voice     |
| `LIVEKIT_API_KEY`     | LiveKit API key (server only — never sent to the browser)       |
| `LIVEKIT_API_SECRET`  | LiveKit API secret (server only)                                |
| `VYBE_PG_POOL_MAX`    | Optional: max PostgreSQL pool connections (default 10)          |
| `CORS_ORIGINS`        | Comma-separated allowlist for REST + Socket.IO. Required in production; dev reflects request origin |

Web (build-time): `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`.

## Scripts

| Command                          | Description                                          |
| -------------------------------- | ---------------------------------------------------- |
| `pnpm build`                     | Build all packages and apps (Turbo)                  |
| `pnpm typecheck`                 | Strict TypeScript across all 7 workspaces            |
| `pnpm test`                      | Unit tests (3d-core math/layouts, schemas, passwords) |
| `docker compose up -d`           | Local PostgreSQL 16 + Redis 7                        |
| `pnpm dev`                       | Run everything in watch mode                         |
| `pnpm db:generate`               | `prisma generate` (Prisma 7 rust-free client)        |
| `pnpm db:push` / `pnpm db:migrate` | Sync schema / create a migration                   |
| `pnpm db:seed`                   | Seed demo users, rooms and feed                      |
| `pnpm db:studio`                 | Prisma Studio                                        |
| `pnpm --filter @vybe/database seed` | Exact seed command referenced above              |

## REST API (`/api`)

Every route except `auth/login|register` requires `Authorization: Bearer <token>`.

| Method | Route                            | Notes                                        |
| ------ | -------------------------------- | -------------------------------------------- |
| POST   | `/auth/register`                 | Demo credentials account                     |
| POST   | `/auth/login`                    | Returns `{ token, user, expiresAt }`         |
| GET    | `/auth/me`                       | Current profile                              |
| GET    | `/users/:username`               | Profile, counts, presence, `avatarConfig`    |
| PATCH  | `/users/me/avatar`               | Validated with `AvatarConfigSchema`          |
| POST/DELETE | `/users/:id/follow`         | Follow / unfollow                            |
| GET    | `/posts/feed?cursor=&limit=`     | Cursor-paginated feed + live room metadata   |
| POST   | `/posts`                         | Text, media, optional `linkedRoomId` portal  |
| POST   | `/posts/:id/like`                | Toggle like                                  |
| POST   | `/posts/:id/comments`            | Add comment                                  |
| GET    | `/rooms`                         | Public rooms + live occupancy                |
| GET    | `/rooms/:slug`                   | Metadata, template, `sceneGraph`, occupants  |
| POST   | `/rooms`                         | Create a custom room                         |
| PATCH  | `/rooms/:slug/scene`             | Persist a new `sceneGraph` (owner only)      |
| GET    | `/messages/conversations`        | Inbox summaries                              |
| GET    | `/messages/:userId`              | Thread (marks incoming as read)              |
| POST   | `/messages`                      | DM, optional `roomInviteId`                  |
| POST   | `/ai/generate-room-layout`       | Prompt → `SceneProp[]` (Gemini 3.1 Flash Lite, sanitized + clamped) |
| POST   | `/voice/token`                   | LiveKit join grant scoped to one room (15 min) |

## Real-time protocol (`/spatial` namespace)

Handshake: `io('http://localhost:4000/spatial', { auth: { token } })`.

Client → server: `room:join`, `room:leave`, `room:move` (15 Hz / 66 ms), `room:chat`, `room:emote`,
`room:prop_added`.

Server → client: `room:state_sync`, `room:player_joined`, `room:player_left`, `room:player_moved`,
`room:chat_message`, `room:emote_triggered`, `room:prop_added`, `room:error`.

All event names and payloads come from `@vybe/shared-types` (`ServerToClientEvents` /
`ClientToServerEvents`) — no app redeclares them.

## Proximity voice (LiveKit)

Voice is **spatial by room, not by distance-mixed audio**: everyone in the same VYBE room shares one
LiveKit room (`vybe-<roomId>`), so you hear the people you can see on screen.

1. The room HUD's **join voice** button calls `POST /api/voice/token` with the room slug.
2. The API mints a 15-minute LiveKit grant (`sub` = VYBE user id, room-scoped, publish + subscribe)
   with `LIVEKIT_API_SECRET`. The secret never reaches the browser.
3. The client connects with `livekit-client`, publishes the microphone and shows a mic mute toggle
   plus the live participant count.

Without the three `LIVEKIT_*` variables the endpoint returns **503** and the HUD reports that voice is
not configured — the rest of the app keeps working. Microphone permissions are requested by the
browser on first join.

## Authentication

- **Primary:** email + password against `POST /api/auth/register|login`; passwords are scrypt-hashed,
  and the API signs its own HS256 access token (`JWT_SECRET`, 7 days).
- **Supabase:** if `SUPABASE_URL`/`SUPABASE_JWKS_URL` is set, access tokens issued by Supabase are
  verified against its JWKS (Supabase now signs with **ES256**; RS256 and legacy HS256 are also
  accepted). The first Supabase token for an unknown `sub` provisions a matching VYBE profile, and
existing emails are linked automatically.
- Supabase projects ship with **email confirmation on** by default. Until you disable it (Authentication
  → Providers → Email) or confirm the user, Supabase will not return a session token — the VYBE
  sign-in form is unaffected because it uses the API's own credentials.

## Architecture rules that matter

- **No `any`.** Every payload is a Zod schema in `@vybe/shared-types`.
- **High-frequency 3D transforms never touch PostgreSQL.** `RoomPresenceStore` keeps
  `Map<roomId, Map<userId, RoomParticipant>>` in NestJS memory; only `User.currentRoomId`,
  `User.presence` and `Room.sceneGraph` are persisted.
- **Interpolation happens on the client.** Remote avatars `lerp` position and `slerp` rotation inside
  `useFrame`; local input emits at 15–20 Hz.
- **Strict dark-first theme.** `#070B19` background, `#0F1629` surface, `#7C3AED` primary,
  `#06B6D4` live accent, HUD glass `rgba(15, 22, 41, 0.75)` + `backdrop-blur`.

## Security & abuse limits

Every route is validated by the same Zod schemas the clients use, and the defaults are defensive:

- **Transport**: `helmet` security headers, `trust proxy`, 1 MB JSON/urlencoded body limit.
- **HTTP throttling** (per IP, in-memory): global 120 req/min on authenticated controllers,
  login 10/min, register 5/min, AI layout generation 12/min.
- **Socket.IO**: `room:move` is capped at ~30 Hz per socket; chat 6-message burst refilling 1.5/s;
  emotes 6 burst at 1/s; prop spawns 12 burst at 0.5/s; joins 8 burst at 0.5/s. Excess returns
  `RATE_LIMITED` rather than being silently dropped.
- **Authorisation**: `PATCH /rooms/:slug/scene` is owner-only; prop spawning requires room
  membership; `room:prop_added` rejects payloads that would exceed the 120-prop room cap instead
  of silently deleting furniture.
- **CORS**: `CORS_ORIGINS` allowlist in production (`origin: false` when unset), reflected origin in
  development only.
- **Secrets**: everything in `.env` is gitignored; `.env.example` documents the keys.

## Tests & CI

```bash
pnpm test     # vitest: 32 unit tests across @vybe/3d-core, @vybe/shared-types, @vybe/database
```

`.github/workflows/ci.yml` runs install → `pnpm db:generate` → typecheck → test → build on every push
to `main` and every pull request.

## Scaling note

Presence and room transforms live in one process (`RoomPresenceStore`), so run **one** API instance
unless you add the Socket.IO Redis adapter (`@socket.io/redis-adapter`) plus a shared presence store.
`docker-compose.yml` already provisions Redis for that step, and it is not wired in yet.

## Troubleshooting

- **“API connection required” banners** — the API or database is not reachable. Check
  `docker ps`, then `pnpm db:push` and restart the API.
- **`P1001: Can't reach database server`** — PostgreSQL is not running on port 5432.
- **Prisma client missing** — run `pnpm db:generate` (the client is generated into
  `packages/database/src/generated/prisma`).
- **AI Room Builder always says “fallback”** — set `GEMINI_API_KEY` in `apps/api/.env`; the
  deterministic layout generator is used until then.
- **HTTP 429** — you hit one of the throttles above (login is 10/min). Wait a minute; the counters
  are in-memory per API instance.
- **HTTP 403 on room scene save** — only the room owner (the creator) may persist `sceneGraph`.
