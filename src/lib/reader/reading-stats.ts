// 标题区：字数与阅读时长、更新日期、长日期（reader module-spec §2）
const HAN = /\p{Script=Han}/gu;
const WORD = /[\p{L}\p{N}]+/gu;
const WORDS_PER_MINUTE = 300;
const WEEKDAYS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

export interface ReadingStats {
  count: number;
  displayWords: number; // ≥ 100 时向上取整到百，用于"约 3,200 字"
  minutes: number;
}

// 汉字按字计数，其余按"字母数字串"计词（汉字已先去掉，避免整段中文算成一个词）
export function readingStats(text: string): ReadingStats {
  const han = text.match(HAN)?.length ?? 0;
  const words = text.replace(HAN, " ").match(WORD)?.length ?? 0;
  const count = han + words;
  return {
    count,
    displayWords: count >= 100 ? Math.ceil(count / 100) * 100 : count,
    minutes: Math.max(1, Math.ceil(count / WORDS_PER_MINUTE)),
  };
}

// 发布后更新过：lastPublishedAt 的 UTC 日期晚于发布日期
export function updatedDate(post: { publishedAt: string; lastPublishedAt: string }): string | null {
  const day = post.lastPublishedAt.slice(0, 10);
  return day > post.publishedAt ? day : null;
}

// yyyy-MM-dd → "2026年10月10日 星期六"（按日历计算，不依赖运行时区）
export function formatLongDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${y}年${m}月${d}日 ${weekday}`;
}
