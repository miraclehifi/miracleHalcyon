import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  importPlan, IMPORT_STEPS, isDoubanTimestamp, isValidDoubanUid, mapInterest, parseInterestPage, type ImportKind,
} from "../../../src/domains/shelf/douban/import";
import { DoubanParseError, ImportItemError } from "../../../src/domains/shelf/errors";

// SHELF-UT-16、17：标记列表 → 导入字段（tests/fixtures/douban/README.md"导入夹具"）
const load = (name: string) => JSON.parse(readFileSync(`tests/fixtures/douban/${name}.json`, "utf8"));
const interestsOf = (name: string) => load(name).interests as Record<string, unknown>[];
const byId = (name: string, id: string) => interestsOf(name).find((i) => (i.subject as { id: string }).id === id)!;
const fieldsOf = (kind: ImportKind, interest: unknown, extra = {}) => {
  const result = mapInterest(kind, interest, extra);
  if ("skip" in result) throw new Error("意外跳过");
  return result;
};
const parseCode = (fn: () => unknown) => {
  try {
    fn();
    return "ok";
  } catch (error) {
    return error instanceof ImportItemError ? `${error.reason}:${error.doubanId}` : String(error);
  }
};

describe("isValidDoubanUid", () => {
  // [TC-US04-10][SC-IMPORT-20] 等价类 / 边界
  it.each([
    ["189806038", true], ["ahbei", true], ["a_b.c-d", true], ["a".repeat(64), true],
    ["a".repeat(65), false], ["", false], [".", false], ["..", false], ["../user/1", false], ["a/b", false], ["a?b", false],
    ["a#b", false], ["a%2Fb", false], ["张三", false], ["a b", false], [189806038, false], [null, false],
  ])("%j → %s", (uid, ok) => {
    expect(isValidDoubanUid(uid)).toBe(ok);
  });
});

describe("导入计划与时间格式", () => {
  it("IMPORT_STEPS 顺序：影视 → 书 → 游戏，各自看过 → 在看", () => {
    expect(IMPORT_STEPS.map((s) => `${s.kind}·${s.status}`)).toEqual(["movie·done", "movie·doing", "book·done", "book·doing", "game·done", "game·doing"]);
  });

  // [TC-US04-26][SC-IMPORT-28] 只保留含勾选类别的大类，每步带该大类内勾选的类别
  it("importPlan", () => {
    expect(importPlan(["comic", "movie"]).map((s) => [s.kind, s.status, s.types])).toEqual([
      ["movie", "done", ["movie"]], ["movie", "doing", ["movie"]], ["book", "done", ["comic"]], ["book", "doing", ["comic"]],
    ]);
    expect(importPlan(["boardgame", "game", "series", "movie"]).map((s) => s.types)).toEqual([["movie", "series"], ["movie", "series"], ["game", "boardgame"], ["game", "boardgame"]]);
    expect(importPlan([])).toEqual([]);
  });

  it.each([
    ["2026-10-18 08:25:08", true], ["2026-10-18T08:25:08", false], ["2026/10/18 08:25:08", false], ["2026-10-18", false], [null, false],
  ])("isDoubanTimestamp(%j) → %s", (value, ok) => {
    expect(isDoubanTimestamp(value)).toBe(ok);
  });
});

describe("parseInterestPage", () => {
  // [TC-US04-08][SC-IMPORT-11] total 原样；interests 缺失视为空；total 不合法 → 解析失败
  it("total 与 interests", () => {
    expect(parseInterestPage({ total: 45, interests: interestsOf("interests-movie-done") }).interests).toHaveLength(5);
    expect(parseInterestPage({ total: 0 })).toEqual({ total: 0, interests: [] });
    for (const bad of [{}, { total: -1 }, { total: 1.5 }, { total: "45" }, null, "<html>"]) expect(() => parseInterestPage(bad)).toThrow(DoubanParseError);
  });
});

describe("mapInterest", () => {
  // [TC-US04-01][SC-IMPORT-03][SC-IMPORT-07] 影视：电影 / 剧集、状态、评分、日期、短评
  it("影视", () => {
    const film = fieldsOf("movie", byId("interests-movie-done", "25765735"));
    expect(film).toEqual({
      doubanId: "25765735",
      coverUrl: expect.stringMatching(/^https:\/\/img\d\.doubanio\.com\//),
      fields: {
        type: "movie", title: "金刚狼3：殊死一战", creator: "詹姆斯·曼高德", year: 2017, status: "completed", rating: 4, markedOn: "2026-06-12",
        comment: expect.stringMatching(/^大学时漫威电影课放映/), douban: { id: "25765735", url: "https://movie.douban.com/subject/25765735/" },
      },
    });
    const show = fieldsOf("movie", byId("interests-movie-done", "30513783")).fields;
    const unrated = fieldsOf("movie", byId("interests-movie-done", "25786060")).fields;
    const doing = fieldsOf("movie", interestsOf("interests-movie-doing")[0]).fields;
    expect([show.type, show.comment, unrated.rating, doing.type, doing.status, doing.rating]).toEqual(["series", null, null, "series", "in_progress", null]);
  });

  // [TC-US04-02][SC-IMPORT-04] 书：漫画、作者去国籍、年份
  it("书（决策表）", () => {
    const novel = fieldsOf("book", byId("interests-book-done", "10594787"), { tags: ["小说"] }).fields;
    const yearMonth = fieldsOf("book", byId("interests-book-done", "36667314")).fields;
    const noDate = fieldsOf("book", byId("interests-book-done", "35053236")).fields;
    const noField = fieldsOf("book", { ...byId("interests-book-done", "35053236"), subject: { ...(byId("interests-book-done", "35053236").subject as object), pubdate: undefined } }).fields;
    const manga = fieldsOf("book", byId("interests-book-done", "36484713"), { tags: ["漫画", "日本"] }).fields;
    const tagsFailed = fieldsOf("book", byId("interests-book-done", "36484713"), { tags: [] }).fields;
    expect([novel.creator, novel.year, novel.type, yearMonth.year, noDate.year, noField.year, manga.type, tagsFailed.type]).toEqual([
      "加西亚·马尔克斯", 2012, "book", 2024, undefined, undefined, "comic", "book",
    ]);
    expect(novel.douban).toEqual({ id: "10594787", url: "https://book.douban.com/subject/10594787/" });
  });

  // [TC-US04-03][SC-IMPORT-05] 游戏：平台（决策表）、桌游、开发商取自游戏详情、不取封面
  it.each([
    [["PS5"], "ps5"], [["PS4"], "ps4"], [["NS"], "switch"], [["NS 2"], "switch2"], [["ns2"], "switch2"], [["PC"], "steam"],
    [["XSX"], undefined], [["XSX", "PC"], "steam"], [[], undefined],
  ])("游戏平台 %j → %s", (abbreviations, platform) => {
    const interest = { ...byId("interests-game-done", "37380017"), platforms: abbreviations.map((abbreviation) => ({ abbreviation })) };
    expect(fieldsOf("game", interest).fields.platform).toBe(platform);
  });

  it("游戏与桌游", () => {
    const game = fieldsOf("game", byId("interests-game-done", "37380017"), { game: load("game-video") });
    const noDetail = fieldsOf("game", byId("interests-game-done", "36721901")).fields;
    const board = fieldsOf("game", byId("interests-game-done", "26436096")).fields;
    expect([game.fields.type, game.fields.creator, game.fields.year, game.coverUrl, game.fields.douban?.url]).toEqual([
      "game", "Valve Corporation", 2026, null, "https://www.douban.com/game/37380017/",
    ]);
    expect([noDetail.creator, noDetail.platform, board.type, board.platform]).toEqual([undefined, undefined, "boardgame", undefined]);
  });

  // [TC-US04-04][SC-IMPORT-06] 想看（接口混入）跳过
  it("status 不是 done / doing → 跳过", () => {
    expect(mapInterest("movie", byId("interests-movie-done", "1305724"), {})).toEqual({ skip: true });
  });

  // [TC-US04-05][SC-IMPORT-13] 无标题 / 无条目 ID / 标记时间非法 → PARSE_FAILED；超长截断
  it("解析失败与截断", () => {
    const base = byId("interests-movie-done", "25765735");
    const subject = base.subject as Record<string, unknown>;
    expect([
      parseCode(() => mapInterest("movie", byId("interests-movie-done", "1401524"), {})),
      parseCode(() => mapInterest("movie", { ...base, subject: { ...subject, id: undefined } }, {})),
      parseCode(() => mapInterest("movie", { ...base, subject: { ...subject, id: "12ab" } }, {})),
      parseCode(() => mapInterest("movie", { ...base, create_time: "2026-02-30 10:00:00" }, {})),
      parseCode(() => mapInterest("movie", { ...base, create_time: undefined }, {})),
      parseCode(() => mapInterest("movie", null, {})),
    ]).toEqual(["PARSE_FAILED:1401524", "PARSE_FAILED:null", "PARSE_FAILED:null", "PARSE_FAILED:25765735", "PARSE_FAILED:25765735", "PARSE_FAILED:null"]);
    const long = fieldsOf("movie", { ...base, comment: "评".repeat(1200), rating: { value: 0 }, subject: { ...subject, title: "长".repeat(250), year: "999" } }).fields;
    expect([[...(long.comment ?? "")].length, long.title.length, long.rating, long.year]).toEqual([1000, 200, null, undefined]);
    expect(fieldsOf("movie", { ...base, comment: "  一行\r\n两行  " }).fields.comment).toBe("一行\n两行");
  });
});
