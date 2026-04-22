/** 双色球奖级（0 表示未中） */
export type DcbPrizeLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** 单期投注记录 */
export interface DcbBetRecord {
  id: string;
  /** 投注时间 ISO 字符串 */
  time: string;
  userRed: number[];
  userBlue: number;
  drawRed: number[];
  drawBlue: number;
  prizeLevel: DcbPrizeLevel;
  prizeYuan: number;
  /** 是否中奖（含六等奖） */
  won: boolean;
}

/** 路由传递至开奖页的参数 */
export interface DrawingLocationState {
  userRed: number[];
  userBlue: number;
}
