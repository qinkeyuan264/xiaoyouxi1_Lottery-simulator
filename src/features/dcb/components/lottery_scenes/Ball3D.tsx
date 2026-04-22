import { BallCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { Decal } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import { getBallNumberTexture } from "@/utils/ballTexture";

/**
 * V11：被白球击落后的动态彩球 —— 质量低于白球，便于接收冲量；首帧可叠加额外 impulse。
 */

export const BALL_RADIUS = 0.5;

export interface BallMeshProps {
  number: number;
  color: string;
  variant: "red" | "blue";
}

export function BallMesh({ number, color, variant }: BallMeshProps) {
  const tex = useMemo(() => getBallNumberTexture(number, variant === "red" ? "red" : "blue"), [number, variant]);

  return (
    <mesh castShadow receiveShadow>
      <sphereGeometry args={[BALL_RADIUS, 32, 32]} />
      <meshStandardMaterial
        color={color}
        roughness={0.22}
        metalness={0.22}
        envMapIntensity={1.35}
        emissive={variant === "red" ? "#26060a" : "#051733"}
        emissiveIntensity={0.35}
      />
      {/* 正面贴花：旋转修正镜像，避免数字反着 */}
      <Decal
        position={[0, 0, BALL_RADIUS - 0.04]}
        rotation={[0, Math.PI, 0]}
        scale={[0.95, 0.95, 0.95]}
        map={tex}
        depthTest
      />
      {/* 背面贴花：保证落下的球从任意方向都可读 */}
      <Decal
        position={[0, 0, -BALL_RADIUS + 0.04]}
        rotation={[0, 0, 0]}
        scale={[0.95, 0.95, 0.95]}
        map={tex}
        depthTest
      />
    </mesh>
  );
}

export interface Ball3DProps {
  idKey: string;
  number: number;
  color: string;
  variant: "red" | "blue";
  position: [number, number, number];
  initialImpulse?: { x: number; y: number; z: number };
  onCollide: () => void;
}

export function Ball3D({ idKey, number, color, variant, position, initialImpulse, onCollide }: Ball3DProps) {
  const rb = useRef<RapierRigidBody>(null);

  useEffect(() => {
    const body = rb.current;
    if (!body || !initialImpulse) return;
    body.applyImpulse(initialImpulse, true);
  }, [initialImpulse]);

  return (
    <RigidBody
      ref={rb}
      type="dynamic"
      position={position}
      colliders={false}
      linearDamping={0.1}
      angularDamping={0.18}
      canSleep
      onCollisionEnter={() => onCollide()}
      userData={{ idKey, number, variant, kind: "numberedBall" }}
    >
      <BallCollider args={[BALL_RADIUS]} mass={0.48} restitution={0.38} friction={0.5} />
      <BallMesh number={number} color={color} variant={variant} />
    </RigidBody>
  );
}
