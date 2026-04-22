import { useEffect, useMemo, useRef, useState } from "react";
import { useAchievementStore } from "@/store/useAchievementStore";
import { useUserStore } from "@/store/useUserStore";
import { playButtonClick, playPrizeWin } from "@/utils/sound";

/** 好运来：奖级（最高 80 万） */
type PrizeAmt = 30 | 40 | 50 | 80 | 100 | 200 | 500 | 800 | 8000 | 80000 | 800000;

/** 三同图图符：鲤=鲤鱼，三连鲤则奖金翻两倍 */
const SYM_NAMES = ["福", "元", "币", "花", "鲤"] as const;
const CARP_IDX = 4;

type TripleRound = {
  symbols: [number, number, number];
  roundPrize: PrizeAmt;
};

type DigitRow =
  | { mode: "digit"; digit: number; linePrize: PrizeAmt }
  | { mode: "fudai"; linePrize: PrizeAmt };

type TicketData = {
  triples: TripleRound[];
  hasHaoyunlai: boolean;
  winningNumbers: [number, number, number];
  digitRows: DigitRow[];
  totalPrize: number;
};

const PRICE = 30;
const TRIPLE_ROUNDS = 10;
const DIGIT_ROWS = 7;
const HAOYUNLAI_BONUS = 100;

const prizeWeights: Array<{ prize: PrizeAmt; weight: number }> = [
  { prize: 800000, weight: 1 },
  { prize: 80000, weight: 5 },
  { prize: 8000, weight: 50 },
  { prize: 800, weight: 100 },
  { prize: 500, weight: 500 },
  { prize: 200, weight: 1500 },
  { prize: 100, weight: 6500 },
  { prize: 80, weight: 18750 },
  { prize: 50, weight: 37500 },
  { prize: 40, weight: 82500 },
  { prize: 30, weight: 577500 },
];

function pickPrizeFromWeights(): PrizeAmt {
  const totalWeight = prizeWeights.reduce((s, x) => s + x.weight, 0);
  const r = Math.random() * totalWeight;
  let acc = 0;
  for (const it of prizeWeights) {
    acc += it.weight;
    if (r <= acc) return it.prize;
  }
  return prizeWeights[prizeWeights.length - 1].prize;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick3DistinctDigits(): [number, number, number] {
  const s = new Set<number>();
  while (s.size < 3) s.add(randInt(0, 9));
  const arr = [...s];
  return [arr[0], arr[1], arr[2]];
}

function tripleRoundWin(tr: TripleRound): number {
  const [a, b, c] = tr.symbols;
  if (a !== b || b !== c) return 0;
  const mult = a === CARP_IDX ? 2 : 1;
  return tr.roundPrize * mult;
}

function digitRowWin(row: DigitRow, wins: Set<number>): number {
  if (row.mode === "fudai") return row.linePrize * 10;
  if (row.mode === "digit" && wins.has(row.digit)) return row.linePrize;
  return 0;
}

function computeTotal(data: Omit<TicketData, "totalPrize">): number {
  let s = 0;
  for (const tr of data.triples) s += tripleRoundWin(tr);
  if (data.hasHaoyunlai) s += HAOYUNLAI_BONUS;
  const wins = new Set<number>(data.winningNumbers);
  for (const row of data.digitRows) s += digitRowWin(row, wins);
  return s;
}

class HaoYunLaiGenerator {
  /**
   * 数值目标：长期期望返奖率约 65%（相对面值 30 元）。
   * 三同、好运来、对数字/福袋均为独立稀有事件，多数票仅小奖或空手。
   */
  private readonly pTripleWin = 0.0155;
  /** 单行刻意中奖（对数字或福袋） */
  private readonly pDigitRowWin = 0.0305;
  private readonly pHaoyunlai = 0.004;

  generate(): TicketData {
    const triples: TripleRound[] = [];
    for (let i = 0; i < TRIPLE_ROUNDS; i += 1) {
      const roundPrize = pickPrizeFromWeights();
      let symbols: [number, number, number];
      if (Math.random() < this.pTripleWin) {
        const sym = randInt(0, 4);
        symbols = [sym, sym, sym];
      } else {
        do {
          symbols = [randInt(0, 4), randInt(0, 4), randInt(0, 4)];
        } while (symbols[0] === symbols[1] && symbols[1] === symbols[2]);
      }
      triples.push({ symbols, roundPrize });
    }

    const hasHaoyunlai = Math.random() < this.pHaoyunlai;
    const winningNumbers = pick3DistinctDigits();

    const digitRows: DigitRow[] = [];
    const winSet = new Set(winningNumbers);
    for (let i = 0; i < DIGIT_ROWS; i += 1) {
      const linePrize = pickPrizeFromWeights();
      if (Math.random() < this.pDigitRowWin) {
        if (Math.random() < 0.06) {
          digitRows.push({ mode: "fudai", linePrize });
        } else {
          const d = winningNumbers[randInt(0, 2)];
          digitRows.push({ mode: "digit", digit: d, linePrize });
        }
      } else {
        let d = randInt(0, 9);
        let guard = 0;
        while (winSet.has(d) && guard < 30) {
          d = randInt(0, 9);
          guard += 1;
        }
        digitRows.push({ mode: "digit", digit: d, linePrize });
      }
    }

    const base: Omit<TicketData, "totalPrize"> = {
      triples,
      hasHaoyunlai,
      winningNumbers,
      digitRows,
    };
    return { ...base, totalPrize: computeTotal(base) };
  }
}

function fitCanvasToCSS(canvas: HTMLCanvasElement) {
  const dpr = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return { dpr, w, h };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function formatYuan(n: number): string {
  return `¥${(Math.round(n * 100) / 100).toFixed(2)}`;
}

function playScratchBeep() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioContextCtor: any = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 250;
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.055, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
    osc.start(now);
    osc.stop(now + 0.04);
    setTimeout(() => void ctx.close(), 120);
  } catch {
    // ignore
  }
}

export function HaoYunLaiGamePage() {
  const balance = useUserStore((s) => s.balance);
  const adjustBalance = useUserStore((s) => s.adjustBalance);

  const generator = useMemo(() => new HaoYunLaiGenerator(), []);
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [settled, setSettled] = useState(false);
  const [toast, setToast] = useState("点击「购买一张（30元）」开始。");

  const ticketCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scratchCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const isDrawingRef = useRef(false);
  const lastSfxAtRef = useRef(0);
  const moveCounterRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number; age: number; r: number }>>([]);

  const currentPrize = settled && ticket ? ticket.totalPrize : 0;

  const drawTicket = (data: TicketData) => {
    const canvas = ticketCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { dpr, w, h } = fitCanvasToCSS(canvas);

    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, "rgba(127, 29, 29, 0.98)");
    bg.addColorStop(0.35, "rgba(153, 27, 27, 0.95)");
    bg.addColorStop(0.65, "rgba(69, 10, 10, 0.96)");
    bg.addColorStop(1, "rgba(30, 8, 8, 1)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = 0.15;
    for (let i = 0; i < 400; i += 1) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.fillStyle = `rgba(250, 204, 21, ${Math.random() * 0.25})`;
      ctx.font = `${(12 + Math.random() * 18) * dpr}px serif`;
      ctx.fillText("福", x, y);
    }
    ctx.restore();

    const pad = 10 * dpr;
    const panelX = pad;
    const panelY = pad;
    const panelW = w - pad * 2;
    const panelH = h - pad * 2;
    roundRect(ctx, panelX, panelY, panelW, panelH, 14 * dpr);
    ctx.strokeStyle = "rgba(250, 204, 21, 0.55)";
    ctx.lineWidth = 2.5 * dpr;
    ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fill();

    const headerH = 44 * dpr;
    roundRect(ctx, panelX + 8 * dpr, panelY + 8 * dpr, panelW - 16 * dpr, headerH, 12 * dpr);
    const hg = ctx.createLinearGradient(panelX, 0, panelX + panelW, 0);
    hg.addColorStop(0, "rgba(180, 83, 9, 0.95)");
    hg.addColorStop(0.5, "rgba(250, 204, 21, 0.9)");
    hg.addColorStop(1, "rgba(180, 83, 9, 0.92)");
    ctx.fillStyle = hg;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 1.5 * dpr;
    ctx.stroke();

    ctx.save();
    ctx.fillStyle = "rgba(69, 10, 10, 0.98)";
    ctx.font = `${20 * dpr}px ui-sans-serif, system-ui`;
    ctx.fillText("好运来", panelX + 18 * dpr, panelY + 38 * dpr);
    ctx.font = `${9 * dpr}px ui-sans-serif, system-ui`;
    ctx.fillText("福彩 · 面值 30 元 · 最高 80 万 · 18 次机会 · 三重玩法", panelX + 100 * dpr, panelY + 28 * dpr);
    ctx.fillText("三同图 + 好运来 100 元 + 对数字（福袋 10 倍）", panelX + 100 * dpr, panelY + 42 * dpr);
    ctx.restore();

    let yCursor = panelY + headerH + 14 * dpr;

    const label = (text: string, y: number) => {
      ctx.save();
      ctx.fillStyle = "rgba(254, 243, 199, 0.9)";
      ctx.font = `${10 * dpr}px ui-sans-serif, system-ui`;
      ctx.fillText(text, panelX + 12 * dpr, y);
      ctx.restore();
    };

    label("玩法一 · 三同图（10 局，鲤=翻倍）", yCursor);
    yCursor += 14 * dpr;

    const triTop = yCursor;
    const triGap = 5 * dpr;
    const triColW = (panelW - 24 * dpr - triGap) / 2;
    const triRowH = 38 * dpr;

    for (let i = 0; i < TRIPLE_ROUNDS; i += 1) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const tx = panelX + 12 * dpr + col * (triColW + triGap);
      const ty = triTop + row * (triRowH + triGap);
      roundRect(ctx, tx, ty, triColW, triRowH, 8 * dpr);
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.fill();
      ctx.strokeStyle = "rgba(250, 204, 21, 0.25)";
      ctx.lineWidth = 1.2 * dpr;
      ctx.stroke();

      const tr = data.triples[i];
      ctx.save();
      ctx.fillStyle = "rgba(254, 243, 199, 0.75)";
      ctx.font = `${8 * dpr}px ui-sans-serif, system-ui`;
      ctx.fillText(`第${i + 1}局`, tx + 6 * dpr, ty + 12 * dpr);
      ctx.fillStyle = "rgba(255, 250, 240, 0.95)";
      ctx.font = `${13 * dpr}px ui-sans-serif, system-ui`;
      const sx = tr.symbols.map((n) => SYM_NAMES[n]).join(" ");
      ctx.fillText(sx, tx + 6 * dpr, ty + 26 * dpr);
      ctx.fillStyle = "rgba(250, 204, 21, 0.95)";
      ctx.font = `${10 * dpr}px ui-sans-serif, system-ui`;
      ctx.textAlign = "right";
      ctx.fillText(`¥${tr.roundPrize}`, tx + triColW - 6 * dpr, ty + 26 * dpr);
      ctx.textAlign = "left";
      ctx.restore();
    }

    yCursor = triTop + 5 * (triRowH + triGap) + 8 * dpr;

    label("玩法二 · 图符即中", yCursor);
    yCursor += 12 * dpr;

    const bonusH = 28 * dpr;
    roundRect(ctx, panelX + 12 * dpr, yCursor, panelW - 24 * dpr, bonusH, 10 * dpr);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fill();
    ctx.strokeStyle = "rgba(250, 204, 21, 0.35)";
    ctx.stroke();
    ctx.save();
    ctx.fillStyle = "rgba(254, 243, 199, 0.95)";
    ctx.font = `${12 * dpr}px ui-sans-serif, system-ui`;
    ctx.textAlign = "center";
    const bonusText = data.hasHaoyunlai ? "好运来 · 中 ¥100" : "未出现「好运来」";
    ctx.fillText(bonusText, panelX + panelW / 2, yCursor + bonusH / 2 + 4 * dpr);
    ctx.textAlign = "left";
    ctx.restore();
    yCursor += bonusH + 10 * dpr;

    label("玩法三 · 对数字（福袋=10 倍）", yCursor);
    yCursor += 12 * dpr;

    const winY = yCursor;
    roundRect(ctx, panelX + 12 * dpr, winY, panelW - 24 * dpr, 22 * dpr, 8 * dpr);
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fill();
    ctx.strokeStyle = "rgba(250, 204, 21, 0.3)";
    ctx.stroke();
    ctx.save();
    ctx.fillStyle = "rgba(254, 243, 199, 0.95)";
    ctx.font = `${11 * dpr}px ui-sans-serif, system-ui`;
    const [n1, n2, n3] = data.winningNumbers;
    ctx.fillText(`中奖号码  ${n1}    ${n2}    ${n3}`, panelX + 18 * dpr, winY + 15 * dpr);
    ctx.restore();
    yCursor += 26 * dpr;

    const dRowH = 22 * dpr;
    const dGap = 4 * dpr;
    for (let i = 0; i < DIGIT_ROWS; i += 1) {
      const row = data.digitRows[i];
      const ry = yCursor + i * (dRowH + dGap);
      if (ry + dRowH > panelY + panelH - 8 * dpr) break;
      roundRect(ctx, panelX + 12 * dpr, ry, panelW - 24 * dpr, dRowH, 6 * dpr);
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fill();
      ctx.strokeStyle = "rgba(250, 204, 21, 0.2)";
      ctx.stroke();
      ctx.save();
      const myStr = row.mode === "fudai" ? "福袋" : String(row.digit);
      ctx.fillStyle = row.mode === "fudai" ? "rgba(251, 191, 36, 0.98)" : "rgba(254, 243, 199, 0.95)";
      ctx.font = `${11 * dpr}px ui-sans-serif, system-ui`;
      ctx.fillText(`我的 ${myStr}`, panelX + 14 * dpr, ry + 15 * dpr);
      ctx.fillStyle = "rgba(250, 204, 21, 0.95)";
      ctx.font = `${10 * dpr}px ui-sans-serif, system-ui`;
      ctx.textAlign = "right";
      ctx.fillText(`¥${row.linePrize}`, panelX + panelW - 18 * dpr, ry + 15 * dpr);
      ctx.textAlign = "left";
      ctx.restore();
    }
  };

  const drawScratchLayer = () => {
    const canvas = scratchCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { dpr, w, h } = fitCanvasToCSS(canvas);

    ctx.globalCompositeOperation = "source-over";
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "rgba(212, 175, 55, 0.95)");
    g.addColorStop(0.45, "rgba(180, 83, 9, 0.92)");
    g.addColorStop(1, "rgba(120, 53, 15, 0.95)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = 0.2;
    for (let i = 0; i < 2000; i += 1) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = (Math.random() * 1.5 + 0.2) * dpr;
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.2})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 250, 0.92)";
    ctx.font = `${20 * dpr}px ui-sans-serif, system-ui`;
    ctx.textAlign = "center";
    ctx.fillText("请刮开涂层", w / 2, h / 2 - 8 * dpr);
    ctx.font = `${13 * dpr}px ui-sans-serif, system-ui`;
    ctx.fillStyle = "rgba(255, 250, 240, 0.75)";
    ctx.fillText("（刮开面积达 60% 自动结算）", w / 2, h / 2 + 18 * dpr);
    ctx.restore();
  };

  const clearScratchLayer = () => {
    const canvas = scratchCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { w, h } = fitCanvasToCSS(canvas);
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, w, h);
  };

  const calcScratchedPercent = (): number => {
    const canvas = scratchCanvasRef.current;
    if (!canvas) return 0;
    const ctx = canvas.getContext("2d");
    if (!ctx) return 0;
    const { w, h } = fitCanvasToCSS(canvas);
    const img = ctx.getImageData(0, 0, w, h).data;
    const step = 6;
    let total = 0;
    let transparent = 0;
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const a = img[(y * w + x) * 4 + 3];
        total += 1;
        if (a === 0) transparent += 1;
      }
    }
    return total > 0 ? transparent / total : 0;
  };

  const tickParticles = (dt: number) => {
    const canvas = particleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { dpr, w, h } = fitCanvasToCSS(canvas);
    ctx.clearRect(0, 0, w, h);
    const particles = particlesRef.current;
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.age += dt;
      if (p.age >= p.life) {
        particles.splice(i, 1);
        continue;
      }
      const t = p.age / p.life;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.86;
      p.vy *= 0.86;
      const alpha = (1 - t) * 0.75;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(254, 243, 199, 0.95)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (particles.length === 0 && rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const startParticleRAF = () => {
    if (rafRef.current != null) return;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      tickParticles(dt);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  const spawnParticles = (x: number, y: number) => {
    const particles = particlesRef.current;
    const n = 6 + Math.floor(Math.random() * 6);
    for (let i = 0; i < n; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const s = 40 + Math.random() * 120;
      particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.5 + Math.random() * 0.45,
        age: 0,
        r: 1.6 + Math.random() * 2.8,
      });
    }
    startParticleRAF();
  };

  const scratchAt = (clientX: number, clientY: number) => {
    if (!ticket || settled) return;
    const canvas = scratchCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const { dpr } = fitCanvasToCSS(canvas);
    const x = (clientX - rect.left) * dpr;
    const y = (clientY - rect.top) * dpr;

    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    const radius = 26 * dpr;
    const g = ctx.createRadialGradient(x, y, radius * 0.15, x, y, radius);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    spawnParticles(x, y);

    const now = performance.now();
    if (now - lastSfxAtRef.current > 38) {
      lastSfxAtRef.current = now;
      playScratchBeep();
    }

    moveCounterRef.current += 1;
    if (moveCounterRef.current % 10 === 0) {
      const p = calcScratchedPercent();
      if (p >= 0.6) void settleTicket("auto");
    }
  };

  const settleTicket = async (_reason: "auto" | "manual") => {
    if (!ticket || settled) return;
    setSettled(true);
    clearScratchLayer();
    particlesRef.current = [];

    if (ticket.totalPrize > 0) {
      adjustBalance(ticket.totalPrize);
      await playPrizeWin();
      setToast(`恭喜中奖：本张获得 ${formatYuan(ticket.totalPrize)}（三重玩法可兼得）`);
    } else {
      setToast("很遗憾：本张未中奖，再接再厉！");
    }
    useAchievementStore.getState().recordScratchSettle(ticket.totalPrize);
  };

  const buyTicket = async () => {
    await playButtonClick();
    if (balance < PRICE) {
      setToast("余额不足，无法购买（需要 ¥30.00）");
      return;
    }
    adjustBalance(-PRICE);
    useAchievementStore.getState().recordScratchPurchase("haoyunlai", PRICE);
    const t = generator.generate();
    setTicket(t);
    setSettled(false);
    moveCounterRef.current = 0;
    setToast("已购买：请刮开涂层查看结果。");
  };

  const demoTicket: TicketData = (() => {
    const triples: TripleRound[] = [
      { symbols: [0, 0, 0], roundPrize: 500 },
      { symbols: [1, 2, 1], roundPrize: 200 },
      { symbols: [4, 4, 4], roundPrize: 80 },
      { symbols: [3, 3, 3], roundPrize: 40 },
      { symbols: [2, 2, 1], roundPrize: 100 },
      { symbols: [0, 1, 0], roundPrize: 50 },
      { symbols: [3, 3, 3], roundPrize: 30 },
      { symbols: [1, 1, 1], roundPrize: 200 },
      { symbols: [2, 3, 2], roundPrize: 500 },
      { symbols: [0, 0, 2], roundPrize: 100 },
    ];
    const digitRows: DigitRow[] = [
      { mode: "digit", digit: 3, linePrize: 100 },
      { mode: "digit", digit: 5, linePrize: 50 },
      { mode: "fudai", linePrize: 30 },
      { mode: "digit", digit: 1, linePrize: 80 },
      { mode: "digit", digit: 7, linePrize: 40 },
      { mode: "digit", digit: 2, linePrize: 30 },
      { mode: "digit", digit: 9, linePrize: 50 },
    ];
    const winningNumbers: [number, number, number] = [3, 5, 8];
    const base = {
      triples,
      hasHaoyunlai: true,
      winningNumbers,
      digitRows,
    };
    return { ...base, totalPrize: computeTotal(base) };
  })();

  useEffect(() => {
    drawTicket(demoTicket);
    drawScratchLayer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ticket) return;
    drawTicket(ticket);
    if (!settled) drawScratchLayer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket, settled]);

  useEffect(() => {
    const onResize = () => {
      if (ticket) drawTicket(ticket);
      else drawTicket(demoTicket);
      if (!settled) drawScratchLayer();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket, settled]);

  useEffect(() => {
    const canvas = scratchCanvasRef.current;
    if (!canvas) return;

    const onPointerDown = (e: PointerEvent) => {
      if (!ticket || settled) return;
      isDrawingRef.current = true;
      canvas.setPointerCapture(e.pointerId);
      scratchAt(e.clientX, e.clientY);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDrawingRef.current) return;
      scratchAt(e.clientX, e.clientY);
    };
    const onPointerUp = () => {
      isDrawingRef.current = false;
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerUp);
    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket, settled]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/70 via-slate-900/30 to-slate-950/70 p-7 shadow-xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">彩票模拟器 · 好运来</h2>
            <p className="mt-2 text-sm text-slate-300">
              面值 30 元：三同图 + 鲤翻倍、好运来 100 元、对数字与福袋 10 倍；18 次机会，最高 80 万元。
            </p>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300">
              本张中奖：<span className="font-bold text-amber-200">{formatYuan(currentPrize)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative w-full overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950/40 to-slate-900/30 shadow-xl">
        <div className="p-6 sm:p-7">
          <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-amber-700/30 bg-black/30 shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-transparent" />
            <div className="relative aspect-[3/5] w-full max-h-[min(92vh,960px)]">
              <canvas ref={ticketCanvasRef} className="absolute inset-0 h-full w-full" />
              <canvas ref={scratchCanvasRef} className="absolute inset-0 h-full w-full cursor-crosshair" />
              <canvas ref={particleCanvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
          <div className="text-sm font-semibold text-white">玩法说明</div>
          <div className="mt-2 text-sm leading-relaxed text-slate-300">
            - 玩法一：10 局三同图，三连相同即中该局奖金；三连「鲤」（鲤鱼）再翻一倍
            <br />- 玩法二：刮出「好运来」即得 100 元（模拟为独立图符区）
            <br />- 玩法三：我的号码与任一中奖号码相同即中该行奖金；「福袋」为该行奖金 10 倍
            <br />- 10+1+7=18 次机会可兼得；刮开 ≥60% 自动结算
          </div>
          {toast ? (
            <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">{toast}</div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-white">操作</div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300">
              本张中奖：<span className="font-bold text-amber-200">{formatYuan(currentPrize)}</span>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => void buyTicket()}
              className="inline-flex flex-1 items-center justify-center rounded-2xl bg-gradient-to-b from-amber-300 to-red-700 px-5 py-3 text-sm font-semibold text-amber-50 shadow-[0_10px_30px_rgba(185,28,28,0.35)] transition hover:brightness-110 active:translate-y-px"
            >
              购买一张（30元）
            </button>
            <button
              type="button"
              disabled={!ticket || settled}
              onClick={() => void settleTicket("manual")}
              className="inline-flex flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/90 transition hover:border-white/20 hover:bg-white/10 disabled:opacity-50"
            >
              自动刮开
            </button>
          </div>
          <div className="mt-4 text-xs leading-relaxed text-slate-400">
            提示：奖金与概率为模拟演示；红金票面为风格化设计，不代表真实印刷。
          </div>
        </div>
      </div>
    </div>
  );
}
