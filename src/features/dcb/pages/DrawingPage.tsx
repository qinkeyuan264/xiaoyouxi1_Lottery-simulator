import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppButton } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Ball } from "@/features/dcb/components/Ball";
import { BlueBallDrawingScene } from "@/features/dcb/components/lottery_scenes/BlueBallDrawingScene";
import { RedBallDrawingScene } from "@/features/dcb/components/lottery_scenes/RedBallDrawingScene";
import { useDcbGame } from "@/features/dcb/hooks/useDcbGame";
import { useDrawSessionStore } from "@/features/dcb/store/useDrawSessionStore";
import { checkDcbPrize } from "@/utils/checkPrize";
import { playButtonClick, playPrizeWin } from "@/utils/sound";
import type { DrawingLocationState } from "../types";

/**
 * 全屏开奖页：红机 → 蓝机两阶段 3D 物理开奖，结束后弹窗结算。
 */
export function DrawingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { settleRound } = useDcbGame();

  const gameStage = useDrawSessionStore((s) => s.gameStage);
  const setGameStage = useDrawSessionStore((s) => s.setGameStage);
  const resetDrawSession = useDrawSessionStore((s) => s.reset);

  const userPick = location.state as DrawingLocationState | undefined;

  /**
   * V11：开奖号码由“白球炮击指向原点 + 运动学球与白球碰撞转动态 + 中心漏斗传感器”产生，不再预设。
   * 用 ref 固化，避免 Strict Mode 或重渲染重复覆盖结果。
   */
  const drawRef = useRef<{ red: number[]; blue: number } | null>(null);

  const [finished, setFinished] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useLayoutEffect(() => {
    setGameStage("DRAWING_RED");
    return () => resetDrawSession();
  }, [setGameStage, resetDrawSession]);

  const prize = useMemo(() => {
    if (!userPick) return null;
    const draw = drawRef.current;
    if (!draw || draw.red.length !== 6 || !draw.blue) return null;
    return checkDcbPrize(userPick.userRed, userPick.userBlue, draw.red, draw.blue);
  }, [userPick, finished]);

  const handleAnimDone = useCallback(() => {
    setFinished(true);
    setShowModal(true);
    const draw = drawRef.current;
    if (!draw || draw.red.length !== 6 || !userPick || !draw.blue) return;
    const result = checkDcbPrize(userPick.userRed, userPick.userBlue, draw.red, draw.blue);
    if (result.level > 0) void playPrizeWin();
  }, [userPick]);

  const handleConfirm = async () => {
    await playButtonClick();
    if (userPick) {
      const draw = drawRef.current;
      if (draw) settleRound(userPick.userRed, userPick.userBlue, draw.red, draw.blue);
    }
    setShowModal(false);
    navigate("/dcb");
  };

  const handleBack = useCallback(async () => {
    await playButtonClick();
    navigate("/dcb");
  }, [navigate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") void handleBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleBack]);

  if (!userPick || userPick.userRed.length !== 6 || !userPick.userBlue) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 p-8">
        <p className="text-slate-300">未找到投注信息，请返回选号页重新投注。</p>
        <AppButton type="button" onClick={() => void navigate("/dcb")}>
          返回双色球
        </AppButton>
      </div>
    );
  }

  const stageLabel =
    gameStage === "DRAWING_RED"
      ? "红球摇奖"
      : gameStage === "DRAWING_BLUE"
        ? "蓝球摇奖"
        : gameStage === "RESULTS"
          ? "开奖完成"
          : "准备中";

  return (
    <div className="relative flex min-h-screen flex-col bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="relative z-20 flex items-center justify-between border-b border-white/10 px-4 py-3 backdrop-blur-sm">
        <AppButton type="button" variant="ghost" onClick={() => void handleBack()}>
          ← 返回
        </AppButton>
        <div className="text-center text-sm text-slate-400">
          您的选号：
          <span className="ml-2 text-rose-200">
            {userPick.userRed.map((n) => n.toString().padStart(2, "0")).join(" ")}
          </span>
          <span className="text-slate-500"> + </span>
          <span className="text-sky-200">{userPick.userBlue.toString().padStart(2, "0")}</span>
        </div>
        <div className="w-[72px]" />
      </div>

      <div
        className={`pointer-events-none absolute left-1/2 top-20 z-10 -translate-x-1/2 rounded-full border border-white/15 bg-black/45 px-4 py-1.5 text-xs text-amber-100/95 backdrop-blur ${gameStage === "RESULTS" || finished ? "opacity-60" : ""}`}
      >
        {stageLabel}
      </div>

      <div className="relative min-h-0 flex-1">
        {gameStage === "DRAWING_RED" ? (
          <RedBallDrawingScene
            onComplete={(winningReds) => {
              drawRef.current = { red: winningReds, blue: 0 };
              setGameStage("DRAWING_BLUE");
            }}
          />
        ) : null}
        {gameStage === "DRAWING_BLUE" ? (
          <BlueBallDrawingScene
            onComplete={(winningBlue) => {
              if (drawRef.current) drawRef.current.blue = winningBlue;
              setGameStage("RESULTS");
              handleAnimDone();
            }}
          />
        ) : null}

        {finished ? (
          <div className="pointer-events-none absolute bottom-16 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/10 bg-black/50 px-4 py-2 text-xs text-slate-300 backdrop-blur">
            {drawRef.current ? (
              <>
                开奖号码：红 {drawRef.current.red.map((n) => n.toString().padStart(2, "0")).join(" ")} · 蓝{" "}
                {drawRef.current.blue.toString().padStart(2, "0")}
              </>
            ) : (
              "正在生成开奖号码…"
            )}
          </div>
        ) : null}
      </div>

      {prize ? (
        <Modal open={showModal} title="开奖结果" onConfirm={() => void handleConfirm()} confirmText="收下结果">
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-300">本期开奖</div>
              <div className="flex flex-wrap items-center gap-2">
                {drawRef.current?.red.map((n) => (
                  <div key={`dr-${n}`} className="pointer-events-none">
                    <Ball label={n.toString().padStart(2, "0")} variant="red" selected onClick={() => undefined} />
                  </div>
                ))}
                <span className="mx-1 text-slate-500">+</span>
                <div className="pointer-events-none">
                  <Ball
                    label={(drawRef.current?.blue ?? 0).toString().padStart(2, "0")}
                    variant="blue"
                    selected
                    onClick={() => undefined}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-300">我的选号</div>
              <div className="flex flex-wrap items-center gap-2">
                {userPick.userRed.map((n) => (
                  <div key={`ur-${n}`} className="pointer-events-none">
                    <Ball label={n.toString().padStart(2, "0")} variant="red" selected onClick={() => undefined} />
                  </div>
                ))}
                <span className="mx-1 text-slate-500">+</span>
                <div className="pointer-events-none">
                  <Ball label={userPick.userBlue.toString().padStart(2, "0")} variant="blue" selected onClick={() => undefined} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-2xl font-bold text-amber-200">{prize.label}</div>
              <div className="mt-2 text-lg text-slate-200">
                奖金：<span className="font-semibold text-emerald-300">¥{prize.prizeYuan.toLocaleString("zh-CN")}</span>
              </div>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
