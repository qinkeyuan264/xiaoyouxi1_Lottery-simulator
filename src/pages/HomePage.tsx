import { Link } from "react-router-dom";
import { ACHIEVEMENTS } from "@/achievements/definitions";
import { selectUnlockedCount, useAchievementStore } from "@/store/useAchievementStore";
import { playButtonClick } from "@/utils/sound";

/**
 * 应用主页：展示游戏入口与成就进度。
 */
export function HomePage() {
  const unlocked = useAchievementStore(selectUnlockedCount);
  const total = ACHIEVEMENTS.length;

  return (
    <div className="flex flex-1 flex-col gap-8">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/40 to-slate-950/80 p-8 shadow-xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">欢迎回来</h2>
            <p className="mt-2 max-w-2xl text-slate-300">
              你是「彩票模拟器」的玩家，开局拥有 <span className="text-amber-200">¥10,000</span>{" "}
              模拟资金。在余额耗尽之前，尽量完成成就中心里的全部挑战——每项成就都有额外奖金助你翻盘。
            </p>
          </div>
          <Link
            to="/achievements"
            onClick={() => void playButtonClick()}
            className="inline-flex items-center gap-2 rounded-2xl border border-amber-400/35 bg-amber-500/10 px-5 py-3 text-sm font-semibold text-amber-100 transition hover:border-amber-300/50 hover:bg-amber-500/15"
          >
            成就进度 {unlocked}/{total}
          </Link>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="group relative overflow-hidden rounded-3xl border border-amber-400/20 bg-gradient-to-br from-rose-900/40 via-slate-900/60 to-blue-900/40 p-8 shadow-lg transition hover:border-amber-300/40">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-400/10 blur-3xl" />
          <h3 className="text-xl font-bold text-white">双色球</h3>
          <p className="mt-2 text-sm text-slate-300">
            6 红 + 1 蓝，Rapier 刚体碰撞模拟摇奖，开奖球贴图数字，支持机选与历史查询。
          </p>
          <div className="mt-6">
            <Link
              to="/dcb"
              onClick={() => void playButtonClick()}
              className="inline-flex min-w-[140px] items-center justify-center rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 px-6 py-3 text-sm font-semibold text-slate-900 shadow-[0_8px_24px_rgba(244,208,63,0.35)] transition hover:brightness-110 active:translate-y-px"
            >
              开始游戏
            </Link>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/70 via-slate-900/40 to-slate-950/70 p-8 shadow-lg transition hover:border-white/20">
          <div className="pointer-events-none absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-sky-400/10 blur-3xl" />
          <h3 className="text-xl font-bold text-white">福彩 3D</h3>
          <p className="mt-2 text-sm text-slate-300">三位数字（000-999），3D 老虎机滚轮缓动回弹停靠，支持单选/组选3/组选6。</p>
          <div className="mt-6">
            <Link
              to="/3d"
              onClick={() => void playButtonClick()}
              className="inline-flex min-w-[140px] items-center justify-center rounded-xl bg-gradient-to-b from-sky-200 to-sky-400 px-6 py-3 text-sm font-semibold text-slate-900 shadow-[0_8px_24px_rgba(129,212,250,0.25)] transition hover:brightness-110 active:translate-y-px"
            >
              开始游戏
            </Link>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-900/25 via-slate-900/60 to-slate-950/70 p-8 shadow-lg transition hover:border-emerald-300/30">
          <div className="pointer-events-none absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />
          <h3 className="text-xl font-bold text-white">争分夺秒（刮刮乐）</h3>
          <p className="mt-2 text-sm text-slate-300">
            纯原生 Canvas 刮开效果，购买一张 2 元，刮开面积达阈值自动结算，支持音效与粒子反馈。
          </p>
          <div className="mt-6">
            <Link
              to="/scratch"
              onClick={() => void playButtonClick()}
              className="inline-flex min-w-[140px] items-center justify-center rounded-xl bg-gradient-to-b from-emerald-200 to-emerald-400 px-6 py-3 text-sm font-semibold text-slate-900 shadow-[0_8px_24px_rgba(52,211,153,0.22)] transition hover:brightness-110 active:translate-y-px"
            >
              开始游戏
            </Link>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-3xl border border-rose-400/20 bg-gradient-to-br from-rose-900/25 via-slate-900/60 to-slate-950/70 p-8 shadow-lg transition hover:border-rose-300/30">
          <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-rose-400/10 blur-3xl" />
          <h3 className="text-xl font-bold text-white">午马（5元刮刮乐）</h3>
          <p className="mt-2 text-sm text-slate-300">
            体彩顶呱刮模拟：10 个中奖区，刮出金额全部累加（兼中兼得），最高 10 万元。
          </p>
          <div className="mt-6">
            <Link
              to="/wuma"
              onClick={() => void playButtonClick()}
              className="inline-flex min-w-[140px] items-center justify-center rounded-xl bg-gradient-to-b from-rose-200 to-rose-400 px-6 py-3 text-sm font-semibold text-slate-900 shadow-[0_8px_24px_rgba(251,113,133,0.22)] transition hover:brightness-110 active:translate-y-px"
            >
              开始游戏
            </Link>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-3xl border border-orange-400/20 bg-gradient-to-br from-orange-900/30 via-slate-900/60 to-amber-950/50 p-8 shadow-lg transition hover:border-orange-300/35">
          <div className="pointer-events-none absolute -right-8 -bottom-8 h-36 w-36 rounded-full bg-orange-400/10 blur-3xl" />
          <h3 className="text-xl font-bold text-white">好运十倍（10元刮刮乐）</h3>
          <p className="mt-2 text-sm text-slate-300">
            福彩风格模拟：对数字中奖；出现「10」标志该行奖金 ×10；10 行兼中兼得，最高 40 万元。
          </p>
          <div className="mt-6">
            <Link
              to="/haoyun10"
              onClick={() => void playButtonClick()}
              className="inline-flex min-w-[140px] items-center justify-center rounded-xl bg-gradient-to-b from-orange-200 to-amber-500 px-6 py-3 text-sm font-semibold text-slate-900 shadow-[0_8px_24px_rgba(251,146,60,0.25)] transition hover:brightness-110 active:translate-y-px"
            >
              开始游戏
            </Link>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-3xl border border-green-400/20 bg-gradient-to-br from-green-900/30 via-slate-900/60 to-emerald-950/50 p-8 shadow-lg transition hover:border-green-300/35">
          <div className="pointer-events-none absolute -left-6 -top-6 h-32 w-32 rounded-full bg-green-400/10 blur-3xl" />
          <h3 className="text-xl font-bold text-white">马到成功（20元刮刮乐）</h3>
          <p className="mt-2 text-sm text-slate-300">
            25 格找图符：马拿金额、祥云 2 倍、「成功」通吃 25 格金额之和；最高 100 万元。
          </p>
          <div className="mt-6">
            <Link
              to="/madaochenggong"
              onClick={() => void playButtonClick()}
              className="inline-flex min-w-[140px] items-center justify-center rounded-xl bg-gradient-to-b from-lime-200 to-green-600 px-6 py-3 text-sm font-semibold text-slate-900 shadow-[0_8px_24px_rgba(74,222,128,0.25)] transition hover:brightness-110 active:translate-y-px"
            >
              开始游戏
            </Link>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-3xl border border-red-500/25 bg-gradient-to-br from-red-950/50 via-slate-900/60 to-amber-950/40 p-8 shadow-lg transition hover:border-amber-400/40">
          <div className="pointer-events-none absolute -right-6 -bottom-6 h-36 w-36 rounded-full bg-amber-500/15 blur-3xl" />
          <h3 className="text-xl font-bold text-white">好运来（30元刮刮乐）</h3>
          <p className="mt-2 text-sm text-slate-300">
            三重玩法：三同图+鲤翻倍、好运来 100 元、对数字与福袋 10 倍；18 次机会，最高 80 万。
          </p>
          <div className="mt-6">
            <Link
              to="/haoyunlai"
              onClick={() => void playButtonClick()}
              className="inline-flex min-w-[140px] items-center justify-center rounded-xl bg-gradient-to-b from-amber-200 via-amber-400 to-red-800 px-6 py-3 text-sm font-semibold text-amber-50 shadow-[0_8px_24px_rgba(220,38,38,0.3)] transition hover:brightness-110 active:translate-y-px"
            >
              开始游戏
            </Link>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-3xl border border-zinc-600/40 bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-950 p-8 shadow-lg transition hover:border-amber-500/50">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(212,175,55,0.12),_transparent_55%)]" />
          <h3 className="text-xl font-bold text-white">超级 9（50元刮刮乐）</h3>
          <p className="mt-2 text-sm text-slate-300">
            黑金风格模拟：找「9」、两数之和为 9、对数字与「999」翻倍；40 次机会，最高 100 万。
          </p>
          <div className="mt-6">
            <Link
              to="/chaoji9"
              onClick={() => void playButtonClick()}
              className="inline-flex min-w-[140px] items-center justify-center rounded-xl border border-amber-500/40 bg-gradient-to-b from-amber-500/90 to-amber-950 px-6 py-3 text-sm font-semibold text-amber-50 shadow-[0_8px_24px_rgba(180,83,9,0.35)] transition hover:brightness-110 active:translate-y-px"
            >
              开始游戏
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
