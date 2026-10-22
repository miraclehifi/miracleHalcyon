import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { mapSubject } from "../../../src/domains/shelf/douban/map";
import { DoubanParseError } from "../../../src/domains/shelf/errors";

// SHELF-UT-08：录制夹具 → 识别字段（tests/fixtures/douban/README.md）
const load = (name: string) => JSON.parse(readFileSync(`tests/fixtures/douban/${name}.json`, "utf8"));
const tags = (name: string) => load(`${name}-tags`).tags as string[];

describe("mapSubject", () => {
  // [TC-US02-01][TC-US02-03][SC-RECOG-03][SC-RECOG-09][SC-RECOG-10][SC-RECOG-11] 字段与分类推断（决策表）
  it.each([
    ["book-principles", "book", tags("book-principles"), { type: "book", title: "原则", creator: "瑞·达利欧", year: 2018 }],
    ["book-manga", "book", tags("book-manga"), { type: "comic", title: "灌篮高手（全31卷）", creator: "井上雄彦", year: 2005 }],
    ["book-manga", "book", [], { type: "book" }],
    ["movie-shawshank", "movie", [], { type: "movie", title: "肖申克的救赎", creator: "弗兰克·德拉邦特", year: 1994 }],
    ["movie-animated", "movie", [], { type: "movie", title: "千与千寻", creator: "宫崎骏", year: 2001 }],
    ["tv-drama", "movie", [], { type: "series", title: "请回答1988", creator: "申元浩", year: 2015 }],
    ["tv-anime", "movie", [], { type: "series", title: "葬送的芙莉莲", creator: "斋藤圭一郎", year: 2023 }],
    ["tv-dispatch", "movie", [], { type: "series", title: "现在不是出轨的问题", year: 2026 }],
    ["game-video", "game", [], { type: "game", title: "传送门2 Portal 2", creator: "Valve Corporation", year: 2011 }],
    ["game-board", "game", [], { type: "boardgame", title: "卡坦岛 Catan", creator: "Capcom、Big Huge Games", year: 2005 }],
  ])("%s（%s）", (name, kind, bookTags, expected) => {
    const result = mapSubject(kind as "book" | "movie" | "game", load(name), bookTags);
    expect(result.fields).toMatchObject(expected);
    expect(result.coverUrl).toMatch(/^https:\/\/img\d\.doubanio\.com\//);
    expect(result.missing).toEqual([]);
  });

  // [TC-US02-04][SC-RECOG-08] 缺失字段为 null 并列入 missing
  it("部分识别", () => {
    const noYear = mapSubject("book", load("book-no-year"), []);
    const bare = mapSubject("book", { title: "孤本" }, []);
    expect([noYear.fields.year, noYear.missing, bare.fields, bare.coverUrl, bare.missing]).toEqual([
      null, ["year"], { type: "book", title: "孤本", creator: null, year: null }, null, ["creator", "year", "cover"],
    ]);
  });

  // [TC-US02-07][SC-RECOG-15] 无标题、非对象 → 解析失败
  it.each([[load("no-title")], [null], ["<html>"], [[1, 2]], [{ title: "   " }]])("无法解析：%j", (json) => {
    expect(() => mapSubject("book", json, [])).toThrow(DoubanParseError);
  });

  it("作者去掉开头国籍括号，多位作者以顿号连接", () => {
    const r = mapSubject("book", { title: "x", author: ["[美] 甲", "（英）乙", "丙"], pubdate: ["1999"] }, []);
    expect(r.fields.creator).toBe("甲、乙、丙");
  });
});
