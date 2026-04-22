import { CameraControls, Environment } from "@react-three/drei";
import type { CameraControls as CameraControlsType } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody, type IntersectionEnterPayload } from "@react-three/rapier";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { LShapedTube } from "@/features/dcb/components/lottery_scenes/LShapedTube";
import { RotatingCarousel, type RotatingCarouselHandle } from "@/features/dcb/components/lottery_scenes/RotatingCarousel";

const RED_NUMBERS = Array.from({ length: 33 }, (_, i) => i + 1);

interface RedBallDrawingSceneProps {
  onComplete: (winningReds: number[]) => void;
}

function RedCinematicIntro({ controlsRef }: { controlsRef: React.RefObject<CameraControlsType | null> }) {
  useEffect(() => {
    const c = controlsRef.current;
    if (!c) return;
    let alive = true;
    void (async () => {
      await c.setLookAt(0, 6, 22, 0, 0.5, 0, false);
      if (!alive) return;
      await c.setLookAt(0, 4.5, 14, 0, 0.4, 0, true);
    })();
    return () => {
      alive = false;
    };
  }, [controlsRef]);
  return null;
}

function RedDrawingWorld({ onComplete }: RedBallDrawingSceneProps) {
  const controlsRef = useRef<CameraControlsType>(null);
  const phaseDoneRef = useRef(false);
  const carouselRef = useRef<RotatingCarouselHandle>(null);
  const armTimerRef = useRef<number | null>(null);
  const [paused, setPaused] = useState(false);
  const valveOpenCountRef = useRef(0);
  const valveNumbersRef = useRef<number[]>([]);
  const finishTimerRef = useRef<number | null>(null);

  const winSetRef = useRef<Set<number>>(new Set());

  const scheduleArm = useCallback(() => {
    if (phaseDoneRef.current) return;
    if (armTimerRef.current != null) window.clearTimeout(armTimerRef.current);
    const delay = 1800 + Math.random() * 1800;
    armTimerRef.current = window.setTimeout(() => {
      armTimerRef.current = null;
      carouselRef.current?.armDrop();
      scheduleArm();
    }, delay);
  }, []);

  useEffect(() => {
    scheduleArm();
    return () => {
      if (armTimerRef.current != null) window.clearTimeout(armTimerRef.current);
    };
  }, [scheduleArm]);

  const onTubeCollect = useCallback((e: IntersectionEnterPayload) => {
    const obj = e.other.rigidBodyObject;
    if (!obj) return;
    const ud = obj.userData as { kind?: string; number?: number };
    if (ud.kind !== "numberedBall" || typeof ud.number !== "number") return;
    const n = ud.number;
    if (winSetRef.current.has(n)) return;
    winSetRef.current.add(n);
  }, []);

  const onValveOpen = useCallback(
    (n: number) => {
      if (phaseDoneRef.current) return;
      valveOpenCountRef.current += 1;

      if (!valveNumbersRef.current.includes(n) && valveNumbersRef.current.length < 6) {
        valveNumbersRef.current = [...valveNumbersRef.current, n];
      }

      if (valveOpenCountRef.current >= 6) {
        phaseDoneRef.current = true;
        setPaused(true);
        if (armTimerRef.current != null) {
          window.clearTimeout(armTimerRef.current);
          armTimerRef.current = null;
        }
        if (finishTimerRef.current != null) window.clearTimeout(finishTimerRef.current);
        // 第 6 个球落下后给它一点时间“走镜头”
        finishTimerRef.current = window.setTimeout(() => {
          finishTimerRef.current = null;
          const final = valveNumbersRef.current.slice(0, 6);
          onComplete(final);
        }, 2200);
      }
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (finishTimerRef.current != null) window.clearTimeout(finishTimerRef.current);
    };
  }, []);

  return (
    <>
      <color attach="background" args={["#05070f"]} />
      <ambientLight intensity={0.42} />
      <spotLight
        castShadow
        position={[0, 16, 18]}
        angle={0.5}
        penumbra={0.55}
        intensity={5}
        color="#ffe6d5"
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[-10, 12, -6]} intensity={0.35} color="#ffd0d0" />

      <CameraControls
        ref={controlsRef}
        makeDefault
        minDistance={8}
        maxDistance={32}
        maxPolarAngle={Math.PI / 2 + 0.15}
      />
      <RedCinematicIntro controlsRef={controlsRef} />

      <RigidBody type="fixed" friction={0.85} restitution={0.02}>
        <mesh receiveShadow position={[0, -4.2, 0]}>
          <boxGeometry args={[80, 1, 80]} />
          <meshStandardMaterial color="#141824" roughness={0.92} metalness={0.08} />
        </mesh>
      </RigidBody>

      <LShapedTube
        inlet={[0, 5, 10]}
        outlet={[0, -2, 15]}
        tubeRadius={0.9}
        onCollect={onTubeCollect}
      />

      <RotatingCarousel
        ref={carouselRef}
        numbers={RED_NUMBERS}
        variant="red"
        ballColor="#c62828"
        center={[0, 5, 0]}
        radius={10}
        omega={0.48}
        inlet={[0, 5, 10]}
        inletThreshold={0.08}
        paused={paused}
        onValveOpen={onValveOpen}
      />

      <Environment preset="sunset" environmentIntensity={0.9} />
    </>
  );
}

export function RedBallDrawingScene({ onComplete }: RedBallDrawingSceneProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 h-screen w-screen">
      <Canvas
        className="pointer-events-auto h-full w-full touch-none"
        shadows
        gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <Suspense fallback={null}>
          <Physics gravity={[0, -12, 0]} timeStep="vary" numSolverIterations={4}>
            <RedDrawingWorld onComplete={onComplete} />
          </Physics>
        </Suspense>
      </Canvas>
    </div>
  );
}
