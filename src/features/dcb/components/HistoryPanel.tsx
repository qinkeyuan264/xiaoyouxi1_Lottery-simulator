import type { DcbBetRecord } from "../types";

interface HistoryPanelProps {
  records: DcbBetRecord[];
}

const MOCK: DcbBetRecord[] = [
  {
    id: "demo-1",
    time: new Date(Date.now() - 86400000 * 3).toISOString(),
    userRed: [3, 7, 12, 18, 22, 31],
    userBlue: 9,
    drawRed: [3, 7, 12, 18, 22, 31],
    drawBlue: 9,
    prizeLevel: 1,
    prizeYuan: 5_000_000,
    won: true,
  },
  {
    id: "demo-2",
    time: new Date(Date.now() - 86400000 * 5).toISOString(),
    userRed: [2, 9, 15, 21, 28, 33],
    userBlue: 4,
    drawRed: [2, 9, 15, 21, 28, 30],
    drawBlue: 4,
    prizeLevel: 4,
    prizeYuan: 200,
    won: true,
  },
  {
    id: "demo-3",
    time: new Date(Date.now() - 86400000 * 7).toISOString(),
    userRed: [5, 8, 14, 19, 25, 30],
    userBlue: 12,
    drawRed: [1, 8, 14, 19, 25, 29],
    drawBlue: 11,
    prizeLevel: 0,
    prizeYuan: 0,
    won: false,
  },
];

function formatNums(nums: number[]) {
  return nums.map((n) => n.toString().padStart(2, "0")).join(" ");
}

/**
 * 历史记录：合并用户真实记录与演示静态数据，展示最近若干期。
 */
export function HistoryPanel({ records }: HistoryPanelProps) {
  const merged = [...records, ...MOCK];
  const seen = new Set<string>();
  const unique = merged.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
  const rows = unique.slice(0, 5);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">最近开奖 / 投注</h3>
        <span className="text-xs text-slate-500">演示数据 + 本地会话记录</span>
      </div>
      <div className="max-h-80 space-y-3 overflow-y-auto scroll-thin pr-1">
        {rows.map((r) => (
          <div
            key={r.id}
            className="rounded-xl border border-white/5 bg-white/[0.03] p-3 text-sm text-slate-200"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span>{new Date(r.time).toLocaleString("zh-CN")}</span>
              <span
                className={
                  r.won ? "rounded-full bg-amber-400/15 px-2 py-0.5 text-amber-200" : "text-slate-500"
                }
              >
                {r.won ? `中奖 ¥${r.prizeYuan.toLocaleString("zh-CN")}` : "未中奖"}
              </span>
            </div>
            <div className="mt-2 space-y-1">
              <div>
                <span className="text-slate-500">开奖：</span>
                <span className="text-rose-200">{formatNums(r.drawRed)}</span>
                <span className="text-slate-500"> + </span>
                <span className="text-sky-200">{r.drawBlue.toString().padStart(2, "0")}</span>
              </div>
              <div>
                <span className="text-slate-500">我的：</span>
                <span className="text-rose-100/90">{formatNums(r.userRed)}</span>
                <span className="text-slate-500"> + </span>
                <span className="text-sky-100/90">{r.userBlue.toString().padStart(2, "0")}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
