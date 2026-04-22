import { Text } from "@react-three/drei";
import gsap from "gsap";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export function SlotReel({
  targetNumber,
  isSpinning,
  spinDelay = 0,
  stopAfterSeconds = 2,
  digitHeight = 1.25,
  onStopped,
}: {
  targetNumber: number;
  isSpinning: boolean;
  spinDelay?: number;
  /** 从开始到停靠的总时长（秒） */
  stopAfterSeconds?: number;
  digitHeight?: number;
  /** 停稳回调（用于“等所有滚轮停下再公布结果”） */
  onStopped?: () => void;
}) {
  const reelRef = useRef<THREE.Group>(null);
  const spinTween = useRef<gsap.core.Tween | null>(null);
  const stopTween = useRef<gsap.core.Tween | null>(null);

  const digits = useMemo(() => Array.from({ length: 10 }, (_, i) => i), []);
  const step = digitHeight;
  const cycle = step * digits.length;
  const centerOffset = ((digits.length - 1) * step) / 2; // 让数字条在 y=0 附近居中显示

  useEffect(() => {
    const g = reelRef.current;
    if (!g) return;

    if (isSpinning) {
      // 启动连续高速滚动（平面老虎机：沿 Y 方向滚动）
      if (spinTween.current) spinTween.current.kill();
      if (stopTween.current) {
        stopTween.current.kill();
        stopTween.current = null;
      }
      // 每次开始滚动都把位置拉回到一个稳定范围内，避免“越滚越远”导致跑出窗口
      g.position.y = gsap.utils.wrap(-cycle, 0, g.position.y);
      spinTween.current = gsap.to(g.position, {
        y: `-=${cycle}`,
        duration: 0.35,
        ease: "none",
        repeat: -1,
        delay: spinDelay,
        modifiers: {
          y: (v) => `${gsap.utils.wrap(-cycle, 0, parseFloat(v))}`,
        },
      });
      return;
    }

    // 停止并卡位：先结束连续滚动，再用 back.out 回弹停到目标数字
    if (spinTween.current) {
      spinTween.current.kill();
      spinTween.current = null;
    }

    const spins = 8;
    const base = targetNumber * step - centerOffset;
    const baseWrapped = gsap.utils.wrap(-cycle, 0, base);
    const targetY = baseWrapped - spins * cycle;
    if (stopTween.current) stopTween.current.kill();
    stopTween.current = gsap.to(g.position, {
      y: targetY,
      duration: Math.max(1.2, stopAfterSeconds),
      ease: "back.out(1.6)",
      delay: spinDelay,
      onComplete: () => {
        stopTween.current = null;
        // 确保停在整格
        g.position.y = baseWrapped;
        onStopped?.();
      },
    });
  }, [centerOffset, cycle, isSpinning, onStopped, spinDelay, step, stopAfterSeconds, targetNumber]);

  return (
    <group>
      {/* 数字条：重复两遍防止滚动穿帮 */}
      <group ref={reelRef} position={[0, 0, 0]}>
        {[0, 1].map((rep) => (
          <group key={`rep-${rep}`} position={[0, centerOffset - rep * cycle, 0]}>
            {digits.map((d) => (
              <group key={`digit-${rep}-${d}`} position={[0, -d * digitHeight, 0]}>
                <Text
                  fontSize={1.35}
                  color="#ffffff"
                  anchorX="center"
                  anchorY="middle"
                  outlineWidth={0.08}
                  outlineColor="rgba(0,0,0,0.75)"
                >
                  {d}
                </Text>
              </group>
            ))}
          </group>
        ))}
      </group>
    </group>
  );
}

