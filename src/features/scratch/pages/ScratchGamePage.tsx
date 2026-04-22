import { useEffect, useMemo, useRef, useState } from "react";
import { useAchievementStore } from "@/store/useAchievementStore";
import { useUserStore } from "@/store/useUserStore";
import { playButtonClick, playPrizeWin } from "@/utils/sound";

type TicketRow = { yourTime: number; prize: number };
type Outcome = { prize: number; label: string };
type TicketData = { standardTime: number; rows: TicketRow[]; totalPrize: number; outcome: Outcome };

const PRICE = 2;

class TicketGenerator {
  private pool: Array<{ prize: number; weight: number; label: string }>;
  private totalWeight: number;

  constructor() {
    this.pool = [
      { prize: 0, weight: 719, label: "未中奖" },
      { prize: 2, weight: 162, label: "九等奖" },
      { prize: 5, weight: 81, label: "八等奖" },
      { prize: 10, weight: 27, label: "七等奖" },
      { prize: 20, weight: 8, label: "六等奖" },
      { prize: 50, weight: 2, label: "五等奖" },
      { prize: 100, weight: 1, label: "四等奖" },
    ];
    this.totalWeight = this.pool.reduce((s, x) => s + x.weight, 0);
  }

  private rand(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  private randInt(min: number, max: number): number {
    return Math.floor(this.rand(min, max + 1));
  }

  private pickByWeight(): Outcome {
    const r = Math.random() * this.totalWeight;
    let acc = 0;
    for (const item of this.pool) {
      acc += item.weight;
      if (r <= acc) return { prize: item.prize, label: item.label };
    }
    const last = this.pool[this.pool.length - 1];
    return { prize: last.prize, label: last.label };
  }

  generate(): TicketData {
    const outcome = this.pickByWeight();
    const standardTime = Math.round(this.rand(150, 200)) / 10;
    const rows: TicketRow[] = Array.from({ length: 4 }, () => ({ yourTime: 0, prize: 0 }));

    if (outcome.prize > 0) {
      const winIndex = this.randInt(0, 3);
      const winDelta = Math.round(this.rand(1, 9)) / 10;
      rows[winIndex].yourTime = Math.max(0.1, Math.round((standardTime - winDelta) * 10) / 10);
      rows[winIndex].prize = outcome.prize;
      for (let i = 0; i < 4; i += 1) {
        if (i === winIndex) continue;
        const d = Math.round(this.rand(2, 30)) / 10;
        rows[i].yourTime = Math.round((standardTime + d) * 10) / 10;
        rows[i].prize = 0;
      }
    } else {
      for (let i = 0; i < 4; i += 1) {
        const d = Math.round(this.rand(2, 35)) / 10;
        rows[i].yourTime = Math.round((standardTime + d) * 10) / 10;
        rows[i].prize = 0;
      }
    }

    // 打乱展示位置，避免固定中奖格
    for (let i = rows.length - 1; i > 0; i -= 1) {
      const j = this.randInt(0, i);
      const tmp = rows[i];
      rows[i] = rows[j];
      rows[j] = tmp;
    }

    const totalPrize = rows.reduce((s, r) => s + r.prize, 0);
    return { standardTime, rows, totalPrize, outcome };
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
  // 极轻量的“刮擦”提示音：避免引入资源文件
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioContextCtor: any = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 260;
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
    osc.start(now);
    osc.stop(now + 0.04);
    setTimeout(() => {
      void ctx.close();
    }, 120);
  } catch {
    // 忽略
  }
}

export function ScratchGamePage() {
  const balance = useUserStore((s) => s.balance);
  const adjustBalance = useUserStore((s) => s.adjustBalance);

  const generator = useMemo(() => new TicketGenerator(), []);
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [settled, setSettled] = useState(false);
  const [toast, setToast] = useState<string>("点击“购买一张（2元）”开始。");

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

    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "rgba(8, 12, 28, 1)");
    bg.addColorStop(1, "rgba(3, 6, 20, 1)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const glow = ctx.createRadialGradient(w * 0.3, h * 0.22, 10, w * 0.3, h * 0.22, w * 0.9);
    glow.addColorStop(0, "rgba(96, 165, 250, 0.18)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = 0.11;
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1 * dpr;
    const step = 26 * dpr;
    for (let x = 0; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();

    const pad = 26 * dpr;
    const panelX = pad;
    const panelY = pad;
    const panelW = w - pad * 2;
    const panelH = h - pad * 2;

    roundRect(ctx, panelX, panelY, panelW, panelH, 22 * dpr);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 2 * dpr;
    ctx.stroke();

    ctx.save();
    ctx.font = `${18 * dpr}px ui-sans-serif, system-ui, -apple-system, Segoe UI`;
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.fillText("争分夺秒 · 计时对决", panelX + 18 * dpr, panelY + 34 * dpr);
    ctx.restore();

    const stdBoxX = panelX + 18 * dpr;
    const stdBoxY = panelY + 52 * dpr;
    const stdBoxW = panelW - 36 * dpr;
    const stdBoxH = 70 * dpr;
    roundRect(ctx, stdBoxX, stdBoxY, stdBoxW, stdBoxH, 18 * dpr);
    ctx.fillStyle = "rgba(15, 23, 42, 0.6)";
    ctx.fill();
    ctx.strokeStyle = "rgba(251, 191, 36, 0.28)";
    ctx.lineWidth = 2 * dpr;
    ctx.stroke();

    ctx.save();
    ctx.fillStyle = "rgba(226,232,240,0.85)";
    ctx.font = `${14 * dpr}px ui-sans-serif, system-ui`;
    ctx.fillText("标准时间（越小越快）", stdBoxX + 18 * dpr, stdBoxY + 26 * dpr);
    ctx.fillStyle = "rgba(253, 230, 138, 0.96)";
    ctx.font = `${30 * dpr}px ui-sans-serif, system-ui`;
    ctx.fillText(`${data.standardTime.toFixed(1)} 秒`, stdBoxX + 18 * dpr, stdBoxY + 58 * dpr);
    ctx.restore();

    const gridX = stdBoxX;
    const gridY = stdBoxY + stdBoxH + 18 * dpr;
    const cellGap = 14 * dpr;
    const cellW = (stdBoxW - cellGap) / 2;
    const cellH = panelY + panelH - gridY - 18 * dpr;
    const rowH = (cellH - cellGap) / 2;

    const positions = [
      [gridX, gridY],
      [gridX + cellW + cellGap, gridY],
      [gridX, gridY + rowH + cellGap],
      [gridX + cellW + cellGap, gridY + rowH + cellGap],
    ] as const;

    for (let i = 0; i < 4; i += 1) {
      const [x, y] = positions[i];
      const row = data.rows[i];
      roundRect(ctx, x, y, cellW, rowH, 18 * dpr);
      ctx.fillStyle = "rgba(2, 6, 23, 0.45)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 2 * dpr;
      ctx.stroke();

      ctx.save();
      ctx.fillStyle = "rgba(226,232,240,0.8)";
      ctx.font = `${13 * dpr}px ui-sans-serif, system-ui`;
      ctx.fillText("你的时间", x + 16 * dpr, y + 26 * dpr);
      ctx.fillStyle = "rgba(255,255,255,0.93)";
      ctx.font = `${32 * dpr}px ui-sans-serif, system-ui`;
      ctx.fillText(`${row.yourTime.toFixed(1)}`, x + 16 * dpr, y + 62 * dpr);
      ctx.fillStyle = "rgba(226,232,240,0.75)";
      ctx.font = `${14 * dpr}px ui-sans-serif, system-ui`;
      ctx.fillText("秒", x + 110 * dpr, y + 62 * dpr);

      const badgeW = 118 * dpr;
      const badgeH = 34 * dpr;
      const bx = x + cellW - badgeW - 14 * dpr;
      const by = y + 14 * dpr;
      roundRect(ctx, bx, by, badgeW, badgeH, 14 * dpr);
      const isWin = row.prize > 0;
      ctx.fillStyle = isWin ? "rgba(52, 211, 153, 0.18)" : "rgba(148, 163, 184, 0.12)";
      ctx.fill();
      ctx.strokeStyle = isWin ? "rgba(52, 211, 153, 0.35)" : "rgba(148, 163, 184, 0.18)";
      ctx.lineWidth = 2 * dpr;
      ctx.stroke();
      ctx.fillStyle = isWin ? "rgba(167, 243, 208, 0.95)" : "rgba(226,232,240,0.78)";
      ctx.font = `${14 * dpr}px ui-sans-serif, system-ui`;
      ctx.fillText(isWin ? `奖金 ¥${row.prize}` : "奖金 ¥0", bx + 12 * dpr, by + 23 * dpr);
      ctx.restore();
    }
  };

  const drawScratchLayer = () => {
    const canvas = scratchCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { dpr, w, h } = fitCanvasToCSS(canvas);

    // 需求：恢复“整张蒙版全覆盖”，更刺激
    ctx.globalCompositeOperation = "source-over";
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "rgba(210, 218, 232, 1)");
    g.addColorStop(0.4, "rgba(160, 172, 192, 1)");
    g.addColorStop(1, "rgba(225, 232, 244, 1)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = 0.22;
    for (let i = 0; i < 2200; i += 1) {
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
      setToast(`恭喜中奖：本张获得 ${formatYuan(ticket.totalPrize)}（${ticket.outcome.label}）`);
    } else {
      setToast("很遗憾：本张未中奖，再接再厉！");
    }
    useAchievementStore.getState().recordScratchSettle(ticket.totalPrize);
  };

  const buyTicket = async () => {
    await playButtonClick();
    if (balance < PRICE) {
      setToast("余额不足，无法购买（需要 ¥2.00）");
      return;
    }
    adjustBalance(-PRICE);
    useAchievementStore.getState().recordScratchPurchase("scratch2", PRICE);
    const t = generator.generate();
    setTicket(t);
    setSettled(false);
    moveCounterRef.current = 0;
    setToast("已购买：请刮开涂层查看结果。");
  };

  useEffect(() => {
    // 初始示例底图
    const demo: TicketData = {
      standardTime: 18.5,
      rows: [
        { yourTime: 19.2, prize: 0 },
        { yourTime: 20.1, prize: 0 },
        { yourTime: 17.9, prize: 10 },
        { yourTime: 18.9, prize: 0 },
      ],
      totalPrize: 10,
      outcome: { prize: 10, label: "示例" },
    };
    drawTicket(demo);
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
      else {
        const demo: TicketData = {
          standardTime: 18.5,
          rows: [
            { yourTime: 19.2, prize: 0 },
            { yourTime: 20.1, prize: 0 },
            { yourTime: 17.9, prize: 10 },
            { yourTime: 18.9, prize: 0 },
          ],
          totalPrize: 10,
          outcome: { prize: 10, label: "示例" },
        };
        drawTicket(demo);
      }
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
            <h2 className="text-2xl font-bold text-white">彩票模拟器 · 争分夺秒</h2>
            <p className="mt-2 text-sm text-slate-300">购买一张 2 元，刮开涂层后若“你的时间”小于标准时间即可中奖。</p>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300">
              本张中奖：<span className="font-bold text-amber-200">{formatYuan(currentPrize)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 彩票主体：占据页面主要位置（不再套用老虎机外壳） */}
      <div className="relative w-full overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950/40 to-slate-900/30 shadow-xl">
        <div className="p-6 sm:p-7">
          <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-black/40 shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-transparent" />
            <div className="relative aspect-[2/1] w-full">
              <canvas ref={ticketCanvasRef} className="absolute inset-0 h-full w-full" />
              <canvas ref={scratchCanvasRef} className="absolute inset-0 h-full w-full cursor-crosshair" />
              <canvas ref={particleCanvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
            </div>
          </div>
        </div>
      </div>

      {/* 辅助信息与操作区：放在下方，避免挤压票面导致数字重叠 */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
          <div className="text-sm font-semibold text-white">玩法说明</div>
          <div className="mt-2 text-sm leading-relaxed text-slate-300">
            - 标准时间固定在 15.0 ~ 20.0 秒之间
            <br />- 4 个“你的时间”里若存在更小值，则按对应奖级中奖
            <br />- 刮开面积 ≥ 60% 会自动结算（也可手动“自动刮开”）
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
              className="inline-flex flex-1 items-center justify-center rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 px-5 py-3 text-sm font-semibold text-slate-900 shadow-[0_10px_30px_rgba(244,208,63,0.28)] transition hover:brightness-110 active:translate-y-px"
            >
              购买一张（2元）
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
            提示：按住鼠标在涂层上拖动即可刮开；刮开到一定程度会自动结算并发放奖金。
          </div>
        </div>
      </div>
    </div>
  );
}

