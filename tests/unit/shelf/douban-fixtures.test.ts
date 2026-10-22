import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dir = "tests/fixtures/douban/";

describe("豆瓣夹具（spike-douban-rexxar）", () => {
  const jsonFiles = readdirSync(dir).filter((f) => f.endsWith(".json"));

  it("包含识别用到的全部样例", () => {
    for (const name of ["book-principles", "book-manga", "movie-shawshank", "movie-animated", "tv-drama", "tv-anime", "game-video", "game-board", "book-no-year", "no-title"]) {
      expect(jsonFiles).toContain(`${name}.json`);
    }
  });

  it.each(jsonFiles.filter((f) => !f.endsWith("-tags.json") && f !== "no-title.json"))("%s 可解析且有标题", (file) => {
    const data = JSON.parse(readFileSync(dir + file, "utf8"));
    expect(typeof data.title).toBe("string");
    expect(data.title.length).toBeGreaterThan(0);
  });

  it("封面样本是 JPEG", () => {
    const bytes = readFileSync(dir + "cover-ok.jpg");
    expect([...bytes.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
  });
});
