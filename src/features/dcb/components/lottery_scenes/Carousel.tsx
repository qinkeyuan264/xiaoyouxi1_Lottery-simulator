import { useFrame } from "@react-three/fiber";
import { BallCollider, RigidBody, type CollisionEnterPayload, type RapierRigidBody } from "@react-three/rapier";
import { Vector3 } from "@dimforge/rapier3d-compat";
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import * as THREE from "three";
import { Ball3D, BallMesh, BALL_RADIUS } from "@/features/dcb/components/lottery_scenes/Ball3D";

/**
 * 运动学轮盘 + 碰撞触发器。
 * 暴露 getStrikeSlotIndex / getBallWorldPosition：发射器应瞄准「当前最靠近 +X 侧」的槽位（与炮口同侧），否则弹道在 z=0 平面内几乎永远碰不到圆周上的球。
 */

const DISC_HEIGHT = 0.38;

/** 与 WhiteBullet / 轨道 BallCollider 质量一致，用于冲量公式 */
const M_WHITE = 3.5;
const M_ORBIT = 0.55;
const RESTITUTION = 0.34;
/** 防止数值异常导致单帧冲量爆炸 */
const MAX_IMPULSE_MAG = 9;

export interface CarouselHandle {
  /** 仍在轨道上的球里，世界坐标 x 最大的一侧（最靠近 +X 发射口），用于瞄准 */
  getStrikeSlotIndex: () => number | null;
  getBallWorldPosition: (slotIndex: number) => [number, number, number] | null;
  /** 预测若干秒后的球心位置（用于提前量瞄准） */
  getBallWorldPositionLead: (slotIndex: number, leadSeconds: number) => [number, number, number] | null;
}

export interface CarouselProps {
  slotCount: number;
  numbers: number[];
  variant: "red" | "blue";
  ballColor: string;
  centerY?: number;
  rimRadius?: number;
  omega?: number;
  paused?: boolean;
  /** 白球击中轨道红/蓝球后回调（用于发射节奏：上一发结算后再打下一发） */
  onWhiteBulletStrike?: () => void;
  onFreedBallCollide?: () => void;
}

type Freed = {
  key: string;
  idKey: string;
  number: number;
  position: [number, number, number];
  impulse: { x: number; y: number; z: number };
};

function slotId(variant: "red" | "blue", slot: number): string {
  return `${variant}-orbit-${slot}`;
}

export const Carousel = forwardRef<CarouselHandle, CarouselProps>(function Carousel(
  {
    slotCount,
    numbers,
    variant,
    ballColor,
    centerY = 1.35,
    rimRadius = 7.4,
    omega = 0.62,
    paused = false,
    onWhiteBulletStrike,
    onFreedBallCollide,
  },
  ref,
) {
  const angleRef = useRef(0);
  const kinTrans = useRef(new Vector3(0, 0, 0));
  const kinQuat = useRef(new THREE.Quaternion());
  const yAxis = useRef(new THREE.Vector3(0, 1, 0));
  const bodyMap = useRef<Map<number, RapierRigidBody | null>>(new Map());
  const [orbitSlots, setOrbitSlots] = useState<number[]>(() => Array.from({ length: slotCount }, (_, i) => i));
  const [freed, setFreed] = useState<Freed[]>([]);

  const discTopY = centerY + DISC_HEIGHT / 2;
  const ballY = discTopY + BALL_RADIUS + 0.04;

  const slotPhase = useCallback((slotIndex: number) => (2 * Math.PI * slotIndex) / slotCount, [slotCount]);

  const computePos = useCallback(
    (slotIndex: number, angle: number): [number, number, number] => {
      const th = angle + slotPhase(slotIndex);
      return [rimRadius * Math.cos(th), ballY, rimRadius * Math.sin(th)];
    },
    [ballY, rimRadius, slotPhase],
  );

  const registerBody = useCallback((slotIndex: number, body: RapierRigidBody | null) => {
    bodyMap.current.set(slotIndex, body);
  }, []);

  const getStrikeSlotIndex = useCallback((): number | null => {
    if (orbitSlots.length === 0) return null;
    let best = orbitSlots[0]!;
    let bestX = Number.NEGATIVE_INFINITY;
    const ang = angleRef.current;
    for (const slot of orbitSlots) {
      const th = ang + slotPhase(slot);
      const x = rimRadius * Math.cos(th);
      if (x > bestX) {
        bestX = x;
        best = slot;
      }
    }
    return best;
  }, [orbitSlots, rimRadius, slotPhase]);

  const getBallWorldPosition = useCallback(
    (slotIndex: number): [number, number, number] | null => {
      if (!orbitSlots.includes(slotIndex)) return null;
      return computePos(slotIndex, angleRef.current);
    },
    [computePos, orbitSlots],
  );

  const getBallWorldPositionLead = useCallback(
    (slotIndex: number, leadSeconds: number): [number, number, number] | null => {
      if (!orbitSlots.includes(slotIndex)) return null;
      const lead = Number.isFinite(leadSeconds) ? Math.max(0, Math.min(leadSeconds, 1.25)) : 0;
      const ang = angleRef.current + (paused ? 0 : omega * lead);
      return computePos(slotIndex, ang);
    },
    [computePos, omega, orbitSlots, paused],
  );

  useImperativeHandle(
    ref,
    () => ({
      getStrikeSlotIndex,
      getBallWorldPosition,
      getBallWorldPositionLead,
    }),
    [getBallWorldPosition, getBallWorldPositionLead, getStrikeSlotIndex],
  );

  useFrame((_, delta) => {
    if (!paused) {
      angleRef.current += omega * delta;
    }
    const ang = angleRef.current;
    const t = kinTrans.current;
    const q = kinQuat.current;
    const axis = yAxis.current;
    for (const slot of orbitSlots) {
      const body = bodyMap.current.get(slot);
      if (!body) continue;
      const [x, y, z] = computePos(slot, ang);
      t.x = x;
      t.y = y;
      t.z = z;
      body.setNextKinematicTranslation(t);
      q.setFromAxisAngle(axis, ang + slotPhase(slot) + Math.PI / 2);
      body.setNextKinematicRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
    }
  });

  const onHit =
    (slot: number) =>
    (e: CollisionEnterPayload) => {
      const otherUd = e.other.rigidBodyObject?.userData as { kind?: string } | undefined;
      if (otherUd?.kind !== "whiteBullet") return;

      const selfRb = e.target.rigidBody;
      const otherRb = e.other.rigidBody;
      if (!selfRb || !otherRb) return;

      const t = selfRb.translation();
      const pos: [number, number, number] = [t.x, t.y, t.z];

      const wLin = otherRb.linvel();
      /** 轨道球瞬时线速度：绕 Y 轴 ω，v = (-ωz, 0, ωx) */
      const vrdx = -omega * pos[2];
      const vrdy = 0;
      const vrdz = omega * pos[0];

      const nv = e.manifold.normal();
      let nx = nv.x;
      let ny = nv.y;
      let nz = nv.z;
      if (e.flipped) {
        nx = -nx;
        ny = -ny;
        nz = -nz;
      }
      let nlen = Math.hypot(nx, ny, nz);
      if (nlen < 1e-8) {
        const wt = otherRb.translation();
        nx = pos[0] - wt.x;
        ny = pos[1] - wt.y;
        nz = pos[2] - wt.z;
        nlen = Math.hypot(nx, ny, nz);
      }
      if (nlen < 1e-8) {
        nx = 1;
        ny = 0;
        nz = 0;
        nlen = 1;
      }
      nx /= nlen;
      ny /= nlen;
      nz /= nlen;

      const rvx = wLin.x - vrdx;
      const rvy = wLin.y - vrdy;
      const rvz = wLin.z - vrdz;
      const vrDotN = rvx * nx + rvy * ny + rvz * nz;

      let j = 0;
      if (vrDotN < -1e-5) {
        const invSum = 1 / M_WHITE + 1 / M_ORBIT;
        j = (-(1 + RESTITUTION) * vrDotN) / invSum;
        j = Math.min(Math.max(j, 0), MAX_IMPULSE_MAG);
      }

      const ix = j * nx;
      const iy = j * ny;
      const iz = j * nz;

      const n = numbers[slot] ?? slot + 1;
      const idKey = `fallen-${variant}-${slot}-${n}-${Date.now()}`;
      setFreed((prev) => [...prev, { key: idKey, idKey, number: n, position: pos, impulse: { x: ix, y: iy, z: iz } }]);
      setOrbitSlots((prev) => prev.filter((s) => s !== slot));
      bodyMap.current.delete(slot);
      onWhiteBulletStrike?.();
    };

  return (
    <group>
      <mesh position={[0, centerY, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[rimRadius + 0.35, rimRadius + 0.35, DISC_HEIGHT, 64]} />
        <meshStandardMaterial color="#3e4555" roughness={0.78} metalness={0.2} />
      </mesh>

      {orbitSlots.map((slot) => {
        const n = numbers[slot] ?? slot + 1;
        const id = slotId(variant, slot);
        const [x, y, z] = computePos(slot, angleRef.current);
        return (
          <RigidBody
            key={id}
            ref={(b) => registerBody(slot, b)}
            type="kinematicPosition"
            position={[x, y, z]}
            colliders={false}
            friction={0.55}
            restitution={0.12}
            ccd
            onCollisionEnter={onHit(slot)}
            userData={{ idKey: id, number: n, variant, kind: "carouselOrbitBall" }}
          >
            <BallCollider args={[BALL_RADIUS]} mass={0.55} restitution={0.22} friction={0.55} />
            <BallMesh number={n} color={ballColor} variant={variant} />
          </RigidBody>
        );
      })}

      {freed.map((f) => (
        <Ball3D
          key={f.key}
          idKey={f.idKey}
          number={f.number}
          color={ballColor}
          variant={variant}
          position={f.position}
          initialImpulse={f.impulse}
          onCollide={() => onFreedBallCollide?.()}
        />
      ))}
    </group>
  );
});
