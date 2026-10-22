// 书影音读者端视图模型（reader module-spec §1.3，shelf domain-model §6）
import type { ShelfType } from "../../domains/shelf/entry";

// 分类的读者页地址：书为 /media，其余 /media/{type}
export function shelfPath(type: ShelfType): string {
  return type === "book" ? "/media" : `/media/${type}`;
}
