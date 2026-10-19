import { describe, expect, it, vi } from "vitest";
import type { ProcessedVideo } from "../../../src/lib/upload/process-video";
import type { UploadedImage, UploadExtras } from "../../../src/lib/upload/upload-client";
import { LIVE_WARNINGS, uploadItem, type UploadItem } from "../../../src/lib/upload/upload-item";

const META = { width: 4096, height: 3072, rgb: "8a7b6c" };
const URL = "/img/2026/10/aaaaaaaaaa_4096x3072_8a7b6c.jpg";

function run(item: UploadItem, processed: ProcessedVideo | Error, upload?: (file: File, extras: UploadExtras) => Promise<UploadedImage>) {
  const events: string[] = [];
  const requests: { name: string; type: string; meta: unknown; video: number | null }[] = [];
  const deps = {
    measure: vi.fn(async () => META),
    processVideo: vi.fn(async () => {
      if (processed instanceof Error) throw processed;
      return processed;
    }),
    upload:
      upload ??
      (async (file: File, { meta, video }: UploadExtras) => {
        requests.push({ name: file.name, type: file.type, meta, video: video?.size ?? null });
        events.push("upload");
        return { url: URL, width: 4096, height: 3072, rgb: "8a7b6c", live: Boolean(video), videoUrl: video ? URL.replace(".jpg", ".live.mp4") : null };
      }),
  };
  const result = uploadItem(item, deps, { onUploading: () => events.push("uploading"), onWarning: (message) => events.push(`warning:${message}`) });
  return { result, events, requests, deps };
}

const live = (): UploadItem => ({ kind: "live", name: "IMG20260516172228.jpg", still: new Blob([new Uint8Array(10)], { type: "image/jpeg" }), video: new Blob([new Uint8Array(20)]) });

// UT-152（SC-LIVE-06、SC-LIVE-08、SC-LIVE-09）
describe("uploadItem", () => {
  it("实况项：静态图与处理后的视频同一请求，引用追加 #live；普通图片项不处理视频", async () => {
    const liveRun = run(live(), { blob: new Blob([new Uint8Array(2_000)]) });
    const imageRun = run({ kind: "image", file: new File(["x"], "photo.png", { type: "image/png" }) }, { dropVideo: true });
    expect({
      live: await liveRun.result,
      liveEvents: liveRun.events,
      liveRequest: liveRun.requests,
      image: await imageRun.result,
      imageVideoCalls: imageRun.deps.processVideo.mock.calls.length,
    }).toEqual({
      live: `![IMG20260516172228](${URL}#live)`,
      liveEvents: ["uploading", "upload"],
      liveRequest: [{ name: "IMG20260516172228.jpg", type: "image/jpeg", meta: META, video: 2_000 }],
      image: `![photo](${URL})`,
      imageVideoCalls: 0,
    });
  });

  it("dropVideo：请求不带视频、引用不带 #live、上传成功后警示；HEVC_KEPT：带视频与 #live 并警示", async () => {
    const dropped = run(live(), { dropVideo: true });
    const kept = run(live(), { blob: new Blob([new Uint8Array(3_000)]), warning: "HEVC_KEPT" });
    expect({
      dropped: await dropped.result,
      droppedEvents: dropped.events,
      droppedVideo: dropped.requests[0].video,
      kept: await kept.result,
      keptEvents: kept.events,
    }).toEqual({
      dropped: `![IMG20260516172228](${URL})`,
      droppedEvents: ["uploading", "upload", `warning:${LIVE_WARNINGS.dropVideo}`],
      droppedVideo: null,
      kept: `![IMG20260516172228](${URL}#live)`,
      keptEvents: ["uploading", "upload", `warning:${LIVE_WARNINGS.HEVC_KEPT}`],
    });
  });

  // UT-155 接线（SC-IMAGE-13）：压缩在测量主色之前，测量与上传都用压缩结果；实况项的静态图同样压缩
  it("压缩：先压缩再测量主色，上传压缩后的文件，alt 仍取原文件名", async () => {
    const order: string[] = [];
    const compress = vi.fn(async (file: File) => {
      order.push(`compress:${file.name}`);
      return new File([new Uint8Array(5)], file.name.replace(/\.jpg$/, ".webp"), { type: "image/webp" });
    });
    const uploaded: string[] = [];
    const deps = {
      compress,
      measure: vi.fn(async (file: Blob) => {
        order.push(`measure:${(file as File).name}`);
        return META;
      }),
      processVideo: vi.fn(async () => ({ blob: new Blob([new Uint8Array(2_000)]) })),
      upload: vi.fn(async (file: File, { video }: UploadExtras) => {
        uploaded.push(`${file.name} ${file.type}`);
        return { url: URL, width: 4096, height: 3072, rgb: "8a7b6c", live: Boolean(video), videoUrl: null };
      }),
    };
    const callbacks = { onUploading: () => undefined, onWarning: () => undefined };
    const image = await uploadItem({ kind: "image", file: new File(["x"], "large-photo.jpg", { type: "image/jpeg" }) }, deps, callbacks);
    await uploadItem(live(), deps, callbacks);
    expect({ image, order, uploaded }).toEqual({
      image: `![large-photo](${URL})`,
      order: ["compress:large-photo.jpg", "measure:large-photo.webp", "compress:IMG20260516172228.jpg", "measure:IMG20260516172228.webp"],
      uploaded: ["large-photo.webp image/webp", "IMG20260516172228.webp image/webp"],
    });
  });

  // UT-152 live: false（SC-LIVE-14）：实况开关关闭——不处理视频、不进入视频阶段，请求只有静态图，引用不带 #live
  it("实况开关关闭：动态照片只传静态图", async () => {
    const events: string[] = [];
    const requests: (number | null)[] = [];
    const deps = {
      measure: vi.fn(async () => META),
      processVideo: vi.fn(async () => ({ blob: new Blob([new Uint8Array(2_000)]) })),
      upload: vi.fn(async (_file: File, { video }: UploadExtras) => {
        requests.push(video?.size ?? null);
        return { url: URL, width: 4096, height: 3072, rgb: "8a7b6c", live: Boolean(video), videoUrl: null };
      }),
    };
    const markdown = await uploadItem(
      live(),
      deps,
      { onProcessingLive: () => events.push("processing-live"), onUploading: () => events.push("uploading"), onWarning: () => undefined },
      { live: false },
    );
    expect({ markdown, events, requests, videoCalls: deps.processVideo.mock.calls.length }).toEqual({
      markdown: `![IMG20260516172228](${URL})`,
      events: ["uploading"],
      requests: [null],
      videoCalls: 0,
    });
  });

  // UT-161 stillOnly（SC-LIVE-16）：处理视频时中止——不等视频处理结束（不支持取消也忽略其结果），按静态图上传、不带 #live、不警示
  it("仅转为静态图：中止后立即按静态图上传", async () => {
    const controller = new AbortController();
    const events: string[] = [];
    const requests: (number | null)[] = [];
    let videoSignal: AbortSignal | undefined;
    const deps = {
      measure: vi.fn(async () => META),
      processVideo: vi.fn((_video: Blob, options?: { signal?: AbortSignal }) => {
        videoSignal = options?.signal;
        return new Promise<ProcessedVideo>(() => undefined); // 一直不结束（不支持取消）
      }),
      upload: vi.fn(async (_file: File, { video }: UploadExtras) => {
        requests.push(video?.size ?? null);
        return { url: URL, width: 4096, height: 3072, rgb: "8a7b6c", live: Boolean(video), videoUrl: null };
      }),
    };
    const result = uploadItem(
      live(),
      deps,
      {
        onProcessingLive: () => {
          events.push("processing-live");
          setTimeout(() => controller.abort(), 0);
        },
        onUploading: () => events.push("uploading"),
        onWarning: (message) => events.push(`warning:${message}`),
      },
      { signal: controller.signal },
    );
    expect({ markdown: await result, events, requests, passed: videoSignal === controller.signal }).toEqual({
      markdown: `![IMG20260516172228](${URL})`,
      events: ["processing-live", "uploading"],
      requests: [null],
      passed: true,
    });
  });

  it("视频处理或上传失败：抛出（由调用方移除占位并报错），不进入上传、不发警示", async () => {
    const processFails = run(live(), new Error("无法处理该视频"));
    const uploadFails = run(live(), { blob: new Blob([new Uint8Array(1)]), warning: "HEVC_KEPT" }, async () => {
      throw new Error("上传失败");
    });
    await expect(processFails.result).rejects.toThrow("无法处理该视频");
    await expect(uploadFails.result).rejects.toThrow("上传失败");
    expect({ processEvents: processFails.events, uploadEvents: uploadFails.events }).toEqual({ processEvents: [], uploadEvents: ["uploading"] });
  });
});
