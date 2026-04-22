/** zustand persist 的 name（与 useUserStore 一致） */
const USER_PERSIST_NAME = "lottery-sim-user";

/**
 * 从 localStorage 读取当前登录用户名，用于成就存档分账号隔离。
 * 与 user store 的 persist 格式一致：{ state: { username, ... }, version }。
 */
export function getAchievementUserSuffix(): string {
  try {
    const raw = localStorage.getItem(USER_PERSIST_NAME);
    if (!raw) return "_guest";
    const parsed = JSON.parse(raw) as { state?: { username?: string | null } };
    const u = parsed?.state?.username;
    if (u && typeof u === "string" && u.length > 0) {
      return encodeURIComponent(u);
    }
    return "_guest";
  } catch {
    return "_guest";
  }
}

export function getScopedPersistName(baseName: string): string {
  return `${baseName}__${getAchievementUserSuffix()}`;
}

/**
 * 若存在旧的无后缀 key，则迁移到 scoped key 下（只迁移一次）。
 */
export function migrateLegacyPersistKey(baseName: string): void {
  try {
    const scoped = getScopedPersistName(baseName);
    const hasScoped = localStorage.getItem(scoped) !== null;
    const legacy = localStorage.getItem(baseName);
    if (!hasScoped && legacy !== null) {
      localStorage.setItem(scoped, legacy);
      localStorage.removeItem(baseName);
    }
  } catch {
    // ignore
  }
}

// 旧版通过自定义 storage 做 key 重写；现改为直接改 persist.name（更稳定）。
