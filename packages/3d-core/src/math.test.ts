import { describe, expect, it } from 'vitest';
import {
  calculateDistance3D,
  clampToRoomBounds,
  eulerYToQuaternion,
  getProximityVolume,
  lerp,
  lerpAngle,
  lerpVector3,
  moveToward,
  normalizeQuaternion,
  quaternionToEulerY,
  slerpQuaternion,
  yawToward,
} from './math.js';

describe('lerp helpers', () => {
  it('clamps the interpolation factor', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(0, 10, -2)).toBe(0);
    expect(lerp(0, 10, 4)).toBe(10);
  });

  it('interpolates all three axes', () => {
    expect(lerpVector3([0, 0, 0], [2, 4, 6], 0.5)).toEqual([1, 2, 3]);
  });

  it('takes the shortest path across the ±π wrap', () => {
    const next = lerpAngle(3.0, -3.0, 0.5);
    // Crossing the wrap must move through π (≈ 3.14159), not the long way around.
    expect(next).toBeGreaterThan(3.0);
    expect(next).toBeLessThan(3.3);
  });
});

describe('quaternion helpers', () => {
  it('round-trips yaw through a quaternion', () => {
    const yaw = 1.234;
    const quat = eulerYToQuaternion(yaw);
    expect(quaternionToEulerY(quat)).toBeCloseTo(yaw, 6);
  });

  it('slerps halfway between identity and a 90° yaw', () => {
    const halfway = slerpQuaternion([0, 0, 0, 1], eulerYToQuaternion(Math.PI / 2), 0.5);
    expect(quaternionToEulerY(halfway)).toBeCloseTo(Math.PI / 4, 5);
    const length = Math.hypot(...halfway);
    expect(length).toBeCloseTo(1, 6);
  });

  it('normalizes degenerate quaternions', () => {
    expect(normalizeQuaternion([0, 0, 0, 0])).toEqual([0, 0, 0, 1]);
  });
});

describe('spatial helpers', () => {
  it('computes 3D distance', () => {
    expect(calculateDistance3D([0, 0, 0], [3, 4, 0])).toBe(5);
  });

  it('returns full proximity volume at zero distance and none out of range', () => {
    expect(getProximityVolume([0, 0, 0], [0, 0, 0])).toBe(1);
    expect(getProximityVolume([0, 0, 0], [9, 0, 0], 18)).toBe(0.5);
    expect(getProximityVolume([0, 0, 0], [40, 0, 0], 18)).toBe(0);
    expect(getProximityVolume([0, 0, 0], [0, 0, 0], 0)).toBe(0);
  });

  it('clamps a position inside room bounds', () => {
    const bounds = { minX: -5, maxX: 5, minZ: -2, maxZ: 2 };
    expect(clampToRoomBounds([40, 1, -40], bounds)).toEqual([5, 0, -2]);
    expect(clampToRoomBounds([1, 3, 1], bounds, 3)).toEqual([1, 3, 1]);
  });

  it('advances toward a destination and reports arrival', () => {
    const first = moveToward([0, 0, 0], [10, 0, 0], 4, 0.5);
    expect(first.position).toEqual([2, 0, 0]);
    expect(first.reached).toBe(false);

    const last = moveToward([9.9, 0, 0], [10, 0, 0], 4, 0.5);
    expect(last.position).toEqual([10, 0, 0]);
    expect(last.reached).toBe(true);
  });

  it('faces the destination', () => {
    expect(yawToward([0, 0, 0], [0, 0, 5])).toBeCloseTo(0, 6);
    expect(yawToward([0, 0, 0], [5, 0, 0])).toBeCloseTo(Math.PI / 2, 6);
  });
});
