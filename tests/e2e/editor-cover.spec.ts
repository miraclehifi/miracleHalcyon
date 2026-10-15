import { expect, test, type Page } from "@playwright/test";
import { OPPO_PATH } from "../fixtures/live/motion-photos";
import { adminApi, login } from "./support/admin";
import { waitForHydration } from "./support/hydration";

// 写文章页设置抽屉的封面（admin-post-editor.md"设置抽屉"，F-002 US-06）
const IMAGE = "tests/fixtures/images/bbbbbbbbbb_1200x800_112233.jpg";
const drawer = (page: Page) => page.getByRole("complementary", { name: "文章设置" });
const run = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

async function openEditor(page: Page, baseURL: string, publish = false) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  const slug = `cover-${run()}`;
  const api = adminApi(page, baseURL);
  const id = await api.create({ title: `[E2E-US06] ${slug}`, slug, body: "正文" });
  if (publish) await api.publish(id);
  await page.goto(`/admin/posts/${id}`);
  await waitForHydration(page);
  if (!(await drawer(page).isVisible())) await page.getByRole("button", { name: "设置" }).click();
  return { id, slug };
}

const savedCover = (page: Page, id: string) =>
  page.waitForRequest((request) => request.method() === "PUT" && request.url().endsWith(`/api/admin/posts/${id}`) && "cover" in (request.postDataJSON() ?? {}));

// [TC-US06-01][SC-COVER-01] 选择图片上传封面，随后自动保存
test("[TC-US06-01] 选择图片上传封面", async ({ page, baseURL }) => {
  const { id } = await openEditor(page, baseURL!);
  const save = savedCover(page, id);
  await drawer(page).getByLabel("选择封面图片").setInputFiles(IMAGE);
  await expect(drawer(page).getByRole("img", { name: "封面" })).toBeVisible();
  const body = (await save).postDataJSON() as { cover: string };
  expect(body.cover).toMatch(/^\/img\/\d{4}\/\d{2}\/[a-z2-7]{10}_1200x800_[0-9a-f]{6}\.jpg$/);
  await expect(drawer(page).getByRole("img", { name: "封面" })).toHaveAttribute("src", body.cover);
});

// [TC-US06-03][SC-COVER-03] 更换与移除
test("[TC-US06-03] 更换与移除封面", async ({ page, baseURL }) => {
  const { id } = await openEditor(page, baseURL!);
  await drawer(page).getByLabel("选择封面图片").setInputFiles(IMAGE);
  await expect(drawer(page).getByRole("img", { name: "封面" })).toBeVisible();
  const removed = page.waitForRequest((request) => request.method() === "PUT" && request.url().endsWith(`/api/admin/posts/${id}`) && (request.postDataJSON() as { cover?: unknown })?.cover === null);
  await drawer(page).getByRole("button", { name: "移除" }).click();
  await removed;
  await expect(drawer(page).getByTestId("cover-dropzone")).toBeVisible();
});

// [TC-US06-04][SC-COVER-04] 不支持的格式与上传失败：提示并保留原封面
test("[TC-US06-04] 上传失败保留原封面", async ({ page, baseURL }) => {
  await openEditor(page, baseURL!);
  await drawer(page).getByLabel("选择封面图片").setInputFiles(IMAGE);
  const cover = drawer(page).getByRole("img", { name: "封面" });
  await expect(cover).toBeVisible();
  const src = await cover.getAttribute("src");
  await drawer(page).getByLabel("选择封面图片").setInputFiles({ name: "a.bmp", mimeType: "image/bmp", buffer: Buffer.from("BM") });
  await expect(drawer(page).getByRole("alert")).toHaveText("仅支持 png、jpg、webp、gif");
  await page.route("**/api/admin/images", (route) => route.fulfill({ status: 500, body: "{}" }));
  await drawer(page).getByLabel("选择封面图片").setInputFiles(IMAGE);
  await expect(drawer(page).getByRole("alert")).toHaveText("上传失败，请重试");
  await expect(cover).toHaveAttribute("src", src!);
});

// [TC-US06-05][SC-COVER-05] 已发布文章改封面：有未发布修改；发布更新后读者接口返回新封面
test("[TC-US06-05] 已发布文章改封面", async ({ page, baseURL }) => {
  const { slug } = await openEditor(page, baseURL!, true);
  await drawer(page).getByLabel("选择封面图片").setInputFiles(IMAGE);
  await expect(page.getByRole("banner").getByText("已发布 · 有未发布修改", { exact: true })).toBeVisible({ timeout: 10_000 });
  expect(((await (await page.request.get(`/api/posts/${slug}`)).json()) as { cover: unknown }).cover).toBeNull();
  await page.getByRole("button", { name: "发布更新" }).click();
  await expect.poll(async () => ((await (await page.request.get(`/api/posts/${slug}`)).json()) as { cover: unknown }).cover).toMatch(/^\/img\//);
});

// [TC-US06-07][SC-COVER-07] 安卓动态照片作封面只上传静态图
test("[TC-US06-07] 动态照片只传静态图", async ({ page, baseURL }) => {
  await openEditor(page, baseURL!);
  // 大请求体的 postData 在 Playwright 中为 null，改从上传接口的响应判断：没有随请求上传视频
  const response = page.waitForResponse((r) => r.request().method() === "POST" && r.url().endsWith("/api/admin/images"));
  await drawer(page).getByLabel("选择封面图片").setInputFiles(OPPO_PATH);
  const uploaded = (await (await response).json()) as { live: boolean; videoUrl: string | null };
  expect([uploaded.live, uploaded.videoUrl]).toEqual([false, null]);
  await expect(drawer(page).getByRole("img", { name: "封面" })).toBeVisible({ timeout: 15_000 });
  await expect(drawer(page).locator("[data-live-badge]")).toHaveCount(0);
});
