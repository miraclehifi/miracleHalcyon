// 书影音录入 / 编辑表单的纯逻辑（admin-media.md §二"校验与保存"）：默认值、条目回填、前端校验、转接口字段。
// 前端只拦"标题空白""年份非 4 位""IGDB 链接格式"三类常见错误；其余规则以服务端 normalizeEntryInput 为准（400 时按 fields 标错）
import { normalizeIgdbCoverUrl, type ShelfPlatform, type ShelfStatus, type ShelfType } from "../../domains/shelf/entry";
import type { ShelfEntryView } from "./shelf-client";

export interface EntryForm {
  type: ShelfType;
  title: string;
  creator: string;
  year: string;
  status: ShelfStatus;
  rating: number | null;
  markedOn: string;
  comment: string;
  doubanUrl: string | null;
  doubanId: string | null;
  platform: ShelfPlatform; // 仅游戏提交；切换分类时在页面内保留
  coverUrl: string; // 仅游戏：IGDB 封面链接原文
}

export type FormErrors = Partial<Record<"title" | "year" | "creator" | "markedOn" | "comment" | "cover" | "coverUrl", string>>;

export const FORM_MESSAGES = {
  title: "请填写标题",
  year: "年份为 4 位数字",
  cover: "封面只支持 jpg / png / webp，且不超过 5 MB",
  coverUrl: "请粘贴 images.igdb.com 的封面图片地址",
  coverLinkUnreachable: "封面链接打不开，请检查后重试",
  invalid: "内容不合规，请检查",
} as const;

export function formDefaults(type: ShelfType, today: string): EntryForm {
  return { type, title: "", creator: "", year: "", status: "completed", rating: null, markedOn: today, comment: "", doubanUrl: null, doubanId: null, platform: "ps5", coverUrl: "" };
}

export function formFromEntry(entry: ShelfEntryView): EntryForm {
  return {
    type: entry.type,
    title: entry.title,
    creator: entry.creator ?? "",
    year: entry.year === null ? "" : String(entry.year),
    status: entry.status,
    rating: entry.rating,
    markedOn: entry.markedOn,
    comment: entry.comment ?? "",
    doubanUrl: entry.doubanUrl,
    doubanId: entry.doubanId,
    platform: entry.platform ?? "ps5",
    coverUrl: entry.coverUrl ?? "",
  };
}

export function validateForm(form: EntryForm): FormErrors {
  const errors: FormErrors = {};
  if (form.title.trim() === "") errors.title = FORM_MESSAGES.title;
  const year = form.year.trim();
  if (year !== "" && !/^\d{4}$/.test(year)) errors.year = FORM_MESSAGES.year;
  if (form.type === "game" && form.coverUrl.trim() !== "" && normalizeIgdbCoverUrl(form.coverUrl) === null) errors.coverUrl = FORM_MESSAGES.coverUrl;
  return errors;
}

const orNull = (text: string) => (text.trim() === "" ? null : text);

export function toEntryFields(form: EntryForm) {
  const year = form.year.trim();
  return {
    type: form.type,
    title: form.title,
    creator: orNull(form.creator),
    year: year === "" ? null : Number(year),
    status: form.status,
    rating: form.rating,
    markedOn: form.markedOn,
    comment: orNull(form.comment),
    doubanUrl: form.doubanUrl,
    doubanId: form.doubanId,
    ...(form.type === "game" ? { platform: form.platform, coverUrl: orNull(form.coverUrl.trim()) } : {}),
  };
}

// 本地日期 yyyy-MM-dd（标记日期默认今天，按作者所在时区）
export function localToday(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
