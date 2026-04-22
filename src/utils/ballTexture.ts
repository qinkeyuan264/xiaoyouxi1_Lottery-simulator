import * as THREE from "three";

/**
 * 使用 Canvas 程序化生成带号码的“彩票球”贴图，避免仓库内放置 49 张 PNG。
 * 结果缓存，减少重复绘制开销。
 */
const cache = new Map<string, THREE.CanvasTexture>();

export function getBallNumberTexture(
  value: number,
  variant: "red" | "blue",
): THREE.CanvasTexture {
  const key = `${variant}-${value}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("无法创建 2D Canvas 上下文");
  }

  const base =
    variant === "red"
      ? { main: "#c62828", ring: "#ff8a80", shadow: "#5c0e0e" }
      : { main: "#1565c0", ring: "#90caf9", shadow: "#0d2f55" };

  ctx.clearRect(0, 0, size, size);

  // 外圈高光
  const grd = ctx.createRadialGradient(
    size * 0.35,
    size * 0.3,
    size * 0.05,
    size * 0.5,
    size * 0.5,
    size * 0.48,
  );
  grd.addColorStop(0, "#ffffff");
  grd.addColorStop(0.25, base.ring);
  grd.addColorStop(0.55, base.main);
  grd.addColorStop(1, base.shadow);

  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.46, 0, Math.PI * 2);
  ctx.fill();

  // 内白底数字区
  ctx.fillStyle = "rgba(255,255,255,0.97)";
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.28, 0, Math.PI * 2);
  ctx.fill();

  // 数字：更大、更高对比 + 描边，远处也清晰
  const label = String(value).padStart(2, "0");
  const fontSize = Math.floor(size * 0.26);
  ctx.font = `900 ${fontSize}px "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.lineWidth = Math.max(10, Math.floor(fontSize * 0.16));
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.strokeText(label, size / 2, size / 2 + 3);

  ctx.fillStyle = "#111111";
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  ctx.fillText(label, size / 2, size / 2 + 3);
  ctx.shadowBlur = 0;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  cache.set(key, tex);
  return tex;
}
