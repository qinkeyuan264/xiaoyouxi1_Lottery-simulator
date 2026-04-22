import type { ReactNode } from "react";
import { Component } from "react";

type Props = {
  children: ReactNode;
  title?: string;
};

type State = {
  error?: Error;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // 保留到控制台，便于打包后定位白屏原因
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex flex-1 flex-col gap-4 rounded-3xl border border-red-500/25 bg-red-500/10 p-6 text-red-100">
        <div className="text-sm font-semibold">{this.props.title ?? "页面渲染失败"}</div>
        <div className="text-xs text-red-200/80">请截图此错误信息发给我，我会继续修复。</div>
        <pre className="whitespace-pre-wrap break-words rounded-2xl border border-red-400/20 bg-black/30 p-4 text-[11px] leading-relaxed text-red-100">
          {String(error.stack ?? error.message ?? error)}
        </pre>
      </div>
    );
  }
}

