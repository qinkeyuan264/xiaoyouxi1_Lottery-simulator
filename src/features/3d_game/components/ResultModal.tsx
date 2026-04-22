import { Modal } from "@/components/ui/Modal";
import { Ball } from "@/features/dcb/components/Ball";
import type { Digits, PlayMode } from "@/features/3d_game/hooks/use3DGame";

function modeLabel(mode: PlayMode) {
  if (mode === "single") return "单选";
  if (mode === "group3") return "组选3";
  return "组选6";
}

export function ResultModal({
  open,
  mode,
  user,
  draw,
  prizeYuan,
  onConfirm,
}: {
  open: boolean;
  mode: PlayMode;
  user: Digits;
  draw: Digits;
  prizeYuan: number;
  onConfirm: () => void;
}) {
  return (
    <Modal open={open} title="福彩 3D 结果" onConfirm={onConfirm} confirmText="收下结果">
      <div className="space-y-5">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-semibold text-slate-300">本期开奖</div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {draw.map((n, idx) => (
              <div key={`d-${idx}`} className="pointer-events-none">
                <Ball label={n.toString()} variant={idx === 2 ? "blue" : "red"} selected onClick={() => undefined} />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-300">我的选号</div>
            <div className="text-xs text-slate-400">玩法：{modeLabel(mode)}</div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {user.map((n, idx) => (
              <div key={`u-${idx}`} className="pointer-events-none">
                <Ball label={n.toString()} variant={idx === 2 ? "blue" : "red"} selected onClick={() => undefined} />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-400/10 via-slate-900/30 to-slate-900/30 p-4">
          <div className="text-2xl font-bold text-amber-200">{prizeYuan > 0 ? "恭喜中奖" : "未中奖"}</div>
          <div className="mt-2 text-lg text-slate-200">
            奖金：<span className="font-semibold text-emerald-300">¥{prizeYuan.toLocaleString("zh-CN")}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

