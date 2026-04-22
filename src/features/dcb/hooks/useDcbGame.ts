import { useCallback, useMemo, useState } from "react";
import { useAchievementStore } from "@/store/useAchievementStore";
import { useUserStore } from "@/store/useUserStore";
import { checkDcbPrize } from "@/utils/checkPrize";
import { playButtonClick } from "@/utils/sound";
import type { DcbBetRecord } from "../types";

const TICKET_PRICE = 2;

export type DcbTab = "play" | "history";

/**
 * 双色球选号与投注流程的核心 Hook：维护选号状态、校验、机选、扣款与结算写入。
 */
export function useDcbGame() {
  const username = useUserStore((s) => s.username);
  const balance = useUserStore((s) => s.balance);
  const adjustBalance = useUserStore((s) => s.adjustBalance);
  const addDcbRecord = useUserStore((s) => s.addDcbRecord);

  const [tab, setTab] = useState<DcbTab>("play");
  const [selectedRed, setSelectedRed] = useState<number[]>([]);
  const [selectedBlue, setSelectedBlue] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  const toggleRed = useCallback(
    (n: number) => {
      void playButtonClick();
      setSelectedRed((prev) => {
        if (prev.includes(n)) {
          return prev.filter((x) => x !== n);
        }
        if (prev.length >= 6) {
          showToast("红球最多选择 6 个");
          return prev;
        }
        return [...prev, n].sort((a, b) => a - b);
      });
    },
    [showToast],
  );

  const toggleBlue = useCallback(
    (n: number) => {
      void playButtonClick();
      setSelectedBlue((prev) => {
        if (prev === n) return null;
        return n;
      });
    },
    [],
  );

  const clearAll = useCallback(() => {
    void playButtonClick();
    setSelectedRed([]);
    setSelectedBlue(null);
  }, []);

  /** 机选一注：随机 6 红 + 1 蓝 */
  const randomPick = useCallback(() => {
    void playButtonClick();
    const pool = Array.from({ length: 33 }, (_, i) => i + 1);
    const reds: number[] = [];
    while (reds.length < 6) {
      const idx = Math.floor(Math.random() * pool.length);
      reds.push(pool[idx]);
      pool.splice(idx, 1);
    }
    reds.sort((a, b) => a - b);
    const blue = Math.floor(Math.random() * 16) + 1;
    setSelectedRed(reds);
    setSelectedBlue(blue);
  }, []);

  const selectionValid = selectedRed.length === 6 && selectedBlue !== null;

  const canAfford = balance >= TICKET_PRICE;

  /** 确认投注：扣款并返回是否成功（成功后由页面 navigate 至开奖页） */
  const confirmBet = useCallback((): boolean => {
    if (!selectionValid || selectedBlue === null) {
      showToast("请选择 6 个红球和 1 个蓝球");
      return false;
    }
    if (!canAfford) {
      showToast("余额不足，无法投注");
      return false;
    }
    adjustBalance(-TICKET_PRICE);
    useAchievementStore.getState().recordSpend(TICKET_PRICE);
    return true;
  }, [adjustBalance, canAfford, selectedBlue, selectionValid, showToast]);

  /**
   * 开奖结束后由页面调用：计算奖金、更新余额、写入历史。
   */
  const settleRound = useCallback(
    (userRed: number[], userBlue: number, drawRed: number[], drawBlue: number) => {
      useAchievementStore.getState().recordDcbRound();
      const result = checkDcbPrize(userRed, userBlue, drawRed, drawBlue);
      if (result.prizeYuan > 0) {
        adjustBalance(result.prizeYuan);
      }
      const record: DcbBetRecord = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        time: new Date().toISOString(),
        userRed: [...userRed].sort((a, b) => a - b),
        userBlue,
        drawRed: [...drawRed].sort((a, b) => a - b),
        drawBlue,
        prizeLevel: result.level,
        prizeYuan: result.prizeYuan,
        won: result.level > 0,
      };
      addDcbRecord(record);
      useAchievementStore.getState().recordDcbSettle(result.prizeYuan, result.level);
      return result;
    },
    [addDcbRecord, adjustBalance],
  );

  const priceLabel = useMemo(() => `每注 ${TICKET_PRICE} 元`, []);

  return {
    username,
    balance,
    tab,
    setTab,
    selectedRed,
    selectedBlue,
    toggleRed,
    toggleBlue,
    clearAll,
    randomPick,
    selectionValid,
    canAfford,
    confirmBet,
    settleRound,
    toast,
    showToast,
    priceLabel,
    ticketPrice: TICKET_PRICE,
  };
}
