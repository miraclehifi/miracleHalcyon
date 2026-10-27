// 豆瓣识别结果合并与提示文案（admin-media.md"RecognizeBox"，UT-09、UT-10）。
// 识别只填条目字段（分类、标题、封面、作者、年份、豆瓣链接）；状态、评分、日期、短评永不变；没识别到的字段保持原值
import { creatorLabel, type ShelfType } from "../../domains/shelf/entry";
import type { EntryForm } from "./shelf-form";

export interface RecognizedFields {
  type: ShelfType;
  title: string;
  creator: string | null;
  year: number | null;
  coverData: string | null; // data: URL，浏览器不请求豆瓣域名
  doubanUrl: string;
  doubanId: string;
}

export type MissingField = "creator" | "year" | "cover";
export type FilledField = "type" | "title" | "cover" | "creator" | "year";

export interface DuplicateEntry {
  id: string;
  title: string;
  type: ShelfType;
  status: "completed" | "in_progress";
  markedOn: string;
}

export type RecognizeResponse = { fields: RecognizedFields; missing: MissingField[] } | { duplicate: DuplicateEntry };

const FILLED_ORDER: FilledField[] = ["type", "title", "cover", "creator", "year"];

export function applyRecognized(form: EntryForm, fields: RecognizedFields): { form: EntryForm; filled: FilledField[] } {
  const next: EntryForm = { ...form, type: fields.type, title: fields.title, doubanUrl: fields.doubanUrl, doubanId: fields.doubanId };
  const filled = new Set<FilledField>(["type", "title"]);
  if (fields.coverData) filled.add("cover");
  if (fields.creator !== null) {
    next.creator = fields.creator;
    filled.add("creator");
  }
  if (fields.year !== null) {
    next.year = String(fields.year);
    filled.add("year");
  }
  return { form: next, filled: FILLED_ORDER.filter((field) => filled.has(field)) };
}

const fieldName = (field: FilledField | MissingField, type: ShelfType) =>
  ({ type: "分类", title: "标题", cover: "封面", creator: creatorLabel(type), year: "年份" })[field];

export function filledText(filled: FilledField[], type: ShelfType): string {
  return `已识别：${filled.map((field) => fieldName(field, type)).join("、")}`;
}

// 文字字段与封面分两行：前者"请手动填写"，后者"可手动上传"
export function missingTexts(missing: MissingField[], type: ShelfType): string[] {
  const texts = missing.filter((field) => field !== "cover");
  const lines = texts.length > 0 ? [`未识别：${texts.map((field) => fieldName(field, type)).join("、")}，请手动填写`] : [];
  // 游戏封面用 IGDB 链接（ADR-013 §5），识别不取豆瓣封面
  if (missing.includes("cover")) lines.push(type === "game" ? "未识别：封面，游戏封面请粘贴 IGDB 图片链接" : "未识别：封面，可手动上传");
  return lines;
}

const ERROR_TEXT: Record<string, string> = {
  NOT_DOUBAN_LINK: "不是豆瓣链接",
  NOT_SUBJECT_LINK: "不是豆瓣条目链接，请粘贴书 / 电影 / 游戏条目的分享链接",
  FETCH_FAILED: "链接打不开",
  PARSE_FAILED: "解析不出条目信息",
};

export const errorText = (code: string) => ERROR_TEXT[code] ?? "识别失败，请稍后重试";

// data: URL → File（保存时随表单上传；识别结果封面不经过任何网络请求）
export function dataUrlToFile(dataUrl: string, name = "cover"): File | null {
  const match = /^data:(image\/(jpeg|png|webp));base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const bytes = Uint8Array.from(atob(match[3]), (c) => c.charCodeAt(0));
  const ext = match[2] === "jpeg" ? "jpg" : match[2];
  return new File([bytes], `${name}.${ext}`, { type: match[1] });
}
