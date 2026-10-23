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
