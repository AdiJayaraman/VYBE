'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { RoomTemplate } from '@vybe/3d-core';
import type { SceneProp } from '@vybe/shared-types';

interface PropMeshProps {
  sceneProp: SceneProp;
  withLight: boolean;
}

function PropMesh({ sceneProp, withLight }: PropMeshProps) {
  const portalRef = useRef<Group>(null);

  useFrame((state, delta) => {
    if (sceneProp.modelType === 'portal' && portalRef.current) {
      portalRef.current.rotation.z += delta * 0.8;
    }
  });

  const { position, rotation, scale, color } = sceneProp;
  const emissive = { color, emissive: color, emissiveIntensity: 1.8, toneMapped: false } as const;

  switch (sceneProp.modelType) {
    case 'sofa':
      return (
        <group position={position} rotation={rotation} scale={scale}>
          <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.6, 0.34, 0.8]} />
            <meshStandardMaterial color={color} roughness={0.7} metalness={0.08} />
          </mesh>
          <mesh position={[0, 0.56, -0.32]} castShadow>
            <boxGeometry args={[1.6, 0.5, 0.18]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
          {[-0.78, 0.78].map((x) => (
            <mesh key={x} position={[x, 0.48, 0]} castShadow>
              <boxGeometry args={[0.16, 0.44, 0.8]} />
              <meshStandardMaterial color={color} roughness={0.7} />
            </mesh>
          ))}
        </group>
      );

    case 'table':
      return (
        <group position={position} rotation={rotation} scale={scale}>
          <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.52, 0.52, 0.08, 28]} />
            <meshStandardMaterial color={color} roughness={0.35} metalness={0.55} />
          </mesh>
          <mesh position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.12, 0.42, 16]} />
            <meshStandardMaterial color="#1E293B" roughness={0.4} metalness={0.6} />
          </mesh>
        </group>
      );

    case 'arcade':
      return (
        <group position={position} rotation={rotation} scale={scale}>
          <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.72, 1.44, 0.6]} />
            <meshStandardMaterial color="#0F1629" roughness={0.5} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0.98, 0.31]}>
            <planeGeometry args={[0.52, 0.44]} />
            <meshStandardMaterial {...emissive} />
          </mesh>
          <mesh position={[0, 1.56, 0.14]} rotation={[0.35, 0, 0]}>
            <boxGeometry args={[0.76, 0.16, 0.3]} />
            <meshStandardMaterial {...emissive} />
          </mesh>
          <mesh position={[0, 1.66, 0.02]}>
            <boxGeometry args={[0.7, 0.06, 0.34]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} toneMapped={false} />
          </mesh>
        </group>
      );

    case 'neon_sign':
      return (
        <group position={position} rotation={rotation} scale={scale}>
          <mesh>
            <boxGeometry args={[1.8, 0.16, 0.08]} />
            <meshStandardMaterial {...emissive} />
          </mesh>
          <mesh position={[0, 0.34, 0]}>
            <boxGeometry args={[1.2, 0.1, 0.06]} />
            <meshStandardMaterial {...emissive} />
          </mesh>
          <mesh position={[0, -0.34, 0]}>
            <boxGeometry args={[0.8, 0.08, 0.06]} />
            <meshStandardMaterial {...emissive} />
          </mesh>
          {withLight ? <pointLight position={[0, 0.4, 0.4]} color={color} intensity={9} distance={9} /> : null}
        </group>
      );

    case 'portal':
      return (
        <group position={position} rotation={rotation} scale={scale}>
          <group ref={portalRef}>
            <mesh>
              <torusGeometry args={[0.95, 0.075, 12, 48]} />
              <meshStandardMaterial {...emissive} />
            </mesh>
            <mesh position={[0, 0, 0]} rotation={[0, 0, 0.4]}>
              <torusGeometry args={[0.72, 0.03, 8, 40]} />
              <meshStandardMaterial color="#7C3AED" emissive="#7C3AED" emissiveIntensity={1.6} toneMapped={false} />
            </mesh>
          </group>
          <mesh>
            <circleGeometry args={[0.68, 32]} />
            <meshBasicMaterial color={color} transparent opacity={0.22} side={2} toneMapped={false} />
          </mesh>
          <pointLight position={[0, 0, 0.6]} color={color} intensity={12} distance={8} />
        </group>
      );

    default:
      return null;
  }
}

export interface RoomSceneProps {
  template: RoomTemplate;
  sceneGraph: SceneProp[];
}

export function RoomScene({ template, sceneGraph }: RoomSceneProps) {
  const floorSize = useMemo(
    () => Math.max(template.bounds.maxX - template.bounds.minX, template.bounds.maxZ - template.bounds.minZ),
    [template.bounds],
  );

  const litPropIds = useMemo(
    () =>
      new Set(
        sceneGraph
          .filter((sceneProp) => sceneProp.modelType === 'neon_sign')
          .slice(0, 4)
          .map((sceneProp) => sceneProp.id),
      ),
    [sceneGraph],
  );

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[floorSize + 8, floorSize + 8, 1, 1]} />
        <meshStandardMaterial
          color={template.environment.floorColor}
          roughness={0.22}
          metalness={0.85}
        />
      </mesh>

      <gridHelper
        args={[floorSize + 8, Math.round((floorSize + 8) * 1.5), template.environment.gridColor, '#0B1120']}
        position={[0, 0.012, 0]}
      />

      {/* Neon perimeter pillars */}
      {[
        [-floorSize / 2, -floorSize / 2],
        [floorSize / 2, -floorSize / 2],
        [-floorSize / 2, floorSize / 2],
        [floorSize / 2, floorSize / 2],
      ].map(([x, z]) => (
        <group key={`${x}-${z}`} position={[x ?? 0, 0, z ?? 0]}>
          <mesh position={[0, 2.4, 0]}>
            <boxGeometry args={[0.24, 4.8, 0.24]} />
            <meshStandardMaterial
              color="#0F1629"
              emissive={template.environment.accentColor}
              emissiveIntensity={0.35}
              roughness={0.35}
              metalness={0.7}
            />
          </mesh>
          <pointLight
            position={[0, 4.4, 0]}
            color={template.environment.accentColor}
            intensity={8}
            distance={14}
          />
        </group>
      ))}

      {sceneGraph.map((sceneProp) => (
        <PropMesh key={sceneProp.id} sceneProp={sceneProp} withLight={litPropIds.has(sceneProp.id)} />
      ))}
    </group>
  );
}
