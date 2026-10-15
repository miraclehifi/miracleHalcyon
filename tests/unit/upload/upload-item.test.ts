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
