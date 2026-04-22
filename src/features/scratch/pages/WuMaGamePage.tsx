import { useEffect, useMemo, useRef, useState } from "react";
import { useAchievementStore } from "@/store/useAchievementStore";
import { useUserStore } from "@/store/useUserStore";
import { playButtonClick, playPrizeWin } from "@/utils/sound";

type WuMaPrize = 5 | 10 | 20 | 30 | 50 | 100 | 200 | 500 | 1000 | 10000 | 100000;

type TicketData = {
  prizes: Array<0 | WuMaPrize>; // 10 格（兼中兼得）
  totalPrize: number;
};

const PRICE = 5;
const GRID_COLS = 5;
const GRID_ROWS = 2;
const CELLS = GRID_COLS * GRID_ROWS; // 10

/**
 * 午马（体彩顶呱刮，5 元）
 * 规则：刮开后看到金额即中奖，10 次机会，兼中兼得（累加）
 *
 * 概率与权重（估算实现）：
 * - 官方信息：约 40.27% 的票能中奖（至少中一次）
 * - 10 次机会 => 用独立“格子中奖概率 p”近似：1-(1-p)^10≈0.4027 => p≈0.0502
 * - 中奖格子内的奖级分布按“奖组个数”做权重抽取
 */
class WuMaGenerator {
  private readonly prizeWeights: Array<{ prize: WuMaPrize; weight: number }> = [
    { prize: 100000, weight: 1 },
    { prize: 10000, weight: 5 },
    { prize: 1000, weight: 50 },
    { prize: 500, weight: 100 },
    { prize: 200, weight: 500 },
    { prize: 100, weight: 1500 },
    { prize: 50, weight: 6500 },
    { prize: 30, weight: 18750 },
    { prize: 20, weight: 37500 },
    { prize: 10, weight: 82500 },
    { prize: 5, weight: 577500 },
  ];

  private readonly totalWeight = this.prizeWeights.reduce((s, x) => s + x.weight, 0);

  // 单格中奖概率（按票面中奖率反推）
  private readonly pCellWin = 1 - Math.pow(1 - 0.4027, 1 / 10);

  private pickPrize(): WuMaPrize {
    const r = Math.random() * this.totalWeight;
    let acc = 0;
    for (const it of this.prizeWeights) {
      acc += it.weight;
      if (r <= acc) return it.prize;
    }
    return this.prizeWeights[this.prizeWeights.length - 1].prize;
  }

  generate(): TicketData {
    const prizes: Array<0 | WuMaPrize> = Array.from({ length: CELLS }, () => 0);
    for (let i = 0; i < CELLS; i += 1) {
      if (Math.random() < this.pCellWin) prizes[i] = this.pickPrize();
    }
    for (let i = prizes.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = prizes[i];
      prizes[i] = prizes[j];
      prizes[j] = tmp;
    }
    const totalPrize = prizes.reduce((s, p) => s + p, 0 as number);
    return { prizes, totalPrize };
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

export function WuMaGamePage() {
  const balance = useUserStore((s) => s.balance);
  const adjustBalance = useUserStore((s) => s.adjustBalance);

  const generator = useMemo(() => new WuMaGenerator(), []);
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [settled, setSettled] = useState(false);
  const [toast, setToast] = useState("点击“购买一张（5元）”开始。");

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
    bg.addColorStop(0, "rgba(243, 246, 252, 1)");
    bg.addColorStop(0.45, "rgba(233, 238, 248, 1)");
    bg.addColorStop(1, "rgba(246, 248, 254, 1)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < 1200; i += 1) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`;
      ctx.fillRect(x, y, 1.2 * dpr, 1.2 * dpr);
    }
    ctx.restore();

    const pad = 22 * dpr;
    const panelX = pad;
    const panelY = pad;
    const panelW = w - pad * 2;
    const panelH = h - pad * 2;
    roundRect(ctx, panelX, panelY, panelW, panelH, 26 * dpr);
    ctx.fillStyle = "rgba(10, 16, 32, 0.06)";
    ctx.fill();
    ctx.strokeStyle = "rgba(10, 16, 32, 0.18)";
    ctx.lineWidth = 2 * dpr;
    ctx.stroke();

    const headerH = 72 * dpr;
    roundRect(ctx, panelX + 14 * dpr, panelY + 14 * dpr, panelW - 28 * dpr, headerH, 20 * dpr);
    const hg = ctx.createLinearGradient(0, 0, panelW, 0);
    hg.addColorStop(0, "rgba(220, 38, 38, 0.95)");
    hg.addColorStop(0.65, "rgba(245, 158, 11, 0.92)");
    hg.addColorStop(1, "rgba(250, 204, 21, 0.92)");
    ctx.fillStyle = hg;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2 * dpr;
    ctx.stroke();

    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = `${28 * dpr}px ui-sans-serif, system-ui`;
    ctx.fillText("午马", panelX + 38 * dpr, panelY + 60 * dpr);
    ctx.font = `${12 * dpr}px ui-sans-serif, system-ui`;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText("体彩 · 顶呱刮 · 面值 5 元", panelX + 120 * dpr, panelY + 46 * dpr);
    ctx.fillText("找奖金符号 · 10 次机会 · 兼中兼得", panelX + 120 * dpr, panelY + 64 * dpr);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(15,23,42,0.72)";
    ctx.font = `${14 * dpr}px ui-sans-serif, system-ui`;
    ctx.fillText("刮开下面 10 个区域，出现的金额全部相加即为中奖金额：", panelX + 22 * dpr, panelY + 110 * dpr);
    ctx.restore();

    const gridTop = panelY + 126 * dpr;
    const gridLeft = panelX + 18 * dpr;
    const gridW = panelW - 36 * dpr;
    const gridH = panelH - (gridTop - panelY) - 18 * dpr;
    const gap = 12 * dpr;
    const cellW = (gridW - gap * (GRID_COLS - 1)) / GRID_COLS;
    const cellH = (gridH - gap * (GRID_ROWS - 1)) / GRID_ROWS;

    for (let r = 0; r < GRID_ROWS; r += 1) {
      for (let c = 0; c < GRID_COLS; c += 1) {
        const i = r * GRID_COLS + c;
        const x = gridLeft + c * (cellW + gap);
        const y = gridTop + r * (cellH + gap);
        roundRect(ctx, x, y, cellW, cellH, 18 * dpr);
        ctx.fillStyle = "rgba(255,255,255,0.72)";
        ctx.fill();
        ctx.strokeStyle = "rgba(15, 23, 42, 0.18)";
        ctx.lineWidth = 2 * dpr;
        ctx.stroke();

        const p = data.prizes[i];
        ctx.save();
        ctx.textAlign = "center";
        ctx.fillStyle = p > 0 ? "rgba(15, 23, 42, 0.92)" : "rgba(15, 23, 42, 0.55)";
        ctx.font = `${26 * dpr}px ui-sans-serif, system-ui`;
        ctx.fillText(p > 0 ? `¥${p}` : "¥0", x + cellW / 2, y + cellH / 2 + 10 * dpr);
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
      setToast(`恭喜中奖：本张获得 ${formatYuan(ticket.totalPrize)}（兼中兼得已累加）`);
    } else {
      setToast("很遗憾：本张未中奖，再接再厉！");
    }
    useAchievementStore.getState().recordScratchSettle(ticket.totalPrize);
  };

  const buyTicket = async () => {
    await playButtonClick();
    if (balance < PRICE) {
      setToast("余额不足，无法购买（需要 ¥5.00）");
      return;
    }
    adjustBalance(-PRICE);
    useAchievementStore.getState().recordScratchPurchase("wuma", PRICE);
    const t = generator.generate();
    setTicket(t);
    setSettled(false);
    moveCounterRef.current = 0;
    setToast("已购买：请刮开涂层查看结果。");
  };

  useEffect(() => {
    const demo: TicketData = {
      prizes: [0, 5, 0, 10, 0, 0, 20, 0, 0, 0],
      totalPrize: 35,
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
      else drawTicket({ prizes: [0, 5, 0, 10, 0, 0, 20, 0, 0, 0], totalPrize: 35 });
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
            <h2 className="text-2xl font-bold text-white">彩票模拟器 · 午马（顶呱刮）</h2>
            <p className="mt-2 text-sm text-slate-300">面值 5 元，刮出金额即中奖，10 次机会，兼中兼得。</p>
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
            <div className="relative aspect-[2/1] w-full">
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
            - 票面共有 10 个刮奖区
            <br />- 刮出金额即中奖，所有中奖金额累加
            <br />- 刮开面积 ≥ 60% 会自动结算（也可手动“自动刮开”）
            <br />- 中奖概率按官方奖组数据近似模拟（并非真实赔率）
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
              购买一张（5元）
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

