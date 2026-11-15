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

## 2. Start PostgreSQL

```bash
docker run --name vybe-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=vybe \
  -p 5432:5432 \
  -d postgres:16
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

```bash
pnpm db:push        # fast, no migration history
# or
pnpm db:migrate     # versioned migrations (prisma migrate dev)
```

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

The web client auto-signs in as `nova` on first load, and the sidebar has an account switcher so you
can open two browser windows as two different people and meet in a room.

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
| `SUPABASE_JWT_SECRET` | Optional: verify Supabase access tokens instead of demo tokens  |
| `SUPABASE_URL`        | Optional: Supabase project URL                                  |
| `GEMINI_API_KEY`      | Optional: enables Gemini layout generation (fallback otherwise) |
| `VYBE_PG_POOL_MAX`    | Optional: max PostgreSQL pool connections (default 10)          |

Web (build-time): `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`.

## Scripts

| Command                          | Description                                          |
| -------------------------------- | ---------------------------------------------------- |
| `pnpm build`                     | Build all packages and apps (Turbo)                  |
| `pnpm typecheck`                 | Strict TypeScript across all 7 workspaces            |
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
| PATCH  | `/rooms/:slug/scene`             | Persist a new `sceneGraph`                   |
| GET    | `/messages/conversations`        | Inbox summaries                              |
| GET    | `/messages/:userId`              | Thread (marks incoming as read)              |
| POST   | `/messages`                      | DM, optional `roomInviteId`                  |
| POST   | `/ai/generate-room-layout`       | Prompt → `SceneProp[]` (Gemini or fallback)  |

## Real-time protocol (`/spatial` namespace)

Handshake: `io('http://localhost:4000/spatial', { auth: { token } })`.

Client → server: `room:join`, `room:leave`, `room:move` (15 Hz / 66 ms), `room:chat`, `room:emote`,
`room:prop_added`.

Server → client: `room:state_sync`, `room:player_joined`, `room:player_left`, `room:player_moved`,
`room:chat_message`, `room:emote_triggered`, `room:prop_added`, `room:error`.

All event names and payloads come from `@vybe/shared-types` (`ServerToClientEvents` /
`ClientToServerEvents`) — no app redeclares them.

## Architecture rules that matter

- **No `any`.** Every payload is a Zod schema in `@vybe/shared-types`.
- **High-frequency 3D transforms never touch PostgreSQL.** `RoomPresenceStore` keeps
  `Map<roomId, Map<userId, RoomParticipant>>` in NestJS memory; only `User.currentRoomId`,
  `User.presence` and `Room.sceneGraph` are persisted.
- **Interpolation happens on the client.** Remote avatars `lerp` position and `slerp` rotation inside
  `useFrame`; local input emits at 15–20 Hz.
- **Strict dark-first theme.** `#070B19` background, `#0F1629` surface, `#7C3AED` primary,
  `#06B6D4` live accent, HUD glass `rgba(15, 22, 41, 0.75)` + `backdrop-blur`.

## Troubleshooting

- **“API connection required” banners** — the API or database is not reachable. Check
  `docker ps`, then `pnpm db:push` and restart the API.
- **`P1001: Can't reach database server`** — PostgreSQL is not running on port 5432.
- **Prisma client missing** — run `pnpm db:generate` (the client is generated into
  `packages/database/src/generated/prisma`).
- **AI Room Builder always says “fallback”** — set `GEMINI_API_KEY` in `apps/api/.env`; the
  deterministic layout generator is used until then.
