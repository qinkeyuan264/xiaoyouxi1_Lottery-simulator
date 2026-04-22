import { RigidBody, TrimeshCollider, BallCollider, type IntersectionEnterPayload } from "@react-three/rapier";
import { useMemo } from "react";
import * as THREE from "three";

export interface CentralFunnelProps {
  radius?: number;
  height?: number;
  /** V11：默认置于世界原点 (0,0,0)，大型收集锥 + 底部 Sensor */
  position?: [number, number, number];
  sensorRadius?: number;
  onPrizeEnter: (e: IntersectionEnterPayload) => void;
}

/**
 * 中心收集漏斗：ConeGeometry 视觉 + TrimeshCollider；底部球形 Sensor 检测中奖球。
 * 几何与碰撞体共用同一网格，避免错位。
 */
export function CentralFunnel({
  radius = 3.9,
  height = 2.85,
  position = [0, 0, 0],
  sensorRadius = 0.45,
  onPrizeEnter,
}: CentralFunnelProps) {
  const geom = useMemo(() => {
    // 径向分段过多会急剧增加 Trimesh 三角形数量，单步物理与 CCD 成本很高，易导致长时间卡顿
    const g = new THREE.ConeGeometry(radius, height, 24, 1, true);
    g.computeVertexNormals();
    return g;
  }, [height, radius]);

  const trimeshArgs = useMemo(() => {
    const pos = geom.attributes.position.array as ArrayLike<number>;
    const idx = geom.index!.array as ArrayLike<number>;
    return [pos, idx] as const;
  }, [geom]);

  const y = height / 2;

  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false} friction={0.52} restitution={0.06}>
        <TrimeshCollider args={[trimeshArgs[0], trimeshArgs[1]]} />
      </RigidBody>

      <mesh geometry={geom} receiveShadow castShadow={false}>
        <meshStandardMaterial color="#3d4456" roughness={0.82} metalness={0.12} side={THREE.DoubleSide} />
      </mesh>

      <RigidBody type="fixed" colliders={false}>
        <BallCollider
          sensor
          args={[sensorRadius]}
          position={[0, -y + sensorRadius * 0.85, 0]}
          onIntersectionEnter={onPrizeEnter}
        />
      </RigidBody>
    </group>
  );
}
