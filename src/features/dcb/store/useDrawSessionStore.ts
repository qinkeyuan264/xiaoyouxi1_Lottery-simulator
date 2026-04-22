import { create } from "zustand";

/**
 * 全屏开奖流程阶段：红机 → 蓝机 → 结果弹层。
 */
export type DrawGameStage = "IDLE" | "DRAWING_RED" | "DRAWING_BLUE" | "RESULTS";

interface DrawSessionState {
  gameStage: DrawGameStage;
  setGameStage: (s: DrawGameStage) => void;
  reset: () => void;
}

export const useDrawSessionStore = create<DrawSessionState>((set) => ({
  gameStage: "IDLE",
  setGameStage: (s) => set({ gameStage: s }),
  reset: () => set({ gameStage: "IDLE" }),
}));
