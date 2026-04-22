import { useEffect } from "react";
import { useAchievementStore } from "@/store/useAchievementStore";
import { useUserStore } from "@/store/useUserStore";

/**
 * 将余额与成就系统同步，并在会话就绪后触发欢迎成就等检测。
 */
export function AchievementSync() {
  const username = useUserStore((s) => s.username);
  const hydrated = useAchievementStore((s) => s.hydrated);
  useEffect(() => {
    if (!username || !hydrated) return;
    useAchievementStore.getState().setSessionReady();
  }, [username, hydrated]);

  return null;
}
