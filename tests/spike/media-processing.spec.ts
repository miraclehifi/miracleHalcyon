import { expect, test, type Page } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { sniffVideo, VIDEO_MAX_BYTES as MAX_VIDEO } from "../../src/domains/media/validate";

// spike：ADR-006 假设 ② —— OPPO 动态照片切出主视频，mediabunny 转码 / 转封装为合规 mp4（≤ 10MB）
const OPPO = fileURLToPath(new URL("../fixtures/live/IMG20260516172228.jpg", import.meta.url));
const FIXTURE_URL = "/_spike/fixture/oppo.jpg";

interface VideoInfo {
  size: number;
  head: number[];
  codec: string | null;
  width: number;
  height: number;
  hasAudio: boolean;
  duration: number;
}

interface SpikeApi {
  extract(url: string): Promise<VideoInfo & { itemLength: number }>;
  process(url: string): Promise<VideoInfo & { mode: "transcode" | "remux"; ms: number; libMs: number }>;
}

async function open(page: Page) {
  await page.route(`**${FIXTURE_URL}`, (route) => route.fulfill({ path: OPPO, contentType: "image/jpeg" }));
  await page.goto("/_spike/media");
  await page.waitForFunction(() => "__spikeMedia" in window);
}

const api = (page: Page) => ({
  extract: () => page.evaluate((url) => (window as unknown as { __spikeMedia: SpikeApi }).__spikeMedia.extract(url), FIXTURE_URL),
  process: () => page.evaluate((url) => (window as unknown as { __spikeMedia: SpikeApi }).__spikeMedia.process(url), FIXTURE_URL),
});

test("OPPO 动态照片：按 Item:Length 定位、按 MP4 顶层 box 截出主视频", async ({ page }) => {
  await open(page);
  const video = await api(page).extract();
  console.log(`[spike-media] extract itemLength=${video.itemLength} mp4=${video.size} ${video.codec} ${video.width}x${video.height} ${video.duration.toFixed(2)}s`);

  expect({
    ftyp: String.fromCharCode(...video.head.slice(4, 8)),
    trimmed: video.size < video.itemLength, // 尾部的副视频与 OPPO 私有数据被截掉
    codec: video.codec,
    size: `${video.width}x${video.height}`,
  }).toEqual({ ftyp: "ftyp", trimmed: true, codec: "hevc", size: "3840x2880" });
});

test("支持 H.264 编码：转码为 H.264、去音轨、≤ 10MB、brand 合法", async ({ page }) => {
  test.setTimeout(300_000);
  await open(page);
  const out = await api(page).process();
  console.log(`[spike-media] transcode size=${out.size} ${out.width}x${out.height} ${out.duration.toFixed(2)}s lib=${out.libMs.toFixed(0)}ms total=${out.ms.toFixed(0)}ms`);

  expect({
    mode: out.mode,
    codec: out.codec,
    hasAudio: out.hasAudio,
    withinLimit: out.size <= MAX_VIDEO,
    brandOk: sniffVideo(new Uint8Array(out.head)),
  }).toEqual({ mode: "transcode", codec: "avc", hasAudio: false, withinLimit: true, brandOk: true });
});

test("不支持 H.264 编码：只转封装，保留 HEVC、去音轨、brand 合法", async ({ page }) => {
  test.setTimeout(300_000);
  await page.addInitScript(() => {
    VideoEncoder.isConfigSupported = async (config) => ({ supported: false, config });
  });
  await open(page);
  const out = await api(page).process();
  console.log(`[spike-media] remux size=${out.size} (${out.size <= MAX_VIDEO ? "≤" : ">"} 10MB) total=${out.ms.toFixed(0)}ms`);

  expect({
    mode: out.mode,
    codec: out.codec,
    hasAudio: out.hasAudio,
    brandOk: sniffVideo(new Uint8Array(out.head)),
  }).toEqual({ mode: "remux", codec: "hevc", hasAudio: false, brandOk: true });
});
