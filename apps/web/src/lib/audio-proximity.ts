import type { Vec3 } from '@vybe/3d-core';

/**
 * LiveKit audio is room-wide by default. VYBE attenuates each remote track by
 * the 3D distance between avatars, so a conversation across the room is quiet
 * and standing next to someone is full volume.
 *
 * Kept outside React: positions update at 15 Hz and must never re-render the scene.
 */
const FULL_VOLUME_RADIUS = 3;
const SILENT_RADIUS = 16;

let localPosition: Vec3 = [0, 0, 0];
const remotePositions = new Map<string, Vec3>();

export function setLocalAudioPosition(position: Vec3): void {
  localPosition = position;
}

export function setRemoteAudioPositions(positions: Map<string, Vec3>): void {
  remotePositions.clear();
  for (const [userId, position] of positions) {
    remotePositions.set(userId, position);
  }
}

export function clearAudioPositions(): void {
  remotePositions.clear();
  localPosition = [0, 0, 0];
}

/** 0..1 gain for a remote user; 1 when adjacent, 0 when out of earshot. */
export function proximityVolume(userId: string): number {
  const remote = remotePositions.get(userId);
  if (!remote) return 1; // unknown position: don't punish the listener
  const distance = Math.hypot(
    remote[0] - localPosition[0],
    remote[1] - localPosition[1],
    remote[2] - localPosition[2],
  );
  if (distance <= FULL_VOLUME_RADIUS) return 1;
  if (distance >= SILENT_RADIUS) return 0;
  return 1 - (distance - FULL_VOLUME_RADIUS) / (SILENT_RADIUS - FULL_VOLUME_RADIUS);
}
