// 浏览器本地日期 YYYY-MM-DD（发布日期默认值；不经 UTC 换算，晚上 8 点后的东八区也是"今天"）
export function localDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
