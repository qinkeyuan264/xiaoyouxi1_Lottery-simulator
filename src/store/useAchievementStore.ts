import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  ACHIEVEMENTS,
  type AchievementContext,
  type AchievementDef,
  type AchievementStats,
} from "../achievements/definitions";
import type { ScratchGameId } from "../achievements/scratchGameIds";
import { getScopedPersistName, migrateLegacyPersistKey } from "./achievementStorage";
import { useUserStore } from "./useUserStore";

export type { AchievementStats };

export type AchievementState = {
  unlocked: Record<string, boolean>;
  stats: AchievementStats;
  celebrationQueue: AchievementDef[];
  hydrated: boolean;
  isGranting: boolean;
  isSyncingBalance: boolean;
  pendingEvaluate: boolean;
  setSessionReady: () => void;
  recordSpend: (amountYuan: number) => void;
  recordDcbRound: () => void;
  recordDcbSettle: (prizeYuan: number, prizeLevel: number) => void;
  record3DBet: () => void;
  record3DSettle: (prizeYuan: number) => void;
  recordScratchPurchase: (gameId: ScratchGameId, priceYuan: number) => void;
  recordScratchSettle: (prizeYuan: number) => void;
  /** 同步余额统计（不触发成就解锁） */
  syncMaxBalance: (balance: number) => void;
  /** 同步余额统计并解锁成就（带重入保护） */
  syncBalanceAndEvaluate: (balance: number) => void;
  evaluateAll: () => void;
  dismissCelebration: () => void;
  resetAchievements: () => void;
};

const initialStats = (): AchievementStats => ({
  sessionReady: false,
  spendCount: 0,
  totalBetYuan: 0,
  totalPrizeYuan: 0,
  maxBalance: 0,
  minBalanceEver: Number.POSITIVE_INFINITY,
  hasTouchedZero: false,
  dcbRounds: 0,
  dcbMaxPrize: 0,
  dcbMaxLevel: 0,
  dcbWins: 0,
  dcbHadLevel1: false,
  scratchTickets: 0,
  scratchByGame: {},
  scratchMaxWin: 0,
  scratchLossStreak: 0,
  scratchWinStreak: 0,
  threeDBets: 0,
  threeDMaxPrize: 0,
  threeDWins: 0,
  playedDcb: false,
  played3D: false,
  playedScratch: false,
});

function mergeStats(partial: Partial<AchievementStats>): AchievementStats {
  const base = initialStats();
  const merged = { ...base, ...partial };
  if (merged.minBalanceEver === undefined || merged.minBalanceEver === null) {
    merged.minBalanceEver = Number.POSITIVE_INFINITY;
  }
  if (!merged.scratchByGame || typeof merged.scratchByGame !== "object") {
    merged.scratchByGame = {};
  }
  return merged;
}

export const useAchievementStore = create<AchievementState>()(
  persist(
    (set, get) => {
      function evaluateAllAfterGrant(): void {
        // 必须：已完成成就读档 + 已登录，否则禁止解锁/发奖（避免 guest 档/覆盖导致循环）
        const st0 = get();
        if (!st0.hydrated) return;
        if (!useUserStore.getState().username) return;
        if (st0.isGranting || st0.isSyncingBalance) return;

        const stats = get().stats;
        let balance = useUserStore.getState().balance;
        let unlocked = { ...(get().unlocked ?? {}) };
        const celebrationAdds: AchievementDef[] = [];
        let rewardSum = 0;

        // 在一次 tick 内把所有“解锁->发奖->余额变化->继续解锁”合并，避免 React 嵌套更新触发 #185
        let guard = 0;
        while (guard < 80) {
          guard++;
          const unlockedIds = new Set(Object.keys(unlocked).filter((k) => unlocked[k]));
          const ctx: AchievementContext = { balance, stats, unlockedIds };

          let progressed = false;
          for (const def of ACHIEVEMENTS) {
            if (unlocked[def.id]) continue;
            if (!def.check(ctx)) continue;
            unlocked[def.id] = true;
            celebrationAdds.push(def);
            rewardSum += def.rewardYuan;
            balance += def.rewardYuan;
            progressed = true;
          }

          if (!progressed) break;
        }

        if (celebrationAdds.length === 0) return;

        set((s) => ({
          unlocked,
          celebrationQueue: [...(s.celebrationQueue ?? []), ...celebrationAdds],
          stats: {
            ...s.stats,
            maxBalance: Math.max(s.stats.maxBalance, balance),
            minBalanceEver: Math.min(s.stats.minBalanceEver, balance),
            hasTouchedZero: s.stats.hasTouchedZero || balance === 0,
          },
        }));

        if (rewardSum !== 0) {
          set({ isGranting: true });
          useUserStore.getState().adjustBalance(rewardSum);
          set({ isGranting: false });
        }
      }

      return {
      unlocked: {},
      stats: initialStats(),
      celebrationQueue: [],
      hydrated: false,
      isGranting: false,
      isSyncingBalance: false,
      pendingEvaluate: false,

      setSessionReady: () => {
        if (!get().hydrated) return;
        if (!useUserStore.getState().username) return;
        const before = get();
        if (!before.stats.sessionReady) {
          set((s) => ({
            stats: { ...s.stats, sessionReady: true },
          }));
        }
        get().evaluateAll();
      },

      recordSpend: (amountYuan) => {
        if (!get().hydrated) return;
        const n = Math.max(0, amountYuan);
        set((s) => ({
          stats: {
            ...s.stats,
            spendCount: s.stats.spendCount + 1,
            totalBetYuan: s.stats.totalBetYuan + n,
          },
        }));
        get().evaluateAll();
      },

      recordDcbRound: () => {
        if (!get().hydrated) return;
        set((s) => ({
          stats: {
            ...s.stats,
            dcbRounds: s.stats.dcbRounds + 1,
            playedDcb: true,
          },
        }));
        get().evaluateAll();
      },

      recordDcbSettle: (prizeYuan, prizeLevel) => {
        if (!get().hydrated) return;
        const p = Math.max(0, prizeYuan);
        const lv = Math.max(0, Math.floor(prizeLevel));
        set((s) => ({
          stats: {
            ...s.stats,
            dcbMaxPrize: Math.max(s.stats.dcbMaxPrize, p),
            dcbMaxLevel: Math.max(s.stats.dcbMaxLevel, lv),
            totalPrizeYuan: s.stats.totalPrizeYuan + p,
            dcbWins: p > 0 ? s.stats.dcbWins + 1 : s.stats.dcbWins,
            dcbHadLevel1: s.stats.dcbHadLevel1 || lv === 1,
          },
        }));
        get().evaluateAll();
      },

      record3DBet: () => {
        if (!get().hydrated) return;
        set((s) => ({
          stats: {
            ...s.stats,
            threeDBets: s.stats.threeDBets + 1,
            played3D: true,
          },
        }));
        get().evaluateAll();
      },

      record3DSettle: (prizeYuan) => {
        if (!get().hydrated) return;
        const p = Math.max(0, prizeYuan);
        set((s) => ({
          stats: {
            ...s.stats,
            threeDMaxPrize: Math.max(s.stats.threeDMaxPrize, p),
            threeDWins: p > 0 ? s.stats.threeDWins + 1 : s.stats.threeDWins,
            totalPrizeYuan: s.stats.totalPrizeYuan + p,
          },
        }));
        get().evaluateAll();
      },

      recordScratchPurchase: (gameId, priceYuan) => {
        if (!get().hydrated) return;
        const price = Math.max(0, priceYuan);
        set((s) => {
          const prev = s.stats.scratchByGame[gameId] ?? 0;
          return {
            stats: {
              ...s.stats,
              spendCount: s.stats.spendCount + 1,
              scratchTickets: s.stats.scratchTickets + 1,
              playedScratch: true,
              totalBetYuan: s.stats.totalBetYuan + price,
              scratchByGame: { ...s.stats.scratchByGame, [gameId]: prev + 1 },
            },
          };
        });
        get().evaluateAll();
      },

      recordScratchSettle: (prizeYuan) => {
        if (!get().hydrated) return;
        const p = Math.max(0, prizeYuan);
        set((s) => ({
          stats: {
            ...s.stats,
            scratchMaxWin: Math.max(s.stats.scratchMaxWin, p),
            totalPrizeYuan: s.stats.totalPrizeYuan + p,
            scratchWinStreak: p > 0 ? s.stats.scratchWinStreak + 1 : 0,
            scratchLossStreak: p > 0 ? 0 : s.stats.scratchLossStreak + 1,
          },
        }));
        get().evaluateAll();
      },

      syncMaxBalance: (balance) => {
        if (!get().hydrated) return;
        if (!useUserStore.getState().username) return;
        set((s) => ({
          stats: {
            ...s.stats,
            maxBalance: Math.max(s.stats.maxBalance, balance),
            minBalanceEver: Math.min(s.stats.minBalanceEver, balance),
            hasTouchedZero: s.stats.hasTouchedZero || balance === 0,
          },
        }));
      },

      syncBalanceAndEvaluate: (balance) => {
        const s = get();
        if (!s.hydrated) return;
        if (!useUserStore.getState().username) return;
        if (s.isGranting || s.isSyncingBalance) return;
        set({ isSyncingBalance: true });
        get().syncMaxBalance(balance);
        get().evaluateAll();
        set({ isSyncingBalance: false });
      },

      evaluateAll: () => {
        const st = get();
        if (!st.hydrated) return;
        if (!useUserStore.getState().username) return;
        if (st.pendingEvaluate) return;
        set({ pendingEvaluate: true });
        queueMicrotask(() => {
          set({ pendingEvaluate: false });
          evaluateAllAfterGrant();
        });
      },

      dismissCelebration: () => {
        set((s) => ({
          celebrationQueue: s.celebrationQueue.slice(1),
        }));
      },

      resetAchievements: () => {
        set({
          unlocked: {},
          stats: initialStats(),
          celebrationQueue: [],
          hydrated: true,
          pendingEvaluate: false,
        });
      },
    };
    },
    {
      name: (() => {
        const base = "lottery-sim-achievements";
        migrateLegacyPersistKey(base);
        return getScopedPersistName(base);
      })(),
      version: 2,
      partialize: (s) => ({
        unlocked: s.unlocked,
        stats: s.stats,
      }),
      migrate: (persistedState, version) => {
        const p = (persistedState ?? {}) as Partial<AchievementState>;
        if (version < 2) {
          return {
            unlocked: p.unlocked ?? {},
            stats: mergeStats(p.stats ?? {}),
          };
        }
        return {
          unlocked: p.unlocked ?? {},
          stats: mergeStats(p.stats ?? {}),
        };
      },
      /**
       * persist 传入的是「已保存的 state 切片」，不是 { state: ... }。
       * 之前误用 p.state 导致 unlocked 从未恢复，页面读取时崩溃。
       */
      merge: (persistedState, currentState) => {
        const p = (persistedState ?? {}) as Partial<AchievementState>;
        const c = currentState as AchievementState;
        const mergedStats = mergeStats({
          ...initialStats(),
          ...(p.stats ?? {}),
        });
        return {
          ...c,
          ...p,
          unlocked: { ...(c.unlocked ?? {}), ...(p.unlocked ?? {}) },
          stats: mergedStats,
          celebrationQueue: [],
          hydrated: true,
          pendingEvaluate: false,
        } as AchievementState;
      },
    },
  ),
);

/** 新数组引用；在 hook 中请配合 `useShallow`，否则易触发无限重渲染（React #185） */
export const selectUnlockedIds = (s: AchievementState) =>
  Object.keys(s.unlocked ?? {}).filter((k) => (s.unlocked ?? {})[k]);

export const selectUnlockedCount = (s: AchievementState) => selectUnlockedIds(s).length;
