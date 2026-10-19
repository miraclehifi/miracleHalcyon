import { act, cleanup, render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UploadError, type UploadedImage, type UploadExtras, type UploadOptions } from "../../../src/lib/upload/upload-client";
import { useImageUploads, type UploadView } from "../../../src/lib/upload/use-image-uploads";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => (resolve = res));
  return { promise, resolve };
}

const image = (name: string): UploadedImage => ({ url: `/img/2026/10/${name}aaaaaaaaa_1x1_808080.png`, width: 1, height: 1, rgb: "808080", live: false, videoUrl: null });
const tick = () => act(async () => void (await new Promise((r) => setTimeout(r, 0))));

let created: string[];
let revoked: string[];
beforeEach(() => {
  created = [];
  revoked = [];
  let n = 0;
  vi.spyOn(URL, "createObjectURL").mockImplementation(() => {
    const url = `blob:thumb-${n++}`;
    created.push(url);
    return url;
  });
  vi.spyOn(URL, "revokeObjectURL").mockImplementation((url: string) => void revoked.push(url));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// UT-157 / UT-160（SC-IMAGE-01、SC-IMAGE-12）：任务视图——等待 / 压缩 / 上传 N% / 淡出；缩略图 URL 创建一次、完成与卸载时回收
describe("useImageUploads 任务视图", () => {
  it("三张图并发 2：前两张立即压缩、第三张等待；上传进度按字节映射；成功后淡出再替换占位并回收缩略图", async () => {
    const uploads = new Map<string, { done: ReturnType<typeof deferred<UploadedImage>>; options?: UploadOptions }>();
    const upload = (file: File, _extras: UploadExtras, options?: UploadOptions) => {
      const done = deferred<UploadedImage>();
      uploads.set(file.name, { done, options });
      return done.promise;
    };
    const views: UploadView[][] = [];
    let uploadFiles!: (files: File[]) => void;
    function Harness() {
      const ref = useRef<HTMLTextAreaElement>(null);
      uploadFiles = useImageUploads(ref, { upload, fadeOutMs: 0, onTasksChange: (v) => views.push(v.filter((item) => !item.ghost)) }).uploadFiles;
      return <textarea ref={ref} defaultValue="" />;
    }
    const { container, unmount } = render(<Harness />);
    const textarea = container.querySelector("textarea")!;
    act(() => uploadFiles(["a.png", "b.png", "c.png"].map((name) => new File(["x"], name, { type: "image/png" }))));
    const first = views.at(-1)!;
    await tick();
    await tick();
    const running = views.at(-1)!;
    await act(async () => uploads.get("a.png")!.options?.onProgress?.(50, 100));
    const halfway = views.at(-1)!.find((v) => v.name === "a.png")!;
    await act(async () => uploads.get("a.png")!.done.resolve(image("a")));
    await tick();
    await tick();
    const afterA = views.at(-1)!;
    const value = textarea.value;
    unmount();

    expect({
      first: first.map((v) => [v.name, v.state, v.progress, v.thumbUrl]),
      running: running.map((v) => [v.name, v.state]),
      halfway: [halfway.state, halfway.progress],
      afterA: afterA.map((v) => v.name),
      value: value.split("\n")[0],
      created,
      revoked,
    }).toEqual({
      first: [
        ["a.png", "compressing", 0, "blob:thumb-0"], // 并发 2：前两张立即开始
        ["b.png", "compressing", 0, "blob:thumb-1"],
        ["c.png", "waiting", 0, "blob:thumb-2"],
      ],
      running: [
        ["a.png", "uploading"],
        ["b.png", "uploading"],
        ["c.png", "waiting"],
      ],
      halfway: ["uploading", 57.5],
      afterA: ["b.png", "c.png"],
      value: `![a](${image("a").url})`,
      created: ["blob:thumb-0", "blob:thumb-1", "blob:thumb-2"],
      revoked: ["blob:thumb-0", "blob:thumb-1", "blob:thumb-2"], // a 完成时回收；b、c 在卸载时回收
    });
  });

  // UT-158 / UT-161（SC-IMAGE-07、SC-IMAGE-10、SC-IMAGE-11）
  it("失败：卡片进入 error 并带原因、保留缩略图；重试从压缩重跑后成功替换；移除删掉整行占位", async () => {
    const attempts = new Map<string, number>();
    const upload = async (file: File) => {
      const n = (attempts.get(file.name) ?? 0) + 1;
      attempts.set(file.name, n);
      if (n === 1) throw new UploadError("NETWORK", "网络中断", 0);
      return image(file.name[0]);
    };
    const views: UploadView[][] = [];
    let uploadFiles!: (files: File[]) => void;
    function Harness() {
      const ref = useRef<HTMLTextAreaElement>(null);
      uploadFiles = useImageUploads(ref, { upload, fadeOutMs: 0, onTasksChange: (v) => views.push(v.filter((item) => !item.ghost)) }).uploadFiles;
      return <textarea ref={ref} defaultValue={"段落A\n\n段落B"} />;
    }
    const { container } = render(<Harness />);
    const textarea = container.querySelector("textarea")!;
    textarea.setSelectionRange(4, 4);
    act(() => uploadFiles(["a.png", "b.png"].map((name) => new File(["x"], name, { type: "image/png" }))));
    await tick();
    await tick();
    const failed = views.at(-1)!.map((v) => [v.name, v.state, v.error, v.thumbUrl]);
    const failedValue = textarea.value;
    await act(async () => views.at(-1)![0].retry?.());
    await tick();
    await tick();
    const retried = textarea.value;
    await act(async () => views.at(-1)![0].remove());
    expect({ failed, failedValue, retried, removed: textarea.value, left: views.at(-1)!.length, attempts: [...attempts.values()] }).toEqual({
      failed: [
        ["a.png", "error", "网络中断", "blob:thumb-0"],
        ["b.png", "error", "网络中断", "blob:thumb-1"],
      ],
      failedValue: "段落A\n![上传失败]()\n![上传失败]()\n段落B",
      retried: `段落A\n![a](${image("a").url})\n![上传失败]()\n段落B`,
      removed: `段落A\n![a](${image("a").url})\n段落B`,
      left: 0,
      attempts: [2, 1],
    });
  });

  // ED-UT-03 扩展 / UT-161（SC-IMAGE-19）：占位槽位——加载时已有占位为空槽位（interrupted），移除按序号删、可撤销；
  // 上传中在前面粘贴占位文本：新占位为空槽位，上传结果仍替换原来的占位
  it("槽位模型：孤立占位显示已中断、可移除；撤销 / 粘贴带回的占位为空槽位；绑定的任务仍对准原占位", async () => {
    const done = deferred<UploadedImage>();
    const views: UploadView[][] = [];
    let uploadFiles!: (files: File[]) => void;
    function Harness() {
      const ref = useRef<HTMLTextAreaElement>(null);
      uploadFiles = useImageUploads(ref, { upload: () => done.promise, fadeOutMs: 0, onTasksChange: (v) => views.push(v.filter((item) => !item.ghost)) }).uploadFiles;
      return <textarea ref={ref} defaultValue={"A\n![上传失败]()\n![上传中…]()\nB"} />;
    }
    const { container } = render(<Harness />);
    const textarea = container.querySelector("textarea")!;
    const type = (value: string, caret: number) =>
      act(() => {
        textarea.value = value;
        textarea.setSelectionRange(caret, caret);
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
      });
    const shape = () => views.at(-1)!.map((v) => [v.state, v.name, v.retry ? "retry" : "-"]);
    await tick();
    const loaded = shape();
    await act(async () => views.at(-1)![0].remove());
    const removed = { value: textarea.value, views: shape() };
    type("A\n![上传失败]()\n![上传中…]()\nB", 2); // 撤销：带回第 1 个占位，光标在其前面
    const undone = shape();
    type("A\nB", 1); // 删掉两个占位
    textarea.setSelectionRange(3, 3);
    act(() => uploadFiles([new File(["x"], "a.png", { type: "image/png" })]));
    await tick();
    await tick();
    type("![上传失败]()A\n" + textarea.value.slice(2), 9); // 在开头粘贴一个占位
    const pasted = shape();
    await act(async () => done.resolve(image("a")));
    await tick();
    expect({ loaded, removed, undone, pasted, final: textarea.value, left: shape() }).toEqual({
      loaded: [
        ["interrupted", "", "-"],
        ["interrupted", "", "-"],
      ],
      removed: { value: "A\n![上传中…]()\nB", views: [["interrupted", "", "-"]] },
      undone: [
        ["interrupted", "", "-"],
        ["interrupted", "", "-"],
      ],
      pasted: [
        ["interrupted", "", "-"],
        ["uploading", "a.png", "-"],
      ],
      final: `![上传失败]()A\nB![a](${image("a").url})`,
      left: [["interrupted", "", "-"]],
    });
  });

  // UT-161 stillOnly（SC-LIVE-16）：两张动态照片都在处理视频，第一张"仅转为静态图"——只中止它的视频处理，按静态图上传；
  // 第二张不受影响，仍带视频
  it("仅转为静态图：只放弃本张视频", async () => {
    const signals = new Map<string, AbortSignal | undefined>();
    const videos = new Map<string, ReturnType<typeof deferred<{ blob: Blob }>>>();
    const sent: [string, number | null][] = [];
    const views: UploadView[][] = [];
    let uploadFiles!: (files: File[]) => void;
    function Harness() {
      const ref = useRef<HTMLTextAreaElement>(null);
      uploadFiles = useImageUploads(ref, {
        liveEnabled: true,
        fadeOutMs: 0,
        toItem: async (file) => ({ kind: "live", name: file.name, still: new Blob(["s"], { type: "image/jpeg" }), video: new Blob([file.name]) }),
        processVideo: (video, options) => {
          const done = deferred<{ blob: Blob }>();
          void video.text().then((name) => {
            signals.set(name, options?.signal);
            videos.set(name, done);
          });
          return done.promise;
        },
        upload: async (file, { video }) => {
          sent.push([file.name, video?.size ?? null]);
          return { ...image(file.name[0]), live: Boolean(video) };
        },
        onTasksChange: (v) => views.push(v.filter((item) => !item.ghost)),
      }).uploadFiles;
      return <textarea ref={ref} defaultValue="" />;
    }
    const { container } = render(<Harness />);
    const textarea = container.querySelector("textarea")!;
    act(() => uploadFiles(["a.jpg", "b.jpg"].map((name) => new File(["x"], name, { type: "image/jpeg" }))));
    for (let i = 0; i < 4; i++) await tick();
    const live = views.at(-1)!.map((v) => [v.name, v.state, Boolean(v.stillOnly)]);
    await act(async () => views.at(-1)![0].stillOnly?.());
    for (let i = 0; i < 3; i++) await tick();
    await act(async () => videos.get("b.jpg")!.resolve({ blob: new Blob([new Uint8Array(7)]) }));
    for (let i = 0; i < 3; i++) await tick();
    expect({ live, aborted: [signals.get("a.jpg")?.aborted, signals.get("b.jpg")?.aborted], sent, value: textarea.value }).toEqual({
      live: [
        ["a.jpg", "processing-live", true],
        ["b.jpg", "processing-live", true],
      ],
      aborted: [true, false],
      sent: [
        ["a.jpg", null],
        ["b.jpg", 7],
      ],
      value: `![a](${image("a").url})\n![b](${image("b").url}#live)`,
    });
  });

  // media-upload module-spec §3"上传"：401 → 占位改为"上传失败"后交给会话过期处理（暂存、跳登录）；其他失败不调用
  it("上传返回 401：先写失败占位，再调用 onUnauthenticated", async () => {
    const calls: string[] = [];
    let uploadFiles!: (files: File[]) => void;
    function Harness() {
      const ref = useRef<HTMLTextAreaElement>(null);
      uploadFiles = useImageUploads(ref, {
        upload: async (file) => {
          throw file.name === "a.png" ? new UploadError("UNAUTHENTICATED", "未登录", 401) : new UploadError("NETWORK", "网络中断", 0);
        },
        onUnauthenticated: () => calls.push(ref.current?.value ?? ""),
      }).uploadFiles;
      return <textarea ref={ref} defaultValue="" />;
    }
    render(<Harness />);
    act(() => uploadFiles(["a.png", "b.png"].map((name) => new File(["x"], name, { type: "image/png" }))));
    for (let i = 0; i < 3; i++) await tick();
    expect({ count: calls.length, first: calls[0]?.split("\n")[0] }).toEqual({ count: 1, first: "![上传失败]()" });
  });

  it("成功后先标记 leaving，fadeOutMs 之后才替换占位；原位置留幽灵条目 1.5 秒", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "setInterval"] });
    const views: UploadView[][] = [];
    const raw: UploadView[][] = [];
    let uploadFiles!: (files: File[]) => void;
    function Harness() {
      const ref = useRef<HTMLTextAreaElement>(null);
      uploadFiles = useImageUploads(ref, {
        upload: async () => image("a"),
        fadeOutMs: 200,
        onTasksChange: (v) => {
          raw.push(v);
          views.push(v.filter((item) => !item.ghost));
        },
      }).uploadFiles;
      return <textarea ref={ref} defaultValue="" />;
    }
    const { container } = render(<Harness />);
    const textarea = container.querySelector("textarea")!;
    act(() => uploadFiles([new File(["x"], "a.png", { type: "image/png" })]));
    await act(async () => void (await vi.advanceTimersByTimeAsync(0)));
    const leaving = { view: views.at(-1)?.[0], value: textarea.value };
    await act(async () => void (await vi.advanceTimersByTimeAsync(200)));
    const ghost = raw.at(-1)?.map((item) => item.ghost ?? false); // 替换后原位置留一个幽灵条目
    await act(async () => void (await vi.advanceTimersByTimeAsync(1500)));
    const ghostGone = raw.at(-1)?.length;
    vi.useRealTimers();
    expect({ leaving: [leaving.view?.leaving, leaving.view?.progress, leaving.value], after: [views.at(-1)?.length, textarea.value] }).toEqual({
      leaving: [true, 100, "![上传中…]()"],
      after: [0, `![a](${image("a").url})`],
    });
    expect({ ghost, ghostGone }).toEqual({ ghost: [true], ghostGone: 0 });
  });
});
