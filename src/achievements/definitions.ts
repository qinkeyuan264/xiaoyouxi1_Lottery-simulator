/**
 * 成就定义：数值目标兼顾「可完成性」与「挑战性」，总奖励与 65% 返奖体系相容。
 */
import { SCRATCH_GAME_IDS } from "./scratchGameIds";

/** 成就系统追踪的统计字段（与 useAchievementStore 持久化一致） */
export type AchievementStats = {
  sessionReady: boolean;
  spendCount: number;
  totalBetYuan: number;
  totalPrizeYuan: number;
  maxBalance: number;
  minBalanceEver: number;
  hasTouchedZero: boolean;
  dcbRounds: number;
  dcbMaxPrize: number;
  dcbMaxLevel: number;
  dcbWins: number;
  /** 是否中过一等奖 */
  dcbHadLevel1: boolean;
  scratchTickets: number;
  scratchByGame: Record<string, number>;
  scratchMaxWin: number;
  scratchLossStreak: number;
  scratchWinStreak: number;
  threeDBets: number;
  threeDMaxPrize: number;
  threeDWins: number;
  playedDcb: boolean;
  played3D: boolean;
  playedScratch: boolean;
};

export type AchievementContext = {
  balance: number;
  unlockedIds: Set<string>;
  stats: AchievementStats;
};

export type AchievementDef = {
  id: string;
  name: string;
  description: string;
  rewardYuan: number;
  check: (ctx: AchievementContext) => boolean;
};

export const evaluateAchievement = (
  def: AchievementDef,
  ctx: AchievementContext,
): boolean => def.check(ctx);

function allScratchKindsTried(s: AchievementStats): boolean {
  return SCRATCH_GAME_IDS.every((id) => (s.scratchByGame[id] ?? 0) >= 1);
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "welcome",
    name: "欢迎来到彩厅",
    description: "进入彩票模拟器，开始你的模拟之旅。",
    rewardYuan: 100,
    check: (c) => c.stats.sessionReady,
  },
  {
    id: "first_spend",
    name: "第一笔投注",
    description: "完成任意一次投注（扣款成功）。",
    rewardYuan: 200,
    check: (c) => c.stats.spendCount >= 1,
  },
  {
    id: "dcb_round_1",
    name: "双色初体验",
    description: "完成一次双色球开奖流程。",
    rewardYuan: 200,
    check: (c) => c.stats.dcbRounds >= 1,
  },
  {
    id: "dcb_win_any",
    name: "红蓝有喜",
    description: "双色球任意奖级中奖（含六等奖）。",
    rewardYuan: 300,
    check: (c) => c.stats.dcbMaxPrize > 0,
  },
  {
    id: "dcb_big_hit",
    name: "大奖临门",
    description: "双色球单注奖金达到或超过 5,000 元。",
    rewardYuan: 800,
    check: (c) => c.stats.dcbMaxPrize >= 5000,
  },
  {
    id: "dcb_jackpot",
    name: "头奖梦想家",
    description: "双色球中得一等奖。",
    rewardYuan: 10000,
    check: (c) => c.stats.dcbHadLevel1,
  },
  {
    id: "dcb_round_25",
    name: "铁杆球迷",
    description: "累计完成 25 期双色球开奖。",
    rewardYuan: 600,
    check: (c) => c.stats.dcbRounds >= 25,
  },
  {
    id: "dcb_round_100",
    name: "期期不落",
    description: "累计完成 100 期双色球开奖。",
    rewardYuan: 3500,
    check: (c) => c.stats.dcbRounds >= 100,
  },
  {
    id: "dcb_second_tier",
    name: "银色传说",
    description: "中得双色球二等奖（6+0）。",
    rewardYuan: 5000,
    check: (c) => c.stats.dcbMaxLevel === 2,
  },
  {
    id: "dcb_third_tier",
    name: "三等荣光",
    description: "至少中得一次双色球三等奖（5+1）。",
    rewardYuan: 1200,
    check: (c) => c.stats.dcbMaxLevel >= 3,
  },
  {
    id: "dcb_win_rounds",
    name: "常胜将军",
    description: "双色球累计 20 期开出奖金（任意奖级）。",
    rewardYuan: 1500,
    check: (c) => c.stats.dcbWins >= 20,
  },
  {
    id: "scratch_first",
    name: "刮开第一层",
    description: "购买并结算任意一张刮刮乐。",
    rewardYuan: 200,
    check: (c) => c.stats.scratchTickets >= 1,
  },
  {
    id: "scratch_win",
    name: "涂层见喜",
    description: "任意刮刮乐单张中奖金额大于 0。",
    rewardYuan: 250,
    check: (c) => c.stats.scratchMaxWin > 0,
  },
  {
    id: "scratch_high",
    name: "刮出惊喜",
    description: "单张刮刮乐中奖达到或超过 10,000 元。",
    rewardYuan: 1500,
    check: (c) => c.stats.scratchMaxWin >= 10000,
  },
  {
    id: "scratch_whale",
    name: "天选刮民",
    description: "单张刮刮乐中奖达到或超过 100,000 元。",
    rewardYuan: 5000,
    check: (c) => c.stats.scratchMaxWin >= 100000,
  },
  {
    id: "scratch_veteran",
    name: "刮乐常客",
    description: "累计购买刮刮乐 40 张。",
    rewardYuan: 600,
    check: (c) => c.stats.scratchTickets >= 40,
  },
  {
    id: "scratch_century",
    name: "刮到手软",
    description: "累计购买刮刮乐 100 张。",
    rewardYuan: 1800,
    check: (c) => c.stats.scratchTickets >= 100,
  },
  {
    id: "scratch_warehouse",
    name: "仓库管理员",
    description: "累计购买刮刮乐 500 张。",
    rewardYuan: 6000,
    check: (c) => c.stats.scratchTickets >= 500,
  },
  {
    id: "scratch_collector",
    name: "票种集邮家",
    description: "六种刮刮乐各至少购买过 1 张。",
    rewardYuan: 1200,
    check: (c) => allScratchKindsTried(c.stats),
  },
  {
    id: "scratch_budget_2",
    name: "争分夺秒达人",
    description: "「争分夺秒」累计购买 50 张。",
    rewardYuan: 400,
    check: (c) => (c.stats.scratchByGame.scratch2 ?? 0) >= 50,
  },
  {
    id: "scratch_wuma_fan",
    name: "五码同心",
    description: "「五码」累计购买 40 张。",
    rewardYuan: 500,
    check: (c) => (c.stats.scratchByGame.wuma ?? 0) >= 40,
  },
  {
    id: "scratch_haoyun10_fan",
    name: "好运成双",
    description: "「好运十倍」累计购买 30 张。",
    rewardYuan: 450,
    check: (c) => (c.stats.scratchByGame.haoyun10 ?? 0) >= 30,
  },
  {
    id: "scratch_madao_fan",
    name: "马到功成铁粉",
    description: "「马到功成」累计购买 25 张。",
    rewardYuan: 600,
    check: (c) => (c.stats.scratchByGame.madao ?? 0) >= 25,
  },
  {
    id: "scratch_haoyunlai_fan",
    name: "好运来敲门",
    description: "「好运来」累计购买 20 张。",
    rewardYuan: 700,
    check: (c) => (c.stats.scratchByGame.haoyunlai ?? 0) >= 20,
  },
  {
    id: "scratch_chaoji9_fan",
    name: "超级玩家",
    description: "「超级 9」累计购买 15 张。",
    rewardYuan: 900,
    check: (c) => (c.stats.scratchByGame.chaoji9 ?? 0) >= 15,
  },
  {
    id: "unlucky_streak",
    name: "脸黑认证",
    description: "连续 12 次刮刮乐结算奖金为 0（真·非酋）。",
    rewardYuan: 800,
    check: (c) => c.stats.scratchLossStreak >= 12,
  },
  {
    id: "lucky_streak",
    name: "欧气连贯",
    description: "连续 5 次刮刮乐单张均中奖（>0）。",
    rewardYuan: 1500,
    check: (c) => c.stats.scratchWinStreak >= 5,
  },
  {
    id: "balance_30k",
    name: "三万小金库",
    description: "当前余额达到或超过 30,000 元。",
    rewardYuan: 500,
    check: (c) => c.balance >= 30000,
  },
  {
    id: "balance_100k",
    name: "十万大户",
    description: "历史最高余额达到或超过 100,000 元。",
    rewardYuan: 2000,
    check: (c) => c.stats.maxBalance >= 100000,
  },
  {
    id: "balance_500k",
    name: "半百万传奇",
    description: "历史最高余额达到或超过 500,000 元。",
    rewardYuan: 8000,
    check: (c) => c.stats.maxBalance >= 500000,
  },
  {
    id: "balance_millionaire",
    name: "百万身家",
    description: "历史最高余额达到或超过 1,000,000 元。",
    rewardYuan: 15000,
    check: (c) => c.stats.maxBalance >= 1000000,
  },
  {
    id: "broke_phoenix",
    name: "涅槃重生",
    description: "余额曾归零，且当前余额不低于 5,000 元。",
    rewardYuan: 2500,
    check: (c) => c.stats.hasTouchedZero && c.balance >= 5000,
  },
  {
    id: "tightrope",
    name: "钢丝漫步",
    description: "历史最低余额不高于 10 元，且最高余额曾达 50,000 元。",
    rewardYuan: 2000,
    check: (c) =>
      c.stats.minBalanceEver <= 10 &&
      Number.isFinite(c.stats.minBalanceEver) &&
      c.stats.maxBalance >= 50000,
  },
  {
    id: "total_bet_10k",
    name: "万元流水",
    description: "累计投注金额达到 10,000 元。",
    rewardYuan: 400,
    check: (c) => c.stats.totalBetYuan >= 10000,
  },
  {
    id: "total_bet_100k",
    name: "十万流水",
    description: "累计投注金额达到 100,000 元。",
    rewardYuan: 2500,
    check: (c) => c.stats.totalBetYuan >= 100000,
  },
  {
    id: "total_bet_1m",
    name: "百万流水",
    description: "累计投注金额达到 1,000,000 元。",
    rewardYuan: 12000,
    check: (c) => c.stats.totalBetYuan >= 1000000,
  },
  {
    id: "total_prize_50k",
    name: "奖金收割机",
    description: "累计中奖金额（不含成就奖励）达到 50,000 元。",
    rewardYuan: 1500,
    check: (c) => c.stats.totalPrizeYuan >= 50000,
  },
  {
    id: "total_prize_500k",
    name: "奖金洪流",
    description: "累计中奖金额达到 500,000 元。",
    rewardYuan: 8000,
    check: (c) => c.stats.totalPrizeYuan >= 500000,
  },
  {
    id: "paper_roi",
    name: "纸面正期望",
    description: "累计中奖额大于累计投注额，且投注额不少于 20,000 元。",
    rewardYuan: 5000,
    check: (c) =>
      c.stats.totalBetYuan >= 20000 &&
      c.stats.totalPrizeYuan > c.stats.totalBetYuan,
  },
  {
    id: "three_d_debut",
    name: "三位逐梦",
    description: "完成一次福彩 3D 投注。",
    rewardYuan: 200,
    check: (c) => c.stats.threeDBets >= 1,
  },
  {
    id: "three_d_win",
    name: "维度中奖",
    description: "福彩 3D 任意玩法中奖。",
    rewardYuan: 300,
    check: (c) => c.stats.threeDWins >= 1,
  },
  {
    id: "three_d_grinder",
    name: "三维老手",
    description: "累计完成 80 次 3D 投注。",
    rewardYuan: 1000,
    check: (c) => c.stats.threeDBets >= 80,
  },
  {
    id: "three_d_century",
    name: "百炼成钢",
    description: "累计完成 200 次 3D 投注。",
    rewardYuan: 3500,
    check: (c) => c.stats.threeDBets >= 200,
  },
  {
    id: "three_d_sharpshooter",
    name: "神枪手",
    description: "福彩 3D 累计中奖 30 次。",
    rewardYuan: 2200,
    check: (c) => c.stats.threeDWins >= 30,
  },
  {
    id: "three_d_jackpot_feel",
    name: "直选高光",
    description: "3D 单注最高奖金达到或超过 1,000 元。",
    rewardYuan: 1800,
    check: (c) => c.stats.threeDMaxPrize >= 1000,
  },
  {
    id: "triple_threat",
    name: "三线作战",
    description: "至少各完成一次：双色球开奖、3D 投注、刮刮乐购买。",
    rewardYuan: 2000,
    check: (c) =>
      c.stats.playedDcb && c.stats.played3D && c.stats.playedScratch,
  },
  {
    id: "completionist",
    name: "成就猎人",
    description: "解锁除本成就外其余全部成就。",
    rewardYuan: 25000,
    check: (c) => {
      const total = ACHIEVEMENTS.length;
      if (c.unlockedIds.size < total - 1) return false;
      return ACHIEVEMENTS.filter((a) => a.id !== "completionist").every((a) =>
        c.unlockedIds.has(a.id),
      );
    },
  },
];

export const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a])) as Record<
  string,
  AchievementDef
>;
