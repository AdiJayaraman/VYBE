/** Shared spatial constants. Keep client + server cadence in sync. */
import type { RoomBounds, Vec3 } from './math';

/** 15Hz client transform broadcast (≈66ms) — see AGENTS.md rule 4. */
export const ROOM_MOVE_TICK_MS = 66;
export const ROOM_MOVE_INTERVAL_SECONDS = ROOM_MOVE_TICK_MS / 1000;

/** Accelerated/interpolated rendering cadence. */
export const RENDER_TICK_RATE = 60;

/** Remote avatars snap if they drift further than this from their target. */
export const REMOTE_SNAP_DISTANCE = 6;
export const REMOTE_INTERPOLATION_LAMBDA = 12;
export const LOCAL_CAMERA_LERP_LAMBDA = 6;

export const WALK_SPEED = 4.2;
export const RUN_SPEED = 8.4;
export const TURN_SPEED = 10;
export const JUMP_HEIGHT = 1.1;

export const PROXIMITY_MAX_DISTANCE = 18;
export const PROXIMITY_FULL_VOLUME_DISTANCE = 3;

export const DEFAULT_SPAWN_POSITION: Vec3 = [0, 0, 6];
export const DEFAULT_ROOM_BOUNDS: RoomBounds = { minX: -18, maxX: 18, minZ: -18, maxZ: 18 };
export const AVATAR_EYE_HEIGHT = 1.6;
export const MAX_CHAT_HISTORY = 80;
export const MAX_ROOM_PROPS = 120;
