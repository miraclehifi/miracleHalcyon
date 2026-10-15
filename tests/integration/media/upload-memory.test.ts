import { describe, expect, it, vi } from "vitest";
import type { ImageRepo, ImageRow, MediaStore } from "../../../src/domains/media/repo";
import { createMediaService } from "../../../src/domains/media/service";
import { MP4, PNG_1X1 } from "../../unit/media/image-bytes";

// 上传的内存峰值（Workers 每个 isolate 128MB）：表单解析已占一份，服务内不再把整个文件复制成 Uint8Array；
// 嗅探只读前缀（JPEG 的 SOF 不在前缀里时逐步扩大），写 R2 直接传 Blob
const MiB = 1024 * 1024;
const NOW = new Date("2026-10-15T00:00:00.000Z");

function padded(head: Uint8Array, size: number, name: string): File {
  const bytes = new Uint8Array(size);
  bytes.set(head);
  return new File([bytes], name);
}

// SOF 之前有 n 个 64KB 的 APP 段（相机厂商私有数据）
function jpegWithMetadata(segments: number, size: number): File {
  const bytes = new Uint8Array(size);
  bytes.set([0xff, 0xd8]);
  let at = 2;
  for (let i = 0; i < segments; i++) {
    bytes.set([0xff, 0xe1, 0xff, 0xff], at); // 长度 65535
    at += 2 + 0xffff;
  }
  bytes.set([0xff, 0xc0, 0x00, 0x11, 0x08, 0x0c, 0x00, 0x10, 0x00], at); // 4096×3072
  return new File([bytes], "camera.jpg");
}

function setup() {
  const puts: { key: string; body: unknown }[] = [];
  const store: MediaStore = { exists: async () => false, put: async (key, body) => void puts.push({ key, body }), delete: async () => {} };
  const rows: ImageRow[] = [];
  const repo: ImageRepo = { insert: async (row) => void rows.push(row) };
  return { service: createMediaService({ store, repo }), puts, rows };
}

const watchWholeRead = (blob: Blob) => vi.spyOn(blob, "arrayBuffer");

describe("上传不复制整个文件", () => {
  it("[SC-IMAGE-05] 大图与视频：不读整个文件，R2 收到的就是表单里的 Blob，记录的大小不变", async () => {
    const { service, puts, rows } = setup();
    const file = padded(PNG_1X1, 20 * MiB, "big.png");
    const video = new File([MP4 as BlobPart, new Uint8Array(5 * MiB)], "big.mp4");
    const reads = [watchWholeRead(file), watchWholeRead(video)];
    const result = await service.upload({ file, video, now: NOW });
    expect({
      wholeReads: reads.map((spy) => spy.mock.calls.length),
      sameBlobs: puts.map((put, i) => put.body === [file, video][i]), // 引用比较：失败时不打印几十 MB 的内容
      sizes: [rows[0].size, rows[0].video?.size],
      live: result.live,
    }).toEqual({ wholeReads: [0, 0], sameBlobs: [true, true], sizes: [file.size, video.size], live: true });
  });

  it("[SC-IMAGE-08] JPEG 的 SOF 在约 520KB 元数据之后：仍取到真实尺寸，且不读整个文件", async () => {
    const { service } = setup();
    const file = jpegWithMetadata(8, 10 * MiB);
    const whole = watchWholeRead(file);
    const result = await service.upload({ file, now: NOW });
    expect([result.width, result.height, whole.mock.calls.length]).toEqual([4096, 3072, 0]);
  });
});
