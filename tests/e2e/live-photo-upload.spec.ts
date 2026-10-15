import { expect, test, type Locator, type Page } from "@playwright/test";
import { adminApi, login } from "./support/admin";
import { waitForHydration } from "./support/hydration";
import { derivedFixtures, oppo, oppoLayout, OPPO_PATH } from "../fixtures/live/motion-photos";
import { dropBytes, dropFiles, holdUploads, type ByteFile } from "./support/images";

// US-11 上传前处理与安卓动态照片（media-upload module-spec §1）：占位"处理中…"→"上传中…"，主色与宽高随请求上报；
// 动态照片切出视频、转码 / 转封装 / 丢弃，与静态图同一请求上传。真实样本为 OPPO，其余由 motion-photos.ts 在内存中派生
async function openPost(page: Page, baseURL: string, body = "") {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  const id = await adminApi(page, baseURL).create({ title: `[E2E-US11] 上传 ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, body });
  await page.goto(`/admin/posts/${id}`);
  await waitForHydration(page);
  return page.getByRole("textbox", { name: "正文" });
}

// 扣住页面里的图片解码（createImageBitmap），直到调用返回的 release()
async function holdDecoding(page: Page): Promise<() => Promise<void>> {
  await page.addInitScript(() => {
    if (typeof window === "undefined") return; // 完整 Chromium 也会在 Worker 里执行 init script（预览渲染在 Worker 中）
    const original = window.createImageBitmap.bind(window);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    Object.assign(window, { __releaseDecode: release });
    window.createImageBitmap = (async (...args: Parameters<typeof createImageBitmap>) => {
      await gate;
      return original(...args);
    }) as typeof createImageBitmap;
  });
  return () => page.evaluate(() => (window as unknown as { __releaseDecode: () => void }).__releaseDecode());
}

const channels = (hex: string) => [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));

// [TC-US11-22][SC-LIVE-05] 占位依次"处理中…"→"上传中…"→引用；预览占位块；请求带宽高与主色（夹具底色 #8a7b6c），key 主色与之一致
test("[TC-US11-22] 占位依次显示处理中、上传中，请求带主色与宽高", async ({ page, baseURL }) => {
  test.setTimeout(60_000); // 与动态照片组并行时，上传可能被转码拖慢
  const releaseDecode = await holdDecoding(page);
  const releaseUpload = await holdUploads(page);
  const editor = await openPost(page, baseURL!);
  const preview = page.getByTestId("md-preview");
  const request = page.waitForRequest((r) => r.url().endsWith("/api/admin/images") && r.method() === "POST");

  await dropFiles(page, editor, [{ name: "b.jpg", type: "image/jpeg", content: { jpeg: [64, 48] } }]);
  await expect(editor).toHaveValue("![处理中…]()");
  await expect(preview.getByText("图片处理中… b.jpg")).toBeVisible();

  await releaseDecode();
  await expect(editor).toHaveValue("![上传中…]()");
  await expect(preview.getByText("图片上传中… b.jpg")).toBeVisible();
  const form = (await request).postDataBuffer()!.toString("latin1");
  const field = (name: string) => new RegExp(`name="${name}"\\r\\n\\r\\n([^\\r]*)`).exec(form)?.[1];
  const rgb = field("rgb")!;
  expect([field("width"), field("height")]).toEqual(["64", "48"]);
  expect(rgb).toMatch(/^[0-9a-f]{6}$/);
  channels(rgb).forEach((value, i) => expect(Math.abs(value - channels("8a7b6c")[i])).toBeLessThanOrEqual(4)); // JPEG 有损，允许小误差

  releaseUpload();
  await expect(editor).toHaveValue(new RegExp(`^!\\[b\\]\\(/img/\\d{4}/\\d{2}/[a-z2-7]{10}_64x48_${rgb}\\.jpg\\)$`), { timeout: 30_000 });
});

// ---- 安卓动态照片（add-motion-photo-detection）----
const OPPO_NAME = "IMG20260516172228.jpg";
const REF = /^!\[([^\]]+)\]\(\/img\/\d{4}\/\d{2}\/[a-z2-7]{10}_\d+x\d+_[0-9a-f]{6}\.(?:jpg|png)(#live)?\)$/;
const jpeg = (name: string, bytes: Uint8Array): ByteFile => ({ name, type: "image/jpeg", bytes });

// 源码各行：引用行解析为 "alt" / "alt#live"，其余原样；占位未替换完时返回 null
async function lines(editor: Locator): Promise<string[] | null> {
  const value = await editor.inputValue();
  if (/处理中…|上传中…/.test(value)) return null;
  return value.split("\n").map((line) => {
    const match = REF.exec(line);
    return match ? `${match[1]}${match[2] ?? ""}` : line;
  });
}
const settled = (editor: Locator, expected: string[]) => expect.poll(() => lines(editor), { timeout: 60_000 }).toEqual(expected);

// 让 mediabunny 认为浏览器不能编码 H.264（只转封装）
const noH264Encoder = (page: Page) =>
  page.addInitScript(() => {
    if (typeof window !== "undefined" && "VideoEncoder" in window) VideoEncoder.isConfigSupported = async (config) => ({ supported: false, config });
  });

interface FilePart {
  size: number;
  head: string; // 第 4–8 字节（mp4 为 ftyp）
  hevc: boolean; // 含 hvc1 / hev1 编码标识
}
type UploadRecord = Record<string, FilePart | string>;

// 在页面里包一层 fetch，记录上传表单各字段（大请求体 Playwright 拿不到 postData，且两种浏览器都要可用）
async function captureUploads(page: Page): Promise<() => Promise<UploadRecord[]>> {
  await page.evaluate(() => {
    const records: UploadRecord[] = [];
    Object.assign(window, { __uploads: records });
    const original = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      if (String(input).endsWith("/api/admin/images") && init?.body instanceof FormData) {
        const record: UploadRecord = {};
        for (const [name, value] of init.body.entries()) {
          if (typeof value === "string") {
            record[name] = value;
            continue;
          }
          const bytes = new Uint8Array(await value.arrayBuffer());
          const text = new TextDecoder("latin1").decode(bytes);
          record[name] = { size: bytes.length, head: text.slice(4, 8), hevc: /hvc1|hev1/.test(text) };
        }
        records.push(record);
      }
      return original(input, init);
    };
  });
  return () => page.evaluate(() => (window as unknown as { __uploads: UploadRecord[] }).__uploads);
}
const part = (record: UploadRecord, name: string) => record[name] as FilePart | undefined;

test.describe("安卓动态照片", () => {
  // 4K HEVC 转码约 7 秒、占满 CPU：组内串行，避免多个转码同时跑把彼此拖到超时
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);
  const derived = derivedFixtures();
  // Windows 版 Playwright WebKit 没有 H.264 编码、不能解码 HEVC：OPPO 主视频只能转封装（16.4MB）而被丢弃，按设计降级为静态图
  // （TC-US11-09 覆盖）；依赖转码的用例只在 chromium 上跑
  const needsTranscode = (browserName: string) => test.skip(browserName === "webkit", "WebKit（Windows）不能转码 HEVC，按设计降级，见 TC-US11-09");

  // [TC-US11-01][SC-LIVE-01] 拖入 OPPO 动态照片：一个请求同时含图片和视频，只新增一行 #live 引用，预览显示 LIVE
  // [TC-US11-05][SC-LIVE-03] 视频字段以 ftyp 开头；file 只含静态图（长度 = 主视频起点）
  test("[TC-US11-01][TC-US11-05] 拖入安卓动态照片，插入一条 #live 引用", async ({ page, baseURL, browserName }) => {
    needsTranscode(browserName);
    const editor = await openPost(page, baseURL!, "行1\n行2\n行3\n");
    const uploads = await captureUploads(page);
    await dropBytes(page, editor, [jpeg(OPPO_NAME, oppo())], 4);

    await settled(editor, ["行1", "行2", "行3", "IMG20260516172228#live"]);
    const [record, ...rest] = await uploads();
    expect({ ftyp: part(record, "video")?.head, still: part(record, "file")?.size, more: rest.length }).toEqual({ ftyp: "ftyp", still: oppoLayout().start, more: 0 });
    await expect(page.getByTestId("md-preview").locator("[data-live-badge]")).toBeVisible({ timeout: 15_000 });
  });

  // [TC-US11-06][SC-LIVE-03] 旧版 MicroVideoOffset 识别；普通 JPEG 不误识别
  test("[TC-US11-06] 旧版 MicroVideoOffset 识别，普通 JPEG 不误识别", async ({ page, baseURL }) => {
    const editor = await openPost(page, baseURL!);
    const uploads = await captureUploads(page);
    await dropBytes(page, editor, [jpeg("MVIMG_0002.jpg", derived["MVIMG_0002.jpg"])]);
    await settled(editor, ["MVIMG_0002#live"]);
    await editor.fill("");
    await dropFiles(page, editor, [{ name: "b.jpg", type: "image/jpeg", content: { jpeg: [40, 30] } }]);
    await settled(editor, ["b"]);
    expect((await uploads()).map((record) => part(record, "video")?.head ?? null)).toEqual(["ftyp", null]);
  });

  // [TC-US11-07][SC-LIVE-04] 混合批次（a.png 最慢）按顺序插入，只有动态照片带 #live
  test("[TC-US11-07] 混合批次按顺序插入，只有动态照片带 #live", async ({ page, baseURL, browserName }) => {
    needsTranscode(browserName);
    await page.route("**/api/admin/images", async (route) => {
      if (route.request().postDataBuffer()?.includes('filename="a.png"')) await new Promise((resolve) => setTimeout(resolve, 2_000));
      await route.continue();
    });
    const editor = await openPost(page, baseURL!);
    const uploads = await captureUploads(page);
    const png = await page.evaluate(async () => {
      const canvas = Object.assign(document.createElement("canvas"), { width: 30, height: 20 });
      canvas.getContext("2d")!.fillRect(0, 0, 30, 20);
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
      return [...new Uint8Array(await blob.arrayBuffer())];
    });
    const jpg = new Uint8Array(await (await page.request.get("/img/2026/10/bbbbbbbbbb_1200x800_112233.jpg")).body());
    await dropBytes(page, editor, [{ name: "a.png", type: "image/png", bytes: new Uint8Array(png) }, jpeg(OPPO_NAME, oppo()), jpeg("b.jpg", jpg)]);

    await settled(editor, ["a", "IMG20260516172228#live", "b"]);
    expect(await uploads()).toHaveLength(3);
  });

  // [TC-US11-09][SC-LIVE-06] 不能编码 H.264：只转封装后 16.4MB → 不带视频、不带 #live，警示
  test("[TC-US11-09] 视频只转封装后超过 10MB，退回普通图片并提示", async ({ page, baseURL }) => {
    await noH264Encoder(page);
    const editor = await openPost(page, baseURL!);
    const uploads = await captureUploads(page);
    await dropBytes(page, editor, [jpeg(OPPO_NAME, oppo())]);
    await settled(editor, ["IMG20260516172228"]);
    expect((await uploads()).map((record) => "video" in record)).toEqual([false]);
    await expect(page.getByRole("status").filter({ hasText: "实况视频超过 10MB，已作为普通图片插入" })).toBeVisible();
  });

  // [TC-US11-10][SC-LIVE-06] 内嵌 H.264（原样使用）恰好 10MB 接受、多 1 字节退回
  test("[TC-US11-10] 视频恰好 10MB 接受，10MB+1 退回", async ({ page, baseURL }) => {
    const editor = await openPost(page, baseURL!);
    const uploads = await captureUploads(page);
    await dropBytes(page, editor, [jpeg("IMG_2100.jpg", derived["IMG_2100.jpg"])]);
    await settled(editor, ["IMG_2100#live"]);
    await editor.fill("");
    await dropBytes(page, editor, [jpeg("IMG_2101.jpg", derived["IMG_2101.jpg"])]);
    await settled(editor, ["IMG_2101"]);
    expect((await uploads()).map((record) => part(record, "video")?.size ?? null)).toEqual([10 * 1024 * 1024, null]);
  });

  // [TC-US11-14][SC-LIVE-08] 上传失败：图片和视频都不保留，常驻错误
  test("[TC-US11-14] 上传请求失败，图片和视频都不保留", async ({ page, baseURL }) => {
    await page.route("**/api/admin/images", (route) => route.abort());
    const editor = await openPost(page, baseURL!, "前文");
    await dropBytes(page, editor, [jpeg("IMG_3000.jpg", derived["IMG_3000.jpg"])]);
    await expect(page.getByRole("alert").filter({ hasText: "上传失败，请重试" })).toBeVisible({ timeout: 60_000 });
    await expect(editor).toHaveValue("前文");
  });

  // [TC-US11-16][SC-LIVE-09] 不能编码 H.264：内嵌 HEVC（≤ 10MB）只转封装、保留 HEVC，带 #live 并警示
  test("[TC-US11-16] 不支持 H.264 编码，保留 HEVC 并提示", async ({ page, baseURL }) => {
    await noH264Encoder(page);
    const editor = await openPost(page, baseURL!);
    const uploads = await captureUploads(page);
    await dropBytes(page, editor, [jpeg("IMG_4000.jpg", derived["IMG_4000.jpg"])]);
    await settled(editor, ["IMG_4000#live"]);
    const video = part((await uploads())[0], "video");
    expect({ mp4: video?.head, hevc: video?.hevc }).toEqual({ mp4: "ftyp", hevc: true });
    await expect(page.getByRole("status").filter({ hasText: "该实况视频在部分浏览器中只显示静态图" })).toBeVisible();
  });

  // [TC-US11-17][SC-LIVE-01] "插入图片"选择动态照片同样识别
  test("[TC-US11-17] 插入图片选择动态照片，同样识别", async ({ page, baseURL, browserName }) => {
    needsTranscode(browserName);
    const editor = await openPost(page, baseURL!);
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "插入图片" }).click();
    await (await chooser).setFiles(OPPO_PATH);
    await settled(editor, ["IMG20260516172228#live"]);
  });
});
