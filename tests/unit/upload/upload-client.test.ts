import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadImage, uploadTimeoutMs, type UploadedImage } from "../../../src/lib/upload/upload-client";

// 上传超时（media-upload module-spec §1）：AbortSignal.timeout 从发请求起算，含上传请求体的时间，必须按体积放宽
const MiB = 1024 * 1024;
const ok: UploadedImage = { url: "/img/2026/10/aaaaaaaaaa_1x1_808080.png", width: 1, height: 1, rgb: "808080", live: false, videoUrl: null };

afterEach(() => vi.restoreAllMocks());

describe("uploadTimeoutMs", () => {
  it("[SC-IMAGE-07] 60 秒基础 + 按 256 KiB/s 计的传输时间：50 MiB 约 4 分 20 秒，手机热点 5 Mbps 传 40 MB 不会被中断", () => {
    expect([uploadTimeoutMs(0), uploadTimeoutMs(1), uploadTimeoutMs(50 * MiB), uploadTimeoutMs(60 * MiB)]).toEqual([60_000, 61_000, 260_000, 300_000]);
    const fortyMbAt5Mbps = ((40 * 1e6 * 8) / 5e6) * 1000; // 64 秒
    expect(uploadTimeoutMs(40 * 1e6)).toBeGreaterThan(fortyMbAt5Mbps);
  });

  it("[SC-IMAGE-07] uploadImage 按图片 + 视频的总大小设定超时", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const fetchImpl = vi.fn(async () => Response.json(ok, { status: 201 }));
    const file = new File([new Uint8Array(3 * MiB)], "a.png", { type: "image/png" });
    await uploadImage(file, { video: new Blob([new Uint8Array(2 * MiB)]) }, fetchImpl);
    expect(timeout).toHaveBeenCalledWith(uploadTimeoutMs(5 * MiB));
  });
});
