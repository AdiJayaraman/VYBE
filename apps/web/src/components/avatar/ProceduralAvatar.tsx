'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Group } from 'three';
import { AVATAR_SURFACE_COLORS } from '@vybe/3d-core';
import type { AnimationState, AvatarConfig } from '@vybe/shared-types';

export interface ProceduralAvatarProps {
  config: AvatarConfig;
  animation?: AnimationState;
  displayName?: string;
  isSpeaking?: boolean;
  chatBubble?: string | null;
  nameplateColor?: string;
  animateMotion?: boolean;
}

const BODY_HEIGHT = 1.8;

function hairGeometry(style: AvatarConfig['hairStyleId'], color: string) {
  switch (style) {
    case 'buzz':
      return (
        <mesh position={[0, 1.72, -0.01]} castShadow>
          <sphereGeometry args={[0.205, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshStandardMaterial color={color} roughness={0.75} />
        </mesh>
      );
    case 'shag':
      return (
        <group position={[0, 1.73, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.235, 20, 16]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.06, 0.13]} rotation={[0.4, 0, 0]}>
            <boxGeometry args={[0.36, 0.16, 0.12]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
        </group>
      );
    case 'bob':
      return (
        <group position={[0, 1.7, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.24, 20, 16]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.2, 0]}>
            <cylinderGeometry args={[0.235, 0.235, 0.32, 20, 1, true]} />
            <meshStandardMaterial color={color} roughness={0.8} side={2} />
          </mesh>
        </group>
      );
    case 'ponytail':
      return (
        <group position={[0, 1.72, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.225, 20, 16]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.18, -0.2]} rotation={[0.35, 0, 0]}>
            <capsuleGeometry args={[0.07, 0.32, 6, 12]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
        </group>
      );
    case 'locs':
      return (
        <group>
          {Array.from({ length: 8 }).map((_, index) => {
            const angle = (index / 8) * Math.PI * 2;
            return (
              <mesh
                key={index}
                position={[Math.cos(angle) * 0.18, 1.78, Math.sin(angle) * 0.18]}
                rotation={[0, angle, 0]}
                castShadow
              >
                <capsuleGeometry args={[0.035, 0.34, 4, 8]} />
                <meshStandardMaterial color={color} roughness={0.7} />
              </mesh>
            );
          })}
        </group>
      );
    case 'mohawk':
      return (
        <mesh position={[0, 1.9, 0]} castShadow>
          <boxGeometry args={[0.08, 0.26, 0.3]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} />
        </mesh>
      );
    case 'none':
    default:
      return null;
  }
}

function accessoryMesh(accessory: AvatarConfig['accessoryId'], color: string) {
  switch (accessory) {
    case 'halo':
      return (
        <mesh position={[0, 2.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.26, 0.022, 8, 40]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.2} toneMapped={false} />
        </mesh>
      );
    case 'earpiece':
      return (
        <mesh position={[0.21, 1.64, 0.02]}>
          <boxGeometry args={[0.05, 0.09, 0.08]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} toneMapped={false} />
        </mesh>
      );
    case 'wings':
      return (
        <group position={[0, 1.3, -0.2]}>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.42, 0, 0]} rotation={[0, side * 0.5, 0]}>
              <planeGeometry args={[0.62, 0.86]} />
              <meshStandardMaterial
                color={color}
                transparent
                opacity={0.32}
                emissive={color}
                emissiveIntensity={1.2}
                side={2}
              />
            </mesh>
          ))}
        </group>
      );
    case 'visor':
      return (
        <mesh position={[0, 1.64, 0.165]}>
          <boxGeometry args={[0.34, 0.095, 0.11]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={2.4}
            transparent
            opacity={0.9}
            toneMapped={false}
          />
        </mesh>
      );
    case 'none':
    default:
      return null;
  }
}

/**
 * Fully procedural (no external assets) modular avatar. Shared by the Avatar
 * Studio viewport and the multiplayer room so the look stays consistent.
 */
export function ProceduralAvatar({
  config,
  animation = 'idle',
  displayName,
  isSpeaking = false,
  chatBubble = null,
  nameplateColor = '#06B6D4',
  animateMotion = true,
}: ProceduralAvatarProps) {
  const rootRef = useRef<Group>(null);
  const legRef = useRef<Group>(null);
  const armLeftRef = useRef<Group>(null);
  const armRightRef = useRef<Group>(null);

  const skin = useMemo(() => AVATAR_SURFACE_COLORS[config.skinTone], [config.skinTone]);

  useFrame((state) => {
    if (!animateMotion) return;
    const t = state.clock.elapsedTime;
    const root = rootRef.current;
    if (root) {
      switch (animation) {
        case 'dance':
          root.rotation.z = Math.sin(t * 4) * 0.12;
          root.position.y = Math.abs(Math.sin(t * 4)) * 0.08;
          break;
        case 'sit':
          root.position.y = -0.38;
          root.rotation.z = 0;
          break;
        case 'walk':
        case 'run': {
          const speed = animation === 'run' ? 12 : 7;
          root.position.y = Math.abs(Math.sin(t * speed)) * 0.05;
          root.rotation.z = 0;
          break;
        }
        default:
          root.position.y = Math.sin(t * 1.6) * 0.018;
          root.rotation.z = 0;
      }
    }

    if (legRef.current) {
      const speed = animation === 'run' ? 12 : animation === 'walk' ? 7 : 0;
      legRef.current.rotation.x = speed === 0 ? 0 : Math.sin(t * speed) * 0.55;
      if (animation === 'sit') legRef.current.rotation.x = -1.25;
    }

    if (armLeftRef.current && armRightRef.current) {
      const armSwing = animation === 'walk' ? 0.45 : animation === 'run' ? 0.85 : 0;
      armLeftRef.current.rotation.x = animation === 'dance' ? Math.sin(t * 4) * 1.1 - 0.4 : -Math.sin(t * (armSwing ? 7 : 0)) * armSwing;
      armRightRef.current.rotation.x =
        animation === 'wave'
          ? -2.2 + Math.sin(t * 8) * 0.35
          : animation === 'dance'
            ? -1.2 + Math.cos(t * 4) * 0.5
            : Math.sin(t * (armSwing ? 7 : 0)) * armSwing;
    }
  });

  return (
    <group ref={rootRef} position={[0, 0, 0]}>
      {/* Legs */}
      <group ref={legRef} position={[0, 0.86, 0]}>
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.145, 0, 0]}>
            <mesh position={[0, -0.36, 0]} castShadow>
              <capsuleGeometry args={[0.085, 0.5, 6, 12]} />
              <meshStandardMaterial color={config.bottomColor} roughness={0.7} />
            </mesh>
            {config.shoesId !== 'none' ? (
              <mesh position={[0, -0.72, 0.05]} castShadow>
                <boxGeometry args={[0.17, 0.12, 0.29]} />
                <meshStandardMaterial
                  color={config.shoesId === 'boots' ? '#0B1120' : '#F8FAFC'}
                  roughness={0.5}
                  metalness={0.3}
                />
              </mesh>
            ) : null}
          </group>
        ))}
      </group>

      {/* Torso */}
      <group position={[0, 1.18, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.56, 0.6, 0.32]} />
          <meshStandardMaterial color={config.topColor} roughness={0.62} metalness={0.12} />
        </mesh>
        {config.topId === 'tech_jacket' ? (
          <mesh position={[0, 0, 0.17]}>
            <boxGeometry args={[0.58, 0.2, 0.02]} />
            <meshStandardMaterial
              color={config.accessoryColor}
              emissive={config.accessoryColor}
              emissiveIntensity={1.4}
              toneMapped={false}
            />
          </mesh>
        ) : null}
        {config.topId === 'hoodie' || config.topId === 'cropped_hoodie' ? (
          <mesh position={[0, 0.2, -0.16]} rotation={[0.3, 0, 0]}>
            <boxGeometry args={[0.36, 0.22, 0.18]} />
            <meshStandardMaterial color={config.topColor} roughness={0.7} />
          </mesh>
        ) : null}

        {/* Arms */}
        <group ref={armLeftRef} position={[-0.35, 0.2, 0]}>
          <mesh position={[0, -0.24, 0]} castShadow>
            <capsuleGeometry args={[0.062, 0.42, 6, 12]} />
            <meshStandardMaterial color={config.topColor} roughness={0.65} />
          </mesh>
          <mesh position={[0, -0.52, 0]}>
            <sphereGeometry args={[0.065, 12, 12]} />
            <meshStandardMaterial color={skin} roughness={0.8} />
          </mesh>
        </group>
        <group ref={armRightRef} position={[0.35, 0.2, 0]}>
          <mesh position={[0, -0.24, 0]} castShadow>
            <capsuleGeometry args={[0.062, 0.42, 6, 12]} />
            <meshStandardMaterial color={config.topColor} roughness={0.65} />
          </mesh>
          <mesh position={[0, -0.52, 0]}>
            <sphereGeometry args={[0.065, 12, 12]} />
            <meshStandardMaterial color={skin} roughness={0.8} />
          </mesh>
        </group>
      </group>

      {/* Head */}
      <group position={[0, 1.63, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.2, 24, 20]} />
          <meshStandardMaterial color={skin} roughness={0.72} />
        </mesh>
        {hairGeometry(config.hairStyleId, config.hairColor)}
        {accessoryMesh(config.accessoryId, config.accessoryColor)}
      </group>

      {/* Speaking ring */}
      {isSpeaking ? (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.38, 0.44, 48]} />
          <meshBasicMaterial color="#06B6D4" transparent opacity={0.85} toneMapped={false} />
        </mesh>
      ) : null}

      {displayName ? (
        <Html position={[0, BODY_HEIGHT + 0.36, 0]} center distanceFactor={12} zIndexRange={[20, 0]}>
          <div
            style={{
              padding: '3px 10px',
              borderRadius: 999,
              border: `1px solid ${nameplateColor}66`,
              background: 'rgba(7, 11, 25, 0.82)',
              color: '#F8FAFC',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
              boxShadow: `0 0 18px -6px ${nameplateColor}`,
            }}
          >
            {displayName}
          </div>
        </Html>
      ) : null}

      {chatBubble ? (
        <Html position={[0, BODY_HEIGHT + 0.72, 0]} center distanceFactor={14}>
          <div
            style={{
              maxWidth: 190,
              padding: '6px 10px',
              borderRadius: 12,
              background: 'rgba(6, 182, 212, 0.16)',
              border: '1px solid rgba(6, 182, 212, 0.5)',
              color: '#F8FAFC',
              fontSize: 11,
              lineHeight: 1.35,
              boxShadow: '0 0 24px -8px rgba(6,182,212,0.9)',
            }}
          >
            {chatBubble}
          </div>
        </Html>
      ) : null}
    </group>
  );
}
