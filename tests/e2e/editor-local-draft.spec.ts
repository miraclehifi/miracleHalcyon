import { expect, test, type Page } from "@playwright/test";
import { adminApi, login } from "./support/admin";
import { waitForHydration } from "./support/hydration";

// 本地暂存与恢复横幅（editor module-spec §2，admin-post-editor"弹层与提示"本地内容恢复）
test.use({ timezoneId: "Asia/Shanghai" });

interface Stash {
  savedAt: string;
  content: { title: string; slug: string; tags: string[]; summary: string; body: string; publishedAt: string | null };
}

const banner = (page: Page) => page.getByRole("region", { name: "发现未同步的本地内容，是否恢复？" });
const body = (page: Page) => page.getByRole("textbox", { name: "正文" });
const readStash = (page: Page, id: string) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null") as Stash | null, `mh:draft:${id}`);

// 横幅里的时间：上海时区"M月D日 HH:mm"
function shanghaiTime(iso: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Shanghai", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date(iso))
      .map((part) => [part.type, part.value]),
  );
  return `${parts.month}月${parts.day}日 ${parts.hour}:${parts.minute}`;
}

// 建一篇草稿（正文"服务端版本"），返回 id、服务端 updatedAt 与内容
async function serverPost(page: Page, baseURL: string, label: string) {
  const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  await login(page);
  const id = await adminApi(page, baseURL).create({ title: `${label} ${run}`, slug: `stash-${run}`, body: "服务端版本" });
  const post = (await (await page.request.get(`/api/admin/posts/${id}`)).json()) as Stash["content"] & { updatedAt: string };
  const content = { title: post.title, slug: post.slug, tags: post.tags, summary: post.summary, body: post.body, publishedAt: post.publishedAt };
  return { id, updatedAt: post.updatedAt, content };
}

// 在同源页面（登录后停留的 /admin）写入暂存，再打开写文章页
async function openWithStash(page: Page, id: string, stashes: Record<string, Stash>) {
  await page.evaluate((entries) => entries.forEach(([key, value]) => localStorage.setItem(key, JSON.stringify(value))), Object.entries(stashes));
  await page.goto(`/admin/posts/${id}`);
  await waitForHydration(page);
}

const shifted = (iso: string, ms: number) => new Date(Date.parse(iso) + ms).toISOString();

// [TC-US06-11][SC-AUTOSAVE-06] 断网：保存失败，正文已暂存；恢复网络后自动重试成功，暂存清除
test("[TC-US06-11] 断网本地暂存，恢复后自动重试", async ({ page, context, baseURL }) => {
  const { id } = await serverPost(page, baseURL!, "离线");
  await page.goto(`/admin/posts/${id}`);
  await waitForHydration(page);

  await context.setOffline(true);
  await body(page).fill("服务端版本+离线内容");
  await expect(page.getByRole("banner").getByText("保存失败")).toBeVisible();
  const stash = await readStash(page, id);
  expect({ body: stash?.content.body, hasTime: !Number.isNaN(Date.parse(stash?.savedAt ?? "")) }).toEqual({ body: "服务端版本+离线内容", hasTime: true });

  await context.setOffline(false);
  await expect(page.getByRole("banner").getByText("已保存")).toBeVisible({ timeout: 15_000 });
  expect(((await (await page.request.get(`/api/admin/posts/${id}`)).json()) as { body: string }).body).toBe("服务端版本+离线内容");
  expect(await readStash(page, id)).toBeNull();
});

// [TC-US06-13][SC-AUTOSAVE-07] 暂存比服务端新 1 分钟：显示横幅（带暂存时间），编辑区仍为服务端版本；恢复后立即保存
test("[TC-US06-13] 本地暂存更新：提示并恢复", async ({ page, baseURL }) => {
  const { id, updatedAt, content } = await serverPost(page, baseURL!, "恢复");
  const savedAt = shifted(updatedAt, 60_000);
  await openWithStash(page, id, { [`mh:draft:${id}`]: { savedAt, content: { ...content, body: "本地版本" } } });

  await expect(banner(page)).toContainText(`本地暂存于 ${shanghaiTime(savedAt)}，比服务端版本更新。丢弃后无法找回。`);
  await expect(body(page)).toHaveValue("服务端版本");

  const save = page.waitForRequest((request) => request.method() === "PUT" && request.url().endsWith(`/api/admin/posts/${id}`), { timeout: 1500 });
  await banner(page).getByRole("button", { name: "恢复本地内容" }).click();
  await save; // 不等 2 秒防抖
  await expect(body(page)).toHaveValue("本地版本");
  await expect(banner(page)).toHaveCount(0);
  await expect(page.getByRole("banner").getByText("已保存")).toBeVisible();
  expect(((await (await page.request.get(`/api/admin/posts/${id}`)).json()) as { body: string }).body).toBe("本地版本");
  expect(await readStash(page, id)).toBeNull();
});

// [TC-US06-14][SC-AUTOSAVE-07] 丢弃：保持服务端版本、不保存、暂存清除，刷新后不再提示
test("[TC-US06-14] 本地暂存更新：丢弃", async ({ page, baseURL }) => {
  const { id, updatedAt, content } = await serverPost(page, baseURL!, "丢弃");
  await openWithStash(page, id, { [`mh:draft:${id}`]: { savedAt: shifted(updatedAt, 60_000), content: { ...content, body: "本地版本" } } });
  const saves: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "PUT") saves.push(request.url());
  });

  await banner(page).getByRole("button", { name: "丢弃本地内容" }).click();
  await expect(banner(page)).toHaveCount(0);
  await expect(body(page)).toHaveValue("服务端版本");
  expect(await readStash(page, id)).toBeNull();
  await page.reload();
  await waitForHydration(page);
  await expect(body(page)).toHaveValue("服务端版本");
  await expect(banner(page)).toHaveCount(0);
  expect(saves).toEqual([]);
});

// [TC-US06-13][SC-AUTOSAVE-07] 横幅未处理时继续输入：自动保存照常，但旧暂存不被覆盖或清除，之后仍可恢复
test("[TC-US06-13] 有恢复横幅时继续输入不丢旧暂存", async ({ page, baseURL }) => {
  const { id, updatedAt, content } = await serverPost(page, baseURL!, "横幅中输入");
  await openWithStash(page, id, { [`mh:draft:${id}`]: { savedAt: shifted(updatedAt, 60_000), content: { ...content, body: "本地版本" } } });
  await expect(banner(page)).toBeVisible();

  await body(page).fill("服务端版本+新输入");
  await expect(page.getByRole("banner").getByText("已保存")).toBeVisible({ timeout: 10_000 });
  expect((await readStash(page, id))?.content.body).toBe("本地版本");

  await banner(page).getByRole("button", { name: "恢复本地内容" }).click();
  await expect(body(page)).toHaveValue("本地版本");
  await expect(page.getByRole("banner").getByText("已保存")).toBeVisible({ timeout: 10_000 });
  expect(await readStash(page, id)).toBeNull();
});

// [TC-US06-15][SC-AUTOSAVE-07] 只有严格更新才提示：更旧 / 相等 / 其他文章的暂存不提示（过期暂存清除），新 1ms 提示
test("[TC-US06-15] 本地暂存更旧 / 时间相等不提示", async ({ page, baseURL }) => {
  const { id, updatedAt, content } = await serverPost(page, baseURL!, "边界");
  const local = (ms: number): Stash => ({ savedAt: shifted(updatedAt, ms), content: { ...content, body: "本地版本" } });

  for (const ms of [-60_000, 0]) {
    await openWithStash(page, id, { [`mh:draft:${id}`]: local(ms) });
    await expect(body(page)).toHaveValue("服务端版本");
    await expect(banner(page)).toHaveCount(0);
    await expect.poll(() => readStash(page, id)).toBeNull();
  }

  await openWithStash(page, id, { "mh:draft:other-post": local(6 * 60_000) });
  await expect(banner(page)).toHaveCount(0);

  await openWithStash(page, id, { [`mh:draft:${id}`]: local(1) });
  await expect(banner(page)).toContainText(`本地暂存于 ${shanghaiTime(local(1).savedAt)}`);
});
