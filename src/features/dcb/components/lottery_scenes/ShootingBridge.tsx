import { CuboidCollider, RigidBody } from "@react-three/rapier";

/**
 * 发射器（+X 外侧）与转盘之间的水平承载面。
 * 顶面高度与轨道球心下的「球底」大致齐平，避免白球在撞击前因重力掉到转盘下方。
 */

export interface ShootingBridgeProps {
  /** 承载面中心世界坐标 */
  position?: [number, number, number];
  /** 半尺寸 [halfX, halfY, halfZ]，halfY 为板厚的一半 */
  halfExtents?: [number, number, number];
}

export function ShootingBridge({
  position = [9.5, 1.56, 0],
  halfExtents = [6, 0.05, 3.8],
}: ShootingBridgeProps) {
  const [hx, hy, hz] = halfExtents;
  return (
    <RigidBody type="fixed" position={position} colliders={false} friction={0.94} restitution={0.06}>
      <CuboidCollider args={halfExtents} friction={0.94} restitution={0.06} />
      <mesh receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[hx * 2, hy * 2, hz * 2]} />
        <meshStandardMaterial
          color="#3a4258"
          roughness={0.78}
          metalness={0.18}
          transparent
          opacity={0.88}
        />
      </mesh>
    </RigidBody>
  );
}
