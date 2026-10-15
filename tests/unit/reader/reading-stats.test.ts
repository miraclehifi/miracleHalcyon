import { describe, expect, it } from "vitest";
import { plainText } from "../../../src/lib/reader/excerpt";
import { formatLongDate, readingStats, updatedDate } from "../../../src/lib/reader/reading-stats";

// [TC-US07-04][TC-US07-05][SC-ARTICLE-03] READER-UT-06
describe("readingStats / updatedDate / formatLongDate", () => {
  it("中文按字、英文按词计数；显示字数向上取整到百；阅读时长 = 字数 / 300 向上取整且至少 1 分钟", () => {
    expect(readingStats("你好世界 hello world")).toEqual({ count: 6, displayWords: 6, minutes: 1 });
    expect(readingStats("字".repeat(300))).toMatchObject({ count: 300, displayWords: 300, minutes: 1 });
    expect(readingStats("字".repeat(301))).toMatchObject({ count: 301, displayWords: 400, minutes: 2 });
    expect(readingStats("")).toEqual({ count: 0, displayWords: 0, minutes: 1 });
  });

  it("发布后更新过（UTC 日期晚于发布日期）才返回更新日期", () => {
    const at = (lastPublishedAt: string) => updatedDate({ publishedAt: "2026-10-10", lastPublishedAt });
    expect(at("2026-10-10T08:00:00.000Z")).toBeNull();
    expect(at("2026-10-12T01:00:00.000Z")).toBe("2026-10-12");
    expect(at("2026-10-09T23:00:00.000Z")).toBeNull();
  });

  it("长日期带星期，不受时区影响", () => {
    expect(formatLongDate("2026-10-10")).toBe("2026年10月10日 星期六");
    expect(formatLongDate("2026-10-08")).toBe("2026年10月8日 星期四");
    expect(formatLongDate("2026-01-01")).toBe("2026年1月1日 星期四");
  });

  it("plainText 去掉标题、强调符号、图片、代码块与 HTML", () => {
    const text = plainText("## 标题\n\n**粗体**文字 ![图](/img/x.jpg) [链接](/a)\n\n```ts\nconst a = 1;\n```\n\n<div>html</div>\n\n- 列表");
    expect(text).toBe("标题 粗体文字 链接 列表");
  });
});
