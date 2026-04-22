import { useCallback, useMemo, useState } from "react";
import { AppButton } from "@/components/ui/Button";
import { SelectionPanel } from "@/features/3d_game/components/SelectionPanel";
import { ResultModal } from "@/features/3d_game/components/ResultModal";
import { SlotMachineScene } from "@/features/3d_game/slot_scenes/SlotMachineScene";
import { use3DGame } from "@/features/3d_game/hooks/use3DGame";

export function ThreeDGamePage() {
  const { playMode, selected, draw, spinning, toast, clearToast, startRound, settle, resetRound } = use3DGame();

  const [showModal, setShowModal] = useState(false);
  const [prizeYuan, setPrizeYuan] = useState(0);

  const canShowModal = useMemo(() => showModal && draw !== null, [draw, showModal]);

  const onStart = useCallback(() => {
    const d = startRound();
    if (!d) return;
    setShowModal(false);
    setPrizeYuan(0);
  }, [startRound]);

  const onFinished = useCallback(async () => {
    if (!draw) return;
    const p = await settle(draw);
    setPrizeYuan(p);
    setShowModal(true);
  }, [draw, settle]);

  const onConfirm = useCallback(() => {
    setShowModal(false);
    resetRound();
  }, [resetRound]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/70 via-slate-900/30 to-slate-950/70 p-7 shadow-xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">彩票模拟器 · 福彩 3D</h2>
            <p className="mt-2 text-sm text-slate-300">三位数字开奖（000-999），使用平面老虎机滚轮动画表现。</p>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300">
              当前选号：<span className="font-bold text-amber-200">{selected.join("")}</span>
            </div>
            <AppButton type="button" variant="ghost" onClick={() => resetRound()}>
              重置
            </AppButton>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <div className="space-y-4">
          <SelectionPanel onStart={onStart} />
          {toast ? (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              <div className="flex items-center justify-between gap-3">
                <span>{toast}</span>
                <button type="button" className="text-xs text-amber-200/90 underline" onClick={() => clearToast()}>
                  关闭
                </button>
              </div>
            </div>
          ) : null}
        </div>
        <SlotMachineScene draw={draw} spinning={spinning} onFinished={onFinished} />
      </div>

      {draw ? (
        <ResultModal open={canShowModal} mode={playMode} user={selected} draw={draw} prizeYuan={prizeYuan} onConfirm={onConfirm} />
      ) : null}
    </div>
  );
}

