// 书影音读者端视图模型（reader module-spec §1.3，shelf domain-model §6）
import { SHELF_TYPES, sortEntries, type ShelfPublicEntry, type ShelfType } from "../../domains/shelf/entry";

// 分类的读者页地址：书为 /media，其余 /media/{type}
export function shelfPath(type: ShelfType): string {
  return type === "book" ? "/media" : `/media/${type}`;
}

// 标记年月：yyyy-MM-dd → yyyy-MM
export const markedMonth = (markedOn: string) => markedOn.slice(0, 7);

const EMPTY_ICONS: Record<ShelfType, string> = { book: "book-open", comic: "book-image", movie: "film", series: "tv", game: "gamepad-2", boardgame: "dices" };
export const emptyIcon = (type: ShelfType) => EMPTY_ICONS[type];

// 公开数据无 id：接口按 id 降序输出，以倒序下标代替 id 调用 sortEntries，同日的仍保持输入顺序（新建在前）
export function sortPublic(entries: readonly ShelfPublicEntry[]): ShelfPublicEntry[] {
  const rows = entries.map((entry, i) => ({ id: entries.length - i, status: entry.status, markedOn: entry.markedOn, entry }));
  return sortEntries(rows).map((row) => row.entry);
}

// 按分类分组，组内 sortPublic
export function groupShelf(entries: readonly ShelfPublicEntry[]): Record<ShelfType, ShelfPublicEntry[]> {
  return Object.fromEntries(SHELF_TYPES.map((type) => [type, sortPublic(entries.filter((entry) => entry.type === type))])) as Record<ShelfType, ShelfPublicEntry[]>;
}

// 海报砖块宽高比（CSS aspect-ratio 写法）：书、漫画、电影、剧集 2:3，桌游 1:1；游戏按 IGDB 大图原始宽高（ADR-013），无封面或宽高无效按 3:4
export function posterAspect(type: ShelfType, cover: { width: number | null; height: number | null } | null): string {
  if (type === "boardgame") return "1 / 1";
  if (type !== "game") return "2 / 3";
  const { width, height } = cover ?? { width: null, height: null };
  return width && height && width > 0 && height > 0 ? `${width} / ${height}` : "3 / 4";
}
