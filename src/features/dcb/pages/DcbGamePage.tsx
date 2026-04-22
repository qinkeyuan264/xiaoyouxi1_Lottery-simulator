import { useNavigate } from "react-router-dom";
import { AppButton } from "@/components/ui/Button";
import { HistoryPanel } from "@/features/dcb/components/HistoryPanel";
import { useDcbGame } from "@/features/dcb/hooks/useDcbGame";
import { useUserStore } from "@/store/useUserStore";
import { playButtonClick } from "@/utils/sound";
import type { DrawingLocationState } from "../types";
import { SelectionPage } from "./SelectionPage";

/**
 * 双色球游戏主页：在「选号」与「历史」视图间切换，并跳转至全屏开奖页。
 */
export function DcbGamePage() {
  const navigate = useNavigate();
  const history = useUserStore((s) => s.dcbHistory);
  const {
    tab,
    setTab,
    selectedRed,
    selectedBlue,
    toggleRed,
    toggleBlue,
    clearAll,
    randomPick,
    selectionValid,
    confirmBet,
    toast,
    priceLabel,
  } = useDcbGame();

  const goDraw = async () => {
    if (!confirmBet()) return;
    await playButtonClick();
    const payload: DrawingLocationState = {
      userRed: [...selectedRed].sort((a, b) => a - b),
      userBlue: selectedBlue!,
    };
    navigate("/dcb/drawing", { state: payload });
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">双色球</h2>
          <p className="mt-1 text-sm text-slate-400">{priceLabel} · 请先完成选号</p>
        </div>
        <div className="flex gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-1">
          <button
            type="button"
            onClick={() => {
              void playButtonClick();
              setTab("play");
            }}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === "play" ? "bg-amber-400/20 text-amber-100" : "text-slate-400 hover:text-white"
            }`}
          >
            选号投注
          </button>
          <button
            type="button"
            onClick={() => {
              void playButtonClick();
              setTab("history");
            }}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === "history" ? "bg-amber-400/20 text-amber-100" : "text-slate-400 hover:text-white"
            }`}
          >
            历史记录
          </button>
        </div>
      </div>

      {tab === "play" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-6 shadow-inner">
            <SelectionPage
              selectedRed={selectedRed}
              selectedBlue={selectedBlue}
              onToggleRed={toggleRed}
              onToggleBlue={toggleBlue}
            />
            <div className="mt-8 flex flex-wrap gap-3">
              <AppButton type="button" variant="ghost" onClick={() => void randomPick()}>
                机选一注
              </AppButton>
              <AppButton type="button" variant="ghost" onClick={() => void clearAll()}>
                清空选号
              </AppButton>
              <AppButton
                type="button"
                onClick={() => void goDraw()}
                disabled={!selectionValid}
                className="ml-auto min-w-[140px]"
              >
                立即摇奖
              </AppButton>
            </div>
          </div>
          <HistoryPanel records={history} />
        </div>
      ) : (
        <HistoryPanel records={history} />
      )}

      {toast ? (
        <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-full border border-amber-400/40 bg-slate-950/95 px-5 py-2 text-sm text-amber-100 shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
