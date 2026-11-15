'use client';

import { Canvas } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import type { AvatarConfig } from '@vybe/shared-types';
import { ProceduralAvatar } from './ProceduralAvatar';

export interface AvatarPreviewProps {
  config: AvatarConfig;
  displayName?: string;
}

export default function AvatarPreview({ config, displayName }: AvatarPreviewProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [2.4, 1.9, 3.4], fov: 42 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#070B19']} />
      <fog attach="fog" args={['#070B19', 8, 16]} />

      <ambientLight intensity={0.55} color="#94A3B8" />
      <directionalLight position={[4, 6, 3]} intensity={1.6} color="#F8FAFC" castShadow />
      <pointLight position={[-3, 2.4, -2]} intensity={22} color="#7C3AED" distance={12} />
      <pointLight position={[3, 1.8, 2.4]} intensity={18} color="#06B6D4" distance={10} />

      <group position={[0, -0.9, 0]}>
        <ProceduralAvatar config={config} animation="idle" displayName={displayName} />
        <ContactShadows position={[0, 0.01, 0]} opacity={0.55} scale={6} blur={2.4} far={3} color="#000000" />
      </group>

      <gridHelper args={[14, 28, '#1E293B', '#0F1629']} position={[0, -0.9, 0]} />
      <OrbitControls
        enablePan={false}
        minDistance={2.2}
        maxDistance={7}
        maxPolarAngle={Math.PI / 2.1}
        autoRotate
        autoRotateSpeed={0.9}
        target={[0, 0.1, 0]}
      />
    </Canvas>
  );
}
