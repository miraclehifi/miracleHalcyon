import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "../../../src/lib/format/relative-time";

// [UT][SC-POSTLIST-01] 列表"更新于 {相对时间}"（admin-post-list.md）：1 小时内"N 分钟前"、当天"今天 HH:mm"、今年"M月D日"、更早"YYYY-MM-DD"
const TZ = "Asia/Shanghai";
const NOW = new Date("2026-10-13T10:00:00+08:00");
const at = (iso: string) => formatRelativeTime(new Date(iso), NOW, TZ);

describe("formatRelativeTime", () => {
  it("按距今时长与日历日分档，日历按指定时区", () => {
    expect({
      justNow: at("2026-10-13T09:59:40+08:00"),
      future: at("2026-10-13T10:00:30+08:00"),
      minutes: at("2026-10-13T09:15:00+08:00"),
      edgeOfHour: at("2026-10-13T09:00:01+08:00"),
      today: at("2026-10-13T09:00:00+08:00"),
      todayEarly: at("2026-10-13T00:05:00+08:00"),
      yesterday: at("2026-10-12T23:59:00+08:00"),
      thisYear: at("2026-01-01T00:00:00+08:00"),
      utcPreviousYear: at("2025-12-31T16:30:00Z"), // 上海时间 2026-01-01 00:30 → 今年
      lastYear: at("2025-12-31T23:59:00+08:00"),
      crossMidnight: formatRelativeTime(new Date("2026-10-12T23:50:00+08:00"), new Date("2026-10-13T00:10:00+08:00"), TZ),
    }).toEqual({
      justNow: "1 分钟前",
      future: "1 分钟前",
      minutes: "45 分钟前",
      edgeOfHour: "59 分钟前",
      today: "今天 09:00",
      todayEarly: "今天 00:05",
      yesterday: "10月12日",
      thisYear: "1月1日",
      utcPreviousYear: "1月1日",
      lastYear: "2025-12-31",
      crossMidnight: "20 分钟前",
    });
  });
});
