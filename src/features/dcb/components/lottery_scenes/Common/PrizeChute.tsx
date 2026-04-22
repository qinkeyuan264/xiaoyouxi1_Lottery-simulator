import { Decal } from "@react-three/drei";
import { useMemo } from "react";
import { getBallNumberTexture } from "@/utils/ballTexture";

export interface SettledBallData {
  idKey: string;
  value: number;
  variant: "red" | "blue";
}

interface PrizeChuteProps {
  /** 已落槽、转为展示态的号码（顺序即开出顺序） */
  settled: SettledBallData[];
  /** 整排偏移 */
  offset?: [number, number, number];
}

/**
 * 中奖展示位：纯网格展示球，无刚体，排列在机器前方。
 */
export function PrizeChute({ settled, offset = [0, 0.12, 1.22] }: PrizeChuteProps) {
  const spacing = 0.36;
  const start = -(settled.length - 1) * (spacing / 2);

  return (
    <group position={offset}>
      {settled.map((b, i) => (
        <SettledBallMesh key={b.idKey} value={b.value} variant={b.variant} position={[start + i * spacing, 0, 0]} />
      ))}
    </group>
  );
}

function SettledBallMesh({
  value,
  variant,
  position,
}: {
  value: number;
  variant: "red" | "blue";
  position: [number, number, number];
}) {
  const tex = useMemo(() => getBallNumberTexture(value, variant === "red" ? "red" : "blue"), [value, variant]);
  const r = 0.32;
  const color = variant === "red" ? "#c62828" : "#1565c0";

  return (
    <mesh position={position} castShadow receiveShadow>
      <sphereGeometry args={[r, 28, 28]} />
      <meshStandardMaterial color={color} roughness={0.28} metalness={0.25} envMapIntensity={1.1} />
      <Decal position={[0, 0, r - 0.03]} scale={[0.62, 0.62, 0.62]} map={tex} depthTest />
    </mesh>
  );
}
