import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { AchievementCelebration } from "@/components/achievements/AchievementCelebration";
import { AchievementSync } from "@/components/achievements/AchievementSync";
import { CheckUpdateButton } from "@/components/CheckUpdateButton";
import { useUserStore } from "@/store/useUserStore";
import pkg from "../../../package.json";

interface MainLayoutProps {
  children: ReactNode;
}

/**
 * 主布局：顶部导航条展示品牌、余额与返回入口。
 */
export function MainLayout({ children }: MainLayoutProps) {
  const username = useUserStore((s) => s.username);
  const balance = useUserStore((s) => s.balance);
  const location = useLocation();
  const disableAchievementRuntime = location.pathname === "/achievements";

  return (
    <div className="flex min-h-full flex-col">
      {disableAchievementRuntime ? null : <AchievementSync />}
      {disableAchievementRuntime ? null : <AchievementCelebration />}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-slate-950/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-lg font-bold tracking-wide text-amber-200">
              彩票模拟器
            </Link>
            <span className="hidden text-xs text-slate-400 sm:inline">
              幸运彩厅 · 成就挑战 · 非真实购彩 · v{pkg.version}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link
              to="/achievements"
              className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-100 transition hover:border-amber-400/50 hover:bg-amber-500/15"
            >
              成就中心
            </Link>
            <CheckUpdateButton />
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-200">
              <span className="text-slate-400">用户：</span>
              <span className="font-medium text-white">{username}</span>
            </div>
            <div className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 font-semibold text-amber-200">
              余额 ¥{balance.toLocaleString("zh-CN")}
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6">{children}</main>
    </div>
  );
}
