import type { Page, Route } from "@playwright/test";
import { readFileSync } from "node:fs";

// Afilmory 外链照片 E2E 打桩（US-13 测试数据策略）：不访问真实 GitHub / Afilmory。
// 照片存储前缀下的请求按文件名返回 R2 夹具字节，并按 Range 头切片返回 206（与 GitHub raw 一致：Accept-Ranges、CORS *）。
// live.jpg 是合成的动态照片：jjjjjjjjjj 静态图（21119 B）后接其 H.264 实况视频（81755 B），即 mp=21119+81755
export const STORAGE = "https://raw.githubusercontent.com/miraclehifi/photo-assets/main/";
export const THUMBS = `${STORAGE}.afilmory/thumbnails/`;

const fixture = (name: string) => readFileSync(`tests/fixtures/images/${name}`);
const STILL = fixture("jjjjjjjjjj_960x1280_6b7f8e.jpg");
const VIDEO = fixture("jjjjjjjjjj_960x1280_6b7f8e.live.mp4");
export const LIVE_MP = { offset: STILL.length, size: VIDEO.length };
const FILES: Record<string, Buffer> = {
  "live.jpg": Buffer.concat([STILL, VIDEO]),
  "grid-a.jpg": fixture("aaaaaaaaaa_1600x900_556677.jpg"),
  "grid-b.jpg": fixture("bbbbbbbbbb_1200x800_112233.jpg"),
  "grid-c.jpg": fixture("cccccccccc_800x1200_445566.jpg"),
  "plain.jpg": fixture("dddddddddd_1000x1000_778899.jpg"),
};
const THUMB = fixture("eeeeeeeeee_1400x1050_8a7b6c.jpg");

export interface RawRequest {
  url: string;
  range: string | null;
}

export interface RawOptions {
  fail?: (url: string, range: string | null) => boolean; // 返回 500
  delayMs?: (url: string) => number;
  hold?: (url: string) => Promise<void> | undefined; // 扣住该请求直到 Promise 完成
}

// 打桩照片存储；返回已收到的请求（按顺序）
export async function routeRaw(page: Page, options: RawOptions = {}): Promise<RawRequest[]> {
  const requests: RawRequest[] = [];
  await page.route(`${STORAGE}**`, async (route: Route) => {
    const request = route.request();
    const url = request.url();
    const range = (await request.allHeaders())["range"] ?? null;
    requests.push({ url, range });
    const delay = options.delayMs?.(url) ?? 0;
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    await options.hold?.(url);
    const cors = { "Access-Control-Allow-Origin": "*", "Accept-Ranges": "bytes" };
    if (options.fail?.(url, range)) return route.fulfill({ status: 500, headers: cors, body: "fail" });
    const name = decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "");
    const body = url.startsWith(THUMBS) ? THUMB : FILES[name];
    if (!body) return route.fulfill({ status: 404, headers: cors, body: "not found" });
    const match = range && /^bytes=(\d+)-(\d+)$/.exec(range);
    if (!match) return route.fulfill({ status: 200, headers: { ...cors, "Content-Type": "image/jpeg" }, body });
    const start = Number(match[1]);
    const end = Math.min(Number(match[2]), body.length - 1);
    return route.fulfill({
      status: 206,
      headers: { ...cors, "Content-Type": "application/octet-stream", "Content-Range": `bytes ${start}-${end}/${body.length}` },
      body: body.subarray(start, end + 1),
    });
  });
  return requests;
}

// 合成动态照片的 Markdown（与 reader 夹具 filler-23 一致）
export const LIVE_MD = (marks = ",live", title = "") =>
  `![实况](${STORAGE}e2e/live.jpg#ext=960x1280x6b7f8e,mp=${LIVE_MP.offset}+${LIVE_MP.size}${marks}${title ? ` "${title}"` : ""})`;
