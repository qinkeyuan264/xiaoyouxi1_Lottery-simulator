import { useEffect, useMemo, useRef, useState } from "react";
import { useAchievementStore } from "@/store/useAchievementStore";
import { useUserStore } from "@/store/useUserStore";
import { playButtonClick, playPrizeWin } from "@/utils/sound";

/** 马到成功：奖级金额（最高 100 万） */
type CellPrizeAmt = 20 | 30 | 50 | 100 | 200 | 500 | 1000 | 10000 | 100000 | 1000000;

type CellSymbol = "blank" | "horse" | "cloud" | "success";

type CellData = {
  amount: CellPrizeAmt;
  symbol: CellSymbol;
};

type TicketData = {
  cells: CellData[];
  totalPrize: number;
  /** 若出现「成功」，为 25 格金额之和（通吃） */
  sumAllAmounts: number;
};

const PRICE = 20;
const GRID_COLS = 5;
const GRID_ROWS = 5;
const CELLS = GRID_COLS * GRID_ROWS;

function computeTotalPrize(cells: CellData[]): { total: number; sumAll: number } {
  const sumAll = cells.reduce((s, c) => s + c.amount, 0);
  if (cells.some((c) => c.symbol === "success")) {
    return { total: sumAll, sumAll };
  }
  const t = cells.reduce((s, c) => {
    if (c.symbol === "horse") return s + c.amount;
    if (c.symbol === "cloud") return s + 2 * c.amount;
    return s;
  }, 0);
  return { total: t, sumAll };
}

/**
 * 马到成功（福彩风格，20 元）
 * - 「马」：中该格下方所示金额
 * - 「祥云」：中该格下方所示金额的 2 倍
 * - 「成功」：中刮开区内 25 个金额之和（通吃）
 */
class MaDaoChengGongGenerator {
  private readonly prizeWeights: Array<{ prize: CellPrizeAmt; weight: number }> = [
    { prize: 1000000, weight: 1 },
    { prize: 100000, weight: 5 },
    { prize: 10000, weight: 50 },
    { prize: 1000, weight: 100 },
    { prize: 500, weight: 500 },
    { prize: 200, weight: 1500 },
    { prize: 100, weight: 6500 },
    { prize: 50, weight: 18750 },
    { prize: 30, weight: 37500 },
    { prize: 20, weight: 577500 },
  ];

  private readonly totalWeight = this.prizeWeights.reduce((s, x) => s + x.weight, 0);

  /**
   * 数值目标：长期期望返奖率约 65%（相对面值 20 元），中奖面显著低于「格格易中」。
   * 单格出现马/祥云的概率压低，使整张票常出现大面积「空白格」。
   */
  private readonly pCellWin = 0.016;

  /** 「成功」通吃彩蛋（极低概率） */
  private readonly pSuccess = 0.00003;

  private pickPrize(): CellPrizeAmt {
    const r = Math.random() * this.totalWeight;
    let acc = 0;
    for (const it of this.prizeWeights) {
      acc += it.weight;
      if (r <= acc) return it.prize;
    }
    return this.prizeWeights[this.prizeWeights.length - 1].prize;
  }

  generate(): TicketData {
    const amounts: CellPrizeAmt[] = Array.from({ length: CELLS }, () => this.pickPrize());
    for (let i = amounts.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = amounts[i];
      amounts[i] = amounts[j];
      amounts[j] = tmp;
    }

    const symbols: CellSymbol[] = Array.from({ length: CELLS }, () => "blank");

    if (Math.random() < this.pSuccess) {
      const idx = Math.floor(Math.random() * CELLS);
      symbols[idx] = "success";
    } else {
      for (let i = 0; i < CELLS; i += 1) {
        if (Math.random() < this.pCellWin) {
          symbols[i] = Math.random() < 0.62 ? "horse" : "cloud";
        }
      }
    }

    const cells: CellData[] = amounts.map((amount, i) => ({ amount, symbol: symbols[i] }));
    const { total, sumAll } = computeTotalPrize(cells);
    return { cells, totalPrize: total, sumAllAmounts: sumAll };
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

export function MaDaoChengGongGamePage() {
  const balance = useUserStore((s) => s.balance);
  const adjustBalance = useUserStore((s) => s.adjustBalance);

  const generator = useMemo(() => new MaDaoChengGongGenerator(), []);
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [settled, setSettled] = useState(false);
  const [toast, setToast] = useState("点击「购买一张（20元）」开始。");

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
    bg.addColorStop(0, "rgba(254, 243, 199, 1)");
    bg.addColorStop(0.45, "rgba(254, 249, 231, 1)");
    bg.addColorStop(1, "rgba(220, 252, 231, 1)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 700; i += 1) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`;
      ctx.fillRect(x, y, 1.2 * dpr, 1.2 * dpr);
    }
    ctx.restore();

    const pad = 14 * dpr;
    const panelX = pad;
    const panelY = pad;
    const panelW = w - pad * 2;
    const panelH = h - pad * 2;
    roundRect(ctx, panelX, panelY, panelW, panelH, 18 * dpr);
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.fill();
    ctx.strokeStyle = "rgba(22, 101, 52, 0.35)";
    ctx.lineWidth = 2 * dpr;
    ctx.stroke();

    const headerH = 58 * dpr;
    roundRect(ctx, panelX + 10 * dpr, panelY + 10 * dpr, panelW - 20 * dpr, headerH, 14 * dpr);
    const hg = ctx.createLinearGradient(panelX, 0, panelX + panelW, 0);
    hg.addColorStop(0, "rgba(22, 163, 74, 0.95)");
    hg.addColorStop(0.5, "rgba(234, 179, 8, 0.9)");
    hg.addColorStop(1, "rgba(22, 163, 74, 0.92)");
    ctx.fillStyle = hg;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2 * dpr;
    ctx.stroke();

    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.98)";
    ctx.font = `${22 * dpr}px ui-sans-serif, system-ui`;
    ctx.fillText("马到成功", panelX + 22 * dpr, panelY + 46 * dpr);
    ctx.font = `${10 * dpr}px ui-sans-serif, system-ui`;
    ctx.fillText("中国福利彩票 · 面值 20 元 · 最高奖金 100 万元 · 25 次机会", panelX + 130 * dpr, panelY + 34 * dpr);
    ctx.fillText("马=该格金额 · 祥云=2 倍 · 成功=25 格金额通吃", panelX + 130 * dpr, panelY + 52 * dpr);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(15,23,42,0.65)";
    ctx.font = `${11 * dpr}px ui-sans-serif, system-ui`;
    ctx.fillText("刮开覆盖膜，查看图符与对应奖金：", panelX + 16 * dpr, panelY + headerH + 28 * dpr);
    ctx.restore();

    const gridTop = panelY + headerH + 38 * dpr;
    const gridLeft = panelX + 12 * dpr;
    const gridW = panelW - 24 * dpr;
    const gridH = panelY + panelH - gridTop - 12 * dpr;
    const gap = 6 * dpr;
    const cellW = (gridW - gap * (GRID_COLS - 1)) / GRID_COLS;
    const cellH = (gridH - gap * (GRID_ROWS - 1)) / GRID_ROWS;

    for (let r = 0; r < GRID_ROWS; r += 1) {
      for (let c = 0; c < GRID_COLS; c += 1) {
        const i = r * GRID_COLS + c;
        const cell = data.cells[i];
        const x = gridLeft + c * (cellW + gap);
        const y = gridTop + r * (cellH + gap);
        roundRect(ctx, x, y, cellW, cellH, 10 * dpr);
        ctx.fillStyle = "rgba(255,255,255,0.82)";
        ctx.fill();
        ctx.strokeStyle = "rgba(15, 23, 42, 0.14)";
        ctx.lineWidth = 1.5 * dpr;
        ctx.stroke();

        const sym = cell.symbol;
        ctx.save();
        ctx.textAlign = "center";
        if (sym === "success") {
          ctx.fillStyle = "rgba(220, 38, 38, 0.95)";
          ctx.font = `${13 * dpr}px ui-sans-serif, system-ui`;
          ctx.fillText("成功", x + cellW / 2, y + cellH * 0.38);
        } else if (sym === "cloud") {
          ctx.fillStyle = "rgba(37, 99, 235, 0.92)";
          ctx.font = `${11 * dpr}px ui-sans-serif, system-ui`;
          ctx.fillText("祥云", x + cellW / 2, y + cellH * 0.38);
        } else if (sym === "horse") {
          ctx.fillStyle = "rgba(22, 101, 52, 0.95)";
          ctx.font = `${14 * dpr}px ui-sans-serif, system-ui`;
          ctx.fillText("马", x + cellW / 2, y + cellH * 0.4);
        } else {
          ctx.fillStyle = "rgba(15, 23, 42, 0.35)";
          ctx.font = `${12 * dpr}px ui-sans-serif, system-ui`;
          ctx.fillText("—", x + cellW / 2, y + cellH * 0.38);
        }

        ctx.fillStyle = "rgba(180, 83, 9, 0.95)";
        ctx.font = `${11 * dpr}px ui-sans-serif, system-ui`;
        ctx.fillText(`¥${cell.amount}`, x + cellW / 2, y + cellH * 0.78);
        ctx.restore();
      }
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
    g.addColorStop(0, "rgba(210, 218, 232, 1)");
    g.addColorStop(0.4, "rgba(160, 172, 192, 1)");
    g.addColorStop(1, "rgba(225, 232, 244, 1)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = 0.22;
    for (let i = 0; i < 2400; i += 1) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = (Math.random() * 1.7 + 0.2) * dpr;
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.18})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
    ctx.font = `${22 * dpr}px ui-sans-serif, system-ui`;
    ctx.textAlign = "center";
    ctx.fillText("请刮开涂层", w / 2, h / 2 - 10 * dpr);
    ctx.font = `${14 * dpr}px ui-sans-serif, system-ui`;
    ctx.fillStyle = "rgba(15, 23, 42, 0.62)";
    ctx.fillText("（刮开面积达 60% 自动结算）", w / 2, h / 2 + 22 * dpr);
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
      ctx.fillStyle = "rgba(255,255,255,0.95)";
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
      const hit = ticket.cells.some((c) => c.symbol === "success");
      setToast(
        hit
          ? `恭喜「通吃」彩蛋：本张获得 ${formatYuan(ticket.totalPrize)}（25 格金额之和）`
          : `恭喜中奖：本张获得 ${formatYuan(ticket.totalPrize)}（马/祥云可兼中兼得）`,
      );
    } else {
      setToast("很遗憾：本张未中奖，再接再厉！");
    }
    useAchievementStore.getState().recordScratchSettle(ticket.totalPrize);
  };

  const buyTicket = async () => {
    await playButtonClick();
    if (balance < PRICE) {
      setToast("余额不足，无法购买（需要 ¥20.00）");
      return;
    }
    adjustBalance(-PRICE);
    useAchievementStore.getState().recordScratchPurchase("madao", PRICE);
    const t = generator.generate();
    setTicket(t);
    setSettled(false);
    moveCounterRef.current = 0;
    setToast("已购买：请刮开涂层查看结果。");
  };

  const demoCells: CellData[] = (() => {
    const base: CellData[] = Array.from({ length: CELLS }, () => ({
      amount: 20 as CellPrizeAmt,
      symbol: "blank" as CellSymbol,
    }));
    base[0] = { amount: 50, symbol: "horse" };
    base[3] = { amount: 30, symbol: "cloud" };
    base[12] = { amount: 100, symbol: "horse" };
    return base;
  })();

  const demoTicket: TicketData = (() => {
    const { total, sumAll } = computeTotalPrize(demoCells);
    return { cells: demoCells, totalPrize: total, sumAllAmounts: sumAll };
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
            <h2 className="text-2xl font-bold text-white">彩票模拟器 · 马到成功</h2>
            <p className="mt-2 text-sm text-slate-300">
              面值 20 元：找「马」「祥云」「成功」图符；祥云 2 倍；「成功」通吃 25 格金额之和；最高 100 万元。
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
          <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-black/20 shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-transparent" />
            <div className="relative aspect-[4/5] w-full max-h-[min(90vh,920px)]">
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
            - 票面 5×5 共 25 格，每格有图符与下方所示金额
            <br />- 「马」：中该格金额；「祥云」：中该格金额的 2 倍
            <br />- 「成功」：中 25 格全部金额之和（通吃彩蛋）
            <br />- 马与祥云可兼中兼得；刮开 ≥ 60% 自动结算
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
              className="inline-flex flex-1 items-center justify-center rounded-2xl bg-gradient-to-b from-emerald-300 to-emerald-600 px-5 py-3 text-sm font-semibold text-slate-900 shadow-[0_10px_30px_rgba(52,211,153,0.28)] transition hover:brightness-110 active:translate-y-px"
            >
              购买一张（20元）
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
            提示：奖金与概率为模拟演示，不代表真实票面；请以实际票面为准。
          </div>
        </div>
      </div>
    </div>
  );
}
