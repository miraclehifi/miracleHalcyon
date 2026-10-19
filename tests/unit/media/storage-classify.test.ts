import { describe, expect, it } from "vitest";
import type { ImageRecord } from "../../../src/domains/media/repo";
import { classifyOrphans, PROTECTION_MS, summarize } from "../../../src/domains/media/storage";
import type { ImageReference } from "../../../src/domains/post/image-reference-query";

// [MEDIA-UT-09] 存储清理分类（media domain-model §9）：未引用图片 / 未引用视频 / 保护期 / 无动作
const NOW = new Date("2026-10-16T06:00:00.000Z");
const OLD = new Date(NOW.getTime() - PROTECTION_MS - 1).toISOString(); // 刚出保护期
const FRESH = new Date(NOW.getTime() - PROTECTION_MS + 1).toISOString(); // 仍在保护期

const row = (key: string, opts: { video?: number; createdAt?: string; size?: number } = {}): ImageRecord => ({
  key,
  size: opts.size ?? 100,
  videoKey: opts.video === undefined ? null : `${key}.live.mp4`,
  videoSize: opts.video ?? null,
  createdAt: opts.createdAt ?? OLD,
});
const ref = (referenced: boolean, liveReferenced = false): ImageReference => ({ referenced, liveReferenced });

describe("classifyOrphans", () => {
  it("[MEDIA-UT-09][SC-DETECT-06][SC-DETECT-07][SC-DETECT-08] 决策表：引用 × 有视频 × 带实况", () => {
    const rows = [
      row("unref-plain"),
      row("unref-video", { video: 50 }),
      row("ref-plain"),
      row("ref-video-nolive", { video: 70 }),
      row("ref-video-live", { video: 90 }),
      row("ref-plain-live-flag"), // 没视频时 liveReferenced 无意义
    ];
    const refs = new Map([
      ["unref-plain", ref(false)],
      ["unref-video", ref(false)],
      ["ref-plain", ref(true)],
      ["ref-video-nolive", ref(true, false)],
      ["ref-video-live", ref(true, true)],
      ["ref-plain-live-flag", ref(true, false)],
    ]);
    const result = classifyOrphans(rows, refs, NOW);

    expect({ images: result.images.map((r) => r.key), videos: result.videos.map((r) => r.key), protectedCount: result.protectedCount }).toEqual({
      images: ["unref-plain", "unref-video"],
      videos: ["ref-video-nolive"],
      protectedCount: 0,
    });
  });

  it("[MEDIA-UT-09][SC-DETECT-09] 保护期边界：差 1ms 进出；已引用的不计入 protectedCount；缺少判定结果按被引用处理", () => {
    const rows = [
      row("fresh-unref", { createdAt: FRESH }),
      row("fresh-video", { createdAt: FRESH, video: 10 }),
      row("old-unref"),
      row("fresh-ref", { createdAt: FRESH }),
      row("missing"),
    ];
    const refs = new Map([
      ["fresh-unref", ref(false)],
      ["fresh-video", ref(true, false)],
      ["old-unref", ref(false)],
      ["fresh-ref", ref(true)],
    ]);
    const result = classifyOrphans(rows, refs, NOW);

    expect({ images: result.images.map((r) => r.key), videos: result.videos.length, protectedCount: result.protectedCount }).toEqual({
      images: ["old-unref"],
      videos: 0,
      protectedCount: 2,
    });
  });
});

describe("summarize", () => {
  it("[MEDIA-UT-09][TC-US01-04][SC-DETECT-06] 体积：图片只计 size，合计含未引用图片自带视频", () => {
    const summary = summarize({
      images: [row("a", { size: 1000, video: 5000 }), row("b", { size: 2000 })],
      videos: [row("v", { size: 300, video: 7000 })],
      protectedCount: 3,
    });

    expect(summary).toEqual({
      orphanImageCount: 2,
      orphanImageBytes: 3000,
      orphanVideoCount: 1,
      orphanVideoBytes: 7000,
      totalOrphanBytes: 15000,
      protectedCount: 3,
    });
  });
});
