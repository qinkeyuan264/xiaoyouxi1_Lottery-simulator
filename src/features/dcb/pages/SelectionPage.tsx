import { BallSelector } from "../components/BallSelector";

interface SelectionPageProps {
  selectedRed: number[];
  selectedBlue: number | null;
  onToggleRed: (n: number) => void;
  onToggleBlue: (n: number) => void;
}

/**
 * 选号子页面：仅负责渲染选号器，由 DcbGamePage 作为容器组织布局。
 */
export function SelectionPage({
  selectedRed,
  selectedBlue,
  onToggleRed,
  onToggleBlue,
}: SelectionPageProps) {
  return (
    <BallSelector
      selectedRed={selectedRed}
      selectedBlue={selectedBlue}
      onToggleRed={onToggleRed}
      onToggleBlue={onToggleBlue}
    />
  );
}
