// 书影音后台接口（shelf api-contract）：条目隐藏 / 删除（任务 4）、新增 / 编辑（任务 5，multipart）、识别（任务 6）。失败抛 ShelfApiError
import type { ShelfPlatform, ShelfStatus, ShelfType } from "../../domains/shelf/entry";
import type { RecognizeResponse } from "./recognize";

export interface ShelfEntryView {
  id: string;
  type: ShelfType;
  title: string;
  creator: string | null;
  year: number | null;
  status: ShelfStatus;
  rating: number | null;
  markedOn: string;
  comment: string | null;
  cover: string | null; // 游戏为 IGDB 地址，其他为站内 /covers/ 路径
  platform: ShelfPlatform | null;
  coverUrl: string | null;
  coverWidth: number | null;
  coverHeight: number | null;
  doubanUrl: string | null;
  doubanId: string | null;
  hidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShelfCounts {
  total: number;
  inProgress: number;
  hidden: number;
}

export class ShelfApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly body: unknown = null,
  ) {
    super(message);
    this.name = "ShelfApiError";
  }
}

const BASE = "/api/admin/shelf/entries";

async function readJson<T>(response: Response): Promise<T> {
  if (response.ok) return (response.status === 204 ? null : await response.json()) as T;
  const body = (await response.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
  throw new ShelfApiError(response.status, body?.error?.code ?? "UNKNOWN", body?.error?.message ?? `shelf api ${response.status}`, body);
}

export async function setEntryHidden(id: string, hidden: boolean): Promise<ShelfEntryView> {
  return readJson<ShelfEntryView>(await fetch(`${BASE}/${encodeURIComponent(id)}/${hidden ? "hide" : "unhide"}`, { method: "POST" }));
}

export async function deleteEntry(id: string): Promise<void> {
  await readJson<null>(await fetch(`${BASE}/${encodeURIComponent(id)}`, { method: "DELETE" }));
}

export type EntryFields = Record<string, unknown>; // shelf-form.toEntryFields 的结果；服务端 normalizeEntryInput 校验

// 封面：File 为上传新封面；"remove" 为移除（仅编辑）；undefined 为保持
export type CoverChange = File | "remove" | undefined;

function entryBody(fields: EntryFields, cover: CoverChange): FormData {
  const body = new FormData();
  body.append("fields", JSON.stringify(fields));
  if (cover instanceof File) body.append("cover", cover);
  else if (cover === "remove") body.append("coverAction", "remove");
  return body;
}

export async function createEntry(fields: EntryFields, cover: CoverChange): Promise<ShelfEntryView> {
  return readJson<ShelfEntryView>(await fetch(BASE, { method: "POST", body: entryBody(fields, cover) }));
}

export async function updateEntry(id: string, fields: EntryFields, cover: CoverChange): Promise<ShelfEntryView> {
  return readJson<ShelfEntryView>(await fetch(`${BASE}/${encodeURIComponent(id)}`, { method: "PUT", body: entryBody(fields, cover) }));
}

// 识别豆瓣分享内容（ADR-011 §3）：成功或重复为 200，识别失败 422（code 见 recognize.errorText）
export async function recognize(text: string, excludeId?: string): Promise<RecognizeResponse> {
  return readJson<RecognizeResponse>(
    await fetch("/api/admin/shelf/recognize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(excludeId ? { text, excludeId } : { text }),
    }),
  );
}
