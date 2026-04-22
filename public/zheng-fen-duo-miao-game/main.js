/**
 * =========================================
 * 争分夺秒 · 模拟刮刮乐（纯原生）
 * 关键技术：Canvas 分层 + destination-out 擦除涂层
 * 目标体验：购买、刮开、自动结算，带音效与粒子反馈
 * =========================================
 *
 * 说明（重要）：
 * - 本模块为“独立静态游戏”，不依赖 React / Three / Zustand 等框架。
 * - 为了未来易集成，本文件不使用任何构建工具或第三方库（除浏览器原生 API）。
 *
 * 音效策略：
 * - 优先加载 assets/audio/*.mp3
 * - 若资源不存在或被阻止播放，则自动降级为 WebAudio 简单“咔擦/中奖”提示音，保证交互反馈不丢失。
 */

// ---------------------------
// Step 2: TicketGenerator 核心逻辑
// ---------------------------

class TicketGenerator {
  /**
   * 奖池与权重（估算）
   * - 中奖面约 28%
   * - 返奖率约 65%（票价 2 元 => 期望回报约 1.3 元）
   *
   * 设计：先抽“这张票总奖金” => 再反向生成票面（标准时间 + 4 个你的时间）
   */
  constructor() {
    // 总权重设为 1000，便于理解与调参
    this.pool = [
      // 未中奖（权重最大）
      { prize: 0, weight: 719, label: "未中奖" },
      // 中奖（总权重大约 281 => 中奖面约 28.1%）
      { prize: 2, weight: 162, label: "九等奖" },
      { prize: 5, weight: 81, label: "八等奖" },
      { prize: 10, weight: 27, label: "七等奖" },
      { prize: 20, weight: 8, label: "六等奖" },
      { prize: 50, weight: 2, label: "五等奖" },
      { prize: 100, weight: 1, label: "四等奖" },
    ];
    this.totalWeight = this.pool.reduce((s, x) => s + x.weight, 0);
  }

  _rand(min, max) {
    return min + Math.random() * (max - min);
  }

  _randInt(min, max) {
    return Math.floor(this._rand(min, max + 1));
  }

  _pickByWeight() {
    const r = Math.random() * this.totalWeight;
    let acc = 0;
    for (const item of this.pool) {
      acc += item.weight;
      if (r <= acc) return item;
    }
    return this.pool[this.pool.length - 1];
  }

  /**
   * 生成一张新票
   * 返回：
   * - standardTime: 标准时间（秒，1 位小数）
   * - rows: 4 行（你的时间、奖金）
   * - totalPrize: 总奖金（元）
   * - outcome: 抽中的奖项信息
   */
  generate() {
    const outcome = this._pickByWeight();

    // 标准时间范围：15.0 ~ 20.0 秒
    const standardTime = Math.round(this._rand(150, 200)) / 10; // 15.0 - 20.0

    // 票面 4 行
    const rows = [
      { yourTime: 0, prize: 0 },
      { yourTime: 0, prize: 0 },
      { yourTime: 0, prize: 0 },
      { yourTime: 0, prize: 0 },
    ];

    if (outcome.prize > 0) {
      // 先定结果，后生成数字：确保至少 1 个“你的时间” < 标准时间 且对应奖金为 outcome.prize
      const winIndex = this._randInt(0, 3);
      const winDelta = Math.round(this._rand(1, 9)) / 10; // 0.1 ~ 0.9 秒更快
      rows[winIndex].yourTime = Math.max(0.1, Math.round((standardTime - winDelta) * 10) / 10);
      rows[winIndex].prize = outcome.prize;

      for (let i = 0; i < 4; i += 1) {
        if (i === winIndex) continue;
        // 干扰项：必须大于标准时间
        const d = Math.round(this._rand(2, 30)) / 10; // 0.2 ~ 3.0 秒更慢
        rows[i].yourTime = Math.round((standardTime + d) * 10) / 10;
        rows[i].prize = 0;
      }
    } else {
      // 未中奖：全部“你的时间”都要大于标准时间
      for (let i = 0; i < 4; i += 1) {
        const d = Math.round(this._rand(2, 35)) / 10; // 0.2 ~ 3.5 秒更慢
        rows[i].yourTime = Math.round((standardTime + d) * 10) / 10;
        rows[i].prize = 0;
      }
    }

    // 将行随机打乱，避免固定位置总中奖
    for (let i = rows.length - 1; i > 0; i -= 1) {
      const j = this._randInt(0, i);
      const tmp = rows[i];
      rows[i] = rows[j];
      rows[j] = tmp;
    }

    const totalPrize = rows.reduce((s, r) => s + r.prize, 0);
    return { standardTime, rows, totalPrize, outcome };
  }
}

// ---------------------------
// 余额同步（与主应用 useUserStore 持久化同源）
// ---------------------------

const USER_STORAGE_KEY = "lottery-sim-user";

function readUserFromStorage() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // zustand persist 结构：{ state: {...}, version: number }
    const state = parsed?.state ?? null;
    if (!state) return null;
    const balance = typeof state.balance === "number" ? state.balance : 0;
    const username = typeof state.username === "string" ? state.username : null;
    return { username, balance };
  } catch {
    return null;
  }
}

function writeBalanceToStorage(nextBalance) {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) {
      // 没有主应用状态时，创建一个最小可用状态（避免刮刮乐孤立运行）
      localStorage.setItem(
        USER_STORAGE_KEY,
        JSON.stringify({
          state: { username: "幸运玩家", balance: nextBalance, dcbHistory: [] },
          version: 1,
        }),
      );
      return;
    }
    const parsed = JSON.parse(raw);
    const state = parsed?.state ?? {};
    state.balance = nextBalance;
    if (typeof state.username !== "string") state.username = "幸运玩家";
    if (!Array.isArray(state.dcbHistory)) state.dcbHistory = [];
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ ...parsed, state }));
  } catch {
    // 忽略：本地存储不可用时，刮刮乐仍可运行但无法同步
  }
}

// ---------------------------
// Step 3: Canvas 绘制彩票（底层 + 顶层涂层）
// ---------------------------

function fitCanvasToCSS(canvas) {
  // 保持 canvas 的像素密度与屏幕一致，避免文字模糊
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

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawTicket(ticketCanvas, ticketData) {
  const { dpr, w, h } = fitCanvasToCSS(ticketCanvas);
  const ctx = ticketCanvas.getContext("2d");
  if (!ctx) return;

  // 背景：渐变 + 细网格
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "rgba(8, 12, 28, 1)");
  bg.addColorStop(1, "rgba(3, 6, 20, 1)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // 微弱光斑
  const glow = ctx.createRadialGradient(w * 0.3, h * 0.25, 10, w * 0.3, h * 0.25, w * 0.9);
  glow.addColorStop(0, "rgba(96, 165, 250, 0.22)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // 网格
  ctx.save();
  ctx.globalAlpha = 0.12;
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

  // 主内容面板
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

  // 标题
  ctx.save();
  ctx.font = `${18 * dpr}px ui-sans-serif, system-ui, -apple-system, Segoe UI`;
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.fillText("争分夺秒 · 计时对决", panelX + 18 * dpr, panelY + 34 * dpr);
  ctx.restore();

  // 标准时间
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
  ctx.fillText(`${ticketData.standardTime.toFixed(1)} 秒`, stdBoxX + 18 * dpr, stdBoxY + 58 * dpr);
  ctx.restore();

  // 你的时间（4 格）
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
  ];

  for (let i = 0; i < 4; i += 1) {
    const [x, y] = positions[i];
    const row = ticketData.rows[i];

    roundRect(ctx, x, y, cellW, rowH, 18 * dpr);
    ctx.fillStyle = "rgba(2, 6, 23, 0.45)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 2 * dpr;
    ctx.stroke();

    // 文本
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

    // 奖金标记
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
}

function drawScratchLayer(scratchCanvas) {
  const { dpr, w, h } = fitCanvasToCSS(scratchCanvas);
  const ctx = scratchCanvas.getContext("2d");
  if (!ctx) return;

  // 覆盖层：银灰渐变 + 纹理噪声 + 提示文字
  // 需求：不需要整张都蒙住，只覆盖“你的时间/奖金”区域（更像真实彩票）
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, w, h);

  // 复用 drawTicket 的布局计算（必须保持一致）
  const pad = 26 * dpr;
  const panelX = pad;
  const panelY = pad;
  const panelW = w - pad * 2;
  const panelH = h - pad * 2;

  const stdBoxX = panelX + 18 * dpr;
  const stdBoxY = panelY + 52 * dpr;
  const stdBoxW = panelW - 36 * dpr;
  const stdBoxH = 70 * dpr;

  const gridX = stdBoxX;
  const gridY = stdBoxY + stdBoxH + 18 * dpr;
  const cellGap = 14 * dpr;
  const cellW = (stdBoxW - cellGap) / 2;
  const cellH = panelY + panelH - gridY - 18 * dpr;
  const rowH = (cellH - cellGap) / 2;

  const cells = [
    [gridX, gridY],
    [gridX + cellW + cellGap, gridY],
    [gridX, gridY + rowH + cellGap],
    [gridX + cellW + cellGap, gridY + rowH + cellGap],
  ];

  const g = ctx.createLinearGradient(0, 0, w, h);
  // 需求：蒙版再“更不透”一些（避免隐约看到下面数字）
  g.addColorStop(0, "rgba(210, 218, 232, 1)");
  g.addColorStop(0.4, "rgba(160, 172, 192, 1)");
  g.addColorStop(1, "rgba(225, 232, 244, 1)");
  ctx.fillStyle = g;

  for (const [x, y] of cells) {
    roundRect(ctx, x, y, cellW, rowH, 18 * dpr);
    ctx.fill();
  }

  // 细噪声：模拟银粉质感
  ctx.save();
  ctx.globalAlpha = 0.22;
  for (let i = 0; i < 1200; i += 1) {
    // 只在蒙版区域撒噪声（更逼真，也更省）
    const c = cells[Math.floor(Math.random() * cells.length)];
    const x = c[0] + Math.random() * cellW;
    const y = c[1] + Math.random() * rowH;
    const r = (Math.random() * 1.6 + 0.2) * dpr;
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.18})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 提示文案
  ctx.save();
  ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
  ctx.font = `${22 * dpr}px ui-sans-serif, system-ui`;
  ctx.textAlign = "center";
  ctx.fillText("刮开涂层", w / 2, gridY + rowH + cellGap / 2);
  ctx.font = `${14 * dpr}px ui-sans-serif, system-ui`;
  ctx.fillStyle = "rgba(15, 23, 42, 0.6)";
  ctx.fillText("（刮开面积达 60% 自动结算）", w / 2, gridY + rowH + cellGap / 2 + 26 * dpr);
  ctx.restore();
}

// ---------------------------
// Step 4/5/6: 交互 + 面积检测 + 结算 + UI 循环
// ---------------------------

function createAudioPlayer(url, fallbackType) {
  // 优先使用 Audio 标签（文件存在时更贴近真实音效）
  const audio = new Audio();
  audio.src = url;
  audio.preload = "auto";
  audio.volume = fallbackType === "win" ? 0.85 : 0.35;

  let ctx = null;

  function beep(type) {
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      const now = ctx.currentTime;
      if (type === "scratch") {
        o.type = "square";
        o.frequency.setValueAtTime(260, now);
        g.gain.setValueAtTime(0.08, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        o.start(now);
        o.stop(now + 0.035);
      } else {
        o.type = "sine";
        o.frequency.setValueAtTime(620, now);
        o.frequency.exponentialRampToValueAtTime(980, now + 0.15);
        g.gain.setValueAtTime(0.14, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        o.start(now);
        o.stop(now + 0.22);
      }
    } catch {
      // 忽略
    }
  }

  return {
    play: async () => {
      try {
        audio.currentTime = 0;
        await audio.play();
      } catch {
        beep(fallbackType);
      }
    },
  };
}

function main() {
  const buyBtn = document.getElementById("buy-btn");
  const autoBtn = document.getElementById("auto-scratch-btn");
  const resetBtn = document.getElementById("reset-btn");
  const balanceEl = document.getElementById("balance");
  const prizeEl = document.getElementById("current-prize");
  const toastEl = document.getElementById("toast");

  const ticketCanvas = document.getElementById("ticket-canvas");
  const scratchCanvas = document.getElementById("scratch-canvas");
  const particleCanvas = document.getElementById("particle-canvas");

  const ticketCtx = ticketCanvas.getContext("2d");
  const scratchCtx = scratchCanvas.getContext("2d");
  const particleCtx = particleCanvas.getContext("2d");

  if (!ticketCtx || !scratchCtx || !particleCtx) return;

  // 音效
  const scratchSfx = createAudioPlayer("./assets/audio/scratch.mp3", "scratch");
  const winSfx = createAudioPlayer("./assets/audio/win.mp3", "win");

  // 游戏状态
  const generator = new TicketGenerator();
  // 余额与主应用同步（useUserStore 持久化）
  const storedUser = readUserFromStorage();
  let balance = storedUser?.balance ?? 10_000;
  let currentTicket = null;
  let settled = false;

  // 刮开状态
  let isDrawing = false;
  let lastScratchAt = 0;
  let moveCounter = 0;

  // 粒子
  const particles = [];
  let raf = 0;

  function setToast(msg, tone = "normal") {
    toastEl.textContent = msg;
    toastEl.style.color = tone === "warn" ? "rgba(253, 230, 138, 0.95)" : "rgba(226,232,240,0.88)";
  }

  function formatYuan(n) {
    return `¥${(Math.round(n * 100) / 100).toFixed(2)}`;
  }

  function renderHUD() {
    balanceEl.textContent = formatYuan(balance);
    const p = currentTicket ? currentTicket.totalPrize : 0;
    prizeEl.textContent = formatYuan(settled ? p : 0);
    prizeEl.style.color = settled && p > 0 ? "rgba(167, 243, 208, 0.96)" : "rgba(253, 230, 138, 0.95)";
    prizeEl.style.transform = settled && p > 0 ? "scale(1.06)" : "scale(1)";
  }

  function resizeAll() {
    fitCanvasToCSS(ticketCanvas);
    fitCanvasToCSS(scratchCanvas);
    fitCanvasToCSS(particleCanvas);
    if (currentTicket) {
      drawTicket(ticketCanvas, currentTicket);
      if (!settled) drawScratchLayer(scratchCanvas);
    }
  }

  function spawnParticles(x, y) {
    // 轻量粒子：银粉散落（不与涂层擦除耦合，单独在粒子层绘制）
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
  }

  function tickParticles(dt) {
    const { dpr, w, h } = fitCanvasToCSS(particleCanvas);
    particleCtx.clearRect(0, 0, w, h);
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
      particleCtx.save();
      particleCtx.globalAlpha = alpha;
      particleCtx.fillStyle = "rgba(255,255,255,0.95)";
      particleCtx.beginPath();
      particleCtx.arc(p.x, p.y, p.r * dpr, 0, Math.PI * 2);
      particleCtx.fill();
      particleCtx.restore();
    }
  }

  function startRAF() {
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      tickParticles(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  function stopRAF() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    particles.length = 0;
    const { w, h } = fitCanvasToCSS(particleCanvas);
    particleCtx.clearRect(0, 0, w, h);
  }

  function scratchAt(clientX, clientY) {
    if (!currentTicket || settled) return;

    const rect = scratchCanvas.getBoundingClientRect();
    const { dpr, w, h } = fitCanvasToCSS(scratchCanvas);
    const x = (clientX - rect.left) * dpr;
    const y = (clientY - rect.top) * dpr;

    // 软边画笔：让刮开更自然
    scratchCtx.save();
    scratchCtx.globalCompositeOperation = "destination-out";

    const radius = 26 * dpr;
    const g = scratchCtx.createRadialGradient(x, y, radius * 0.15, x, y, radius);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    scratchCtx.fillStyle = g;
    scratchCtx.beginPath();
    scratchCtx.arc(x, y, radius, 0, Math.PI * 2);
    scratchCtx.fill();
    scratchCtx.restore();

    // 粒子
    spawnParticles(x, y);
    if (!raf) startRAF();

    // 音效节流（避免过密播放）
    const now = performance.now();
    if (now - lastScratchAt > 38) {
      lastScratchAt = now;
      void scratchSfx.play();
    }

    // 面积检测（每 10 次 move 采样一次）
    moveCounter += 1;
    if (moveCounter % 10 === 0) {
      const percent = calcScratchedPercent(scratchCtx, w, h);
      if (percent >= 0.6) {
        settle("auto");
      }
    }
  }

  function calcScratchedPercent(ctx, w, h) {
    // 性能考虑：做“抽样统计”，步长越大越快，误差越大
    const step = 6; // 抽样步长（像素）
    const img = ctx.getImageData(0, 0, w, h).data;
    let total = 0;
    let transparent = 0;
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const idx = (y * w + x) * 4 + 3; // alpha 通道
        total += 1;
        if (img[idx] === 0) transparent += 1;
      }
    }
    return total > 0 ? transparent / total : 0;
  }

  function clearScratchLayer() {
    const { w, h } = fitCanvasToCSS(scratchCanvas);
    scratchCtx.globalCompositeOperation = "source-over";
    scratchCtx.clearRect(0, 0, w, h);
  }

  async function settle(reason) {
    if (!currentTicket || settled) return;
    settled = true;
    clearScratchLayer();
    stopRAF();

    const prize = currentTicket.totalPrize;
    balance += prize;
    writeBalanceToStorage(balance);
    renderHUD();

    if (prize > 0) {
      setToast(`恭喜中奖：本张获得 ${formatYuan(prize)}（${currentTicket.outcome.label}）`, "normal");
      await winSfx.play();
    } else {
      setToast("很遗憾：本张未中奖，再接再厉！", "warn");
    }

    // 恢复按钮可用
    buyBtn.disabled = false;
    autoBtn.disabled = false;
    if (reason === "auto") {
      // 给玩家一点“自动结算”的明确反馈
      prizeEl.animate([{ transform: "scale(1)" }, { transform: "scale(1.08)" }, { transform: "scale(1.02)" }], {
        duration: 520,
        easing: "cubic-bezier(.2,.8,.2,1)",
      });
    }
  }

  function bindScratchEvents() {
    const onDown = (e) => {
      if (!currentTicket || settled) return;
      isDrawing = true;
      scratchAt(e.clientX, e.clientY);
    };
    const onMove = (e) => {
      if (!isDrawing) return;
      scratchAt(e.clientX, e.clientY);
    };
    const onUp = () => {
      isDrawing = false;
    };

    scratchCanvas.addEventListener("mousedown", onDown);
    scratchCanvas.addEventListener("mousemove", onMove);
    scratchCanvas.addEventListener("mouseup", onUp);
    scratchCanvas.addEventListener("mouseleave", onUp);

    // 触摸支持（平板/触屏）
    scratchCanvas.addEventListener(
      "touchstart",
      (e) => {
        if (!currentTicket || settled) return;
        isDrawing = true;
        const t = e.touches[0];
        scratchAt(t.clientX, t.clientY);
      },
      { passive: true },
    );
    scratchCanvas.addEventListener(
      "touchmove",
      (e) => {
        if (!isDrawing) return;
        const t = e.touches[0];
        scratchAt(t.clientX, t.clientY);
      },
      { passive: true },
    );
    scratchCanvas.addEventListener("touchend", () => {
      isDrawing = false;
    });
  }

  function newTicket() {
    currentTicket = generator.generate();
    settled = false;
    moveCounter = 0;
    drawTicket(ticketCanvas, currentTicket);
    drawScratchLayer(scratchCanvas);
    renderHUD();
    setToast("已生成新票：请刮开涂层查看结果。");
  }

  buyBtn.addEventListener("click", () => {
    if (balance < 2) {
      setToast("余额不足：无法购买（需要 ¥2.00）", "warn");
      return;
    }
    balance -= 2;
    writeBalanceToStorage(balance);
    buyBtn.disabled = true; // 防止连点造成状态混乱
    autoBtn.disabled = false;
    newTicket();
    buyBtn.disabled = false;
  });

  autoBtn.addEventListener("click", async () => {
    if (!currentTicket || settled) return;
    autoBtn.disabled = true;
    // 视觉：小延迟更像“自动刮开”
    await new Promise((r) => setTimeout(r, 180));
    await settle("auto");
  });

  resetBtn.addEventListener("click", () => {
    // 需求：不再使用独立余额；此按钮仅作为“调试/演示”保留，重置为 10000
    balance = 10_000;
    writeBalanceToStorage(balance);
    currentTicket = null;
    settled = false;
    clearScratchLayer();
    stopRAF();
    drawTicket(ticketCanvas, { standardTime: 18.5, rows: [{ yourTime: 19.2, prize: 0 }, { yourTime: 20.1, prize: 0 }, { yourTime: 17.9, prize: 10 }, { yourTime: 18.9, prize: 0 }] });
    renderHUD();
    setToast("余额已重置为 ¥10000.00。点击“购买一张”开始。");
  });

  window.addEventListener("resize", () => {
    resizeAll();
  });

  // 同步：如果用户在其它页面（双色球/福彩3D）改变了余额，刮刮乐也跟着更新
  window.addEventListener("storage", (e) => {
    if (e.key !== USER_STORAGE_KEY) return;
    const u = readUserFromStorage();
    if (!u) return;
    balance = u.balance;
    renderHUD();
  });

  // 初始化：先画一张示例底图（不发放真实开奖结果）
  drawTicket(ticketCanvas, {
    standardTime: 18.5,
    rows: [
      { yourTime: 19.2, prize: 0 },
      { yourTime: 20.1, prize: 0 },
      { yourTime: 17.9, prize: 10 },
      { yourTime: 18.9, prize: 0 },
    ],
    totalPrize: 10,
    outcome: { prize: 10, label: "示例" },
  });
  drawScratchLayer(scratchCanvas);
  // 初次显示以同步余额为准
  balanceEl.textContent = formatYuan(balance);
  prizeEl.textContent = "¥0.00";
  setToast("点击“购买一张（2元）”开始游戏。");

  bindScratchEvents();
  resizeAll();
}

document.addEventListener("DOMContentLoaded", main);

