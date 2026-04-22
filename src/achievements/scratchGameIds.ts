/** 刮刮乐票种 ID（与成就统计一致） */
export const SCRATCH_GAME_IDS = [
  "scratch2",
  "wuma",
  "haoyun10",
  "madao",
  "haoyunlai",
  "chaoji9",
] as const;

export type ScratchGameId = (typeof SCRATCH_GAME_IDS)[number];
