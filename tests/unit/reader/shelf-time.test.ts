import { describe, expect, it } from "vitest";
import type { ShelfPublicEntry } from "../../../src/domains/shelf/entry";
import { groupByTime } from "../../../src/lib/reader/shelf-time";

const movie = (title: string, markedOn: string, status: ShelfPublicEntry["status"] = "completed"): ShelfPublicEntry => ({
  type: "movie",
  title,
  creator: null,
  year: null,
  status,
  rating: null,
  markedOn,
  comment: null,
  cover: null,
  doubanUrl: null,
  platform: null,
  coverWidth: null,
  coverHeight: null,
});

const summary = (groups: ReturnType<typeof groupByTime>) => groups.map((g) => [g.label, g.meta, g.entries.map((e) => e.title)]);

// [UT-15][SC-SHELF-20] reader module-spec §2 groupByTime
describe("groupByTime", () => {
  it("today = 2026-10-22：六类段的归属、顺序与 meta", () => {
    const entries = [
      movie("更早", "2024-06-01"),
      movie("去年", "2025-12-31"),
      movie("本年", "2026-03-01"),
      movie("上月", "2026-09-30"),
      movie("本月", "2026-10-05"),
      movie("在看", "2025-01-01", "in_progress"),
    ];
    expect(summary(groupByTime(entries, "2026-10-22"))).toEqual([
      ["在看", "1 部", ["在看"]],
      ["本月", "10 月 · 1 部", ["本月"]],
      ["上个月", "9 月 · 1 部", ["上月"]],
      ["本年", "2026 · 1 部", ["本年"]],
      ["去年", "2025 · 1 部", ["去年"]],
      ["2024", "1 部", ["更早"]],
    ]);
  });

  it("晚于今天的日期归本月；空段不出现；段内按 sortEntries（日期倒序，同日保持输入顺序）", () => {
    expect(summary(groupByTime([movie("未来", "2026-11-01")], "2026-10-22"))).toEqual([["本月", "10 月 · 1 部", ["未来"]]]);
    const groups = groupByTime([movie("早", "2026-10-01"), movie("新 A", "2026-10-20"), movie("新 B", "2026-10-20")], "2026-10-22");
    expect(summary(groups)).toEqual([["本月", "10 月 · 3 部", ["新 A", "新 B", "早"]]]);
    expect(groupByTime([], "2026-10-22")).toEqual([]);
  });

  it("1 月时上一年 12 月归上个月，11 月归去年；更早年份倒序", () => {
    const groups = groupByTime([movie("十二月", "2025-12-20"), movie("十一月", "2025-11-01"), movie("2022", "2022-05-01"), movie("2023", "2023-05-01")], "2026-01-15");
    expect(summary(groups)).toEqual([
      ["上个月", "12 月 · 1 部", ["十二月"]],
      ["去年", "2025 · 1 部", ["十一月"]],
      ["2023", "1 部", ["2023"]],
      ["2022", "1 部", ["2022"]],
    ]);
  });

  it("today 为 3 月 1 日时，闰年 2 月 29 日归上个月", () => {
    expect(summary(groupByTime([movie("闰日", "2028-02-29")], "2028-03-01"))).toEqual([["上个月", "2 月 · 1 部", ["闰日"]]]);
  });

  it("每段有稳定 key", () => {
    expect(groupByTime([movie("a", "2024-06-01"), movie("b", "2026-10-05")], "2026-10-22").map((g) => g.key)).toEqual(["this-month", "year-2024"]);
  });
});
