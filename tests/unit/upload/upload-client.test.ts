import { afterEach, describe, expect, it, vi } from "vitest";
import { UploadError, uploadImage, uploadTimeoutMs, type UploadedImage } from "../../../src/lib/upload/upload-client";

// 上传超时（media-upload module-spec §3"上传"）：从发请求起算，含上传请求体的时间，必须按体积放宽
const MiB = 1024 * 1024;
const ok: UploadedImage = { url: "/img/2026/10/aaaaaaaaaa_1x1_808080.png", width: 1, height: 1, rgb: "808080", live: false, videoUrl: null };

afterEach(() => vi.restoreAllMocks());

// 可手动驱动的 XMLHttpRequest
class FakeXhr {
  static last: FakeXhr;
  method = "";
  url = "";
  body: unknown = null;
  timeout = 0;
  status = 0;
  responseText = "";
  aborted = false;
  upload: { onprogress: ((event: { loaded: number; total: number; lengthComputable: boolean }) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  onabort: (() => void) | null = null;
  constructor() {
    FakeXhr.last = this;
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  send(body: unknown) {
    this.body = body;
  }
  abort() {
    this.aborted = true;
    this.onabort?.();
  }
  respond(status: number, body: unknown) {
    this.status = status;
    this.responseText = typeof body === "string" ? body : JSON.stringify(body);
    this.onload?.();
  }
}
const xhr = () => new FakeXhr() as unknown as XMLHttpRequest;
const file = (size = 10) => new File([new Uint8Array(size)], "a.png", { type: "image/png" });

describe("uploadTimeoutMs", () => {
  it("[SC-IMAGE-07] 60 秒基础 + 按 256 KiB/s 计的传输时间：50 MiB 约 4 分 20 秒，手机热点 5 Mbps 传 40 MB 不会被中断", () => {
    expect([uploadTimeoutMs(0), uploadTimeoutMs(1), uploadTimeoutMs(50 * MiB), uploadTimeoutMs(60 * MiB)]).toEqual([60_000, 61_000, 260_000, 300_000]);
    const fortyMbAt5Mbps = ((40 * 1e6 * 8) / 5e6) * 1000; // 64 秒
    expect(uploadTimeoutMs(40 * 1e6)).toBeGreaterThan(fortyMbAt5Mbps);
  });

  it("[SC-IMAGE-07] uploadImage 按图片 + 视频的总大小设定超时", async () => {
    const result = uploadImage(file(3 * MiB), { video: new Blob([new Uint8Array(2 * MiB)]) }, { xhr });
    const request = FakeXhr.last;
    request.respond(201, ok);
    await result;
    expect(request.timeout).toBe(uploadTimeoutMs(5 * MiB));
  });
});

// UT-158（SC-IMAGE-07、SC-IMAGE-12）
describe("uploadImage（XHR）", () => {
  it("POST multipart 到 /api/admin/images；upload.onprogress 逐次回调字节进度；201 返回结果", async () => {
    const progress: [number, number][] = [];
    const result = uploadImage(file(), { meta: { width: 1, height: 1, rgb: "8a7b6c" } }, { xhr, onProgress: (loaded, total) => progress.push([loaded, total]) });
    const request = FakeXhr.last;
    request.upload.onprogress?.({ loaded: 25, total: 100, lengthComputable: true });
    request.upload.onprogress?.({ loaded: 100, total: 100, lengthComputable: true });
    request.respond(201, ok);
    const fields = [...(request.body as FormData).keys()];
    expect({ method: request.method, url: request.url, fields, progress, result: await result }).toEqual({
      method: "POST",
      url: "/api/admin/images",
      fields: ["file", "rgb", "width", "height"],
      progress: [
        [25, 100],
        [100, 100],
      ],
      result: ok,
    });
  });

  it("错误分类：网络中断、超时、服务端带 error 的 4xx、无法解析的 5xx", async () => {
    const outcome = async (drive: (request: FakeXhr) => void) => {
      const result = uploadImage(file(), {}, { xhr });
      drive(FakeXhr.last);
      const error = (await result.catch((e: unknown) => e)) as UploadError;
      return [error instanceof UploadError, error.code, error.message, error.status];
    };
    expect([
      await outcome((r) => r.onerror?.()),
      await outcome((r) => r.ontimeout?.()),
      await outcome((r) => r.respond(400, { error: { code: "UNSUPPORTED_TYPE", message: "不支持的图片格式" } })),
      await outcome((r) => r.respond(500, "<html>")),
    ]).toEqual([
      [true, "NETWORK", "网络中断", 0],
      [true, "TIMEOUT", "上传超时，请重试", 0],
      [true, "UNSUPPORTED_TYPE", "不支持的图片格式", 400],
      [true, "UPLOAD_FAILED", "上传失败，请重试", 500],
    ]);
  });

  it("signal 中止：调用 abort，结果以 AbortError 拒绝，之后不再回调进度", async () => {
    const controller = new AbortController();
    const onProgress = vi.fn();
    const result = uploadImage(file(), {}, { xhr, signal: controller.signal, onProgress });
    const request = FakeXhr.last;
    controller.abort();
    request.upload.onprogress?.({ loaded: 50, total: 100, lengthComputable: true });
    const error = (await result.catch((e: unknown) => e)) as Error;
    expect({ aborted: request.aborted, name: error.name, progress: onProgress.mock.calls.length }).toEqual({ aborted: true, name: "AbortError", progress: 0 });
  });
});
