// 后台文章列表"更新于 {相对时间}"（admin-post-list.md）：
// 1 小时内"N 分钟前"、当天"今天 HH:mm"、今年"M月D日"、更早"YYYY-MM-DD"。日历日按 timeZone（缺省为浏览器时区）
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

interface CalendarParts {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
}

function calendarParts(date: Date, timeZone?: string): CalendarParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute") };
}

export function formatRelativeTime(date: Date, now: Date, timeZone?: string): string {
  const elapsed = now.getTime() - date.getTime();
  // 不足 1 分钟或略晚于当前时间（时钟偏差）都显示"1 分钟前"
  if (elapsed < HOUR_MS) return `${Math.max(1, Math.floor(elapsed / MINUTE_MS))} 分钟前`;
  const that = calendarParts(date, timeZone);
  const today = calendarParts(now, timeZone);
  if (that.year === today.year && that.month === today.month && that.day === today.day) return `今天 ${that.hour}:${that.minute}`;
  if (that.year === today.year) return `${Number(that.month)}月${Number(that.day)}日`;
  return `${that.year}-${that.month}-${that.day}`;
}
