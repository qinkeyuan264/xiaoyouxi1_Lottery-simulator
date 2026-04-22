import { CuboidCollider, CylinderCollider, RigidBody, type IntersectionEnterPayload } from "@react-three/rapier";
import { useCallback, useMemo } from "react";
import * as THREE from "three";

export interface LShapedTubeProps {
  /** 管道入口（贴合轮盘边缘） */
  inlet?: [number, number, number];
  /** 管道出口（朝向观众展示区） */
  outlet?: [number, number, number];
  /** 管道内径半径（需要略大于球半径） */
  tubeRadius?: number;
  /** 入口 sensor 的半高（用于“确认进入管道”，节流阀门） */
  inletSensorHalfHeight?: number;
  /** 末端收集区 sensor 的半高（用于判定中奖） */
  collectSensorHalfHeight?: number;
  /** 封头厚度（用于闭合出口端） */
  endCapThickness?: number;
  onInletEnter?: (e: IntersectionEnterPayload) => void;
  onCollect: (e: IntersectionEnterPayload) => void;
}

/**
 * 透明中空 L 形滑管：TubeGeometry 视觉 + TrimeshCollider 物理滑道。
 * 注意：Trimesh 只提供“表面”，球会在内部滚动，靠重力与摩擦滑行。
 */
export function LShapedTube({
  inlet = [0, 5, 10],
  outlet = [0, -2, 15],
  tubeRadius = 0.9,
  inletSensorHalfHeight = 0.9,
  collectSensorHalfHeight = 2.2,
  endCapThickness = 0.18,
  onInletEnter,
  onCollect,
}: LShapedTubeProps) {
  const curve = useMemo(() => {
    // 真正的 90° L 形：入口 → 垂直下落段 → 水平出管段（朝向观众）
    const a = new THREE.Vector3(...inlet);
    // 末端稍微更低，形成轻微下坡，球会自然滚到封头附近而不是堆在转角处
    const d = new THREE.Vector3(outlet[0], outlet[1] - 0.7, outlet[2]);
    const corner0 = new THREE.Vector3(a.x, a.y - 1.2, a.z);
    const corner1 = new THREE.Vector3(a.x, d.y + 0.65, a.z);
    const corner2 = new THREE.Vector3(a.x, d.y + 0.3, a.z + 0.9);
    return new THREE.CatmullRomCurve3([a, corner0, corner1, corner2, d], false, "centripetal", 0.5);
  }, [inlet, outlet]);

  const geom = useMemo(() => {
    const g = new THREE.TubeGeometry(curve, 96, tubeRadius, 18, false);
    g.computeVertexNormals();
    return g;
  }, [curve, tubeRadius]);

  const inletSensorPos = useMemo(() => [inlet[0], inlet[1] - 0.55, inlet[2]] as [number, number, number], [inlet]);

  const collectPos = useMemo(() => {
    // 收集 sensor 放在封头前的一段“储球区”
    return [outlet[0], outlet[1] - 0.55, outlet[2] - 0.6] as [number, number, number];
  }, [outlet]);

  const endCapPos = useMemo(() => {
    // 封头在最末端稍微再向外一点，确保“出口端闭合”
    return [outlet[0], outlet[1] - 0.7, outlet[2] + endCapThickness * 0.55] as [number, number, number];
  }, [endCapThickness, outlet]);

  const segments = useMemo(() => {
    const count = 54;
    const out: Array<{
      mid: THREE.Vector3;
      q: THREE.Quaternion;
      len: number;
    }> = [];
    const zAxis = new THREE.Vector3(0, 0, 1);
    for (let i = 0; i < count; i++) {
      const t0 = i / count;
      const t1 = (i + 1) / count;
      const p0 = curve.getPointAt(t0);
      const p1 = curve.getPointAt(t1);
      const mid = p0.clone().add(p1).multiplyScalar(0.5);
      const dir = p1.clone().sub(p0);
      const len = Math.max(0.02, dir.length());
      dir.normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(zAxis, dir);
      out.push({ mid, q, len });
    }
    return out;
  }, [curve]);

  const qTuple = useCallback((q: THREE.Quaternion): [number, number, number, number] => [q.x, q.y, q.z, q.w], []);

  const posWithOffset = useCallback((mid: THREE.Vector3, q: THREE.Quaternion, ox: number, oy: number, oz: number) => {
    const off = new THREE.Vector3(ox, oy, oz).applyQuaternion(q);
    return [mid.x + off.x, mid.y + off.y, mid.z + off.z] as [number, number, number];
  }, []);

  return (
    <group>
      {/* 物理滑道：用多段封闭盒子通道，避免 Trimesh 在细长弯管上漏判导致“穿透” */}
      <RigidBody type="fixed" colliders={false} friction={0.25} restitution={0.02}>
        {segments.map((s, i) => {
          const wall = 0.1;
          const r = tubeRadius;
          const halfLen = s.len / 2;
          const quat = qTuple(s.q);
          return (
            <group key={`seg-${i}`}>
              {/* 左右墙 */}
              <CuboidCollider
                args={[wall, r * 1.05, halfLen]}
                position={posWithOffset(s.mid, s.q, r, 0, 0)}
                quaternion={quat}
                friction={0.25}
                restitution={0.02}
              />
              <CuboidCollider
                args={[wall, r * 1.05, halfLen]}
                position={posWithOffset(s.mid, s.q, -r, 0, 0)}
                quaternion={quat}
                friction={0.25}
                restitution={0.02}
              />
              {/* 上下墙 */}
              <CuboidCollider
                args={[r * 1.05, wall, halfLen]}
                position={posWithOffset(s.mid, s.q, 0, r, 0)}
                quaternion={quat}
                friction={0.25}
                restitution={0.02}
              />
              <CuboidCollider
                args={[r * 1.05, wall, halfLen]}
                position={posWithOffset(s.mid, s.q, 0, -r, 0)}
                quaternion={quat}
                friction={0.25}
                restitution={0.02}
              />
            </group>
          );
        })}
      </RigidBody>

      <mesh geometry={geom} castShadow={false} receiveShadow>
        <meshPhysicalMaterial
          color="#a8d4ff"
          roughness={0.08}
          metalness={0.0}
          transmission={1}
          thickness={0.6}
          transparent
          opacity={0.28}
          ior={1.35}
          envMapIntensity={1.2}
        />
      </mesh>

      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider
          sensor
          args={[inletSensorHalfHeight, tubeRadius * 1.25]}
          position={inletSensorPos}
          onIntersectionEnter={onInletEnter}
        />
      </RigidBody>

      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider
          sensor
          args={[collectSensorHalfHeight, tubeRadius * 1.35]}
          position={collectPos}
          onIntersectionEnter={onCollect}
        />
      </RigidBody>

      {/* 出口封头：闭合一端，确保球不会从尾端漏出去 */}
      <RigidBody type="fixed" colliders={false} friction={0.55} restitution={0.02}>
        <CuboidCollider args={[tubeRadius * 1.05, tubeRadius * 1.05, endCapThickness]} position={endCapPos} />
      </RigidBody>
      <mesh position={endCapPos} castShadow={false} receiveShadow={false}>
        <circleGeometry args={[tubeRadius * 1.05, 28]} />
        <meshPhysicalMaterial
          color="#a8d4ff"
          roughness={0.12}
          metalness={0.0}
          transmission={1}
          thickness={0.65}
          transparent
          opacity={0.22}
          ior={1.35}
          envMapIntensity={1.2}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

