// 海报墙按时间分段（reader module-spec §2 groupByTime，reader-media.md"按时间分段"）：纯函数，日期按字符串拆分，不依赖时区
import { countLabel, statusLabel, type ShelfPublicEntry } from "../../domains/shelf/entry";
import { sortPublic } from "./shelf";

export interface TimeGroup {
  key: string;
  label: string;
  meta: string;
  entries: ShelfPublicEntry[];
}

const parts = (date: string) => ({ y: Number(date.slice(0, 4)), m: Number(date.slice(5, 7)) });

// entries：同一分类、已过滤隐藏；today：浏览器本地日期 yyyy-MM-dd。条目依次落入第一个满足的段，空段不返回
export function groupByTime(entries: readonly ShelfPublicEntry[], today: string): TimeGroup[] {
  const now = parts(today);
  const prev = now.m === 1 ? { y: now.y - 1, m: 12 } : { y: now.y, m: now.m - 1 };
  const buckets = new Map<string, { label: string; rank: number; month?: number; year?: number; entries: ShelfPublicEntry[] }>();
  const put = (key: string, label: string, rank: number, entry: ShelfPublicEntry, extra: { month?: number; year?: number } = {}) => {
    if (!buckets.has(key)) buckets.set(key, { label, rank, ...extra, entries: [] });
    buckets.get(key)!.entries.push(entry);
  };
  for (const entry of sortPublic(entries)) {
    const d = parts(entry.markedOn);
    if (entry.status === "in_progress") put("in-progress", statusLabel(entry.type, "in_progress"), 0, entry); // 在看 / 在玩 / 在读
    else if (entry.markedOn > today || (d.y === now.y && d.m === now.m)) put("this-month", "本月", 1, entry, { month: now.m });
    else if (d.y === prev.y && d.m === prev.m) put("last-month", "上个月", 2, entry, { month: prev.m });
    else if (d.y === now.y) put("this-year", "本年", 3, entry, { year: now.y });
    else if (d.y === now.y - 1) put("last-year", "去年", 4, entry, { year: now.y - 1 });
    else put(`year-${d.y}`, String(d.y), 10_000 - d.y + 5, entry);
  }
  return [...buckets.entries()]
    .sort(([, a], [, b]) => a.rank - b.rank)
    .map(([key, b]) => {
      const count = countLabel(b.entries[0].type, b.entries.length, 0);
      const meta = b.month !== undefined ? `${b.month} 月 · ${count}` : b.year !== undefined ? `${b.year} · ${count}` : count;
      return { key, label: b.label, meta, entries: b.entries };
    });
}
