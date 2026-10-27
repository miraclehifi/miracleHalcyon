import { expect, test, type Page, type Route } from "@playwright/test";
import { login } from "./support/admin";
import { waitForHydration } from "./support/hydration";

// F-005 US-04 从豆瓣导入（admin-media.md"从豆瓣导入"，设计稿 11i）。导入 / 状态 / 结束接口全部 page.route 打桩，不写真实数据
test.use({ timezoneId: "Asia/Shanghai" });

const TYPES = ["movie", "series", "book", "comic", "game", "boardgame"];
type Category = { type: string; status: string; watermark: string | null; syncedAt: string | null };
const categories = (sync: Record<string, string> = {}): Category[] =>
  TYPES.flatMap((type) => ["done", "doing"].map((status) => ({ type, status, watermark: sync[type] ? "2026-10-18 08:25:08" : null, syncedAt: sync[type] ?? null })));
const result = (extra: Record<string, unknown> = {}) => ({ total: 20, head: "2026-10-18 08:25:08", nextStart: null, created: 0, updated: 0, coverFailed: 0, failed: [], ...extra });
const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

type Body = { uid: string; kind: string; status: string; types: string[]; mode: string; start: number; head?: string };

async function stubImport(page: Page, opts: { state: { uid: string | null; categories: Category[] }; page?: (body: Body, n: number) => Promise<unknown> | unknown; error?: (body: Body, n: number) => [number, string] | null }) {
  const bodies: Body[] = [];
  const calls = { finish: 0, state: 0 };
  let state = opts.state;
  await page.route((url) => url.pathname === "/api/admin/shelf/import/state", (route) => {
    calls.state++;
    return json(route, state);
  });
  await page.route((url) => url.pathname === "/api/admin/shelf/import/finish", (route) => {
    calls.finish++;
    return route.fulfill({ status: 204 });
  });
  await page.route((url) => url.pathname === "/api/admin/shelf/import", async (route) => {
    const body = route.request().postDataJSON() as Body;
    bodies.push(body);
    const error = opts.error?.(body, bodies.length);
    if (error) return json(route, { error: { code: error[1], message: "x" } }, error[0]);
    return json(route, (await opts.page?.(body, bodies.length)) ?? result({ created: 1 }));
  });
  return { bodies, calls, setState: (next: typeof state) => (state = next) };
}

async function openDialog(page: Page) {
  await login(page);
  await page.goto("/admin/media");
  await waitForHydration(page);
  await page.getByRole("button", { name: "从豆瓣导入" }).click();
  return page.getByRole("dialog", { name: "从豆瓣导入" });
}

const SYNCED = "2026-10-23T13:30:00.000Z"; // 北京时间 10-23 21:30

test("[TC-US04-14][SC-IMPORT-01][SC-IMPORT-02] 面板初始态与 ID 校验", async ({ page }) => {
  await stubImport(page, { state: { uid: "189806038", categories: categories() } });
  const dialog = await openDialog(page);
  const input = dialog.getByLabel("豆瓣用户 ID");
  await expect(input).toHaveValue("189806038");
  await expect(dialog.getByRole("checkbox")).toHaveCount(6);
  for (const box of await dialog.getByRole("checkbox").all()) await expect(box).toBeChecked();
  await expect(dialog.getByText("未同步")).toHaveCount(6);
  await expect(dialog.getByRole("button", { name: "同步新标记" })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "全量导入" })).toBeEnabled();
  await input.fill("");
  await expect(dialog.getByRole("button", { name: "全量导入" })).toBeDisabled();
  await input.fill("abc/../x");
  await expect(dialog.getByText("用户 ID 只能包含字母、数字、下划线、点和短横线")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "全量导入" })).toBeDisabled();
});

test("[TC-US04-15][SC-IMPORT-12][SC-IMPORT-16] 进度、汇总与列表刷新", async ({ page }) => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => (release = resolve));
  const stub = await stubImport(page, {
    state: { uid: "189806038", categories: categories() },
    page: async (body) => {
      if (body.kind === "movie" && body.status === "done" && body.start === 0) return result({ total: 40, nextStart: 20, created: 15, updated: 5 });
      if (body.kind === "movie" && body.status === "done") {
        await gate;
        return result({ total: 40, created: 10, updated: 2, coverFailed: 1 });
      }
      return result({ created: 1 });
    },
  });
  const dialog = await openDialog(page);
  await dialog.getByRole("button", { name: "全量导入" }).click();
  await expect(dialog.getByText(/影视 · 看过 20 \/ 40/)).toBeVisible();
  await expect(dialog.getByLabel("豆瓣用户 ID")).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "停止" })).toBeEnabled();
  await expect(dialog.getByRole("button", { name: "全量导入" })).toHaveCount(0);
  release();
  await expect(dialog.getByText("导入完成：新增 30、更新 7、失败 0、封面失败 1")).toBeVisible();
  expect(stub.bodies.map((b) => `${b.kind}·${b.status}·${b.start}`)).toEqual(["movie·done·0", "movie·done·20", "movie·doing·0", "book·done·0", "book·doing·0", "game·done·0", "game·doing·0"]);
  expect(stub.bodies[1].head).toBe("2026-10-18 08:25:08");
  expect(stub.calls.finish).toBe(1);
  await expect(page.getByText("读者页将在重建后更新")).toBeVisible();
  const reloaded = page.waitForEvent("load");
  await dialog.getByRole("button", { name: "关闭", exact: true }).click();
  await reloaded;
});

test("[TC-US04-16][SC-IMPORT-15] 停止导入", async ({ page }) => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => (release = resolve));
  const stub = await stubImport(page, {
    state: { uid: "189806038", categories: categories() },
    page: async () => {
      await gate;
      return result({ total: 614, nextStart: 20, created: 20 });
    },
  });
  const dialog = await openDialog(page);
  await dialog.getByRole("button", { name: "全量导入" }).click();
  await dialog.getByRole("button", { name: "停止" }).click();
  await expect(dialog.getByRole("button", { name: "正在停止…" })).toBeDisabled();
  release();
  await expect(dialog.getByText("已停止：新增 20、更新 0、失败 0、封面失败 0")).toBeVisible();
  expect([stub.bodies.length, stub.calls.finish]).toEqual([1, 1]);
});

test("[TC-US04-17][SC-IMPORT-13][SC-IMPORT-17][SC-IMPORT-18][SC-IMPORT-19] 失败列表与错误提示", async ({ page }) => {
  const stage: { now: "failed" | "error" | "502"; error: [number, string] | null } = { now: "failed", error: null };
  const stub = await stubImport(page, {
    state: { uid: "189806038", categories: categories() },
    page: (body) =>
      stage.now === "failed" ? result({ created: 1, failed: body.status === "done" ? [{ doubanId: "1", title: null, reason: "PARSE_FAILED" }] : [] }) : result({ total: 40, nextStart: 20, created: 1 }),
    error: (body) => (stage.now === "error" ? stage.error : stage.now === "502" && body.start === 20 ? [502, "FETCH_FAILED"] : null),
  });
  const dialog = await openDialog(page);
  for (const box of (await dialog.getByRole("checkbox").all()).slice(1)) await box.uncheck();
  await dialog.getByRole("button", { name: "全量导入" }).click();
  await expect(dialog.getByText("豆瓣 1：解析不出条目信息")).toBeVisible();

  for (const [code, status, message] of [["DOUBAN_USER_NOT_FOUND", 404, "豆瓣上找不到这个用户"], ["DOUBAN_FORBIDDEN", 403, "豆瓣标记未公开或需要登录，无法导入"]] as const) {
    stage.now = "error";
    stage.error = [status, code];
    const finishBefore = stub.calls.finish;
    await dialog.getByRole("button", { name: "全量导入" }).click();
    await expect(dialog.getByRole("alert")).toHaveText(message);
    expect(stub.calls.finish).toBe(finishBefore);
  }

  stage.now = "502";
  const finishBefore = stub.calls.finish;
  await dialog.getByRole("button", { name: "全量导入" }).click(); // 第 1 页成功、第 2 页 502
  await expect(dialog.getByRole("alert")).toHaveText("豆瓣暂时无法访问，已导入的条目已保存，可稍后重新导入");
  expect(stub.calls.finish).toBe(finishBefore + 1);
});

test("[TC-US04-23][SC-IMPORT-01][SC-IMPORT-12][SC-IMPORT-22] 增量模式：按钮、进度、汇总", async ({ page }) => {
  const stub = await stubImport(page, {
    state: { uid: "189806038", categories: categories(Object.fromEntries(TYPES.map((t) => [t, SYNCED]))) },
    page: (body) => result({ created: body.kind === "movie" && body.status === "done" ? 3 : 0 }),
  });
  const dialog = await openDialog(page);
  await expect(dialog.getByText("10-23 21:30")).toHaveCount(6);
  await expect(dialog.getByRole("button", { name: "全量导入" })).toBeVisible();
  stub.setState({ uid: "189806038", categories: categories(Object.fromEntries(TYPES.map((t) => [t, "2026-10-27T04:00:00.000Z"]))) });
  await dialog.getByRole("button", { name: "同步新标记" }).click();
  await expect(dialog.getByText("同步完成：新增 3、更新 0、失败 0、封面失败 0")).toBeVisible();
  expect(stub.bodies.every((b) => b.mode === "incremental" && b.start === 0)).toBe(true);
  expect(stub.calls.finish).toBe(1);
  await expect(dialog.getByText("10-27 12:00")).toHaveCount(6); // 完成后重新拉取同步状态
  await dialog.getByRole("button", { name: "全量导入" }).click();
  await expect(dialog.getByText(/导入完成：/)).toBeVisible();
  expect(stub.bodies.at(-1)?.mode).toBe("full");
});

test("[TC-US04-26][SC-IMPORT-01][SC-IMPORT-02][SC-IMPORT-28] 类别勾选", async ({ page }) => {
  const sync = categories({ movie: SYNCED, comic: "2026-10-20T01:05:00.000Z" });
  const stub = await stubImport(page, { state: { uid: "189806038", categories: sync }, page: () => result() }); // 无变更：关闭后不刷新页面
  const dialog = await openDialog(page);
  await expect(dialog.getByRole("checkbox", { name: /电影/ })).toBeChecked();
  await expect(dialog.getByText("10-23 21:30")).toHaveCount(1);
  await expect(dialog.getByText("10-20 09:05")).toHaveCount(1);
  await expect(dialog.getByText("未同步")).toHaveCount(4);
  for (const name of ["剧集", "书", "漫画", "游戏", "桌游"]) await dialog.getByRole("checkbox", { name: new RegExp(`^${name}`) }).uncheck();
  await dialog.getByRole("button", { name: "同步新标记" }).click();
  await expect(dialog.getByText(/同步完成：/)).toBeVisible();
  expect(stub.bodies.map((b) => [b.kind, b.status, b.types.join()])).toEqual([["movie", "done", "movie"], ["movie", "doing", "movie"]]);
  await dialog.getByRole("checkbox", { name: /电影/ }).uncheck();
  await expect(dialog.getByText("至少选择一个类别")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "全量导入" })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "再次同步" })).toBeDisabled();
  await dialog.getByRole("button", { name: "关闭", exact: true }).click();
  await page.getByRole("button", { name: "从豆瓣导入" }).click();
  for (const box of await dialog.getByRole("checkbox").all()) await expect(box).toBeChecked();
});
