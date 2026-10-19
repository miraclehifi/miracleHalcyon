import { describe, expect, it } from "vitest";
import { cleanupConfirmText, cleanupResultText } from "../../../src/lib/admin/storage-text";

// [F-006 UT-05][UT-06] 清理确认框与结果文案（admin-storage.md"交互"）：某项为 0 时省略该项与顿号
describe("cleanupConfirmText", () => {
  it.each([
    [{ images: 2, videos: 1, bytes: 6_000_000 }, "将清理 2 张图片、1 个实况视频，释放 5.7 MB。清理后无法恢复。"],
    [{ images: 0, videos: 1, bytes: 2_000_000 }, "将清理 1 个实况视频，释放 1.9 MB。清理后无法恢复。"],
    [{ images: 2, videos: 0, bytes: 15_000 }, "将清理 2 张图片，释放 15 KB。清理后无法恢复。"],
  ])("[UT-05][TC-US02-11][SC-CLEANUP-03] %j", (counts, text) => {
    expect(cleanupConfirmText(counts)).toBe(text);
  });
});

describe("cleanupResultText", () => {
  it("[UT-06][TC-US02-10][SC-CLEANUP-01] 项数 = 图片 + 视频，体积按接口返回", () => {
    expect([cleanupResultText({ removedImages: 2, removedVideos: 1, freedBytes: 15_000 }), cleanupResultText({ removedImages: 12, removedVideos: 3, freedBytes: 26_552_460 })]).toEqual([
      "已清理 3 项，释放 15 KB",
      "已清理 15 项，释放 25.3 MB",
    ]);
  });
});
