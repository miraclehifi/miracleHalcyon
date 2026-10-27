import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { entryCount, entryOf, fakeDouban, FIXTURES, makeImport, req, resetShelf, seedEntry, TAGS_FAIL, W } from "./import-fixtures";
import { NOW } from "./shelf-fixtures";

// POST /api/admin/shelf/import、/import/finish（api-contract"导入"，ADR-014）：真实 D1 / R2，fetch 返回 interests-* 夹具
beforeEach(resetShelf);

describe("导入一页：映射", () => {
  // [TC-US04-01][SC-IMPORT-03][SC-IMPORT-07] 影视：电影 / 剧集、状态、评分、日期、短评；在看页
  it("影视看过与在看", async () => {
    const { fetchImpl } = fakeDouban({ "movie·done·0": FIXTURES.movieDone, "movie·doing·0": FIXTURES.movieDoing });
    const api = makeImport(fetchImpl);
    const done = await api.page(req());
    const doing = await api.page(req({ status: "doing" }));
    const film = await entryOf("25765735");
    expect([done.status, done.body?.created, done.body?.updated, doing.body?.created]).toEqual([200, 3, 0, 1]);
    expect(film).toMatchObject({
      type: "movie", title: "金刚狼3：殊死一战", creator: "詹姆斯·曼高德", year: 2017, status: "completed", rating: 4, marked_on: "2026-06-12",
      douban_url: "https://movie.douban.com/subject/25765735/", hidden: 0, platform: null,
    });
    expect(film?.comment).toMatch(/^大学时漫威电影课放映/);
    expect([(await entryOf("30513783"))?.type, (await entryOf("30513783"))?.comment, (await entryOf("25786060"))?.rating]).toEqual(["series", null, null]);
    expect([(await entryOf("36189165"))?.type, (await entryOf("36189165"))?.status]).toEqual(["series", "in_progress"]);
  });

  // [TC-US04-02][SC-IMPORT-04] 书：作者去国籍、pubdate 年份、空 pubdate、漫画
  it("书", async () => {
    const { fetchImpl } = fakeDouban({ "book·done·0": FIXTURES.bookDone });
    const res = await makeImport(fetchImpl).page(req({ kind: "book", types: ["book", "comic"] }));
    expect(res.body?.created).toBe(4);
    expect([
      (await entryOf("10594787"))?.creator, (await entryOf("10594787"))?.year, (await entryOf("36667314"))?.year, (await entryOf("35053236"))?.year,
      (await entryOf("36484713"))?.type, (await entryOf("10594787"))?.douban_url,
    ]).toEqual(["加西亚·马尔克斯", 2012, 2024, null, "comic", "https://book.douban.com/subject/10594787/"]);
  });

  // [TC-US04-03][SC-IMPORT-05] 游戏：平台、桌游、开发商取自游戏详情、不下载游戏封面
  it("游戏", async () => {
    const { fetchImpl, requests } = fakeDouban({ "game·done·0": FIXTURES.gameDone });
    const res = await makeImport(fetchImpl).page(req({ kind: "game", types: ["game", "boardgame"] }));
    const rows = await Promise.all(["37380017", "36087617", "37303074", "36721901", "26436096"].map(entryOf));
    expect(res.body?.created).toBe(5);
    expect(rows.map((r) => [r?.type, r?.platform, r?.cover_key, r?.cover_url])).toEqual([
      ["game", "ps5", null, null], ["game", "steam", null, null], ["game", "switch2", null, null], ["game", "ps5", null, null], ["boardgame", null, null, null],
    ]);
    expect([rows[0]?.creator, rows[0]?.year]).toEqual(["Valve Corporation", 2026]);
    expect(requests.some((r) => r.url.includes("doubanio.com"))).toBe(false);
  });

  // [TC-US04-04][TC-US04-05][SC-IMPORT-06][SC-IMPORT-13] 想看跳过、无标题进 failed，整页 200；请求 status 只为 done / doing
  it("跳过想看与单条失败", async () => {
    const { fetchImpl, lists } = fakeDouban({ "movie·done·0": FIXTURES.movieDone });
    const res = await makeImport(fetchImpl).page(req());
    expect([res.status, res.body?.failed, await entryOf("1305724"), await entryOf("1401524"), await entryCount()]).toEqual([
      200, [{ doubanId: "1401524", title: null, reason: "PARSE_FAILED" }], null, null, 3,
    ]);
    expect(lists().map((r) => new URL(r.url).searchParams.get("status"))).toEqual(["done"]);
  });
});

describe("导入一页：封面与覆盖", () => {
  // [TC-US04-06][SC-IMPORT-10] 封面存 R2；418 / 非图片 / 非豆瓣图片域 → coverFailed，条目照常写入
  it("封面", async () => {
    const page = structuredClone(FIXTURES.movieDoneP2);
    const [ok, teapot, svg] = page.interests;
    svg.subject.cover_url = "https://evil.example/a.jpg";
    svg.subject.pic = { large: "https://evil.example/a.jpg" };
    const { fetchImpl, requests } = fakeDouban({ "movie·done·20": page }, { [teapot.subject.cover_url]: () => new Response("", { status: 418 }) });
    const res = await makeImport(fetchImpl).page(req({ start: 20, head: W }));
    const saved = await entryOf(ok.subject.id);
    expect([res.body?.created, res.body?.coverFailed, saved?.cover_key?.startsWith("covers/2026/10/"), (await entryOf(teapot.subject.id))?.cover_key, (await entryOf(svg.subject.id))?.cover_key]).toEqual([3, 2, true, null, null]);
    expect(await env.MEDIA.head(saved!.cover_key!)).not.toBeNull();
    expect(requests.some((r) => r.url.includes("evil.example"))).toBe(false);
  });

  // [TC-US04-07][SC-IMPORT-08][SC-IMPORT-09][SC-IMPORT-14] 覆盖已有（doing / 无评分 → done / 有评分），hidden、封面、IGDB 封面不动；重复导入幂等
  it("覆盖已有条目与幂等", async () => {
    const hidden = await seedEntry({ type: "movie", douban_id: "25765735", douban_url: "https://movie.douban.com/subject/25765735/", hidden: 1, cover_key: "covers/2020/01/aaaaaaaaaaaa.jpg" });
    const igdb = "https://images.igdb.com/igdb/image/upload/t_1080p/co8h3y.jpg";
    await seedEntry({ type: "game", douban_id: "36721901", douban_url: "https://www.douban.com/game/36721901/", creator: "Sucker Punch", platform: "ps4", cover_url: igdb, cover_width: 810, cover_height: 1080 });
    const movie = fakeDouban({ "movie·done·0": FIXTURES.movieDone });
    const game = fakeDouban({ "game·done·0": FIXTURES.gameDone }, { [`https://m.douban.com/rexxar/api/v2/game/`]: () => new Response("x", { status: 500 }) });
    const first = await makeImport(movie.fetchImpl).page(req());
    await makeImport(game.fetchImpl).page(req({ kind: "game", types: ["game", "boardgame"] }));
    const again = await makeImport(movie.fetchImpl).page(req());
    const updated = await entryOf("25765735");
    const keptGame = await entryOf("36721901");
    expect([first.body?.created, first.body?.updated, again.body?.created, again.body?.updated]).toEqual([2, 1, 0, 3]);
    expect([updated?.id, updated?.status, updated?.rating, updated?.hidden, updated?.cover_key, updated?.created_at, updated?.updated_at, updated?.title]).toEqual([
      hidden.id, "completed", 4, 1, "covers/2020/01/aaaaaaaaaaaa.jpg", "2020-01-01T00:00:00.000Z", NOW.toISOString(), "金刚狼3：殊死一战",
    ]);
    expect(movie.requests.filter((r) => r.url.includes("doubanio.com")).length).toBe(2); // 已有条目不下载封面；第二次全是覆盖
    expect([keptGame?.creator, keptGame?.platform, keptGame?.cover_url, keptGame?.cover_width, keptGame?.status]).toEqual(["Sucker Punch", "ps4", igdb, 810, "completed"]);
    const { results } = await env.DB.prepare("SELECT douban_id, COUNT(*) AS n FROM shelf_entries GROUP BY douban_id HAVING n > 1").all();
    expect(results).toEqual([]);
  });
});

describe("分页、类别与重建", () => {
  // [TC-US04-08][SC-IMPORT-11] 按请求条数前进；count 固定 20；total 原样
  it("分页边界", async () => {
    const { fetchImpl, lists } = fakeDouban({ "movie·done·0": FIXTURES.movieDone, "movie·done·20": FIXTURES.movieDoneP2, "movie·done·40": FIXTURES.movieDoneP3 });
    const api = makeImport(fetchImpl);
    const p1 = await api.page(req());
    const p2 = await api.page(req({ start: 20, head: p1.body?.head }));
    const p3 = await api.page(req({ start: 40, head: p1.body?.head }));
    const empty = await api.page(req({ status: "doing" }));
    expect([p1.body?.nextStart, p2.body?.nextStart, p3.body?.nextStart, p3.body?.total, empty.body?.nextStart, empty.body?.created]).toEqual([20, 40, null, 45, null, 0]);
    expect(lists().map((r) => new URL(r.url).searchParams.get("count"))).toEqual(["20", "20", "20", "20"]);
  });

  // [TC-US04-24][SC-IMPORT-28][SC-IMPORT-30] 按类别过滤写入（决策表）
  it.each([
    ["movie", ["movie"], 12], ["movie", ["series"], 8], ["movie", ["movie", "series"], 20], ["book", ["comic"], 3], ["book", ["book"], 16],
  ])("%s / %j → created %d", async (kind, types, created) => {
    const { fetchImpl, requests } = fakeDouban({ "movie·done·0": FIXTURES.movieDoneMixed, "book·done·0": FIXTURES.bookDoneManga });
    const res = await makeImport(fetchImpl).page(req({ kind, types }));
    const failed = kind === "book" ? [{ doubanId: TAGS_FAIL, title: "降り積もれ孤独な死よ (3)", reason: "FETCH_FAILED" }] : []; // tags 失败不按书写入
    expect([res.body?.created, res.body?.failed, await entryCount(), requests.filter((r) => r.url.includes("doubanio.com")).length]).toEqual([created, failed, created, created]);
    if (kind === "book") expect(requests.filter((r) => r.url.endsWith("/tags")).length).toBe(20);
  });

  it("未勾选类别的已有条目不变", async () => {
    await seedEntry({ type: "series", douban_id: "30513783", douban_url: "https://movie.douban.com/subject/30513783/", title: "本站标题" });
    const { fetchImpl } = fakeDouban({ "movie·done·0": FIXTURES.movieDoneMixed });
    await makeImport(fetchImpl).page(req({ types: ["movie"] }));
    expect([(await entryOf("30513783"))?.title, (await entryOf("30513783"))?.updated_at]).toEqual(["本站标题", "2020-01-01T00:00:00.000Z"]);
  });

  // [TC-US04-09][SC-IMPORT-16] 导入接口不触发重建；finish changed > 0 触发一次
  it("只在结束时触发一次重建", async () => {
    const { fetchImpl } = fakeDouban({ "movie·done·0": FIXTURES.movieDone });
    const api = makeImport(fetchImpl);
    await api.page(req());
    const afterImport = api.hookCalls.n;
    const results = [await api.finish({ changed: 3 }), await api.finish({ changed: 0 }), await api.finish({ changed: -1 }), await api.finish("{bad")];
    expect([afterImport, api.hookCalls.n, results.map((r) => [r.status, r.body?.error?.code ?? null])]).toEqual([
      0, 1, [[204, null], [204, null], [400, "VALIDATION_FAILED"], [400, "BAD_REQUEST"]],
    ]);
  });
});
