import { useEffect, useMemo, useRef, useState } from "react";
import { useAchievementStore } from "@/store/useAchievementStore";
import { useUserStore } from "@/store/useUserStore";
import { playButtonClick, playPrizeWin } from "@/utils/sound";

/** 超级 9：奖级（最高 100 万） */
type PrizeAmt = 50 | 60 | 80 | 100 | 150 | 300 | 500 | 1000 | 10000 | 50000 | 1000000;

type Play1Cell = { isNine: boolean; prize: PrizeAmt };

type Play2Round = { left: number; right: number; roundPrize: PrizeAmt };

type Play3Row =
  | { mode: "digit"; digit: number; linePrize: PrizeAmt }
  | { mode: "triple9"; linePrize: PrizeAmt };

type TicketData = {
  play1: Play1Cell[];
  play2: Play2Round[];
  winningNumbers: [number, number, number];
  play3: Play3Row[];
  totalPrize: number;
};

const PRICE = 50;
const PLAY1_CELLS = 20;
const PLAY2_ROUNDS = 3;
const PLAY3_ROWS = 17;
const TOTAL_CHANCES = PLAY1_CELLS + PLAY2_ROUNDS + PLAY3_ROWS;

const prizeWeights: Array<{ prize: PrizeAmt; weight: number }> = [
  { prize: 1000000, weight: 1 },
  { prize: 50000, weight: 5 },
  { prize: 10000, weight: 50 },
  { prize: 1000, weight: 100 },
  { prize: 500, weight: 500 },
  { prize: 300, weight: 1500 },
  { prize: 150, weight: 6500 },
  { prize: 100, weight: 18750 },
  { prize: 80, weight: 37500 },
  { prize: 60, weight: 82500 },
  { prize: 50, weight: 577500 },
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

function play1Total(cells: Play1Cell[]): number {
  return cells.reduce((sum, c) => sum + (c.isNine ? c.prize : 0), 0);
}

function play2Total(rounds: Play2Round[]): number {
  return rounds.reduce((sum, r) => sum + (r.left + r.right === 9 ? r.roundPrize : 0), 0);
}

function play3RowWin(row: Play3Row, wins: Set<number>): number {
  if (row.mode === "triple9") return row.linePrize * 2;
  if (row.mode === "digit" && wins.has(row.digit)) return row.linePrize;
  return 0;
}

function play3Total(rows: Play3Row[], winningNumbers: [number, number, number]): number {
  const wins = new Set<number>(winningNumbers);
  return rows.reduce((s, r) => s + play3RowWin(r, wins), 0);
}

function computeTotal(data: Omit<TicketData, "totalPrize">): number {
  return play1Total(data.play1) + play2Total(data.play2) + play3Total(data.play3, data.winningNumbers);
}

class ChaoJi9Generator {
  /**
   * 数值目标：长期期望返奖率约 65%（相对面值 50 元），且多数票不会三区全中。
   * 此前独立概率叠加过高会导致「几乎张张有奖」。
   */
  private readonly pPlay1Nine = 0.01;
  private readonly pPlay2Sum9 = 0.06;
  private readonly pPlay3RowWin = 0.0105;

  generate(): TicketData {
    const play1: Play1Cell[] = [];
    for (let i = 0; i < PLAY1_CELLS; i += 1) {
      const prize = pickPrizeFromWeights();
      const isNine = Math.random() < this.pPlay1Nine;
      play1.push({ isNine, prize });
    }

    const play2: Play2Round[] = [];
    for (let i = 0; i < PLAY2_ROUNDS; i += 1) {
      const roundPrize = pickPrizeFromWeights();
      let left: number;
      let right: number;
      if (Math.random() < this.pPlay2Sum9) {
        left = randInt(0, 9);
        right = 9 - left;
      } else {
        do {
          left = randInt(0, 9);
          right = randInt(0, 9);
        } while (left + right === 9);
      }
      play2.push({ left, right, roundPrize });
    }

    const winningNumbers = pick3DistinctDigits();
    const winSet = new Set(winningNumbers);
    const play3: Play3Row[] = [];
    for (let i = 0; i < PLAY3_ROWS; i += 1) {
      const linePrize = pickPrizeFromWeights();
      if (Math.random() < this.pPlay3RowWin) {
        if (Math.random() < 0.05) {
          play3.push({ mode: "triple9", linePrize });
        } else {
          const d = winningNumbers[randInt(0, 2)];
          play3.push({ mode: "digit", digit: d, linePrize });
        }
      } else {
        let d = randInt(0, 9);
        let guard = 0;
        while (winSet.has(d) && guard < 40) {
          d = randInt(0, 9);
          guard += 1;
        }
        play3.push({ mode: "digit", digit: d, linePrize });
      }
    }

    const base: Omit<TicketData, "totalPrize"> = { play1, play2, winningNumbers, play3 };
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

export function ChaoJi9GamePage() {
  const balance = useUserStore((s) => s.balance);
  const adjustBalance = useUserStore((s) => s.adjustBalance);

  const generator = useMemo(() => new ChaoJi9Generator(), []);
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [settled, setSettled] = useState(false);
  const [toast, setToast] = useState("点击「购买一张（50元）」开始。");

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
    bg.addColorStop(0, "rgba(15, 15, 18, 1)");
    bg.addColorStop(0.5, "rgba(25, 25, 32, 1)");
    bg.addColorStop(1, "rgba(8, 8, 12, 1)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const pad = 10 * dpr;
    const panelX = pad;
    const panelY = pad;
    const panelW = w - pad * 2;
    const panelH = h - pad * 2;
    roundRect(ctx, panelX, panelY, panelW, panelH, 16 * dpr);
    ctx.strokeStyle = "rgba(212, 175, 55, 0.65)";
    ctx.lineWidth = 2.5 * dpr;
    ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fill();

    const headerH = 46 * dpr;
    roundRect(ctx, panelX + 8 * dpr, panelY + 8 * dpr, panelW - 16 * dpr, headerH, 12 * dpr);
    const hg = ctx.createLinearGradient(panelX, 0, panelX + panelW, 0);
    hg.addColorStop(0, "rgba(180, 83, 9, 0.35)");
    hg.addColorStop(0.5, "rgba(212, 175, 55, 0.5)");
    hg.addColorStop(1, "rgba(180, 83, 9, 0.35)");
    ctx.fillStyle = hg;
    ctx.fill();
    ctx.strokeStyle = "rgba(212, 175, 55, 0.55)";
    ctx.stroke();

    ctx.save();
    ctx.fillStyle = "rgba(250, 204, 21, 0.95)";
    ctx.font = `${22 * dpr}px ui-sans-serif, system-ui`;
    ctx.fillText("超级 9", panelX + 18 * dpr, panelY + 38 * dpr);
    ctx.font = `${9 * dpr}px ui-sans-serif, system-ui`;
    ctx.fillStyle = "rgba(229, 231, 235, 0.85)";
    ctx.fillText("黑金票 · 面值 50 元 · 最高 100 万 · 40 次机会 · 三重玩法兼中兼得", panelX + 110 * dpr, panelY + 28 * dpr);
    ctx.fillText("①找「9」②两数之和=9 ③对数字 · 999 翻倍", panelX + 110 * dpr, panelY + 44 * dpr);
    ctx.restore();

    const sectionStroke = "rgba(220, 38, 38, 0.45)";
    const goldText = "rgba(250, 204, 21, 0.92)";
    const dimText = "rgba(209, 213, 219, 0.75)";

    let y = panelY + headerH + 12 * dpr;

    const sectionTitle = (t: string) => {
      ctx.save();
      ctx.fillStyle = goldText;
      ctx.font = `${10 * dpr}px ui-sans-serif, system-ui`;
      ctx.fillText(t, panelX + 12 * dpr, y);
      ctx.restore();
      y += 12 * dpr;
    };

    sectionTitle("玩法一 · 出现「9」即中下方奖金（20 格）");
    const gCols = 5;
    const gRows = 4;
    const gGap = 4 * dpr;
    const gW = (panelW - 24 * dpr - (gCols - 1) * gGap) / gCols;
    const gH = 34 * dpr;
    for (let r = 0; r < gRows; r += 1) {
      for (let c = 0; c < gCols; c += 1) {
        const i = r * gCols + c;
        const cell = data.play1[i];
        const x = panelX + 12 * dpr + c * (gW + gGap);
        const cy = y + r * (gH + gGap);
        roundRect(ctx, x, cy, gW, gH, 6 * dpr);
        ctx.fillStyle = "rgba(127, 29, 29, 0.35)";
        ctx.fill();
        ctx.strokeStyle = sectionStroke;
        ctx.lineWidth = 1 * dpr;
        ctx.stroke();
        ctx.save();
        ctx.textAlign = "center";
        ctx.fillStyle = cell.isNine ? "rgba(250, 204, 21, 1)" : dimText;
        ctx.font = `${(cell.isNine ? 16 : 12) * dpr}px ui-sans-serif, system-ui`;
        ctx.fillText(cell.isNine ? "9" : "·", x + gW / 2, cy + 14 * dpr);
        ctx.fillStyle = "rgba(212, 175, 55, 0.95)";
        ctx.font = `${9 * dpr}px ui-sans-serif, system-ui`;
        ctx.fillText(`¥${cell.prize}`, x + gW / 2, cy + 28 * dpr);
        ctx.textAlign = "left";
        ctx.restore();
      }
    }
    y += gRows * (gH + gGap) + 10 * dpr;

    sectionTitle("玩法二 · 两数之和 = 9（3 局）");
    const p2H = 26 * dpr;
    const p2Gap = 5 * dpr;
    for (let i = 0; i < PLAY2_ROUNDS; i += 1) {
      const pr = data.play2[i];
      const py = y + i * (p2H + p2Gap);
      roundRect(ctx, panelX + 12 * dpr, py, panelW - 24 * dpr, p2H, 8 * dpr);
      ctx.fillStyle = "rgba(127, 29, 29, 0.28)";
      ctx.fill();
      ctx.strokeStyle = sectionStroke;
      ctx.stroke();
      ctx.save();
      ctx.fillStyle = dimText;
      ctx.font = `${11 * dpr}px ui-sans-serif, system-ui`;
      ctx.fillText(`第${i + 1}局  ${pr.left}  +  ${pr.right}  =  ${pr.left + pr.right}`, panelX + 18 * dpr, py + 17 * dpr);
      ctx.fillStyle = goldText;
      ctx.font = `${10 * dpr}px ui-sans-serif, system-ui`;
      ctx.textAlign = "right";
      ctx.fillText(`¥${pr.roundPrize}`, panelX + panelW - 18 * dpr, py + 17 * dpr);
      ctx.textAlign = "left";
      ctx.restore();
    }
    y += PLAY2_ROUNDS * (p2H + p2Gap) + 10 * dpr;

    sectionTitle("玩法三 · 对数字 · 999 翻倍（17 行）");
    const winY = y;
    roundRect(ctx, panelX + 12 * dpr, winY, panelW - 24 * dpr, 20 * dpr, 6 * dpr);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fill();
    ctx.strokeStyle = "rgba(212, 175, 55, 0.4)";
    ctx.stroke();
    const [a, b, c2] = data.winningNumbers;
    ctx.save();
    ctx.fillStyle = goldText;
    ctx.font = `${10 * dpr}px ui-sans-serif, system-ui`;
    ctx.fillText(`中奖号码  ${a}    ${b}    ${c2}`, panelX + 16 * dpr, winY + 14 * dpr);
    ctx.restore();
    y += 24 * dpr;

    const rowH = 18 * dpr;
    const rowGap = 3 * dpr;
    for (let i = 0; i < PLAY3_ROWS; i += 1) {
      const row = data.play3[i];
      const ry = y + i * (rowH + rowGap);
      if (ry + rowH > panelY + panelH - 6 * dpr) break;
      roundRect(ctx, panelX + 12 * dpr, ry, panelW - 24 * dpr, rowH, 5 * dpr);
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.fill();
      ctx.strokeStyle = "rgba(212, 175, 55, 0.22)";
      ctx.stroke();
      ctx.save();
      const label = row.mode === "triple9" ? "999" : String(row.digit);
      ctx.fillStyle = row.mode === "triple9" ? "rgba(250, 204, 21, 1)" : dimText;
      ctx.font = `${10 * dpr}px ui-sans-serif, system-ui`;
      ctx.fillText(`我的 ${label}`, panelX + 14 * dpr, ry + 12 * dpr);
      ctx.fillStyle = goldText;
      ctx.textAlign = "right";
      ctx.fillText(`¥${row.linePrize}`, panelX + panelW - 14 * dpr, ry + 12 * dpr);
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
    g.addColorStop(0, "rgba(55, 48, 40, 0.98)");
    g.addColorStop(0.5, "rgba(30, 27, 22, 0.98)");
    g.addColorStop(1, "rgba(20, 18, 14, 0.99)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = 0.18;
    for (let i = 0; i < 2200; i += 1) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = (Math.random() * 1.6 + 0.2) * dpr;
      ctx.fillStyle = `rgba(212,175,55,${Math.random() * 0.25})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(212, 175, 55, 0.88)";
    ctx.font = `${20 * dpr}px ui-sans-serif, system-ui`;
    ctx.textAlign = "center";
    ctx.fillText("请刮开涂层", w / 2, h / 2 - 8 * dpr);
    ctx.font = `${12 * dpr}px ui-sans-serif, system-ui`;
    ctx.fillStyle = "rgba(209, 213, 219, 0.65)";
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
      ctx.fillStyle = "rgba(212, 175, 55, 0.9)";
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
      setToast(`恭喜中奖：本张获得 ${formatYuan(ticket.totalPrize)}（三重玩法兼中兼得）`);
    } else {
      setToast("很遗憾：本张未中奖，再接再厉！");
    }
    useAchievementStore.getState().recordScratchSettle(ticket.totalPrize);
  };

  const buyTicket = async () => {
    await playButtonClick();
    if (balance < PRICE) {
      setToast("余额不足，无法购买（需要 ¥50.00）");
      return;
    }
    adjustBalance(-PRICE);
    useAchievementStore.getState().recordScratchPurchase("chaoji9", PRICE);
    const t = generator.generate();
    setTicket(t);
    setSettled(false);
    moveCounterRef.current = 0;
    setToast("已购买：请刮开涂层查看结果。");
  };

  const demoTicket: TicketData = (() => {
    const play1: Play1Cell[] = Array.from({ length: PLAY1_CELLS }, (_, i) =>
      i === 3 || i === 11 ? { isNine: true, prize: 500 } : { isNine: false, prize: 50 as PrizeAmt },
    );
    const play2: Play2Round[] = [
      { left: 4, right: 5, roundPrize: 300 },
      { left: 2, right: 3, roundPrize: 100 },
      { left: 1, right: 8, roundPrize: 150 },
    ];
    const winningNumbers: [number, number, number] = [2, 7, 9];
    const play3: Play3Row[] = [
      { mode: "digit", digit: 2, linePrize: 150 },
      { mode: "triple9", linePrize: 80 },
      { mode: "digit", digit: 1, linePrize: 60 },
      { mode: "digit", digit: 5, linePrize: 50 },
      { mode: "digit", digit: 7, linePrize: 100 },
      { mode: "digit", digit: 0, linePrize: 50 },
      { mode: "digit", digit: 3, linePrize: 60 },
      { mode: "digit", digit: 4, linePrize: 50 },
      { mode: "digit", digit: 6, linePrize: 80 },
      { mode: "digit", digit: 8, linePrize: 50 },
      { mode: "digit", digit: 9, linePrize: 150 },
      { mode: "digit", digit: 1, linePrize: 50 },
      { mode: "digit", digit: 2, linePrize: 60 },
      { mode: "digit", digit: 3, linePrize: 50 },
      { mode: "digit", digit: 4, linePrize: 100 },
      { mode: "digit", digit: 5, linePrize: 50 },
      { mode: "digit", digit: 6, linePrize: 60 },
    ];
    const base = { play1, play2, winningNumbers, play3 };
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
            <h2 className="text-2xl font-bold text-white">彩票模拟器 · 超级 9</h2>
            <p className="mt-2 text-sm text-slate-300">
              面值 50 元：找「9」、两数之和为 9、对数字与「999」翻倍；{TOTAL_CHANCES} 次机会，三重玩法兼中兼得，最高 100 万元。
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
          <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-amber-900/40 bg-black/50 shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-transparent" />
            <div className="relative aspect-[9/20] w-full max-h-[min(96vh,1000px)]">
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
            - 玩法一：20 格，刮出「9」即得该格下方奖金
            <br />- 玩法二：3 局，两数之和为 9 即得该局右侧奖金
            <br />- 玩法三：我的号码与任一中奖号码相同即得该行奖金；「999」图符该行奖金翻倍
            <br />- 共 {TOTAL_CHANCES} 次机会；刮开 ≥60% 自动结算（模拟返奖率约 65%）
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
              className="inline-flex flex-1 items-center justify-center rounded-2xl bg-gradient-to-b from-amber-500 to-amber-900 px-5 py-3 text-sm font-semibold text-amber-50 shadow-[0_10px_30px_rgba(180,83,9,0.35)] transition hover:brightness-110 active:translate-y-px"
            >
              购买一张（50元）
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
            提示：黑金票面为风格化模拟；奖金与概率不代表真实票面。
          </div>
        </div>
      </div>
    </div>
  );
}
