'use client';

import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { Group } from 'three';
import {
  ROOM_MOVE_TICK_MS,
  RUN_SPEED,
  WALK_SPEED,
  clampToRoomBounds,
  dampFactor,
  lerpAngle,
  moveToward,
  yawToward,
  type RoomBounds,
  type Vec3,
} from '@vybe/3d-core';
import type { AnimationState, AvatarConfig, PlayerTransformPayload } from '@vybe/shared-types';
import { ProceduralAvatar } from '../avatar/ProceduralAvatar';

export interface LocalPlayerProps {
  roomId: string;
  bounds: RoomBounds;
  spawnPosition: Vec3;
  avatarConfig: AvatarConfig;
  displayName: string;
  onMove: (payload: PlayerTransformPayload) => void;
  /** Local position at the network tick, used for proximity audio. */
  onTransform?: (position: Vec3) => void;
}

const CAMERA_DISTANCE = 5.2;
const CAMERA_HEIGHT = 2.8;
const JUMP_VELOCITY = 4.4;
const GRAVITY = 12.5;

export function LocalPlayer({
  roomId,
  bounds,
  spawnPosition,
  avatarConfig,
  displayName,
  onMove,
  onTransform,
}: LocalPlayerProps) {
  const groupRef = useRef<Group>(null);
  const positionRef = useRef<Vec3>([...spawnPosition]);
  const yawRef = useRef<number>(0);
  const targetRef = useRef<Vec3 | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const emitClockRef = useRef(0);
  const jumpRef = useRef({ velocity: 0, height: 0, airborne: false });
  const [animation, setAnimation] = useState<AnimationState>('idle');
  const animationRef = useRef<AnimationState>('idle');
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const key = event.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
        event.preventDefault();
      }
      if (key === ' ' && !jumpRef.current.airborne) {
        jumpRef.current = { velocity: JUMP_VELOCITY, height: 0, airborne: true };
      }
      keysRef.current.add(key);
    };

    const handleKeyUp = (event: KeyboardEvent): void => {
      keysRef.current.delete(event.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const keys = keysRef.current;
    const position = positionRef.current;

    const forwardInput =
      (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
    const strafeInput =
      (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
    const sprinting = keys.has('shift');

    let moving = false;

    if (forwardInput !== 0 || strafeInput !== 0) {
      targetRef.current = null;
      const yaw = yawRef.current;
      const forward: Vec3 = [Math.sin(yaw), 0, Math.cos(yaw)];
      const right: Vec3 = [Math.cos(yaw), 0, -Math.sin(yaw)];
      const dirX = forward[0] * forwardInput + right[0] * strafeInput;
      const dirZ = forward[2] * forwardInput + right[2] * strafeInput;
      const length = Math.hypot(dirX, dirZ) || 1;
      const speed = (sprinting ? RUN_SPEED : WALK_SPEED) * delta;

      position[0] += (dirX / length) * speed;
      position[2] += (dirZ / length) * speed;
      if (forwardInput !== 0 || strafeInput !== 0) {
        yawRef.current = Math.atan2(dirX, dirZ);
      }
      moving = true;
    } else if (targetRef.current) {
      const speed = (sprinting ? RUN_SPEED : WALK_SPEED) * delta;
      const step = moveToward(position, targetRef.current, speed / delta, delta);
      position[0] = step.position[0];
      position[2] = step.position[2];
      yawRef.current = lerpAngle(yawRef.current, yawToward(position, targetRef.current), 0.35);
      moving = true;
      if (step.reached) {
        targetRef.current = null;
      }
    }

    const clamped = clampToRoomBounds(position, bounds);
    position[0] = clamped[0];
    position[2] = clamped[2];

    if (jumpRef.current.airborne) {
      jumpRef.current.velocity -= GRAVITY * delta;
      jumpRef.current.height += jumpRef.current.velocity * delta;
      if (jumpRef.current.height <= 0) {
        jumpRef.current = { velocity: 0, height: 0, airborne: false };
      }
    }

    const nextAnimation: AnimationState = moving ? (sprinting ? 'run' : 'walk') : 'idle';
    if (nextAnimation !== animationRef.current) {
      animationRef.current = nextAnimation;
      setAnimation(nextAnimation);
    }

    // Third-person follow camera with exponential smoothing.
    const yaw = yawRef.current;
    const desiredX = position[0] - Math.sin(yaw) * CAMERA_DISTANCE;
    const desiredZ = position[2] - Math.cos(yaw) * CAMERA_DISTANCE;
    const alpha = dampFactor(6.5, delta);
    camera.position.x += (desiredX - camera.position.x) * alpha;
    camera.position.z += (desiredZ - camera.position.z) * alpha;
    camera.position.y += (position[1] + jumpRef.current.height + CAMERA_HEIGHT - camera.position.y) * alpha;
    camera.lookAt(position[0], position[1] + jumpRef.current.height + 1.25, position[2]);

    const group = groupRef.current;
    if (group) {
      group.position.set(position[0], position[1] + jumpRef.current.height, position[2]);
      group.rotation.y = yaw;
    }

    // Throttled 15Hz network transform (never inside React state).
    emitClockRef.current += delta * 1000;
    if (emitClockRef.current >= ROOM_MOVE_TICK_MS) {
      emitClockRef.current = 0;
      const transform: PlayerTransformPayload = {
        roomId,
        position: [Number(position[0].toFixed(3)), Number((position[1] + jumpRef.current.height).toFixed(3)), Number(position[2].toFixed(3))],
        rotation: Number(yawRef.current.toFixed(3)),
        animation: animationRef.current,
      };
      onMove(transform);
      onTransform?.(transform.position);
    }

    void state;
  });

  const planeWidth = bounds.maxX - bounds.minX;
  const planeDepth = bounds.maxZ - bounds.minZ;
  const centerX = (bounds.maxX + bounds.minX) / 2;
  const centerZ = (bounds.maxZ + bounds.minZ) / 2;

  return (
    <group>
      {/* Click-to-walk surface */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[centerX, 0.02, centerZ]}
        onPointerDown={(event) => {
          event.stopPropagation();
          targetRef.current = [event.point.x, 0, event.point.z];
        }}
      >
        <planeGeometry args={[planeWidth, planeDepth]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <group ref={groupRef} position={spawnPosition}>
        <ProceduralAvatar
          config={avatarConfig}
          animation={animation}
          displayName={`${displayName} (you)`}
          nameplateColor="#7C3AED"
        />
      </group>
    </group>
  );
}
