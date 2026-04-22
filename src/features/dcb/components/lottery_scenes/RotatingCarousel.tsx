import { useFrame } from "@react-three/fiber";
import { BallCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { RigidBodyType } from "@dimforge/rapier3d-compat";
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { BallMesh, BALL_RADIUS } from "@/features/dcb/components/lottery_scenes/Ball3D";

export interface RotatingCarouselHandle {
  armDrop: () => void;
  reset: () => void;
}

export interface RotatingCarouselProps {
  numbers: number[];
  variant: "red" | "blue";
  ballColor: string;
  /** 轮盘中心（与用户方案一致：默认 [0,5,0]） */
  center?: [number, number, number];
  /** 轮盘半径（默认 10） */
  radius?: number;
  /** 角速度（弧度/秒） */
  omega?: number;
  /** 管道入口点：阀门判定与释放对齐点 */
  inlet?: [number, number, number];
  /** 命中阈值：越小越“卡点” */
  inletThreshold?: number;
  /** 阀门打开后回调（用于父组件“打开 6 次就直接判定”） */
  onValveOpen?: (n: number) => void;
  /** 暂停旋转（开奖结束） */
  paused?: boolean;
  /** 某球释放时回调（可用于调试/节奏控制） */
  onDrop?: (n: number) => void;
}

type BallState = {
  idKey: string;
  n: number;
  baseAngle: number;
  dynamic: boolean;
};

/**
 * 运动学轮盘：未释放的球使用 kinematicPosition 跟随旋转；
 * armed 时当某球对齐入口点则切换为 dynamic，自由落入管道。
 */
export const RotatingCarousel = forwardRef<RotatingCarouselHandle, RotatingCarouselProps>(function RotatingCarousel(
  {
    numbers,
    variant,
    ballColor,
    center = [0, 5, 0],
    radius = 10,
    omega = 0.55,
    inlet = [0, 5, 10],
    inletThreshold = 0.08,
    paused = false,
    onValveOpen,
    onDrop,
  },
  ref,
) {
  const [balls, setBalls] = useState<BallState[]>(() => {
    const base = numbers.map((n, i) => {
      const a = (2 * Math.PI * i) / numbers.length;
      return { idKey: `${variant}-orbit-${i}-${n}`, n, baseAngle: a, dynamic: false } as BallState;
    });
    return base;
  });

  const centerV = useMemo(() => new THREE.Vector3(...center), [center]);
  const inletV = useMemo(() => new THREE.Vector3(...inlet), [inlet]);

  const rotationRef = useRef(0);
  const armedRef = useRef(false);
  const droppingRef = useRef(false);

  const rbRefs = useRef<Array<RapierRigidBody | null>>([]);
  const setRbRef = useCallback((idx: number, body: RapierRigidBody | null) => {
    rbRefs.current[idx] = body;
  }, []);

  const armDrop = useCallback(() => {
    armedRef.current = true;
  }, []);

  const reset = useCallback(() => {
    rotationRef.current = 0;
    armedRef.current = false;
    droppingRef.current = false;
    setBalls((prev) => prev.map((b, i) => ({ ...b, dynamic: false, idKey: `${variant}-orbit-${i}-${b.n}-${Date.now()}` })));
  }, [variant]);

  useImperativeHandle(ref, () => ({ armDrop, reset }), [armDrop, reset]);

  useFrame((_, dt) => {
    if (!paused) rotationRef.current += omega * dt;
    const rot = rotationRef.current;

    // 防止同一帧里多球同时满足阈值
    if (droppingRef.current) return;

    for (let i = 0; i < balls.length; i++) {
      const b = balls[i]!;
      if (b.dynamic) continue;
      const body = rbRefs.current[i];
      if (!body) continue;

      const th = rot + b.baseAngle;
      const x = centerV.x + radius * Math.sin(th);
      const y = centerV.y;
      const z = centerV.z + radius * Math.cos(th);

      body.setNextKinematicTranslation({ x, y, z });

      if (!armedRef.current) continue;

      const dx = x - inletV.x;
      const dz = z - inletV.z;
      // 只按 XZ 平面对齐判定，避免“高度正常但还没到入口就释放”
      const d = Math.hypot(dx, dz);
      // 必须落到入口正中间（极小阈值）才打开阀门
      if (d > inletThreshold) continue;

      armedRef.current = false;
      droppingRef.current = true;

      // 将球“阀门打开”：瞬间切换 dynamic，清除速度，靠重力垂直落入管道
      body.setNextKinematicTranslation({ x: inletV.x, y: inletV.y, z: inletV.z });
      body.setBodyType(RigidBodyType.Dynamic, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);

      setBalls((prev) => {
        const next = [...prev];
        next[i] = { ...next[i]!, dynamic: true };
        return next;
      });

      onValveOpen?.(b.n);
      onDrop?.(b.n);

      // 下一帧允许再次 drop（由父组件 armDrop 再开启）
      requestAnimationFrame(() => {
        droppingRef.current = false;
      });
      return;
    }
  });

  return (
    <group>
      {balls.map((b, i) => (
        <RigidBody
          key={b.idKey}
          ref={(rb) => setRbRef(i, rb)}
          type={b.dynamic ? "dynamic" : "kinematicPosition"}
          colliders={false}
          position={[centerV.x, centerV.y, centerV.z + radius]}
          gravityScale={1}
          linearDamping={0.15}
          angularDamping={0.25}
          canSleep
          ccd={b.dynamic}
          userData={{ idKey: b.idKey, number: b.n, variant, kind: "numberedBall" }}
        >
          {/* 未释放球设为 sensor：不产生推力，避免“后球顶飞前球” */}
          <BallCollider sensor={!b.dynamic} args={[BALL_RADIUS]} mass={0.9} restitution={0.12} friction={0.45} />
          <BallMesh number={b.n} color={ballColor} variant={variant} />
        </RigidBody>
      ))}
    </group>
  );
});

