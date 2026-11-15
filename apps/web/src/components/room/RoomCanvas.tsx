'use client';

import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import type { RoomTemplate, Vec3 } from '@vybe/3d-core';
import type {
  AnimationState,
  AvatarConfig,
  ChatMessageEvent,
  PlayerTransformPayload,
  RoomParticipant,
  SceneProp,
} from '@vybe/shared-types';
import { LocalPlayer } from './LocalPlayer';
import { RemotePlayer } from './RemotePlayer';
import { RoomScene } from './RoomScene';

export interface RoomCanvasProps {
  roomId: string;
  template: RoomTemplate;
  sceneGraph: SceneProp[];
  participants: RoomParticipant[];
  messages: ChatMessageEvent[];
  self: { id: string; displayName: string; avatarConfig: AvatarConfig };
  spawnPosition: Vec3;
  onMove: (payload: PlayerTransformPayload) => void;
}

const BUBBLE_TTL_MS = 7000;
const SPEAKING_TTL_MS = 4000;

export default function RoomCanvas({
  roomId,
  template,
  sceneGraph,
  participants,
  messages,
  self,
  spawnPosition,
  onMove,
}: RoomCanvasProps) {
  const remoteParticipants = useMemo(
    () => participants.filter((participant) => participant.userId !== self.id),
    [participants, self.id],
  );

  const bubblesByUser = useMemo(() => {
    const now = Date.now();
    const bubbles = new Map<string, { content: string; at: number }>();
    for (const message of messages) {
      if (now - new Date(message.sentAt).getTime() > BUBBLE_TTL_MS) continue;
      bubbles.set(message.userId, { content: message.content, at: new Date(message.sentAt).getTime() });
    }
    return bubbles;
  }, [messages]);

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [0, 5, 12], fov: 52, near: 0.1, far: 200 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      className="absolute inset-0"
    >
      <color attach="background" args={[template.environment.fogColor]} />
      <fog attach="fog" args={[template.environment.fogColor, 18, 70]} />

      <ambientLight intensity={0.42} color={template.environment.ambientColor} />
      <hemisphereLight args={[template.environment.accentColor, '#070B19', 0.5]} />
      <directionalLight
        position={[8, 14, 6]}
        intensity={1.15}
        color="#F8FAFC"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
      />
      <pointLight position={[0, 7, 0]} intensity={20} color={template.environment.accentColor} distance={30} />

      <Stars radius={120} depth={60} count={1400} factor={3.2} saturation={0} fade speed={0.5} />

      <RoomScene template={template} sceneGraph={sceneGraph} />

      <LocalPlayer
        roomId={roomId}
        bounds={template.bounds}
        spawnPosition={spawnPosition}
        avatarConfig={self.avatarConfig}
        displayName={self.displayName}
        onMove={onMove}
      />

      {remoteParticipants.map((participant) => {
        const bubble = bubblesByUser.get(participant.userId);
        const isSpeaking =
          participant.isSpeaking ||
          (bubble ? Date.now() - bubble.at < SPEAKING_TTL_MS : false);
        return (
          <RemotePlayer
            key={participant.userId}
            participant={participant}
            chatBubble={bubble ? bubble.content : null}
            isSpeaking={isSpeaking}
          />
        );
      })}
    </Canvas>
  );
}

export type { AnimationState };
