import { useState } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

/**
 * 桌面端「检查更新」：依赖 tauri.conf.json 中 plugins.updater 的公钥与 HTTPS 端点。
 * 浏览器开发模式下不渲染有效按钮。
 */
export function CheckUpdateButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  const handle = async () => {
    if (!isTauri) return;
    setBusy(true);
    setMsg(null);
    try {
      const update = await check();
      if (!update) {
        setMsg("当前已是最新版本。");
        return;
      }
      const ok = window.confirm(`发现新版本 ${update.version}，是否下载并安装？`);
      if (!ok) return;
      await update.downloadAndInstall();
      await relaunch();
    } catch (e) {
      const text = e instanceof Error ? e.message : String(e);
      setMsg(
        `检查更新失败：${text}。若尚未配置更新服务器，请编辑 src-tauri/tauri.conf.json 中的 plugins.updater.endpoints，指向托管的 latest.json 后重新打包。`,
      );
    } finally {
      setBusy(false);
    }
  };

  if (!isTauri) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void handle()}
        disabled={busy}
        className="rounded-lg px-2 py-1 text-xs text-slate-400 transition hover:bg-white/5 hover:text-amber-200 disabled:opacity-50"
      >
        {busy ? "检查中…" : "检查更新"}
      </button>
      {msg ? (
        <p className="max-w-[220px] text-right text-[11px] leading-snug text-rose-300/90">{msg}</p>
      ) : null}
    </div>
  );
}
