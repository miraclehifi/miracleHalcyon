import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { countLabel, SHELF_TYPES, sortEntries, statusLabel } from "../../../src/domains/shelf/entry";
import { parseShelfData } from "../../../src/integrations/reader-data";
import { emptyIcon, groupShelf, markedMonth, posterAspect, shelfPath } from "../../../src/lib/reader/shelf";

const { entries } = parseShelfData(JSON.parse(readFileSync("tests/fixtures/reader/reader-fixture.shelf.json", "utf8")), "reader-fixture");

// [UT-01][SC-MANAGE-09][SC-SHELF-04]
describe("statusLabel", () => {
  it("6 个分类 × 2 个状态", () => {
    expect(SHELF_TYPES.map((t) => [statusLabel(t, "completed"), statusLabel(t, "in_progress")])).toEqual([
      ["读过", "在读"],
      ["读过", "在读"],
      ["看过", "在看"],
      ["看过", "在看"],
      ["玩过", "在玩"],
      ["玩过", "在玩"],
    ]);
  });
});

// [UT-02][SC-SHELF-03][SC-SHELF-12]
describe("countLabel", () => {
  it("量词与进行中数", () => {
    expect([countLabel("book", 10, 2), countLabel("movie", 5, 0), countLabel("boardgame", 0, 0), countLabel("series", 3, 1)]).toEqual(["10 本 · 在读 2", "5 部", "0 款", "3 部 · 在看 1"]);
  });
});

// [UT-03][SC-MANAGE-02][SC-SHELF-04]
describe("sortEntries", () => {
  const rows = [
    { id: 1, status: "completed", markedOn: "2026-03-01" },
    { id: 2, status: "in_progress", markedOn: "2026-01-10" },
    { id: 3, status: "completed", markedOn: "2026-09-15" },
    { id: 4, status: "completed", markedOn: "2026-09-15" },
  ] as const;
  it("进行中在前、日期倒序、同日 id 倒序；输入顺序无关；空数组", () => {
    expect(sortEntries(rows).map((r) => r.id)).toEqual([2, 4, 3, 1]);
    expect(sortEntries([...rows].reverse()).map((r) => r.id)).toEqual([2, 4, 3, 1]);
    expect(sortEntries([])).toEqual([]);
  });
});

// [UT-05] shared-field-formats"标记年月"
describe("markedMonth", () => {
  it("截取 yyyy-MM", () => {
    expect(markedMonth("2026-10-01")).toBe("2026-10");
  });
});

// [SHELF-UT-11][TC-US03-04][TC-US03-05]
describe("groupShelf / shelfPath / emptyIcon", () => {
  const groups = groupShelf(entries);
  const titles = (type: keyof typeof groups) => groups[type].map((e) => e.title);

  it("按分类分组，组内进行中在前、日期倒序；空分类为空数组", () => {
    expect({ series: titles("series"), book: titles("book"), movie: titles("movie"), game: titles("game"), boardgame: titles("boardgame"), comic: titles("comic") }).toEqual({
      series: ["B", "C", "A"],
      book: ["三体", "原则", "手记", "<b>粗体</b>"],
      movie: ["肖申克的救赎", "无名片"],
      game: ["塞尔达传说：王国之泪", "黑神话：悟空", "博德之门 3", "断链游戏", "某款老游戏"],
      boardgame: ["卡坦岛", "无评桌游"],
      comic: [],
    });
  });

  it("同日条目保持接口顺序（接口按 id 降序：新建在前）", () => {
    const same = [
      { ...entries[0], type: "game" as const, title: "新", markedOn: "2026-05-01" },
      { ...entries[0], type: "game" as const, title: "旧", markedOn: "2026-05-01" },
    ];
    expect(groupShelf(same).game.map((e) => e.title)).toEqual(["新", "旧"]);
  });

  it("分类地址与空状态图标", () => {
    expect(SHELF_TYPES.map(shelfPath)).toEqual(["/media", "/media/comic", "/media/movie", "/media/series", "/media/game", "/media/boardgame"]);
    expect(SHELF_TYPES.map(emptyIcon)).toEqual(["book-open", "book-image", "film", "tv", "gamepad-2", "dices"]);
  });
});

// [UT-17][SC-SHELF-21][SC-SHELF-22] 海报砖块宽高比（reader module-spec posterAspect）
describe("posterAspect", () => {
  const size = { width: 810, height: 1080 };
  it("书、漫画、电影、剧集 2 / 3（不看封面宽高）；桌游 1 / 1", () => {
    expect((["book", "comic", "movie", "series", "boardgame"] as const).map((type) => posterAspect(type, size))).toEqual(["2 / 3", "2 / 3", "2 / 3", "2 / 3", "1 / 1"]);
  });
  it("游戏按封面原始宽高；无封面、宽高缺失或为 0 → 3 / 4", () => {
    expect(posterAspect("game", size)).toBe("810 / 1080");
    expect(posterAspect("game", { width: 600, height: 900 })).toBe("600 / 900");
    expect([posterAspect("game", null), posterAspect("game", { width: null, height: 1080 }), posterAspect("game", { width: 0, height: 1080 }), posterAspect("game", { width: 810, height: 0 })]).toEqual(["3 / 4", "3 / 4", "3 / 4", "3 / 4"]);
  });
});

// 构建数据校验接受游戏的 IGDB 封面与平台、宽高（ADR-013 §4）；旧数据缺新字段时补 null
describe("parseShelfData 游戏字段", () => {
  const IGDB = "https://images.igdb.com/igdb/image/upload/t_1080p/co8h3y.jpg";
  const base = { type: "game", title: "塞尔达", creator: null, year: null, status: "completed", rating: null, markedOn: "2026-05-01", comment: null, doubanUrl: null };
  const parse = (entry: Record<string, unknown>) => parseShelfData({ entries: [entry] }, "t").entries[0];

  it("IGDB 封面、平台与宽高；缺字段补 null", () => {
    expect(parse({ ...base, cover: IGDB, platform: "switch2", coverWidth: 810, coverHeight: 1080 })).toMatchObject({ cover: IGDB, platform: "switch2", coverWidth: 810, coverHeight: 1080 });
    expect(parse({ ...base, cover: null })).toMatchObject({ platform: null, coverWidth: null, coverHeight: null });
  });

  it("非规范外链、非法平台、非法宽高 → 报错", () => {
    for (const bad of [
      { cover: "https://example.com/a.jpg" },
      { cover: "https://images.igdb.com/igdb/image/upload/t_720p/co8h3y.png" },
      { cover: null, platform: "xbox" },
      { cover: IGDB, coverWidth: 0, coverHeight: 1080 },
    ]) {
      expect(() => parse({ ...base, ...bad })).toThrow(/条目字段不合法/);
    }
  });
});
