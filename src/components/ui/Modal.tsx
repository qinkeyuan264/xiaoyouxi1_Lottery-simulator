import type { ReactNode } from "react";
import { AppButton } from "./Button";

interface ModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmText?: string;
  onConfirm: () => void;
}

/**
 * 简易居中模态层：半透明背景 + 毛玻璃卡片。
 */
export function Modal({ open, title, children, confirmText = "确定", onConfirm }: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dcb-modal-title"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900/95 p-8 shadow-2xl shadow-black/50">
        <h2 id="dcb-modal-title" className="text-xl font-bold text-amber-200">
          {title}
        </h2>
        <div className="mt-5 space-y-4 text-base leading-relaxed text-slate-100">{children}</div>
        <div className="mt-6 flex justify-end">
          <AppButton type="button" onClick={onConfirm}>
            {confirmText}
          </AppButton>
        </div>
      </div>
    </div>
  );
}
