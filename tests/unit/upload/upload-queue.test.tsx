import { act, cleanup, render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { createLimiter } from "../../../src/lib/upload/upload-queue";
import { useImageUploads } from "../../../src/lib/upload/use-image-uploads";
import type { ImageMeta } from "../../../src/lib/upload/dominant-color";
import type { UploadedImage, UploadExtras } from "../../../src/lib/upload/upload-client";

afterEach(cleanup);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const image = (name: string): UploadedImage => ({ url: `/img/2026/10/${name}aaaaaaaaa_1x1_808080.png`, width: 1, height: 1, rgb: "808080", live: false, videoUrl: null });

// 并发上限 2（media-upload module-spec §1）
describe("createLimiter", () => {
  it("同时最多运行 2 个，前一个结束后补上", async () => {
    const limit = createLimiter(2);
    const gates = [deferred<void>(), deferred<void>(), deferred<void>()];
    let running = 0;
    let peak = 0;
    const started: number[] = [];
    const jobs = gates.map((gate, i) =>
      limit(async () => {
        started.push(i);
        running++;
        peak = Math.max(peak, running);
        await gate.promise;
        running--;
      }),
    );
    await Promise.resolve();
    const startedFirst = [...started];
    gates[1].resolve();
    await jobs[1];
    await Promise.resolve();
    gates[0].resolve();
    gates[2].resolve();
    await Promise.all(jobs);
    expect({ startedFirst, started, peak }).toEqual({ startedFirst: [0, 1], started: [0, 1, 2], peak: 2 });
  });
});

// [SC-IMAGE-04] UT-90：a、b、c 一批插入（并发 2，c 等前面任一个完成才开始），以 b → c → a 的顺序完成，正文仍按 a、b、c 各一行
describe("useImageUploads", () => {
  it("乱序完成仍按顺序替换各自的占位", async () => {
    const pending = new Map<string, ReturnType<typeof deferred<UploadedImage>>>();
    const upload = (file: File) => {
      const d = deferred<UploadedImage>();
      pending.set(file.name, d);
      return d.promise;
    };
    let uploadFiles!: (files: File[]) => void;
    function Harness() {
      const ref = useRef<HTMLTextAreaElement>(null);
      uploadFiles = useImageUploads(ref, { upload }).uploadFiles;
      return <textarea ref={ref} defaultValue="" />;
    }
    const { container } = render(<Harness />);
    const textarea = container.querySelector("textarea")!;
    const files = ["a.png", "b.png", "c.png"].map((name) => new File(["x"], name, { type: "image/png" }));

    act(() => uploadFiles(files));
    const withPlaceholders = textarea.value;
    for (const name of ["b.png", "c.png", "a.png"]) {
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0)); // 让并发队列启动下一个
        pending.get(name)?.resolve(image(name[0]));
      });
    }
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect({ withPlaceholders, final: textarea.value, uploaded: [...pending.keys()].sort() }).toEqual({
      withPlaceholders: "![处理中…]()\n![处理中…]()\n![处理中…]()",
      final: ["a", "b", "c"].map((n) => `![${n}](${image(n).url})`).join("\n"),
      uploaded: ["a.png", "b.png", "c.png"],
    });
  });

  // UT-146（SC-LIVE-05）：占位阶段 处理中 → 上传中 → 替换 / 移除；算出的主色与宽高交给上传
  it("占位按阶段改写，主色与宽高随上传传入", async () => {
    const measured = new Map<string, ReturnType<typeof deferred<ImageMeta | null>>>();
    const uploads = new Map<string, ReturnType<typeof deferred<UploadedImage>>>();
    const metas: [string, ImageMeta | null][] = [];
    const measure = (file: Blob) => {
      const d = deferred<ImageMeta | null>();
      measured.set((file as File).name, d);
      return d.promise;
    };
    const upload = (file: File, { meta = null }: UploadExtras) => {
      metas.push([file.name, meta]);
      const d = deferred<UploadedImage>();
      uploads.set(file.name, d);
      return d.promise;
    };
    let uploadFiles!: (files: File[]) => void;
    function Harness() {
      const ref = useRef<HTMLTextAreaElement>(null);
      uploadFiles = useImageUploads(ref, { upload, measure }).uploadFiles;
      return <textarea ref={ref} defaultValue="" />;
    }
    const { container } = render(<Harness />);
    const textarea = container.querySelector("textarea")!;
    const settle = (fn: () => void) =>
      act(async () => {
        fn();
        await new Promise((r) => setTimeout(r, 0));
      });

    act(() => uploadFiles(["a.png", "b.png"].map((name) => new File(["x"], name, { type: "image/png" }))));
    const steps = [textarea.value];
    await settle(() => {}); // 转成上传项后才开始算主色
    await settle(() => measured.get("a.png")!.resolve({ width: 640, height: 480, rgb: "8a7b6c" }));
    steps.push(textarea.value);
    await settle(() => measured.get("b.png")!.resolve(null));
    steps.push(textarea.value);
    await settle(() => uploads.get("a.png")!.resolve(image("a")));
    await settle(() => uploads.get("b.png")!.reject(new Error("网络错误")));
    steps.push(textarea.value);

    expect({ steps, metas }).toEqual({
      steps: ["![处理中…]()\n![处理中…]()", "![上传中…]()\n![处理中…]()", "![上传中…]()\n![上传中…]()", `![a](${image("a").url})\n`],
      metas: [
        ["a.png", { width: 640, height: 480, rgb: "8a7b6c" }],
        ["b.png", null],
      ],
    });
  });
});
