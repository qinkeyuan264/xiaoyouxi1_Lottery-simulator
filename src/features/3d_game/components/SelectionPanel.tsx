import { Ball } from "@/features/dcb/components/Ball";
import { use3DGame, type PlayMode } from "@/features/3d_game/hooks/use3DGame";

function ModeTab({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
        active
          ? "border border-amber-400/40 bg-amber-400/15 text-amber-200"
          : "border border-white/10 bg-white/5 text-slate-200 hover:border-white/20"
      }`}
    >
      {label}
    </button>
  );
}

function ModeLabel(mode: PlayMode) {
  if (mode === "single") return "单选";
  if (mode === "group3") return "组选3";
  return "组选6";
}

export function SelectionPanel({ onStart }: { onStart: () => void }) {
  const { playMode, selected, setPlayMode, setDigit, payoutLabel } = use3DGame();
  const digits = Array.from({ length: 10 }, (_, i) => i);

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-6 shadow-inner">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-lg font-bold text-white">福彩 3D</div>
        <div className="ml-auto text-sm text-slate-300">
          玩法：<span className="font-semibold text-amber-200">{payoutLabel}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <ModeTab active={playMode === "single"} label="单选" onClick={() => setPlayMode("single")} />
        <ModeTab active={playMode === "group3"} label="组选3" onClick={() => setPlayMode("group3")} />
        <ModeTab active={playMode === "group6"} label="组选6" onClick={() => setPlayMode("group6")} />
      </div>

      <div className="mt-5 grid gap-5">
        {(["百位", "十位", "个位"] as const).map((posLabel, pos) => (
          <div key={posLabel}>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-200">
                {posLabel}（当前：<span className="text-amber-200">{selected[pos].toString()}</span>）
              </div>
              <div className="text-xs text-slate-400">
                {ModeLabel(playMode)} 选号：{selected.map((x) => x.toString()).join("")}
              </div>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-2">
              {digits.map((d) => (
                <Ball
                  key={`${posLabel}-${d}`}
                  label={d.toString()}
                  variant={pos === 2 ? "blue" : "red"}
                  selected={selected[pos] === d}
                  onClick={() => setDigit(pos as 0 | 1 | 2, d)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onStart}
        className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 px-6 py-3 text-sm font-bold text-slate-900 shadow-[0_10px_28px_rgba(244,208,63,0.35)] transition hover:brightness-110 active:translate-y-px"
      >
        立即开奖（¥2）
      </button>
    </div>
  );
}

