import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useAchievementStore } from "@/store/useAchievementStore";
import { playPrizeWin } from "@/utils/sound";

/**
 * 成就解锁：全屏庆祝层 + 自动轮播队列。
 */
export function AchievementCelebration() {
  const queue = useAchievementStore((s) => s.celebrationQueue);
  const dismissCelebration = useAchievementStore((s) => s.dismissCelebration);
  const current = queue[0];
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!current) return;
    void playPrizeWin();
    const el = panelRef.current;
    if (!el) return;
    gsap.fromTo(
      el,
      { scale: 0.75, opacity: 0, y: 24 },
      { scale: 1, opacity: 1, y: 0, duration: 0.45, ease: "back.out(1.4)" },
    );
    const t = window.setTimeout(() => dismissCelebration(), 4800);
    return () => window.clearTimeout(t);
  }, [current, dismissCelebration]);

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <button
        type="button"
        aria-label="关闭成就提示"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={() => dismissCelebration()}
      />
      <div
        ref={panelRef}
        className="pointer-events-auto relative z-[1] max-w-md overflow-hidden rounded-3xl border border-amber-400/50 bg-gradient-to-br from-amber-950/95 via-slate-900/98 to-amber-950/95 p-8 shadow-[0_0_80px_rgba(251,191,36,0.35)]"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-amber-600/15 blur-3xl" />
        <div className="relative text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.4em] text-amber-200/90">成就解锁</div>
          <h3 className="mt-3 text-2xl font-black text-white">{current.name}</h3>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">{current.description}</p>
          <div className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-3 text-amber-100">
            <span className="text-sm text-amber-200/90">成就奖励 </span>
            <span className="text-xl font-bold text-amber-200">+¥{current.rewardYuan.toLocaleString("zh-CN")}</span>
          </div>
          <p className="mt-4 text-xs text-slate-500">奖励已自动加入余额 · {queue.length > 1 ? `还有 ${queue.length - 1} 项` : "点击任意处继续"}</p>
        </div>
      </div>
    </div>
  );
}
