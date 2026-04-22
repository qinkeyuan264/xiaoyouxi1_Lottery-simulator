import { forwardRef, useCallback, useImperativeHandle, useState } from "react";
import * as THREE from "three";
import { WhiteBullet } from "@/features/dcb/components/lottery_scenes/WhiteBullet";

/**
 * fire(target)：炮口 → 目标球心方向，初速度用固定「米/秒」模长（launchSpeed），
 * 避免 applyImpulse 在高质量量比下产生极端线速度、肉眼只能看到一闪。
 */

export interface LauncherHandle {
  fire: (targetWorld: [number, number, number]) => void;
  removeBullet: (bulletId: string) => void;
  clearAllBullets: () => void;
}

export interface LauncherProps {
  position?: [number, number, number];
  /** 初速度大小（米/秒），建议 2.8～4.5，越小越慢、越易观察 */
  launchSpeed?: number;
  muzzleDistance?: number;
}

type Bullet = {
  id: string;
  spawn: [number, number, number];
  linvel: { x: number; y: number; z: number };
};

export const Launcher = forwardRef<LauncherHandle, LauncherProps>(function Launcher(
  { position = [15, 1, 0], launchSpeed = 3.4, muzzleDistance = 0.85 },
  ref,
) {
  const [bullets, setBullets] = useState<Bullet[]>([]);

  const removeBullet = useCallback((bulletId: string) => {
    setBullets((b) => b.filter((x) => x.id !== bulletId));
  }, []);

  const clearAllBullets = useCallback(() => {
    setBullets([]);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      removeBullet,
      clearAllBullets,
      fire: (targetWorld: [number, number, number]) => {
        const launcherP = new THREE.Vector3(...position);
        const target = new THREE.Vector3(...targetWorld);
        let toTarget = target.clone().sub(launcherP);
        if (toTarget.lengthSq() < 1e-12) {
          toTarget = new THREE.Vector3(-1, 0, 0);
        } else {
          toTarget.normalize();
        }
        const start = launcherP.clone().add(toTarget.clone().multiplyScalar(muzzleDistance));
        let dir = target.clone().sub(start);
        if (dir.lengthSq() < 1e-12) {
          dir = toTarget.clone();
        } else {
          dir.normalize();
        }
        const linvel = {
          x: dir.x * launchSpeed,
          y: dir.y * launchSpeed,
          z: dir.z * launchSpeed,
        };
        const id = `wb-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        setBullets((b) => [...b, { id, spawn: [start.x, start.y, start.z], linvel }]);
      },
    }),
    [launchSpeed, muzzleDistance, position, removeBullet, clearAllBullets],
  );

  return (
    <>
      <group position={position}>
        <mesh castShadow position={[0.42, 0, 0]}>
          <boxGeometry args={[0.95, 0.72, 1.05]} />
          <meshStandardMaterial color="#5d4037" roughness={0.65} metalness={0.35} />
        </mesh>
        <mesh position={[-0.48, 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.12, 0.16, 0.92, 18]} />
          <meshStandardMaterial color="#8d6e63" metalness={0.45} roughness={0.38} />
        </mesh>
      </group>
      {bullets.map((b) => (
        <WhiteBullet key={b.id} bulletId={b.id} position={b.spawn} initialLinvel={b.linvel} />
      ))}
    </>
  );
});
