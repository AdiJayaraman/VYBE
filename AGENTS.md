# Project Context: VYBE — Hybrid 2D/3D Virtual Social Network

## 1. Architecture & Monorepo Layout (pnpm + Turborepo)
- `apps/web`: Next.js (App Router), TypeScript, Tailwind CSS, Three.js, `@react-three/fiber`, `@react-three/drei`, `socket.io-client`.
- `apps/mobile`: React Native (Expo), TypeScript, NativeWind, Expo GL / R3F, `socket.io-client`.
- `apps/api`: NestJS (REST controllers + Socket.IO WebSocket Gateways), Prisma, Supabase Auth JWT verification.
- `packages/database`: Prisma schema, migrations, and exported `PrismaClient` instance (`@vybe/database`).
- `packages/shared-types`: Zod schemas, REST DTOs, and Socket.IO event interfaces (`@vybe/shared-types`).
- `packages/ui`: Shared design tokens (`@vybe/ui`).
- `packages/3d-core`: Shared Three.js interpolation math, avatar config helpers, and state machines (`@vybe/3d-core`).

## 2. Design Tokens (Strict Dark-First Spatial Theme)
- Primary Background: `#070B19` (Deep Space Navy)
- Secondary Surface: `#0F1629`
- Primary Accent: `#7C3AED` (Electric Purple)
- Spatial / Live Accent: `#06B6D4` (Neon Cyan)
- Text Primary: `#F8FAFC`, Text Secondary: `#94A3B8`

## 3. Strict Development Rules for Coding Agents
1. **Package Manager:** Always use `pnpm`. Never run `npm install` or `yarn`. Use `pnpm --filter <workspace> add <pkg>`.
2. **Type Safety:** Never use `any`. All REST payloads and Socket.IO events must be imported from `@vybe/shared-types`.
3. **Database vs. Ephemeral State:** Never write real-time 3D player coordinates (`[x, y, z]`) to PostgreSQL on every tick. Keep active room transforms in memory/Redis inside the NestJS `RoomGateway` and only persist `currentRoomId` and `Room.sceneGraph` in PostgreSQL.
4. **3D Tick Rate & Interpolation:** Client emits `room:move` throttled to 15-20Hz (every 50-66ms). Remote avatars in R3F must interpolate positions (`Vector3.lerp`) and rotations (`Quaternion.slerp`) inside `useFrame` for smooth 60fps rendering.
5. **Incremental Verification:** After modifying any package or app, run `pnpm typecheck` and update `DEVELOPMENT_STATUS.md` before finishing the task.
