import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "danger";

const variantClass: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-amber-300 to-amber-500 text-slate-900 shadow-[0_8px_24px_rgba(244,208,63,0.35)] hover:brightness-110 active:translate-y-px",
  ghost:
    "bg-white/5 text-slate-100 border border-white/10 hover:bg-white/10 active:translate-y-px",
  danger:
    "bg-gradient-to-b from-rose-500 to-rose-700 text-white shadow-[0_8px_24px_rgba(229,57,53,0.35)] hover:brightness-110 active:translate-y-px",
};

interface AppButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
}

/**
 * 全局按钮：统一圆角、动效与可访问焦点环。
 */
export function AppButton({
  children,
  variant = "primary",
  className = "",
  type = "button",
  ...rest
}: AppButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition will-change-transform outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80 disabled:cursor-not-allowed disabled:opacity-40 ${variantClass[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
