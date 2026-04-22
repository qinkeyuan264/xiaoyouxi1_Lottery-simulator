import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";

export function SlotMachineScene({
  draw,
  spinning,
  onFinished,
}: {
  draw: [number, number, number] | null;
  spinning: boolean;
  onFinished: () => void;
}) {
  const [localSpinning, setLocalSpinning] = useState(false);
  const finishedTimerRef = useRef<number | null>(null);
  const stopCountRef = useRef(0);

  const reelsOuterRef = useRef<Array<HTMLDivElement | null>>([null, null, null]);
  const reelsInnerRef = useRef<Array<HTMLDivElement | null>>([null, null, null]);
  const timelinesRef = useRef<Array<gsap.core.Timeline | null>>([null, null, null]);

  const digits = useMemo(() => Array.from({ length: 10 }, (_, i) => i), []);
  const digitHeight = 64; // px
  const windowHeight = 160; // px
  const centerOffset = windowHeight / 2 - digitHeight / 2; // 让“目标数字”落在中线
  const repeatRounds = 220; // 数字段长度（越大越“PPT”且永不空白）
  const strip = useMemo(() => {
    const arr: number[] = [];
    for (let r = 0; r < repeatRounds; r += 1) for (const d of digits) arr.push(d);
    return arr;
  }, [digits, repeatRounds]);

  useEffect(() => {
    if (!spinning || !draw) return;
    setLocalSpinning(true);
    stopCountRef.current = 0;
    if (finishedTimerRef.current != null) window.clearTimeout(finishedTimerRef.current);

    // 2D 老虎机（PPT 风格）：长数字带从上往下滑，窗口裁切
    const delays = [0, 0.55, 1.1];
    const accelSeconds = 0.8;
    const cruiseSeconds = 1.2;
    const decelSeconds = 1.05;
    const pxPerSecondMin = 320; // 初速（慢）
    const pxPerSecondMax = 1650; // 最高速（调满一点）

    const cyclePx = digitHeight * digits.length;

    for (let i = 0; i < 3; i += 1) {
      const inner = reelsInnerRef.current[i];
      if (!inner) continue;

      timelinesRef.current[i]?.kill();
      timelinesRef.current[i] = null;

      // 方向：数字带整体“向下滑”（y 递增），窗口里看到数字从上往下滚
      // 做法：先选一个“目标轮次”，再把起始轮次放在它下面若干圈（index 更大 => y 更小 => 数字段在窗口上方）
      // 这样 y 递增时，数字会从上往下不断滑入窗口，直到最后停到目标数字。
      const extraRounds = 12 + Math.floor(Math.random() * 14); // 12~25 圈（不确定性：多转圈数）
      const targetRoundMin = 20;
      const targetRoundMax = repeatRounds - (extraRounds + 20); // 预留空间，防止起始超出数字带末尾
      const targetRound =
        targetRoundMax > targetRoundMin
          ? targetRoundMin + Math.floor(Math.random() * (targetRoundMax - targetRoundMin))
          : targetRoundMin;

      const startRound = targetRound + extraRounds;
      const startDigit = Math.floor(Math.random() * 10);
      const startIndex = startRound * 10 + startDigit;
      const targetIndex = targetRound * 10 + draw[i];

      // 初始让数字带“在窗口上方一点点”，再往下滑进来
      const startY = centerOffset - startIndex * digitHeight - digitHeight * 3;
      const finalY = centerOffset - targetIndex * digitHeight;
      gsap.set(inner, { y: startY });

      // 预计在滚动阶段走过的距离（加速+匀速）用速度积分估算，再用 timeline 最后校准到 finalY
      const accelDist = ((pxPerSecondMin + pxPerSecondMax) / 2) * accelSeconds;
      const cruiseDist = pxPerSecondMax * cruiseSeconds;
      const plannedDist = accelDist + cruiseDist;

      // 确保距离足够“转很多圈”，不够就再加一段匀速距离
      const needDist = extraRounds * cyclePx;
      const extraCruise = Math.max(0, (needDist - plannedDist) / pxPerSecondMax);

      const tl = gsap.timeline({ delay: delays[i] });
      // 加速：速度由慢到快（等价于位置用 ease.in）
      tl.to(inner, {
        y: `+=${accelDist}`,
        duration: accelSeconds,
        ease: "power2.in",
      });
      // 匀速：最快速滑动
      tl.to(inner, {
        y: `+=${cruiseDist + pxPerSecondMax * extraCruise}`,
        duration: cruiseSeconds + extraCruise,
        ease: "none",
      });
      // 减速并精准停靠：直接拉到最终目标（保证 9 后无缝接 0 的视觉连续性）
      tl.to(inner, {
        y: finalY,
        duration: decelSeconds,
        ease: "power3.out",
        onComplete: () => {
          timelinesRef.current[i] = null;
          handleReelStopped();
        },
      });

      timelinesRef.current[i] = tl;
    }
    return () => {
      if (finishedTimerRef.current != null) window.clearTimeout(finishedTimerRef.current);
      for (let i = 0; i < 3; i += 1) {
        timelinesRef.current[i]?.kill();
        timelinesRef.current[i] = null;
      }
    };
  }, [centerOffset, digitHeight, draw, onFinished, spinning, strip.length, repeatRounds]);

  const handleReelStopped = () => {
    stopCountRef.current += 1;
    if (stopCountRef.current < 3) return;
    // 三个滚轮都停稳后再公布结果
    if (finishedTimerRef.current != null) window.clearTimeout(finishedTimerRef.current);
    finishedTimerRef.current = window.setTimeout(() => {
      finishedTimerRef.current = null;
      setLocalSpinning(false);
      onFinished();
    }, 1000);
  };

  const targets = useMemo(() => draw ?? [0, 0, 0], [draw]);

  return (
    <div className="relative h-[520px] w-full overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950/40 to-slate-900/30 shadow-xl">
      {/* 机身外框（纯平面） */}
      <div className="absolute inset-6 rounded-[28px] bg-gradient-to-br from-slate-800/60 via-slate-900/50 to-slate-950/70 shadow-[0_30px_90px_rgba(0,0,0,0.55)] ring-1 ring-white/10" />

      {/* 顶部灯条 */}
      <div className="absolute left-10 right-10 top-10 h-[10px] rounded-full bg-amber-300/40 shadow-[0_0_22px_rgba(251,191,36,0.55)]">
        <div className="h-full w-full rounded-full bg-gradient-to-r from-amber-200/10 via-amber-200/55 to-amber-200/10" />
      </div>

      {/* 拉杆 */}
      <div className="absolute right-10 top-[160px] flex flex-col items-center gap-2">
        <div className="h-[170px] w-[10px] rounded-full bg-slate-200/20 ring-1 ring-white/10" />
        <div className="h-8 w-8 rounded-full bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.55)] ring-1 ring-white/20" />
      </div>

      {/* 窗口 */}
      <div className="absolute left-10 right-24 top-[120px] rounded-3xl bg-slate-950/70 p-4 ring-1 ring-white/10">
        <div className="relative overflow-hidden rounded-2xl bg-black/60 ring-1 ring-white/10">
          {/* 玻璃高光 */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-transparent" />

          {/* 三列滚轮 */}
          <div
            ref={(el) => {
              reelsOuterRef.current[0] = el;
            }}
            className="relative flex items-center justify-center gap-6 px-8 py-10"
          >
            {[0, 1, 2].map((idx) => (
              <div
                key={`reel-${idx}`}
                className="relative h-[160px] w-[110px] overflow-hidden rounded-2xl bg-slate-950/60 ring-1 ring-white/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
              >
                {/* 中间高亮线 */}
                <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-white/10" />
                <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[70px] -translate-y-1/2 bg-gradient-to-b from-white/6 via-white/0 to-white/6" />

                {/* 数字带从窗口顶部开始，避免“高度不确定导致中心线对不准” */}
                <div className="absolute inset-0">
                  <div
                    ref={(el) => {
                      reelsInnerRef.current[idx] = el;
                    }}
                    style={{ transform: "translate3d(0,0,0)" }}
                    className="will-change-transform"
                  >
                    {/* “PPT 风格”长数字带：0-9 重复很多轮，永远不会空白 */}
                    {strip.map((d, j) => (
                      <div
                        key={`d-${idx}-${j}`}
                        className="flex h-[64px] items-center justify-center text-5xl font-black tracking-wider text-white [text-shadow:0_2px_0_rgba(0,0,0,0.7),0_0_18px_rgba(255,255,255,0.10)]"
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 提示 */}
        <div className="mt-4 flex items-center justify-between text-xs text-slate-300/80">
          <span>平面老虎机动画（非 3D），更稳定更清晰</span>
          <span className="tabular-nums">{localSpinning ? "SPINNING..." : draw ? `READY: ${targets.join("")}` : "READY"}</span>
        </div>
      </div>

      {/* 底座 */}
      <div className="absolute left-6 right-6 bottom-6 h-[70px] rounded-[28px] bg-slate-950/55 ring-1 ring-white/10" />
    </div>
  );
}

