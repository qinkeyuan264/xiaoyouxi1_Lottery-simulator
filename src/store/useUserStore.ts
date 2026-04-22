import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DcbBetRecord } from "@/features/dcb/types";

interface UserState {
  /** 当前登录用户名，未登录为 null */
  username: string | null;
  /** 账户余额（模拟货币，单位：元） */
  balance: number;
  /** 双色球投注历史 */
  dcbHistory: DcbBetRecord[];
  /** 登录：写入用户名并赋予初始余额 */
  login: (name: string) => void;
  /** 退出登录 */
  logout: () => void;
  /** 调整余额（正数为奖励，负数为扣款） */
  adjustBalance: (delta: number) => void;
  /** 追加一条双色球记录 */
  addDcbRecord: (record: DcbBetRecord) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      username: null,
      balance: 0,
      dcbHistory: [],

      login: (name: string) => {
        const trimmed = name.trim() || "幸运玩家";
        // 切换到“该账号”用户存档并读档：同账号不重置余额/历史
        useUserStore.persist.setOptions({
          name: `lottery-sim-user__${encodeURIComponent(trimmed)}`,
          version: 2,
        });
        // 关键：必须先 rehydrate，再 set(username)。
        // 否则 set(username) 也会触发 persist 写入（partialize 仍会写 balance/dcbHistory），导致把旧余额覆盖成 0。
        void useUserStore.persist.rehydrate();
        queueMicrotask(() => {
          set((s) => ({
            username: trimmed,
            // 若该账号从未存档过（首次登录），则初始化为 10000。
            // 注意：余额可能合法为 0（破产），因此仅在“非数字/未初始化”时兜底。
            balance: typeof s.balance === "number" ? s.balance : 10_000,
            dcbHistory: Array.isArray(s.dcbHistory) ? s.dcbHistory : [],
          }));
          set((s) => ({
            balance: s.balance === 0 && (!Array.isArray(s.dcbHistory) || s.dcbHistory.length === 0) ? 10_000 : s.balance,
          }));
        });

        // 成就存档 key 依赖 username，登录后强制切换到对应账号档
        void import("./useAchievementStore").then((m) => {
          m.useAchievementStore.persist.setOptions({
            name: `lottery-sim-achievements__${encodeURIComponent(trimmed)}`,
          });
          void m.useAchievementStore.persist.rehydrate();
        });
      },

      logout: () => {
        set({ username: null, balance: 0, dcbHistory: [] });
        useUserStore.persist.setOptions({ name: "lottery-sim-user__guest", version: 2 });
        void useUserStore.persist.rehydrate();

        void import("./useAchievementStore").then((m) => {
          m.useAchievementStore.persist.setOptions({
            name: "lottery-sim-achievements___guest",
          });
          void m.useAchievementStore.persist.rehydrate();
        });
      },

      adjustBalance: (delta: number) => {
        set((s) => ({ balance: Math.max(0, s.balance + delta) }));
      },

      addDcbRecord: (record: DcbBetRecord) => {
        set((s) => ({
          dcbHistory: [record, ...s.dcbHistory].slice(0, 50),
        }));
      },
    }),
    {
      name: "lottery-sim-user__guest",
      version: 2,
      migrate: (persistedState: unknown, version: number) => {
        const p = (persistedState ?? {}) as Partial<UserState>;
        if (version < 2) {
          // 彻底清空旧存档里的 username，避免“跳过登录”
          return {
            balance: typeof p.balance === "number" ? p.balance : 0,
            dcbHistory: Array.isArray((p as any).dcbHistory) ? (p as any).dcbHistory : [],
          };
        }
        return p;
      },
      // 不持久化 username：每次启动都要求重新登录（避免“直接跳过登录”）
      partialize: (s) => ({ balance: s.balance, dcbHistory: s.dcbHistory }),
    },
  ),
);
