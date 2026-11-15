'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import {
  REMOTE_INTERPOLATION_LAMBDA,
  REMOTE_SNAP_DISTANCE,
  calculateDistance3D,
  dampFactor,
  lerpVector3,
  slerpQuaternion,
  eulerYToQuaternion,
  type Vec3,
  type Quat,
} from '@vybe/3d-core';
import type { RoomParticipant } from '@vybe/shared-types';
import { ProceduralAvatar } from '../avatar/ProceduralAvatar';

export interface RemotePlayerProps {
  participant: RoomParticipant;
  chatBubble: string | null;
  isSpeaking: boolean;
}

/**
 * Remote avatars are driven by network targets, not React state: every frame we
 * lerp position and slerp rotation toward the last known transform (AGENTS.md
 * rule 4), so the network cadence (15Hz) renders smoothly at 60fps.
 */
export function RemotePlayer({ participant, chatBubble, isSpeaking }: RemotePlayerProps) {
  const groupRef = useRef<Group>(null);
  const currentPosition = useRef<Vec3>([...participant.position] as Vec3);
  const currentQuat = useRef<Quat>(eulerYToQuaternion(participant.rotation));

  useFrame((_state, rawDelta) => {
    const group = groupRef.current;
    if (!group) return;
    const delta = Math.min(rawDelta, 0.05);
    const target = participant.position as Vec3;

    if (calculateDistance3D(currentPosition.current, target) > REMOTE_SNAP_DISTANCE) {
      currentPosition.current = [...target] as Vec3;
      currentQuat.current = eulerYToQuaternion(participant.rotation);
    }

    const alpha = dampFactor(REMOTE_INTERPOLATION_LAMBDA, delta);
    currentPosition.current = lerpVector3(currentPosition.current, target, alpha);
    currentQuat.current = slerpQuaternion(
      currentQuat.current,
      eulerYToQuaternion(participant.rotation),
      alpha,
    );

    group.position.set(
      currentPosition.current[0],
      currentPosition.current[1],
      currentPosition.current[2],
    );

    group.quaternion.set(
      currentQuat.current[0],
      currentQuat.current[1],
      currentQuat.current[2],
      currentQuat.current[3],
    );
  });

  return (
    <group ref={groupRef} position={participant.position}>
      <ProceduralAvatar
        config={participant.avatarConfig}
        animation={participant.animation}
        displayName={participant.displayName}
        isSpeaking={isSpeaking}
        chatBubble={chatBubble}
        nameplateColor="#06B6D4"
      />
    </group>
  );
}
