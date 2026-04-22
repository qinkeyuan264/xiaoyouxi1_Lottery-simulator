import { BallCollider, RigidBody } from "@react-three/rapier";
import { useMemo } from "react";

export const WHITE_BULLET_RADIUS = 0.42;

export interface WhiteBulletProps {
  bulletId: string;
  position: [number, number, number];
  initialLinvel: { x: number; y: number; z: number };
}

/**
 * 使用 RigidBody 的 linearVelocity，首帧即有速度；配合 CCD 避免大 dt 下穿模错过红球。
 */
export function WhiteBullet({ bulletId, position, initialLinvel }: WhiteBulletProps) {
  const lv = useMemo(
    (): [number, number, number] => [initialLinvel.x, initialLinvel.y, initialLinvel.z],
    [bulletId, initialLinvel.x, initialLinvel.y, initialLinvel.z],
  );

  return (
    <RigidBody
      type="dynamic"
      position={position}
      linearVelocity={lv}
      colliders={false}
      gravityScale={0.22}
      linearDamping={0.22}
      angularDamping={0.35}
      canSleep={false}
      ccd
      userData={{ kind: "whiteBullet", bulletId }}
    >
      <BallCollider args={[WHITE_BULLET_RADIUS]} mass={3.5} restitution={0.35} friction={0.45} />
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[WHITE_BULLET_RADIUS, 32, 32]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.22}
          metalness={0.12}
          envMapIntensity={1.35}
          emissive="#dde8ff"
          emissiveIntensity={0.55}
        />
      </mesh>
    </RigidBody>
  );
}
