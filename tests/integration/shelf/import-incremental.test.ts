import { beforeEach, describe, expect, it } from "vitest";
import { entryOf, fakeDouban, FIXTURES, makeImport, req, resetShelf, seedEntry, seedWatermark, UID, W, watermarkOf } from "./import-fixtures";
import { NOW } from "./shelf-fixtures";

// 增量同步与同步状态（ADR-014 §1.1，迁移 0006 shelf_import_state）：真实 D1
beforeEach(resetShelf);

const HEAD = "2026-10-25 21:10:00"; // interests-movie-done-incr 第一条
const S2 = "2026-10-22 00:00:00";

describe("增量同步", () => {
  // [TC-US04-18][SC-IMPORT-22][SC-IMPORT-23] 晚于水位 ×3 新增；= 水位已有覆盖、没有新增；更早不处理；只请求 1 页
  it("增量截断与同一秒", async () => {
    await seedWatermark("movie", W);
    await seedWatermark("series", W);
    await seedEntry({ type: "series", douban_id: "30513783", douban_url: "https://movie.douban.com/subject/30513783/" });
    const { fetchImpl, lists } = fakeDouban({ "movie·done·0": FIXTURES.movieDoneIncr });
    const res = await makeImport(fetchImpl).page(req({ mode: "incremental" }));
    expect([res.body?.created, res.body?.updated, res.body?.nextStart, res.body?.head, lists().length, await entryOf("36367195")]).toEqual([4, 1, null, HEAD, 1, null]);
    expect([await watermarkOf("movie"), await watermarkOf("series")].map((w) => [w?.watermark, w?.syncedAt])).toEqual([[HEAD, NOW.toISOString()], [HEAD, NOW.toISOString()]]);
  });

  // [TC-US04-19][SC-IMPORT-24][SC-IMPORT-14] 水位前移（状态转换）
  it("全量 3 页：末页前移为第 1 页 head；中途失败不前移", async () => {
    const pages = { "movie·done·0": FIXTURES.movieDone, "movie·done·20": FIXTURES.movieDoneP2, "movie·done·40": FIXTURES.movieDoneP3 };
    const ok = makeImport(fakeDouban(pages).fetchImpl);
    const p1 = await ok.page(req());
    const midway = await watermarkOf("movie");
    await ok.page(req({ start: 20, head: p1.body?.head }));
    await ok.page(req({ start: 40, head: p1.body?.head }));
    expect([midway?.watermark, midway?.syncedAt, (await watermarkOf("movie"))?.watermark, (await watermarkOf("series"))?.syncedAt]).toEqual([null, null, W, NOW.toISOString()]);

    await resetShelf();
    const failing = makeImport(fakeDouban({ ...pages, "movie·done·20": new Response("busy", { status: 503 }) }).fetchImpl);
    const first = await failing.page(req());
    const second = await failing.page(req({ start: 20, head: first.body?.head }));
    expect([second.status, second.body?.error.code, (await watermarkOf("movie"))?.watermark, (await watermarkOf("movie"))?.syncedAt]).toEqual([502, "FETCH_FAILED", null, null]);
  });

  it("增量未到水位后停止：水位不变；豆瓣该类为空：水位仍空、syncedAt 刷新", async () => {
    await seedWatermark("movie", "2020-01-01 00:00:00");
    await seedWatermark("series", "2020-01-01 00:00:00");
    const api = makeImport(fakeDouban({ "movie·done·0": FIXTURES.movieDone }).fetchImpl);
    const res = await api.page(req({ mode: "incremental" }));
    const empty = await api.page(req({ status: "doing", types: ["movie"] }));
    expect([res.body?.nextStart, (await watermarkOf("movie"))?.watermark, empty.body?.head, (await watermarkOf("movie", "doing"))?.watermark, (await watermarkOf("movie", "doing"))?.syncedAt]).toEqual([
      20, "2020-01-01 00:00:00", null, null, NOW.toISOString(),
    ]);
  });

  // [TC-US04-20][SC-IMPORT-25] 只有影视有水位：书·读过增量按全量处理
  it("无水位按全量", async () => {
    await seedWatermark("movie", W);
    await seedWatermark("series", W);
    const book = { ...FIXTURES.bookDone, total: 45 };
    const res = await makeImport(fakeDouban({ "book·done·0": book }).fetchImpl).page(req({ kind: "book", types: ["book", "comic"], mode: "incremental" }));
    expect([res.body?.nextStart, res.body?.created]).toEqual([20, 4]);
  });

  // [TC-US04-21][SC-IMPORT-26] 在看改看过
  it("在看改看过", async () => {
    await seedWatermark("movie", "2026-10-20 00:00:00");
    await seedWatermark("series", "2026-10-20 00:00:00");
    await seedEntry({ type: "series", douban_id: "36189165", douban_url: "https://movie.douban.com/subject/36189165/", status: "in_progress", marked_on: "2026-08-23" });
    const res = await makeImport(fakeDouban({ "movie·done·0": FIXTURES.movieDoneDoing2Done }).fetchImpl).page(req({ mode: "incremental" }));
    const row = await entryOf("36189165");
    expect([res.body?.created, res.body?.updated, row?.status, row?.marked_on, row?.rating]).toEqual([0, 1, "completed", "2026-10-26", 5]);
  });

  // [TC-US04-25][SC-IMPORT-29][SC-IMPORT-24][SC-IMPORT-25] 类别 × 状态水位
  it.each([
    ["电影 W1、剧集无，只勾电影", { movie: W }, ["movie"], "incremental", 3, null, { movie: HEAD, series: null }],
    ["电影 W1、剧集无，勾两者 → 不截断", { movie: W }, ["movie", "series"], "incremental", 6, 20, { movie: W, series: null }],
    ["两者都有 → 按较早的 W1", { movie: W, series: S2 }, ["movie", "series"], "incremental", 5, null, { movie: HEAD, series: HEAD }],
    ["只勾剧集 → 按 W2，电影不变", { movie: W, series: S2 }, ["series"], "incremental", 1, null, { movie: W, series: HEAD }],
  ])("%s", async (_, seed, types, mode, written, nextStart, after) => {
    for (const [type, watermark] of Object.entries(seed)) await seedWatermark(type, watermark);
    const res = await makeImport(fakeDouban({ "movie·done·0": FIXTURES.movieDoneIncr }).fetchImpl).page(req({ mode, types }));
    expect([res.body!.created + res.body!.updated, res.body?.nextStart]).toEqual([written, nextStart]);
    expect({ movie: (await watermarkOf("movie"))?.watermark ?? null, series: (await watermarkOf("series"))?.watermark ?? null }).toEqual(after);
  });

  it("电影 W1 全量翻完 → 电影前移；未勾选的剧集 attempted_at 不更新", async () => {
    await seedWatermark("movie", W);
    await seedWatermark("series", S2);
    await makeImport(fakeDouban({ "movie·done·40": FIXTURES.movieDoneP3 }).fetchImpl).page(req({ types: ["movie"], start: 40, head: HEAD }));
    expect([(await watermarkOf("movie"))?.watermark, (await watermarkOf("movie"))?.attemptedAt, (await watermarkOf("series"))?.attemptedAt]).toEqual([HEAD, NOW.toISOString(), "2026-10-20T13:00:00.000Z"]);
  });
});

describe("同步状态接口", () => {
  // [TC-US04-22][SC-IMPORT-27][SC-IMPORT-01]
  it("无记录 / 已同步 / 换 ID / 指定 uid / 非法 uid", async () => {
    const api = makeImport(fakeDouban().fetchImpl);
    const none = await api.state();
    const order = ["movie", "series", "book", "comic", "game", "boardgame"].flatMap((type) => ["done", "doing"].map((status) => `${type}·${status}`));
    for (const [i, type] of ["movie", "series", "book", "comic", "game", "boardgame"].entries()) {
      await seedWatermark(type, `2026-10-1${i} 08:00:00`, "done");
      await seedWatermark(type, `2026-09-1${i} 08:00:00`, "doing");
    }
    const synced = await api.state();
    await api.page(req({ uid: "ahbei" }));
    const switched = await api.state();
    const named = await api.state(UID);
    const bad = await api.state("a/b");
    expect([none.status, none.body?.uid, none.body?.categories.length, none.body?.categories.every((c: { watermark: null; syncedAt: null }) => c.watermark === null && c.syncedAt === null)]).toEqual([200, null, 12, true]);
    expect([synced.body?.uid, synced.body?.categories.map((c: { type: string; status: string }) => `${c.type}·${c.status}`), synced.body?.categories[0]]).toEqual([
      UID, order, { type: "movie", status: "done", watermark: "2026-10-10 08:00:00", syncedAt: "2026-10-23T13:30:00.000Z" },
    ]);
    expect([switched.body?.uid, switched.body?.categories.every((c: { watermark: null }) => c.watermark === null)]).toEqual(["ahbei", true]);
    expect([named.body?.uid, named.body?.categories[11].watermark]).toEqual([UID, "2026-09-15 08:00:00"]);
    expect([bad.status, bad.body?.error.code]).toEqual([400, "VALIDATION_FAILED"]);
  });
});
