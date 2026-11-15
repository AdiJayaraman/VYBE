/**
 * Deterministic, framework-agnostic 3D math.
 *
 * Pure functions operating on plain tuples so the exact same interpolation code
 * runs in `apps/web` (R3F `useFrame`), `apps/mobile`, and unit tests — without
 * pulling `three` into the bundle graph of every consumer.
 */

export type Vec3 = [number, number, number];
/** Quaternion ordered `[x, y, z, w]`, matching Three.js. */
export type Quat = [number, number, number, number];

export interface RoomBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Frame-rate independent linear interpolation factor. */
export function dampFactor(lambda: number, deltaSeconds: number): number {
  return 1 - Math.exp(-lambda * deltaSeconds);
}

export function lerp(from: number, to: number, alpha: number): number {
  const t = clamp(alpha, 0, 1);
  return from + (to - from) * t;
}

/** Interpolate a position toward a target. Used for remote avatar smoothing. */
export function lerpVector3(current: Vec3, target: Vec3, alpha: number): Vec3 {
  const t = clamp(alpha, 0, 1);
  return [
    current[0] + (target[0] - current[0]) * t,
    current[1] + (target[1] - current[1]) * t,
    current[2] + (target[2] - current[2]) * t,
  ];
}

/** Frame-rate independent position smoothing with an exponential decay. */
export function dampVector3(
  current: Vec3,
  target: Vec3,
  lambda: number,
  deltaSeconds: number,
): Vec3 {
  return lerpVector3(current, target, dampFactor(lambda, deltaSeconds));
}

/** Shortest-arc yaw interpolation in radians (handles the ±π wrap). */
export function lerpAngle(current: number, target: number, alpha: number): number {
  const twoPi = Math.PI * 2;
  let delta = ((target - current + Math.PI) % twoPi) - Math.PI;
  if (delta < -Math.PI) delta += twoPi;
  return current + delta * clamp(alpha, 0, 1);
}

export function normalizeQuaternion(q: Quat): Quat {
  const length = Math.hypot(q[0], q[1], q[2], q[3]);
  if (length === 0) return [0, 0, 0, 1];
  return [q[0] / length, q[1] / length, q[2] / length, q[3] / length];
}

/** Spherical interpolation of quaternions with a sign-corrected shortest path. */
export function slerpQuaternion(current: Quat, target: Quat, alpha: number): Quat {
  const from = normalizeQuaternion(current);
  let to = normalizeQuaternion(target);
  const t = clamp(alpha, 0, 1);

  let cosHalfTheta = from[0] * to[0] + from[1] * to[1] + from[2] * to[2] + from[3] * to[3];
  if (cosHalfTheta < 0) {
    to = [-to[0], -to[1], -to[2], -to[3]];
    cosHalfTheta = -cosHalfTheta;
  }

  if (cosHalfTheta >= 0.9995) {
    return normalizeQuaternion([
      from[0] + (to[0] - from[0]) * t,
      from[1] + (to[1] - from[1]) * t,
      from[2] + (to[2] - from[2]) * t,
      from[3] + (to[3] - from[3]) * t,
    ]);
  }

  const halfTheta = Math.acos(clamp(cosHalfTheta, -1, 1));
  const sinHalfTheta = Math.sqrt(1 - cosHalfTheta * cosHalfTheta);
  const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
  const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;

  return normalizeQuaternion([
    from[0] * ratioA + to[0] * ratioB,
    from[1] * ratioA + to[1] * ratioB,
    from[2] * ratioA + to[2] * ratioB,
    from[3] * ratioA + to[3] * ratioB,
  ]);
}

export function calculateDistance3D(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/**
 * Normalised proximity volume (1 = on top of the listener, 0 = out of earshot)
 * used to attenuate spatial voice/emote volume.
 */
export function getProximityVolume(listenerPos: Vec3, speakerPos: Vec3, maxDistance = 18): number {
  if (maxDistance <= 0) return 0;
  const distance = calculateDistance3D(listenerPos, speakerPos);
  if (distance >= maxDistance) return 0;
  return Number((1 - distance / maxDistance).toFixed(4));
}

/** Yaw (radians) -> quaternion. */
export function eulerYToQuaternion(yaw: number): Quat {
  return [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)];
}

/** Quaternion -> yaw (radians), for reconciling incoming rotations. */
export function quaternionToEulerY(q: Quat): number {
  const normalized = normalizeQuaternion(q);
  const siny = 2 * (normalized[3] * normalized[1] + normalized[0] * normalized[2]);
  const cosy = 1 - 2 * (normalized[1] * normalized[1] + normalized[0] * normalized[0]);
  return Math.atan2(siny, cosy);
}

/** Keep a player inside the walkable room rectangle. */
export function clampToRoomBounds(position: Vec3, bounds: RoomBounds, y = 0): Vec3 {
  return [clamp(position[0], bounds.minX, bounds.maxX), y, clamp(position[2], bounds.minZ, bounds.maxZ)];
}

/**
 * Advance a position toward a destination at a fixed speed for one frame.
 * Returns the new position plus whether the destination has been reached.
 */
export function moveToward(
  current: Vec3,
  destination: Vec3,
  speedUnitsPerSecond: number,
  deltaSeconds: number,
): { position: Vec3; reached: boolean } {
  const dx = destination[0] - current[0];
  const dz = destination[2] - current[2];
  const distance = Math.hypot(dx, dz);
  const step = speedUnitsPerSecond * deltaSeconds;
  if (distance <= step || distance < 0.001) {
    return { position: [destination[0], current[1], destination[2]], reached: true };
  }
  const ratio = step / distance;
  return {
    position: [current[0] + dx * ratio, current[1], current[2] + dz * ratio],
    reached: false,
  };
}

/** Yaw that faces a destination from a position. */
export function yawToward(from: Vec3, to: Vec3): number {
  return Math.atan2(to[0] - from[0], to[2] - from[2]);
}

export function isWithinRadius(a: Vec3, b: Vec3, radius: number): boolean {
  return calculateDistance3D(a, b) <= radius;
}
