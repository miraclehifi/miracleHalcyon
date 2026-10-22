// 书影音集成测试共用：路由调用、multipart 构造、钩子计数（workers：每个测试文件存储隔离）
import type { APIContext } from "astro";
import { env } from "cloudflare:workers";
import { createShelfHideHandler } from "../../../src/pages/api/admin/shelf/entries/[id]/hide";
import { createShelfEntryItemHandlers } from "../../../src/pages/api/admin/shelf/entries/[id]";
import { createShelfEntriesHandlers } from "../../../src/pages/api/admin/shelf/entries/index";

export const SITE = "http://localhost:4321";
export const NOW = new Date("2026-10-21T06:30:00.000Z");
export const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46]);
export const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
export const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 4, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
export const MIN = { type: "book", title: "原则", status: "completed", markedOn: "2026-10-01" };

export function makeShelf() {
  const hookCalls = { n: 0 };
  const deps = { db: env.DB, bucket: env.MEDIA, now: () => NOW, hooksFor: () => ({ onShelfChanged: async () => void hookCalls.n++ }) };
  const entries = createShelfEntriesHandlers(deps);
  const item = createShelfEntryItemHandlers(deps);
  const hide = createShelfHideHandler({ ...deps, hidden: true });
  const unhide = createShelfHideHandler({ ...deps, hidden: false });

  const call = async (handler: (c: APIContext) => Promise<Response> | Response, method: string, path: string, init: { body?: BodyInit; params?: Record<string, string> } = {}) => {
    const request = new Request(`${SITE}${path}`, { method, body: init.body });
    const response = await handler({ request, url: new URL(request.url), params: init.params ?? {}, locals: {} } as unknown as APIContext);
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };

  return {
    hookCalls,
    list: (type?: string) => call(entries.GET, "GET", `/api/admin/shelf/entries${type === undefined ? "" : `?type=${type}`}`),
    create: (fields: unknown, cover?: Uint8Array | null, raw?: BodyInit) => call(entries.POST, "POST", "/api/admin/shelf/entries", { body: raw ?? form(fields, cover) }),
    get: (id: string) => call(item.GET, "GET", `/api/admin/shelf/entries/${id}`, { params: { id } }),
    update: (id: string, fields: unknown, extra: { cover?: Uint8Array; coverAction?: string } = {}) =>
      call(item.PUT, "PUT", `/api/admin/shelf/entries/${id}`, { params: { id }, body: form(fields, extra.cover, extra.coverAction) }),
    remove: (id: string) => call(item.DELETE, "DELETE", `/api/admin/shelf/entries/${id}`, { params: { id } }),
    hide: (id: string) => call(hide, "POST", `/api/admin/shelf/entries/${id}/hide`, { params: { id } }),
    unhide: (id: string) => call(unhide, "POST", `/api/admin/shelf/entries/${id}/unhide`, { params: { id } }),
  };
}

export function form(fields: unknown, cover?: Uint8Array | null, coverAction?: string): FormData {
  const body = new FormData();
  body.append("fields", JSON.stringify(fields));
  if (cover) body.append("cover", new File([cover as Uint8Array<ArrayBuffer>], "cover.bin", { type: "application/octet-stream" }));
  if (coverAction) body.append("coverAction", coverAction);
  return body;
}

export const keyOf = (coverUrl: string) => coverUrl.replace(/^\//, "");
export const objectExists = async (coverUrl: string) => (await env.MEDIA.head(keyOf(coverUrl))) !== null;
export const rowCount = async () => (await env.DB.prepare("SELECT COUNT(*) AS n FROM shelf_entries").first<{ n: number }>())!.n;
