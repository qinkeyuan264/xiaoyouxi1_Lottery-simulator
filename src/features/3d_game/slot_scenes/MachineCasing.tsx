import { RoundedBox } from "@react-three/drei";

export function MachineCasing() {
  return (
    <group>
      {/* 外壳主体 */}
      <RoundedBox castShadow receiveShadow args={[12.8, 10.2, 4.2]} radius={0.65} smoothness={6} position={[0, 0, 0]}>
        <meshStandardMaterial color="#272c36" roughness={0.28} metalness={0.92} envMapIntensity={1.35} />
      </RoundedBox>

      {/* 窗口凹槽 */}
      {/* 注意：凹槽要在滚轮“后面”，否则会把数字完全挡住 */}
      <RoundedBox castShadow receiveShadow args={[10.9, 5.6, 0.35]} radius={0.38} smoothness={6} position={[0, 0.6, 1.05]}>
        <meshStandardMaterial color="#0a0f1c" roughness={0.95} metalness={0.08} />
      </RoundedBox>

      {/* 玻璃 */}
      <RoundedBox args={[10.7, 5.3, 0.08]} radius={0.32} smoothness={6} position={[0, 0.6, 2.04]}>
        <meshPhysicalMaterial
          color="#cfe8ff"
          roughness={0.06}
          metalness={0}
          transmission={1}
          thickness={0.5}
          transparent
          opacity={0.16}
          ior={1.35}
          envMapIntensity={1.35}
          depthWrite={false}
        />
      </RoundedBox>

      {/* 顶部灯条 */}
      <mesh position={[0, 4.4, 2.02]}>
        <boxGeometry args={[11.2, 0.4, 0.15]} />
        <meshStandardMaterial color="#ffc94a" emissive="#ffc94a" emissiveIntensity={1.2} />
      </mesh>

      {/* 侧边霓虹 */}
      <mesh position={[-6.1, 0.2, 1.95]}>
        <boxGeometry args={[0.18, 7.4, 0.12]} />
        <meshStandardMaterial color="#7dd3fc" emissive="#7dd3fc" emissiveIntensity={1.1} />
      </mesh>
      <mesh position={[6.1, 0.2, 1.95]}>
        <boxGeometry args={[0.18, 7.4, 0.12]} />
        <meshStandardMaterial color="#fda4af" emissive="#fda4af" emissiveIntensity={1.1} />
      </mesh>

      {/* 拉杆 */}
      <group position={[6.8, 1.0, 1.8]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.12, 0.12, 3.2, 16]} />
          <meshStandardMaterial color="#757b8b" roughness={0.3} metalness={0.9} />
        </mesh>
        <mesh castShadow position={[0, 1.8, 0]}>
          <sphereGeometry args={[0.45, 18, 18]} />
          <meshStandardMaterial color="#e53935" roughness={0.25} metalness={0.35} envMapIntensity={1.2} />
        </mesh>
      </group>

      {/* 底座 */}
      <RoundedBox receiveShadow args={[14.2, 1.25, 5.4]} radius={0.55} smoothness={6} position={[0, -5.45, 0]}>
        <meshStandardMaterial color="#141926" roughness={0.92} metalness={0.08} />
      </RoundedBox>
    </group>
  );
}

