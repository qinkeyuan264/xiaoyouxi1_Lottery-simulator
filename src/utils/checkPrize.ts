import type { DcbPrizeLevel } from "@/features/dcb/types";

export interface PrizeResult {
  level: DcbPrizeLevel;
  /** 模拟奖金（元） */
  prizeYuan: number;
  /** 中文说明 */
  label: string;
}

/**
 * 根据官方双色球规则简化后的中奖判定（演示用奖金额度可调整）。
 * 红球命中数 + 蓝球是否命中 -> 奖级。
 */
export function checkDcbPrize(
  userRed: number[],
  userBlue: number,
  drawRed: number[],
  drawBlue: number,
): PrizeResult {
  const ur = new Set(userRed);
  const dr = new Set(drawRed);
  let redHit = 0;
  ur.forEach((n) => {
    if (dr.has(n)) redHit++;
  });
  const blueHit = userBlue === drawBlue ? 1 : 0;

  if (redHit === 6 && blueHit === 1) {
    return { level: 1, prizeYuan: 5_000_000, label: "一等奖（6+1）" };
  }
  if (redHit === 6 && blueHit === 0) {
    return { level: 2, prizeYuan: 1_000_000, label: "二等奖（6+0）" };
  }
  if (redHit === 5 && blueHit === 1) {
    return { level: 3, prizeYuan: 3_000, label: "三等奖（5+1）" };
  }
  if ((redHit === 5 && blueHit === 0) || (redHit === 4 && blueHit === 1)) {
    return { level: 4, prizeYuan: 200, label: "四等奖（5+0 或 4+1）" };
  }
  if ((redHit === 4 && blueHit === 0) || (redHit === 3 && blueHit === 1)) {
    return { level: 5, prizeYuan: 10, label: "五等奖（4+0 或 3+1）" };
  }
  if ((redHit === 2 && blueHit === 1) || (redHit === 1 && blueHit === 1) || (redHit === 0 && blueHit === 1)) {
    return { level: 6, prizeYuan: 5, label: "六等奖（2+1 / 1+1 / 0+1）" };
  }
  return { level: 0, prizeYuan: 0, label: "未中奖" };
}
