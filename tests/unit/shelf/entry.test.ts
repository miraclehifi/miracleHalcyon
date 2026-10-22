import { describe, expect, it } from "vitest";
import {
  canonicalDoubanUrl,
  countLabel,
  creatorLabel,
  detectCoverType,
  isCoverKey,
  newCoverKey,
  normalizeEntryInput,
  SHELF_TYPES,
  TYPE_LABELS,
  sortEntries,
  statusLabel,
} from "../../../src/domains/shelf/entry";
import { ShelfValidationError } from "../../../src/domains/shelf/errors";

const MIN = { type: "book", title: "原则", status: "completed", markedOn: "2026-10-01" };
const fieldsOf = (raw: unknown) => {
  try {
    normalizeEntryInput(raw);
    return [];
  } catch (error) {
    if (error instanceof ShelfValidationError) return error.fields;
    throw error;
  }
};

describe("normalizeEntryInput（SHELF-UT-01）", () => {
  // [TC-US01-03][SC-MANAGE-05] 最小字段：可空字段为 null
  it("最小字段通过，可空字段为 null", () => {
    expect(normalizeEntryInput(MIN)).toEqual({ ...MIN, creator: null, year: null, rating: null, comment: null, douban: null });
  });

  // [TC-US01-04][SC-MANAGE-07][SC-MANAGE-08] 等价类与边界值
  it.each([
    [{ title: "" }, ["title"]],
    [{ title: "   " }, ["title"]],
    [{ title: undefined }, ["title"]],
    [{ title: "a" }, []],
    [{ title: "字".repeat(200) }, []],
    [{ title: "字".repeat(201) }, ["title"]],
    [{ type: "music" }, ["type"]],
    [{ type: "BOOK" }, ["type"]],
    [{ type: "anime" }, ["type"]], // 2026-10-22 去掉的分类（drop-anime-type）
    [{ status: "wish" }, ["status"]],
    [{ rating: 0 }, ["rating"]],
    [{ rating: 6 }, ["rating"]],
    [{ rating: 3.5 }, ["rating"]],
    [{ rating: "4" }, ["rating"]],
    [{ rating: 1 }, []],
    [{ rating: 5 }, []],
    [{ rating: null }, []],
    [{ year: 23 }, ["year"]],
    [{ year: 20231 }, ["year"]],
    [{ year: "2023" }, ["year"]],
    [{ year: 1000 }, []],
    [{ year: 9999 }, []],
    [{ markedOn: "2026-13-01" }, ["markedOn"]],
    [{ markedOn: "2026/10/01" }, ["markedOn"]],
    [{ markedOn: undefined }, ["markedOn"]],
    [{ markedOn: "2026-02-29" }, ["markedOn"]],
    [{ markedOn: "2028-02-29" }, []],
    [{ comment: "字".repeat(1000) }, []],
    [{ comment: "字".repeat(1001) }, ["comment"]],
  ])("%j → %j", (patch, fields) => {
    expect(fieldsOf({ ...MIN, ...patch })).toEqual(fields);
  });

  it("多个错误按固定字段顺序合并", () => {
    expect(fieldsOf({ type: "x", title: "", status: "x", markedOn: "x", rating: 9 })).toEqual(["type", "title", "status", "rating", "markedOn"]);
  });

  // [TC-US01-15] 文本去首尾空白、空串为 null、短评换行统一为 \n、emoji 按码点计
  it("文本规范化", () => {
    const entry = normalizeEntryInput({ ...MIN, title: " 🎮 Zelda ", creator: "  ", comment: " 第一行\r\n第二行\r第三行 " });
    expect(entry).toMatchObject({ title: "🎮 Zelda", creator: null, comment: "第一行\n第二行\n第三行" });
    expect(fieldsOf({ ...MIN, title: "😀".repeat(200) })).toEqual([]);
  });

  // [TC-US01-12] 豆瓣字段：同时有或同时无，且必须是规范链接
  it("豆瓣字段", () => {
    const url = "https://book.douban.com/subject/27608239/";
    expect(normalizeEntryInput({ ...MIN, doubanId: "27608239", doubanUrl: url }).douban).toEqual({ id: "27608239", url });
    expect(normalizeEntryInput({ ...MIN, doubanId: null, doubanUrl: null }).douban).toBeNull();
    for (const bad of [
      { doubanId: "27608239", doubanUrl: null },
      { doubanId: null, doubanUrl: url },
      { doubanId: "abc", doubanUrl: url },
      { doubanId: "27608239", doubanUrl: "https://evil.example/subject/27608239/" },
      { doubanId: "27608239", doubanUrl: "https://book.douban.com/subject/1/" },
    ]) {
      expect(fieldsOf({ ...MIN, ...bad })).toEqual(["doubanUrl"]);
    }
  });
});

describe("sortEntries（SHELF-UT-02）", () => {
  // [TC-US01-02][SC-MANAGE-02] 进行中在前 → 标记日期降序 → 同日 id 降序
  it("D、B、E、C、A", () => {
    const rows = [
      { id: 1, name: "A", status: "completed", markedOn: "2026-03-01" },
      { id: 2, name: "B", status: "in_progress", markedOn: "2026-01-10" },
      { id: 3, name: "C", status: "completed", markedOn: "2026-09-15" },
      { id: 4, name: "D", status: "in_progress", markedOn: "2026-08-01" },
      { id: 5, name: "E", status: "completed", markedOn: "2026-09-15" },
    ] as const;
    expect(sortEntries(rows).map((r) => r.name)).toEqual(["D", "B", "E", "C", "A"]);
    expect(sortEntries([...rows].reverse()).map((r) => r.name)).toEqual(["D", "B", "E", "C", "A"]);
  });
});

describe("分类（drop-anime-type）", () => {
  // [SC-MANAGE-01][SC-SHELF-02] 6 个分类，无"动画"；series 显示为"剧集"
  it("分类枚举与显示名", () => {
    expect(SHELF_TYPES).toEqual(["book", "comic", "movie", "series", "game", "boardgame"]);
    expect(SHELF_TYPES.map((t) => TYPE_LABELS[t])).toEqual(["书", "漫画", "电影", "剧集", "游戏", "桌游"]);
  });
});

describe("文案（SHELF-UT-03）", () => {
  // [SC-MANAGE-09][SC-SHELF-03]
  it("状态动词、作者标签、计数", () => {
    expect(SHELF_TYPES.map((t) => `${statusLabel(t, "completed")}/${statusLabel(t, "in_progress")}`)).toEqual([
      "读过/在读", "读过/在读", "看过/在看", "看过/在看", "玩过/在玩", "玩过/在玩",
    ]);
    expect([creatorLabel("comic"), creatorLabel("series"), creatorLabel("boardgame")]).toEqual(["作者", "导演", "开发商"]);
    expect([countLabel("book", 10, 2), countLabel("movie", 5, 0), countLabel("boardgame", 0, 0), countLabel("series", 3, 1)]).toEqual([
      "10 本 · 在读 2", "5 部", "0 款", "3 部 · 在看 1",
    ]);
  });
});

describe("detectCoverType（SHELF-UT-04）", () => {
  // [TC-US01-05][SC-MANAGE-11]
  it("只认 jpg / png / webp 文件头", () => {
    const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]);
    const cases = [
      new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      webp,
      new TextEncoder().encode("<svg xmlns="),
      new TextEncoder().encode("GIF89a"),
      new Uint8Array(),
      new TextEncoder().encode("not a jpeg"),
    ];
    expect(cases.map(detectCoverType)).toEqual(["image/jpeg", "image/png", "image/webp", null, null, null, null]);
  });
});

describe("封面 key（SHELF-UT-05）与规范链接", () => {
  it("生成与校验", () => {
    const key = newCoverKey(new Date("2026-10-21T23:59:00Z"), "image/png", "abcdefghij23");
    expect(key).toBe("covers/2026/10/abcdefghij23.png");
    expect([isCoverKey(key), isCoverKey("covers/../x.jpg"), isCoverKey("covers/2026/10/ABCDEFGHIJ23.jpg"), isCoverKey("img/2026/10/abcdefghij23.jpg")]).toEqual([true, false, false, false]);
    expect(newCoverKey(new Date(), "image/jpeg")).toMatch(/^covers\/\d{4}\/\d{2}\/[a-z2-7]{12}\.jpg$/);
  });

  it("canonicalDoubanUrl", () => {
    expect([canonicalDoubanUrl("book", "1"), canonicalDoubanUrl("movie", "2"), canonicalDoubanUrl("game", "3")]).toEqual([
      "https://book.douban.com/subject/1/",
      "https://movie.douban.com/subject/2/",
      "https://www.douban.com/game/3/",
    ]);
  });
});
