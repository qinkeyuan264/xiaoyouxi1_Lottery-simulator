/**
 * 轻量音效工具：若将 mp3 放入 public/audio/ 目录则自动尝试播放；
 * 否则使用 WebAudio 合成提示音，保证无资源文件时仍有反馈。
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

/** 播放短促方波提示音（点击 / 中奖等） */
function beep(freq: number, durationMs: number, type: OscillatorType = "square"): void {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = 0.0001;
  osc.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;
  gain.gain.exponentialRampToValueAtTime(0.15, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
  osc.start(now);
  osc.stop(now + durationMs / 1000 + 0.02);
}

/** 模拟碰撞的噪声短促音 */
function noiseHit(): void {
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * 0.05;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = 0.08;
  src.connect(gain);
  gain.connect(ctx.destination);
  src.start();
}

async function tryPlayPublic(path: string): Promise<boolean> {
  try {
    const audio = new Audio(path);
    audio.volume = 0.35;
    await audio.play();
    return true;
  } catch {
    return false;
  }
}

/** 按钮点击 */
export async function playButtonClick(): Promise<void> {
  const ok = await tryPlayPublic("/audio/button_click.mp3");
  if (!ok) beep(880, 45, "triangle");
}

/** 摇奖球碰撞（节流由调用方控制） */
export async function playBallCollision(): Promise<void> {
  const ok = await tryPlayPublic("/audio/ball_collision.mp3");
  if (!ok) noiseHit();
}

/** 中奖庆祝 */
export async function playPrizeWin(): Promise<void> {
  const ok = await tryPlayPublic("/audio/prize_win.mp3");
  if (!ok) {
    beep(523, 80, "sine");
    setTimeout(() => beep(659, 80, "sine"), 90);
    setTimeout(() => beep(784, 120, "sine"), 180);
  }
}
