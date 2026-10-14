import { expect, test } from "@playwright/test";
import { adminApi, login } from "./support/admin";
import { waitForHydration } from "./support/hydration";
import { deleteViaDrawer, drag, entranceDone, openList, rowNames, total, trackDeletes } from "./support/post-list";

// 列表删除的撤销与延迟提交（admin-post-list.md"删除与撤销"）：删除后 6 秒撤销期才发请求。
// 计时用 page.clock（安装但不暂停，动画照常播放），runFor 快进
const undoToast = (page: import("@playwright/test").Page) => page.getByRole("status").filter({ hasText: /^已删除/ });

// [TC-US09-14][SC-DELETE-07] 撤销：原位恢复、不发请求；悬停暂停计时；键盘撤销（Enter / Ctrl+Z）
test("[TC-US09-14] 列表删除后撤销", async ({ page, baseURL }) => {
  const { prefix, ids, row } = await openList(page, baseURL!, "U", ["C", "B", "A"], { clock: true }); // 显示顺序 A、B、C
  const deletes = trackDeletes(page);
  const order = [`《${prefix} A》`, `《${prefix} B》`, `《${prefix} C》`];
  const before = await total(page);

  // 1. 全滑删除 B，3 秒后点"撤销"
  await drag(page, row("B"), "full");
  await expect(row("B")).toHaveCount(0);
  await expect(undoToast(page)).toHaveText(`已删除《${prefix} B》撤销`);
  await expect.poll(() => total(page)).toBe(before - 1);
  await page.clock.runFor(3000);
  await undoToast(page).getByRole("button", { name: "撤销" }).click();
  await expect(undoToast(page)).toHaveCount(0);
  await expect.poll(() => rowNames(page)).toEqual(order);
  await expect.poll(() => total(page)).toBe(before);
  await page.clock.runFor(10_000);
  expect(deletes).toEqual([]);

  // 2. 再删 B，鼠标停在提示上 10 秒不提交；移开后继续计时，6 秒内提交 1 次
  await entranceDone(page);
  await deleteViaDrawer(row("B"));
  await page.mouse.move(0, 0); // 第 1 步点"撤销"后光标停在提示的位置
  await undoToast(page).hover();
  await page.clock.runFor(10_000);
  await expect(undoToast(page)).toBeVisible();
  expect(deletes).toEqual([]);
  await page.mouse.move(0, 0); // 移开后接着计时（剩余不足 6 秒：悬停前已走了一点）
  await page.clock.runFor(3000);
  expect(deletes).toEqual([]);
  await page.clock.runFor(3100);
  await expect(undoToast(page)).toHaveCount(0);
  await expect.poll(() => deletes).toEqual([ids.B]);

  // 3. 键盘撤销：Tab 到"撤销"按 Enter；提示聚焦时 Ctrl+Z
  for (const press of [["Enter"], ["Control+z"]]) {
    await entranceDone(page);
    await deleteViaDrawer(row("A"));
    await undoToast(page).getByRole("button", { name: "撤销" }).focus();
    await page.keyboard.press(press[0]);
    await expect(row("A")).toBeVisible();
    await expect.poll(() => rowNames(page)).toEqual([order[0], order[2]]);
  }
  await page.clock.runFor(10_000);
  expect(deletes).toEqual([ids.B]);
});

// [TC-US09-15][SC-DELETE-08] 撤销期内离开页面立即提交；连续删除时先提交上一条
test("[TC-US09-15] 撤销期内离开页面 / 连续删除", async ({ page, baseURL }) => {
  const { prefix, ids, row } = await openList(page, baseURL!, "L", ["C", "B", "A"], { clock: true });
  const deletes = trackDeletes(page);

  // 1. 删除 A，立即点 C 进入写文章页：跳转前发出 A 的删除（keepalive；卸载中的文档发出的请求不一定报给 request 事件，以接口结果为准）
  await deleteViaDrawer(row("A"));
  await row("C").getByRole("link").first().click();
  await expect(page).toHaveURL(new RegExp(`/admin/posts/${ids.C}$`));
  await expect.poll(async () => (await page.request.get(`/api/admin/posts/${ids.A}`)).status()).toBe(404);

  // 3. 删除 B，2 秒后删除 C：删 C 时 B 立即提交、提示换成 C；C 在其后 6 秒提交；每篇 1 次
  await page.goto(`/admin?q=${encodeURIComponent(prefix)}`);
  await waitForHydration(page);
  await entranceDone(page);
  await deleteViaDrawer(row("B"));
  deletes.length = 0;
  await page.clock.runFor(2000);
  expect(deletes).toEqual([]);
  await deleteViaDrawer(row("C"));
  await expect.poll(() => deletes).toEqual([ids.B]);
  await expect(undoToast(page)).toHaveText(`已删除《${prefix} C》撤销`);
  // 时钟不暂停（动画要播放），断言留出真实流逝的余量
  await page.clock.runFor(5000);
  expect(deletes).toEqual([ids.B]);
  await page.clock.runFor(1100);
  await expect.poll(() => deletes).toEqual([ids.B, ids.C]);
});

// [TC-US09-15][SC-DELETE-08] 撤销期内关闭标签页：请求随页面卸载发出（Chromium 验证 keepalive）
test("[TC-US09-15] 撤销期内关闭标签页仍删除", async ({ page, context, baseURL, browserName }) => {
  test.skip(browserName !== "chromium", "关标签页场景只在 Chromium 下验证（TC-US09-15）");
  const { ids, row } = await openList(page, baseURL!, "X", ["B"]);
  await deleteViaDrawer(row("B"));
  await page.close({ runBeforeUnload: true });
  const other = await context.newPage();
  await expect.poll(async () => (await other.request.get(`${baseURL}/api/admin/posts/${ids.B}`)).status()).toBe(404);
});

// [TC-US09-05][SC-DELETE-06] 删除请求失败（500 / 中断）：行回到原位、数量恢复、常驻错误提示；取消拦截后重试成功
test("[TC-US09-05] 列表删除失败时原位恢复并提示", async ({ page, baseURL }) => {
  const { prefix, ids, row } = await openList(page, baseURL!, "F", ["Keep", "Old Post", "Top"], { clock: true }); // 顺序 Top、Old Post、Keep
  const order = await rowNames(page);
  const before = await total(page);

  for (const fail of ["500", "abort"] as const) {
    await page.route(`**/api/admin/posts/${ids["Old Post"]}`, (route) =>
      route.request().method() !== "DELETE" ? route.fallback() : fail === "500" ? route.fulfill({ status: 500 }) : route.abort(),
    );
    await entranceDone(page);
    await drag(page, row("Old Post"), "full");
    await expect(row("Old Post")).toHaveCount(0);
    await page.clock.runFor(6000);
    const error = page.getByRole("alert").filter({ hasText: `删除《${prefix} Old Post》失败，请重试` });
    await expect(error).toBeVisible();
    await expect.poll(() => rowNames(page)).toEqual(order);
    await expect.poll(() => total(page)).toBe(before);
    await page.clock.runFor(30_000);
    await expect(error).toBeVisible(); // 常驻
    await error.getByRole("button", { name: "关闭提示" }).click();
    await page.unroute(`**/api/admin/posts/${ids["Old Post"]}`);
  }

  await entranceDone(page);
  await deleteViaDrawer(row("Old Post"));
  await page.clock.runFor(6000);
  await expect.poll(async () => (await page.request.get(`/api/admin/posts/${ids["Old Post"]}`)).status()).toBe(404);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

// [TC-US09-13][SC-DELETE-01] 删除后补位：第 2 页唯一一篇删掉后回到第 1 页（20 篇、无分页）；
// 搜索结果里唯一一篇删掉后显示无结果提示（共享 D1 下无法造"全部删完"，空状态"还没有文章"由单元测试覆盖）
test("[TC-US09-13] 删除后分页与空状态联动", async ({ page, baseURL }, testInfo) => {
  const token = `g${Date.now().toString(36)}${testInfo.project.name[0]}`;
  const api = adminApi(page, baseURL!);
  await login(page);
  const first = await api.create({ title: `${token}-a 最早` }); // 按更新时间倒序：最早的一篇在第 2 页
  for (let i = 1; i <= 20; i++) await api.create({ title: `${token}-a 第 ${i} 篇` });
  const solo = await api.create({ title: `${token}-solo` });
  await page.clock.install();

  await page.goto(`/admin?q=${token}-a&page=2`);
  await waitForHydration(page);
  await entranceDone(page);
  await expect(page.getByRole("listitem")).toHaveCount(1);
  await deleteViaDrawer(page.getByRole("group", { name: `《${token}-a 最早》` }));
  await page.clock.runFor(6000);
  await expect(page).not.toHaveURL(/page=2/);
  await expect(page.getByRole("listitem")).toHaveCount(20);
  await expect(page.getByRole("navigation", { name: "分页" })).toHaveCount(0);
  expect((await page.request.get(`/api/admin/posts/${first}`)).status()).toBe(404);

  await page.goto(`/admin?q=${token}-solo`);
  await waitForHydration(page);
  await entranceDone(page);
  await deleteViaDrawer(page.getByRole("group", { name: `《${token}-solo》` }));
  await expect(page.getByRole("status").filter({ hasText: `没有标题包含“${token}-solo”的文章` })).toBeVisible();
  await page.clock.runFor(6000);
  await expect.poll(async () => (await page.request.get(`/api/admin/posts/${solo}`)).status()).toBe(404);
  await expect(page.getByRole("status").filter({ hasText: `没有标题包含“${token}-solo”的文章` })).toBeVisible();
});
