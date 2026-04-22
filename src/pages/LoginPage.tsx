import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppButton } from "@/components/ui/Button";
import { useUserStore } from "@/store/useUserStore";
import { playButtonClick } from "@/utils/sound";

/**
 * 登录页：输入昵称后写入全局 Store 并进入主页。
 */
export function LoginPage() {
  const navigate = useNavigate();
  const login = useUserStore((s) => s.login);
  const [name, setName] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await playButtonClick();
    login(name);
    navigate("/", { replace: true });
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/95 p-10 shadow-2xl shadow-black/40">
        <div className="mb-2 text-center text-xs uppercase tracking-[0.35em] text-amber-200/80">
          彩票模拟器
        </div>
        <h1 className="text-center text-3xl font-black text-white">幸运彩厅</h1>
        <p className="mt-3 text-center text-sm text-slate-400">
          初始资金 ¥10,000 · 在破产前解锁全部成就 · 仅供娱乐
        </p>

        <form className="mt-10 space-y-5" onSubmit={onSubmit}>
          <div>
            <label htmlFor="username" className="mb-2 block text-sm font-medium text-slate-300">
              用户名 / 昵称
            </label>
            <input
              id="username"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：幸运星"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none ring-amber-400/0 transition focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/30"
            />
          </div>
          <AppButton type="submit" className="w-full py-3 text-base">
            进入大厅
          </AppButton>
        </form>
      </div>
    </div>
  );
}
