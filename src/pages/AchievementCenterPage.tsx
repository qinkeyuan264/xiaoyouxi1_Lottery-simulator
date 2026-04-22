import { Link } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { ACHIEVEMENTS } from "@/achievements/definitions";
import { selectUnlockedIds, useAchievementStore } from "@/store/useAchievementStore";
import { playButtonClick } from "@/utils/sound";

/**
 * 成就中心：展示全部成就、解锁状态与奖励金额。
 *（当前版本：仍禁用自动评估，先确保页面稳定打开）
 */
export function AchievementCenterPage() {
  // selectUnlockedIds 每次返回新数组，若直接传给 useStore 会用 Object.is 比较，导致无限重渲染与 #185
  const unlockedIds = useAchievementStore(useShallow(selectUnlockedIds));
  const unlockedSet = new Set(unlockedIds);
  const total = ACHIEVEMENTS.length;
  const done = unlockedIds.length;

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/40 to-slate-950/80 p-8 shadow-xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">成就中心</h2>
            <p className="mt-2 max-w-2xl text-slate-300">
              在资金耗尽之前，尽量解锁全部成就。每项成就均有名称、说明与一次性资金奖励；奖励在解锁时自动入账。
            </p>
          </div>
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-3 text-right">
            <div className="text-xs text-amber-200/80">收集进度</div>
            <div className="text-2xl font-bold text-amber-100">
              {done} / {total}
            </div>
          </div>
        </div>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-500"
            style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {ACHIEVEMENTS.map((a) => {
          const ok = unlockedSet.has(a.id);
          return (
            <div
              key={a.id}
              className={`rounded-2xl border p-6 shadow-lg transition ${
                ok
                  ? "border-amber-400/35 bg-gradient-to-br from-amber-950/40 to-slate-900/50"
                  : "border-white/10 bg-white/[0.03] opacity-80"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        ok ? "bg-emerald-500/25 text-emerald-200" : "bg-slate-600/40 text-slate-400"
                      }`}
                    >
                      {ok ? "已解锁" : "未解锁"}
                    </span>
                  </div>
                  <h3 className={`mt-2 text-lg font-bold ${ok ? "text-amber-100" : "text-slate-400"}`}>{a.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{a.description}</p>
                </div>
                <div
                  className={`shrink-0 rounded-xl border px-3 py-2 text-right text-sm font-semibold ${
                    ok ? "border-amber-400/40 text-amber-200" : "border-white/10 text-slate-500"
                  }`}
                >
                  +¥{Number(a.rewardYuan ?? 0).toLocaleString("zh-CN")}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center">
        <Link
          to="/"
          onClick={() => void playButtonClick()}
          className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-8 py-3 text-sm font-semibold text-white/90 transition hover:border-white/25 hover:bg-white/10"
        >
          返回大厅
        </Link>
      </div>
    </div>
  );
}
