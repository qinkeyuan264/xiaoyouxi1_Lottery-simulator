import { Ball } from "./Ball";

interface BallSelectorProps {
  selectedRed: number[];
  selectedBlue: number | null;
  onToggleRed: (n: number) => void;
  onToggleBlue: (n: number) => void;
}

/**
 * 红球 1-33、蓝球 1-16 的网格选号器。
 */
export function BallSelector({ selectedRed, selectedBlue, onToggleRed, onToggleBlue }: BallSelectorProps) {
  const reds = Array.from({ length: 33 }, (_, i) => i + 1);
  const blues = Array.from({ length: 16 }, (_, i) => i + 1);

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-rose-200">红球（选 6 个）</h3>
          <span className="text-xs text-slate-400">已选 {selectedRed.length} / 6</span>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-2">
          {reds.map((n) => (
            <Ball
              key={`r-${n}`}
              label={n.toString().padStart(2, "0")}
              variant="red"
              selected={selectedRed.includes(n)}
              onClick={() => onToggleRed(n)}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-sky-200">蓝球（选 1 个）</h3>
          <span className="text-xs text-slate-400">已选 {selectedBlue !== null ? 1 : 0} / 1</span>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-2">
          {blues.map((n) => (
            <Ball
              key={`b-${n}`}
              label={n.toString().padStart(2, "0")}
              variant="blue"
              selected={selectedBlue === n}
              onClick={() => onToggleBlue(n)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
