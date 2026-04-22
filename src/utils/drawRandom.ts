/**
 * 生成一注随机开奖号码：6 个不重复红球（1-33）+ 1 个蓝球（1-16）。
 */
export function randomDraw(): { red: number[]; blue: number } {
  const pool = Array.from({ length: 33 }, (_, i) => i + 1);
  const red: number[] = [];
  while (red.length < 6) {
    const idx = Math.floor(Math.random() * pool.length);
    red.push(pool[idx]);
    pool.splice(idx, 1);
  }
  red.sort((a, b) => a - b);
  const blue = Math.floor(Math.random() * 16) + 1;
  return { red, blue };
}
