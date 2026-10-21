import { act, cleanup, render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AfilmoryPhotoInfo } from "../../../src/lib/afilmory/markdown";
import { UploadError } from "../../../src/lib/upload/upload-client";
import { useImageUploads, type UploadView } from "../../../src/lib/upload/use-image-uploads";

// UT-175（SC-AFIL-01、02、05、07）：insertAfilmoryPhotos 与文件上传共用占位槽位与卡片
const STORAGE = "https://raw.githubusercontent.com/miraclehifi/photo-assets/main/";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
}
const tick = () => act(async () => void (await new Promise((r) => setTimeout(r, 0))));
const photo = (id: string, patch: Partial<AfilmoryPhotoInfo> = {}): AfilmoryPhotoInfo => ({
  id,
  url: `${STORAGE}${id}.jpg`,
  thumbnail: `${STORAGE}.afilmory/thumbnails/${id}.jpg`,
  width: 800,
  height: 600,
  rgb: "112233",
  ...patch,
});

afterEach(cleanup);

function setup(options: { live?: boolean } = {}) {
  const pending = new Map<string, ReturnType<typeof deferred<AfilmoryPhotoInfo>>[]>();
  const fetchPhoto = vi.fn((id: string) => {
    const d = deferred<AfilmoryPhotoInfo>();
    pending.set(id, [...(pending.get(id) ?? []), d]);
    return d.promise;
  });
  const views: UploadView[][] = [];
  const warnings: string[] = [];
  const onUnauthenticated = vi.fn();
  const api = {} as { insert: (ids: string[]) => void };
  function Harness() {
    const ref = useRef<HTMLTextAreaElement>(null);
    api.insert = useImageUploads(ref, {
      fetchPhoto,
      photoStorage: STORAGE,
      liveEnabled: options.live,
      fadeOutMs: 0,
      onWarning: (m) => warnings.push(m),
      onUnauthenticated,
      onTasksChange: (v) => views.push(v.filter((item) => !item.ghost)),
    }).insertAfilmoryPhotos;
    return <textarea ref={ref} defaultValue="前" />;
  }
  const { container } = render(<Harness />);
  const textarea = container.querySelector("textarea")!;
  textarea.setSelectionRange(1, 1);
  return { pending, fetchPhoto, views, warnings, onUnauthenticated, textarea, insert: (ids: string[]) => act(() => api.insert(ids)) };
}

describe("useImageUploads.insertAfilmoryPhotos", () => {
  it("每个 id 一行占位；卡片 fetching、无缩略图；乱序完成按占位顺序替换", async () => {
    const t = setup();
    t.insert(["a", "b", "c"]);
    const first = t.views.at(-1)!.map((v) => [v.name, v.state, v.thumbUrl]);
    const placeholders = t.textarea.value;
    await act(async () => t.pending.get("c")![0].resolve(photo("c")));
    await act(async () => t.pending.get("a")![0].resolve(photo("a")));
    await act(async () => t.pending.get("b")![0].resolve(photo("b", { video: { offset: 10, size: 20 } })));
    await tick();
    expect({ first, placeholders, value: t.textarea.value }).toEqual({
      first: [
        ["Afilmory a", "fetching", undefined],
        ["Afilmory b", "fetching", undefined],
        ["Afilmory c", "fetching", undefined],
      ],
      placeholders: "前![处理中…]()\n![处理中…]()\n![处理中…]()",
      value: `前![](${STORAGE}a.jpg#ext=800x600x112233)\n![](${STORAGE}b.jpg#ext=800x600x112233,mp=10+20)\n![](${STORAGE}c.jpg#ext=800x600x112233)`,
    });
  });

  it("实况开关开启时动态照片带 live；存储位置不符时插普通外链并提示", async () => {
    const t = setup({ live: true });
    t.insert(["a", "b"]);
    await act(async () => t.pending.get("a")![0].resolve(photo("a", { video: { offset: 10, size: 20 } })));
    await act(async () => t.pending.get("b")![0].resolve(photo("b", { thumbnail: `${STORAGE}x.jpg` })));
    await tick();
    expect(t.textarea.value).toBe(`前![](${STORAGE}a.jpg#ext=800x600x112233,mp=10+20,live)\n![](${STORAGE}b.jpg)`);
    expect(t.warnings).toEqual(["Afilmory b：这张照片的存储位置不符合约定，已按普通外链插入"]);
  });

  it("失败：占位为上传失败、卡片原因为接口文案；重试重新请求；401 走会话过期", async () => {
    const t = setup();
    t.insert(["a"]);
    await act(async () => t.pending.get("a")![0].reject(new UploadError("UPSTREAM_UNAVAILABLE", "Afilmory 暂时无法访问", 502)));
    await tick();
    const failed = t.views.at(-1)![0];
    expect([failed.state, failed.error, t.textarea.value]).toEqual(["error", "Afilmory 暂时无法访问", "前![上传失败]()"]);
    act(() => failed.retry!());
    expect([t.fetchPhoto.mock.calls.length, t.textarea.value, t.views.at(-1)![0].state]).toEqual([2, "前![处理中…]()", "fetching"]);
    await act(async () => t.pending.get("a")![1].reject(new UploadError("UNAUTHENTICATED", "登录已过期，请重新登录", 401)));
    await tick();
    expect(t.onUnauthenticated).toHaveBeenCalledTimes(1);
  });
});
