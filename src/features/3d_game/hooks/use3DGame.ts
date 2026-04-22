import { create } from "zustand";
import { useCallback, useMemo } from "react";
import { useAchievementStore } from "@/store/useAchievementStore";
import { useUserStore } from "@/store/useUserStore";
import { playButtonClick, playPrizeWin } from "@/utils/sound";

export type PlayMode = "single" | "group3" | "group6";

export type DigitPosition = 0 | 1 | 2; // 百 十 个

export type Digits = [number, number, number];

const BET_PRICE = 2;

export const PRIZE_SINGLE = 1040;
export const PRIZE_GROUP3 = 346;
export const PRIZE_GROUP6 = 173;

function isValidDigit(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n <= 9;
}

function toCounts(d: Digits): Map<number, number> {
  const m = new Map<number, number>();
  for (const x of d) m.set(x, (m.get(x) ?? 0) + 1);
  return m;
}

function sameMultiset(a: Digits, b: Digits): boolean {
  const ca = toCounts(a);
  const cb = toCounts(b);
  if (ca.size !== cb.size) return false;
  for (const [k, v] of ca) if (cb.get(k) !== v) return false;
  return true;
}

export function validateSelection(mode: PlayMode, digits: Digits): { ok: true } | { ok: false; message: string } {
  if (digits.some((x) => !isValidDigit(x))) return { ok: false, message: "请选择 0-9 的三个数字" };

  const uniq = new Set(digits).size;
  if (mode === "group3") {
    // 必须且只能有两个数字相同
    if (uniq !== 2) return { ok: false, message: "组选3：必须且只能有两个数字相同（例如 112）" };
    const counts = Array.from(toCounts(digits).values()).sort((a, b) => b - a);
    if (counts[0] !== 2 || counts[1] !== 1) return { ok: false, message: "组选3：必须是“二同号 + 一不同号”" };
  }
  if (mode === "group6") {
    if (uniq !== 3) return { ok: false, message: "组选6：三个数字必须互不相同（例如 127）" };
  }
  return { ok: true };
}

export function checkPrize(mode: PlayMode, user: Digits, draw: Digits): number {
  if (mode === "single") {
    return user[0] === draw[0] && user[1] === draw[1] && user[2] === draw[2] ? PRIZE_SINGLE : 0;
  }
  if (mode === "group3") {
    const uniq = new Set(draw).size;
    if (uniq !== 2) return 0;
    return sameMultiset(user, draw) ? PRIZE_GROUP3 : 0;
  }
  if (mode === "group6") {
    const uniq = new Set(draw).size;
    if (uniq !== 3) return 0;
    return sameMultiset(user, draw) ? PRIZE_GROUP6 : 0;
  }
  return 0;
}

type ThreeDStoreState = {
  playMode: PlayMode;
  selected: Digits;
  toast: string | null;
  draw: Digits | null;
  spinning: boolean;
};

type ThreeDStoreActions = {
  setPlayMode: (m: PlayMode) => void;
  setDigit: (pos: DigitPosition, digit: number) => void;
  showToast: (msg: string) => void;
  clearToast: () => void;
  startSpin: (draw: Digits) => void;
  stopSpin: () => void;
  resetRound: () => void;
};

const useThreeDStore = create<ThreeDStoreState & ThreeDStoreActions>((set, get) => ({
  playMode: "single",
  selected: [0, 0, 0],
  toast: null,
  draw: null,
  spinning: false,

  setPlayMode: (m) => set({ playMode: m }),
  setDigit: (pos, digit) => {
    const s = get().selected;
    const next: Digits = [s[0], s[1], s[2]];
    next[pos] = digit;
    set({ selected: next });
  },
  showToast: (msg) => {
    set({ toast: msg });
    window.setTimeout(() => {
      if (get().toast === msg) set({ toast: null });
    }, 2200);
  },
  clearToast: () => set({ toast: null }),
  startSpin: (draw) => set({ draw, spinning: true }),
  stopSpin: () => set({ spinning: false }),
  resetRound: () => set({ draw: null, spinning: false }),
}));

export function use3DGame() {
  const playMode = useThreeDStore((s) => s.playMode);
  const selected = useThreeDStore((s) => s.selected);
  const toast = useThreeDStore((s) => s.toast);
  const draw = useThreeDStore((s) => s.draw);
  const spinning = useThreeDStore((s) => s.spinning);

  const setPlayMode = useThreeDStore((s) => s.setPlayMode);
  const setDigit = useThreeDStore((s) => s.setDigit);
  const showToast = useThreeDStore((s) => s.showToast);
  const clearToast = useThreeDStore((s) => s.clearToast);
  const startSpin = useThreeDStore((s) => s.startSpin);
  const stopSpin = useThreeDStore((s) => s.stopSpin);
  const resetRound = useThreeDStore((s) => s.resetRound);

  const balance = useUserStore((s) => s.balance);
  const adjustBalance = useUserStore((s) => s.adjustBalance);

  const validate = useCallback(() => validateSelection(playMode, selected), [playMode, selected]);

  const canAfford = balance >= BET_PRICE;

  const generateDraw = useCallback((): Digits => {
    const a = Math.floor(Math.random() * 10);
    const b = Math.floor(Math.random() * 10);
    const c = Math.floor(Math.random() * 10);
    return [a, b, c];
  }, []);

  const startRound = useCallback((): Digits | null => {
    void playButtonClick();
    const v = validate();
    if (!v.ok) {
      showToast(v.message);
      return null;
    }
    if (!canAfford) {
      showToast("余额不足，无法投注");
      return null;
    }
    adjustBalance(-BET_PRICE);
    useAchievementStore.getState().recordSpend(BET_PRICE);
    useAchievementStore.getState().record3DBet();
    const d = generateDraw();
    startSpin(d);
    return d;
  }, [adjustBalance, canAfford, generateDraw, showToast, startSpin, validate]);

  const settle = useCallback(
    async (finalDraw: Digits) => {
      const prizeYuan = checkPrize(playMode, selected, finalDraw);
      if (prizeYuan > 0) {
        adjustBalance(prizeYuan);
        await playPrizeWin();
      }
      useAchievementStore.getState().record3DSettle(prizeYuan);
      return prizeYuan;
    },
    [adjustBalance, playMode, selected],
  );

  const payoutLabel = useMemo(() => {
    if (playMode === "single") return `单选（¥${PRIZE_SINGLE}）`;
    if (playMode === "group3") return `组选3（¥${PRIZE_GROUP3}）`;
    return `组选6（¥${PRIZE_GROUP6}）`;
  }, [playMode]);

  return {
    playMode,
    selected,
    toast,
    draw,
    spinning,
    payoutLabel,
    setPlayMode,
    setDigit,
    clearToast,
    validate,
    startRound,
    stopSpin,
    resetRound,
    settle,
  };
}

