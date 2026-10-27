import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CoverStore } from "../../../src/domains/shelf/cover-store";
import type { DoubanClient, InterestQuery } from "../../../src/domains/shelf/douban/client";
import type { ShelfType } from "../../../src/domains/shelf/entry";
import {
  DoubanFetchError, DoubanForbiddenError, DoubanUserNotFoundError, DuplicateDoubanError, ImportError, ShelfValidationError,
} from "../../../src/domains/shelf/errors";
import type { ImportStateRepo, ImportCategoryState } from "../../../src/domains/shelf/import-state-repo";
import type { ShelfEntry, ShelfRepo } from "../../../src/domains/shelf/repo";
import { createShelfService } from "../../../src/domains/shelf/service";

// SHELF-UT-18–22：导入一页、结束、同步状态（替身 client / repo / stateRepo / store / hooks）
const NOW = new Date("2026-10-27T12:00:00.000Z");
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const UID = "189806038";
const W = "2026-10-18 08:25:08";
const load = (name: string) => JSON.parse(readFileSync(`tests/fixtures/douban/${name}.json`, "utf8"));
const MANGA = ["36484713", "36265242", "36145936"];
const TAGS_FAIL = "35929511"; // 标签请求失败 → 单条 FETCH_FAILED（不按书写入，免得漫画被写成书）
const TAGS_FAILED = [{ doubanId: TAGS_FAIL, title: "降り積もれ孤独な死よ (3)", reason: "FETCH_FAILED" }];

type Row = ShelfEntry;

function fakeRepo(seed: Partial<Row>[] = []) {
  const rows = new Map<number, Row>();
  let seq = 0;
  const conflictOnce = new Set<string>();
  for (const s of seed) {
    const row = { type: "movie", title: "旧", creator: null, year: null, status: "in_progress", rating: null, markedOn: "2020-01-01", comment: null, douban: null, platform: null, coverUrl: null, coverWidth: null, coverHeight: null, coverKey: null, hidden: false, createdAt: "2020-01-01T00:00:00.000Z", updatedAt: "2020-01-01T00:00:00.000Z", ...s, id: ++seq } as Row;
    rows.set(row.id, row);
  }
  const repo = {
    rows,
    conflictOnce,
    findByDoubanIds: vi.fn(async (ids: string[]) => new Map([...rows.values()].filter((r) => r.douban && ids.includes(r.douban.id)).map((r) => [r.douban!.id, r]))),
    insert: vi.fn(async (data: Row & { now: string }) => {
      const id = data.douban?.id;
      if (id && conflictOnce.delete(id)) {
        rows.set(++seq, { ...data, id: seq, hidden: false, createdAt: data.now, updatedAt: data.now }); // 并发写入者先插入
        throw new DuplicateDoubanError(null);
      }
      const row = { ...data, id: ++seq, hidden: false, createdAt: data.now, updatedAt: data.now } as Row;
      rows.set(row.id, row);
      return row;
    }),
    update: vi.fn(async (id: number, data: Row & { now: string }) => {
      const old = rows.get(id);
      if (!old) return null;
      const row = { ...old, ...data, id, updatedAt: data.now } as Row;
      rows.set(id, row);
      return row;
    }),
  };
  return repo as typeof repo & ShelfRepo;
}

function fakeStore() {
  const objects = new Map<string, string>();
  return {
    objects,
    put: vi.fn(async (key: string, _bytes: Uint8Array, type: string) => void objects.set(key, type)),
    get: async () => null,
    delete: vi.fn(async (key: string) => void objects.delete(key)),
  } satisfies CoverStore & { objects: Map<string, string> };
}

function fakeStateRepo(seed: Record<string, string> = {}) {
  const rows = new Map<string, { watermark: string | null; syncedAt: string | null; attemptedAt: string }>();
  for (const [key, watermark] of Object.entries(seed)) rows.set(`${UID}|${key}`, { watermark, syncedAt: "2026-10-23T13:30:00.000Z", attemptedAt: "2026-10-23T13:00:00.000Z" });
  const repo = {
    rows,
    get: vi.fn(async (uid: string) => {
      const out: ImportCategoryState[] = [];
      for (const type of ["movie", "series", "book", "comic", "game", "boardgame"] as ShelfType[])
        for (const status of ["done", "doing"] as const) {
          const row = rows.get(`${uid}|${type}|${status}`);
          out.push({ type, status, watermark: row?.watermark ?? null, syncedAt: row?.syncedAt ?? null });
        }
      return out;
    }),
    lastUid: vi.fn(async () => [...rows.entries()].sort((a, b) => (a[1].attemptedAt < b[1].attemptedAt ? 1 : -1))[0]?.[0].split("|")[0] ?? null),
    touch: vi.fn(async (uid: string, types: ShelfType[], status: string, now: string) => {
      for (const type of types) {
        const key = `${uid}|${type}|${status}`;
        rows.set(key, { watermark: null, syncedAt: null, ...rows.get(key), attemptedAt: now });
      }
    }),
    complete: vi.fn(async (uid: string, types: ShelfType[], status: string, head: string | null, now: string) => {
      for (const type of types) {
        const key = `${uid}|${type}|${status}`;
        const row = rows.get(key)!;
        rows.set(key, { ...row, watermark: head ?? row.watermark, syncedAt: now });
      }
    }),
  };
  return repo satisfies ImportStateRepo;
}

// 外发请求替身：按 kind·status·start 返回夹具；记录请求与最大并发
function fakeClient(pages: Record<string, unknown>, opts: { coverFail?: string[]; coverBytes?: Record<string, Uint8Array>; gameFail?: boolean; delayMs?: number } = {}) {
  const calls: string[] = [];
  const queries: InterestQuery[] = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const track = async <T>(label: string, run: () => T | Promise<T>): Promise<T> => {
    calls.push(label);
    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    try {
      if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));
      return await run();
    } finally {
      inFlight--;
    }
  };
  const client: DoubanClient = {
    fetchInterests: vi.fn((q: InterestQuery) => {
      queries.push(q);
      return track(`list:${q.kind}·${q.status}·${q.start}`, () => {
        const page = pages[`${q.kind}·${q.status}·${q.start}`];
        if (page instanceof Error) throw page;
        return page ?? { total: 0, interests: [] };
      });
    }),
    fetchBookTags: vi.fn((id: string) =>
      track(`tags:${id}`, () => {
        if (id === TAGS_FAIL) throw new DoubanFetchError("500");
        return MANGA.includes(id) ? ["漫画"] : ["小说"];
      })),
    fetchSubject: vi.fn((ref) =>
      track(`subject:${ref.kind}/${ref.id}`, () => {
        if (opts.gameFail) throw new DoubanFetchError("500");
        return load("game-video");
      })),
    fetchCover: vi.fn((url: string) =>
      track(`cover:${url}`, () => {
        if (opts.coverFail?.some((part) => url.includes(part))) throw new DoubanFetchError("418");
        return Object.entries(opts.coverBytes ?? {}).find(([part]) => url.includes(part))?.[1] ?? JPG;
      })),
  };
  return { client, calls, queries, maxInFlight: () => maxInFlight };
}

function setup(o: { pages?: Record<string, unknown>; seed?: Partial<Row>[]; state?: Record<string, string>; client?: Parameters<typeof fakeClient>[1] } = {}) {
  const repo = fakeRepo(o.seed);
  const store = fakeStore();
  const stateRepo = fakeStateRepo(o.state);
  const hooks = { onShelfChanged: vi.fn(async () => {}) };
  const douban = fakeClient(o.pages ?? {}, o.client);
  const service = createShelfService({ repo, store, hooks, douban: douban.client, stateRepo, now: () => NOW, log: () => {} });
  return { service, repo, store, stateRepo, hooks, douban };
}

const req = (extra: Record<string, unknown> = {}) => ({ uid: UID, kind: "movie", status: "done", types: ["movie", "series"], mode: "full", start: 0, ...extra });
const byDouban = (repo: ReturnType<typeof fakeRepo>, id: string) => [...repo.rows.values()].find((r) => r.douban?.id === id);
const errorOf = async (p: Promise<unknown>) => {
  try {
    await p;
    return "ok";
  } catch (error) {
    if (error instanceof ShelfValidationError) return `VALIDATION_FAILED:${error.fields.join(",")}`;
    if (error instanceof ImportError) return error.code;
    throw error;
  }
};

afterEach(() => vi.useRealTimers());

describe("importPage（SHELF-UT-18）", () => {
  // [TC-US04-01][TC-US04-04][TC-US04-05][TC-US04-07][SC-IMPORT-03][SC-IMPORT-06][SC-IMPORT-08][SC-IMPORT-09][SC-IMPORT-13] 新增与覆盖混合页
  it("新增、覆盖已有（隐藏 + 封面不动）、跳过想看、无标题进 failed、不触发钩子", async () => {
    const existing = { type: "movie", title: "旧标题", status: "in_progress", hidden: true, coverKey: "covers/2020/01/aaaaaaaaaaaa.jpg", douban: { id: "25786060", url: "https://movie.douban.com/subject/25786060/" } } as Partial<Row>;
    const { service, repo, douban, hooks } = setup({ pages: { "movie·done·0": load("interests-movie-done") }, seed: [existing] });
    const result = await service.importPage(req());
    const old = byDouban(repo, "25786060")!;
    expect(result).toEqual({ total: 45, head: W, nextStart: 20, created: 2, updated: 1, coverFailed: 0, failed: [{ doubanId: "1401524", title: null, reason: "PARSE_FAILED" }] });
    expect([old.title, old.status, old.rating, old.markedOn, old.year, old.creator, old.hidden, old.coverKey, old.createdAt, old.updatedAt]).toEqual([
      "X战警：天启", "completed", null, "2026-06-12", 2016, "布莱恩·辛格", true, "covers/2020/01/aaaaaaaaaaaa.jpg", "2020-01-01T00:00:00.000Z", NOW.toISOString(),
    ]);
    expect([byDouban(repo, "30513783")?.type, byDouban(repo, "25765735")?.coverKey, byDouban(repo, "1305724")]).toEqual(["series", expect.stringMatching(/^covers\/2026\/10\/[a-z2-7]{12}\.jpg$/), undefined]);
    expect(douban.calls.filter((c) => c.startsWith("cover:")).length).toBe(2); // 已有条目不补下载封面
    expect(hooks.onShelfChanged).not.toHaveBeenCalled();
  });

  // [TC-US04-03][TC-US04-07][SC-IMPORT-05] 游戏：平台映射、桌游、不取封面；已有游戏在详情失败、平台为空时保留开发商 / 平台 / IGDB 封面
  it("游戏与已有游戏", async () => {
    const igdb = "https://images.igdb.com/igdb/image/upload/t_1080p/co8h3y.jpg";
    const existing = { type: "game", title: "旧", creator: "Sucker Punch", platform: "ps4", coverUrl: igdb, coverWidth: 810, coverHeight: 1080, douban: { id: "36721901", url: "https://www.douban.com/game/36721901/" } } as Partial<Row>;
    const { service, repo, douban } = setup({ pages: { "game·done·0": load("interests-game-done") }, seed: [existing], client: { gameFail: true } });
    const result = await service.importPage(req({ kind: "game", types: ["game", "boardgame"] }));
    const kept = byDouban(repo, "36721901")!;
    expect([result.created, result.updated, result.failed]).toEqual([4, 1, []]);
    expect([kept.creator, kept.platform, kept.coverUrl, kept.coverWidth, kept.coverHeight, kept.status]).toEqual(["Sucker Punch", "ps4", igdb, 810, 1080, "completed"]);
    expect(["37380017", "36087617", "37303074", "26436096"].map((id) => [byDouban(repo, id)?.type, byDouban(repo, id)?.platform, byDouban(repo, id)?.coverKey])).toEqual([
      ["game", "ps5", null], ["game", "steam", null], ["game", "switch2", null], ["boardgame", null, null],
    ]);
    expect(douban.calls.some((c) => c.startsWith("cover:"))).toBe(false);
  });

  // [TC-US04-06][SC-IMPORT-10] 封面失败降级：418、SVG、非豆瓣图片域 → 照常写入、coverFailed 计数
  it("封面失败降级", async () => {
    const page = load("interests-movie-done-p2");
    page.interests[2].subject.cover_url = "https://evil.example/a.jpg";
    page.interests[2].subject.pic = null;
    const { service, repo, store } = setup({
      pages: { "movie·done·20": page },
      client: { coverFail: [page.interests[0].subject.cover_url], coverBytes: { [page.interests[1].subject.cover_url]: new TextEncoder().encode("<svg/>") } },
    });
    const result = await service.importPage(req({ start: 20, head: W }));
    expect([result.created, result.coverFailed, [...repo.rows.values()].map((r) => r.coverKey), store.objects.size]).toEqual([3, 3, [null, null, null], 0]);
  });

  // 并发插入同一豆瓣 ID：唯一冲突转为覆盖一次
  it("insert 唯一冲突 → 覆盖", async () => {
    const { service, repo } = setup({ pages: { "movie·done·40": load("interests-movie-done-p3") } });
    repo.conflictOnce.add("37116446");
    const result = await service.importPage(req({ start: 40, head: W }));
    expect([result.created, result.updated, result.nextStart, [...repo.rows.values()].filter((r) => r.douban?.id === "37116446").length]).toEqual([1, 1, null, 1]);
  });

  // [TC-US04-08][SC-IMPORT-11] 分页：按请求条数前进，count 固定 20
  it.each([
    [0, undefined, "interests-movie-done", 20],
    [20, W, "interests-movie-done-p2", 40],
    [40, W, "interests-movie-done-p3", null],
  ])("start %d → nextStart %s", async (start, head, fixture, next) => {
    const { service, douban } = setup({ pages: { [`movie·done·${start}`]: load(fixture) } });
    const result = await service.importPage(req({ start, head }));
    expect([result.total, result.nextStart, douban.queries.map((q) => q.count)]).toEqual([45, next, [20]]);
  });

  it("豆瓣该类为空：nextStart null、head null", async () => {
    const { service } = setup();
    expect(await service.importPage(req())).toEqual({ total: 0, head: null, nextStart: null, created: 0, updated: 0, coverFailed: 0, failed: [] });
  });

  // [TC-US04-11][SC-IMPORT-17][SC-IMPORT-18][SC-IMPORT-19] 标记列表失败映射，不写库
  it.each([
    [new DoubanUserNotFoundError(), "DOUBAN_USER_NOT_FOUND"],
    [new DoubanForbiddenError(), "DOUBAN_FORBIDDEN"],
    [new DoubanFetchError("502"), "FETCH_FAILED"],
    [{ interests: [] }, "FETCH_FAILED"],
  ])("列表失败 %s → %s", async (page, code) => {
    const { service, repo, stateRepo } = setup({ pages: { "movie·done·0": page } });
    expect([await errorOf(service.importPage(req())), repo.insert.mock.calls.length, stateRepo.complete.mock.calls.length]).toEqual([code, 0, 0]);
  });

  // [TC-US04-13][SC-IMPORT-19] 列表挂起：25 秒内 FETCH_FAILED
  it("挂起超时", async () => {
    vi.useFakeTimers();
    const { service, douban } = setup();
    douban.client.fetchInterests = () => new Promise(() => {});
    const pending = errorOf(service.importPage(req()));
    await vi.advanceTimersByTimeAsync(25_000);
    expect(await pending).toBe("FETCH_FAILED");
  });

  // [TC-US04-13][SC-IMPORT-19] 书 20 本：外部请求 = 1 + 20 tags + 20 封面 = 41，并发 ≤ 5
  it("外部请求数与并发上限", async () => {
    const { service, douban } = setup({ pages: { "book·done·0": load("interests-book-done-manga") }, client: { delayMs: 2 } });
    const result = await service.importPage(req({ kind: "book", types: ["book", "comic"] }));
    expect([result.created, result.failed, douban.calls.length, douban.maxInFlight() <= 5]).toEqual([19, TAGS_FAILED, 40, true]);
  });

  // [TC-US04-10][SC-IMPORT-20] 非法参数：400，不发外部请求、不写状态
  it.each([
    [{ uid: "../user/1" }, "uid"], [{ uid: "a".repeat(65) }, "uid"], [{ uid: "" }, "uid"], [{ kind: "music" }, "kind"], [{ status: "mark" }, "status"],
    [{ start: -1 }, "start"], [{ start: 1.5 }, "start"], [{ start: 10 }, "start"], [{ start: 100_020 }, "start"], [{ start: "x" }, "start"],
    [{ mode: undefined }, "mode"], [{ mode: "all" }, "mode"], [{ start: 20, head: "2026/10/18" }, "head"], [{ start: 20 }, "head"],
    [{ types: ["book"] }, "types"], [{ types: [] }, "types"], [{ types: ["music"] }, "types"], [{ types: ["movie", "movie"] }, "types"], [{ types: "movie" }, "types"],
  ])("%j → VALIDATION_FAILED %s", async (extra, field) => {
    const { service, douban, stateRepo } = setup();
    expect([await errorOf(service.importPage(req(extra))), douban.calls.length, stateRepo.touch.mock.calls.length]).toEqual([`VALIDATION_FAILED:${field}`, 0, 0]);
  });

  it("start = 0 时忽略请求里的 head", async () => {
    const { service } = setup({ pages: { "movie·done·0": load("interests-movie-done-p3") } });
    expect((await service.importPage(req({ head: "乱写" }))).head).toBe("2026-05-26 22:01:30");
  });
});

describe("增量与水位（SHELF-UT-20）", () => {
  const synced = { "movie|done": W, "series|done": W };

  // [TC-US04-18][SC-IMPORT-22][SC-IMPORT-23] 截断与同一秒：晚于 ×3 新增，= 水位已有覆盖、没有新增，更早不处理
  it("增量截断", async () => {
    const existing = { type: "series", douban: { id: "30513783", url: "https://movie.douban.com/subject/30513783/" } } as Partial<Row>;
    const { service, douban, stateRepo } = setup({ pages: { "movie·done·0": load("interests-movie-done-incr") }, seed: [existing], state: synced });
    const result = await service.importPage(req({ mode: "incremental" }));
    expect([result.created, result.updated, result.nextStart, result.head, douban.calls.filter((c) => c.startsWith("list:")).length]).toEqual([4, 1, null, "2026-10-25 21:10:00", 1]);
    expect(stateRepo.complete).toHaveBeenCalledWith(UID, ["movie", "series"], "done", "2026-10-25 21:10:00", NOW.toISOString());
    expect(stateRepo.rows.get(`${UID}|movie|done`)).toMatchObject({ watermark: "2026-10-25 21:10:00", syncedAt: NOW.toISOString() });
  });

  // [TC-US04-19][SC-IMPORT-24][SC-IMPORT-14] 水位只在 nextStart = null 时前移，参数为第 1 页 head
  it("未结束不前移；末页用带回的 head 前移", async () => {
    const { service, stateRepo } = setup({ pages: { "movie·done·0": load("interests-movie-done"), "movie·done·40": load("interests-movie-done-p3") } });
    await service.importPage(req());
    const afterFirst = stateRepo.complete.mock.calls.length;
    await service.importPage(req({ start: 40, head: W }));
    expect([afterFirst, stateRepo.complete.mock.calls[0]?.[3]]).toEqual([0, W]);
  });

  // [TC-US04-20][SC-IMPORT-25] 无水位按全量
  it("无水位 → 同全量", async () => {
    const { service } = setup({ pages: { "movie·done·0": load("interests-movie-done") } });
    const result = await service.importPage(req({ mode: "incremental" }));
    expect([result.nextStart, result.created]).toEqual([20, 3]);
  });

  // [TC-US04-21][SC-IMPORT-26] 在看改看过
  it("在看改看过", async () => {
    const existing = { type: "series", status: "in_progress", markedOn: "2026-08-23", douban: { id: "36189165", url: "https://movie.douban.com/subject/36189165/" } } as Partial<Row>;
    const { service, repo } = setup({ pages: { "movie·done·0": load("interests-movie-done-doing2done") }, seed: [existing], state: { "movie|done": "2026-10-20 00:00:00", "series|done": "2026-10-20 00:00:00" } });
    const result = await service.importPage(req({ mode: "incremental" }));
    expect([result.created, result.updated, byDouban(repo, "36189165")?.status, byDouban(repo, "36189165")?.markedOn]).toEqual([0, 1, "completed", "2026-10-26"]);
  });

  it("标记时间非法的项单条 PARSE_FAILED，不影响截断", async () => {
    const page = load("interests-movie-done-incr");
    page.interests[1].create_time = "昨天";
    const { service } = setup({ pages: { "movie·done·0": page }, state: synced });
    const result = await service.importPage(req({ mode: "incremental" }));
    expect([result.created, result.nextStart, result.failed]).toEqual([4, null, [{ doubanId: "37185797", title: "百年孤独 第二季", reason: "PARSE_FAILED" }]]);
  });
});

describe("类别过滤与类别水位（SHELF-UT-22）", () => {
  // [TC-US04-24][SC-IMPORT-28][SC-IMPORT-30] 不在 types 的标记跳过：不写入、不下载封面、不计数
  it.each([
    [["movie"], 12], [["series"], 8], [["movie", "series"], 20],
  ])("影视 %j → created %d", async (types, created) => {
    const { service, douban } = setup({ pages: { "movie·done·0": load("interests-movie-done-mixed") } });
    const result = await service.importPage(req({ types }));
    expect([result.created, result.updated, result.failed.length, douban.calls.filter((c) => c.startsWith("cover:")).length]).toEqual([created, 0, 0, created]);
  });

  // tags 失败不按书覆盖：已有漫画条目保持不变
  it("tags 失败时已有漫画不被改成书", async () => {
    const existing = { type: "comic", title: "本站标题", douban: { id: TAGS_FAIL, url: `https://book.douban.com/subject/${TAGS_FAIL}/` } } as Partial<Row>;
    const { service, repo } = setup({ pages: { "book·done·0": load("interests-book-done-manga") }, seed: [existing] });
    const result = await service.importPage(req({ kind: "book", types: ["book", "comic"] }));
    expect([result.failed, byDouban(repo, TAGS_FAIL)?.type, byDouban(repo, TAGS_FAIL)?.title]).toEqual([TAGS_FAILED, "comic", "本站标题"]);
  });

  it("已有的未勾选类别条目不变", async () => {
    const existing = { type: "series", title: "本站标题", douban: { id: "30513783", url: "https://movie.douban.com/subject/30513783/" } } as Partial<Row>;
    const { service, repo } = setup({ pages: { "movie·done·0": load("interests-movie-done-mixed") }, seed: [existing] });
    await service.importPage(req({ types: ["movie"] }));
    expect([byDouban(repo, "30513783")?.title, byDouban(repo, "30513783")?.updatedAt]).toEqual(["本站标题", "2020-01-01T00:00:00.000Z"]);
  });

  it.each([
    [["comic"], 3, 3], [["book"], 16, 16],
  ])("书 %j：仍请求每本 tags；created %d；tags 失败那本进 failed", async (types, created, covers) => {
    const { service, douban } = setup({ pages: { "book·done·0": load("interests-book-done-manga") } });
    const result = await service.importPage(req({ kind: "book", types }));
    expect([result.created, result.failed, douban.calls.filter((c) => c.startsWith("tags:")).length, douban.calls.filter((c) => c.startsWith("cover:")).length]).toEqual([created, TAGS_FAILED, 20, covers]);
  });

  // [TC-US04-25][SC-IMPORT-29] 截断点取勾选类别中最早的水位；touch / complete 只动 types
  // 夹具 interests-movie-done-incr：电影 10-25、剧集 10-22、电影 10-20、剧集 = W、电影 = W、电影 08-08（total 614）
  const S2 = "2026-10-22 00:00:00";
  const HEAD = "2026-10-25 21:10:00";
  it.each([
    ["电影有水位、剧集无，只勾电影 → 按电影水位截断", { "movie|done": W }, ["movie"], 3, null, { movie: HEAD, series: null }],
    ["剧集无水位 → 不截断，未结束不前移", { "movie|done": W }, ["movie", "series"], 6, 20, { movie: W, series: null }],
    ["两者都有 → 取较早的 W", { "movie|done": W, "series|done": S2 }, ["movie", "series"], 5, null, { movie: HEAD, series: HEAD }],
    ["只勾剧集 → 按剧集水位截断，电影不变", { "movie|done": W, "series|done": S2 }, ["series"], 1, null, { movie: W, series: HEAD }],
  ])("%s", async (_, state, types, written, nextStart, watermarks) => {
    const { service, stateRepo } = setup({ pages: { "movie·done·0": load("interests-movie-done-incr") }, state });
    const result = await service.importPage(req({ mode: "incremental", types }));
    expect([result.created + result.updated, result.nextStart, stateRepo.touch.mock.calls[0][1]]).toEqual([written, nextStart, types]);
    expect({ movie: stateRepo.rows.get(`${UID}|movie|done`)?.watermark ?? null, series: stateRepo.rows.get(`${UID}|series|done`)?.watermark ?? null }).toEqual(watermarks);
  });

  it("全量也前移水位；未勾选类别 attempted_at 不更新", async () => {
    const { service, stateRepo } = setup({ pages: { "movie·done·40": load("interests-movie-done-p3") }, state: { "movie|done": W, "series|done": S2 } });
    await service.importPage(req({ types: ["movie"], start: 40, head: HEAD }));
    expect([stateRepo.rows.get(`${UID}|movie|done`)?.watermark, stateRepo.rows.get(`${UID}|series|done`)?.attemptedAt]).toEqual([HEAD, "2026-10-23T13:00:00.000Z"]);
  });
});

describe("importState（SHELF-UT-21）", () => {
  // [TC-US04-22][SC-IMPORT-27][SC-IMPORT-01]
  it("无记录 / lastUid / 指定 uid / 非法 uid", async () => {
    const empty = setup();
    const none = await empty.service.importState();
    const synced = setup({ state: { "movie|done": W } });
    const last = await synced.service.importState();
    const named = await synced.service.importState("ahbei");
    expect([none.uid, none.categories.length, none.categories.every((c) => c.watermark === null && c.syncedAt === null)]).toEqual([null, 12, true]);
    expect([last.uid, last.categories.slice(0, 2).map((c) => [c.type, c.status, c.watermark])]).toEqual([UID, [["movie", "done", W], ["movie", "doing", null]]]);
    expect([named.uid, named.categories.every((c) => c.watermark === null)]).toEqual(["ahbei", true]);
    expect(await errorOf(synced.service.importState("a/b"))).toBe("VALIDATION_FAILED:uid");
  });
});

describe("finishImport（SHELF-UT-19）", () => {
  // [TC-US04-09][SC-IMPORT-16] changed > 0 才触发一次重建
  it.each([[0, 0, "ok"], [3, 1, "ok"], [-1, 0, "VALIDATION_FAILED:changed"], [1.5, 0, "VALIDATION_FAILED:changed"], ["3", 0, "VALIDATION_FAILED:changed"]])("changed %j", async (changed, hookCalls, outcome) => {
    const { service, hooks } = setup();
    expect([await errorOf(service.finishImport(changed)), hooks.onShelfChanged.mock.calls.length]).toEqual([outcome, hookCalls]);
  });
});
