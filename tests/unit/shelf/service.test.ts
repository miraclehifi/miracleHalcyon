import { afterEach, describe, expect, it, vi } from "vitest";
import type { CoverStore } from "../../../src/domains/shelf/cover-store";
import type { ImageSize } from "../../../src/domains/shelf/entry";
import {
  CoverTooLargeError, CoverTypeError, DuplicateDoubanError, EntryNotFoundError, IgdbImageError, ShelfValidationError,
} from "../../../src/domains/shelf/errors";
import type { IgdbImageClient } from "../../../src/domains/shelf/igdb";
import type { ShelfEntry, ShelfRepo } from "../../../src/domains/shelf/repo";
import { createShelfService } from "../../../src/domains/shelf/service";

// SHELF-UT-10：服务写操作（替身仓储 / 存储 / 钩子）
const NOW = new Date("2026-10-21T06:30:00.000Z");
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const BASE = { type: "book", title: "原则", status: "completed", markedOn: "2026-10-01" };

function fakeRepo(): ShelfRepo & { rows: Map<number, ShelfEntry> } {
  const rows = new Map<number, ShelfEntry>();
  let seq = 0;
  return {
    rows,
    listByType: async (type) => [...rows.values()].filter((r) => r.type === type),
    listVisible: async () => [...rows.values()].filter((r) => !r.hidden).sort((a, b) => b.id - a.id),
    get: async (id) => rows.get(id) ?? null,
    findByDoubanId: async (doubanId) => {
      const row = [...rows.values()].find((r) => r.douban?.id === doubanId);
      return row ? { id: row.id, title: row.title, type: row.type, status: row.status, markedOn: row.markedOn } : null;
    },
    findByDoubanIds: async (ids) => new Map([...rows.values()].filter((r) => r.douban && ids.includes(r.douban.id)).map((r) => [r.douban!.id, r])),
    insert: async (data) => {
      if (data.douban && [...rows.values()].some((r) => r.douban?.id === data.douban!.id)) throw new DuplicateDoubanError(null);
      const row = { ...data, id: ++seq, hidden: false, createdAt: data.now, updatedAt: data.now } as ShelfEntry;
      rows.set(row.id, row);
      return row;
    },
    update: async (id, data) => {
      const old = rows.get(id);
      if (!old) return null;
      const row = { ...old, ...data, updatedAt: data.now } as ShelfEntry;
      rows.set(id, row);
      return row;
    },
    setHidden: async (id, hidden, now) => {
      const old = rows.get(id);
      if (!old) return null;
      if (old.hidden === hidden) return { entry: old, changed: false };
      const row = { ...old, hidden, updatedAt: now.toISOString() };
      rows.set(id, row);
      return { entry: row, changed: true };
    },
    delete: async (id) => {
      const old = rows.get(id) ?? null;
      rows.delete(id);
      return old;
    },
  };
}

function fakeStore(): CoverStore & { objects: Map<string, string> } {
  const objects = new Map<string, string>();
  return {
    objects,
    put: vi.fn(async (key: string, _bytes: Uint8Array, contentType: string) => void objects.set(key, contentType)),
    get: async () => null,
    delete: vi.fn(async (key: string) => void objects.delete(key)),
  };
}

// IGDB 替身：按图片 ID 返回宽高；coslow1 挂起、nope000 失败
function fakeIgdb(): IgdbImageClient & { readSize: ReturnType<typeof vi.fn> } {
  const sizes: Record<string, ImageSize> = { co8h3y: { width: 810, height: 1080 }, co5vmg: { width: 811, height: 1080 } };
  return {
    readSize: vi.fn(async (url: string) => {
      const id = /\/([a-z0-9]+)\.jpg$/.exec(url)![1];
      if (id === "coslow1") return new Promise<ImageSize>(() => {});
      if (!sizes[id]) throw new IgdbImageError("404");
      return sizes[id];
    }),
  };
}

function setup(overrides: Partial<{ repo: ShelfRepo; store: CoverStore }> = {}) {
  const repo = fakeRepo();
  const store = fakeStore();
  const igdb = fakeIgdb();
  const hooks = { onShelfChanged: vi.fn(async () => {}) };
  const log = vi.fn();
  const service = createShelfService({ repo: overrides.repo ?? repo, store: overrides.store ?? store, igdb, hooks, log, now: () => NOW });
  return { repo, store, igdb, hooks, log, service };
}

describe("ShelfService 写操作（SHELF-UT-10）", () => {
  // [TC-US01-05][SC-MANAGE-10] 新增带封面：封面写入 covers/，条目指向它
  it("新增带封面", async () => {
    const { service, store } = setup();
    const entry = await service.create(BASE, { bytes: JPG });
    expect(entry.coverKey).toMatch(/^covers\/2026\/10\/[a-z2-7]{12}\.jpg$/);
    expect(store.objects.get(entry.coverKey!)).toBe("image/jpeg");
  });

  // [TC-US01-05][SC-MANAGE-11] 封面类型、大小不合规：不写存储、不写库
  it("封面不合规时拒绝", async () => {
    const { service, store, repo } = setup();
    await expect(service.create(BASE, { bytes: new TextEncoder().encode("<svg>") })).rejects.toBeInstanceOf(CoverTypeError);
    const big = new Uint8Array(5 * 1024 * 1024 + 1);
    big.set(JPG);
    await expect(service.create(BASE, { bytes: big })).rejects.toBeInstanceOf(CoverTooLargeError);
    expect({ objects: store.objects.size, rows: repo.rows.size }).toEqual({ objects: 0, rows: 0 });
  });

  it("insert 失败时删除刚写入的封面", async () => {
    const repo = fakeRepo();
    repo.insert = async () => {
      throw new Error("D1 down");
    };
    const { service, store } = setup({ repo });
    await expect(service.create(BASE, { bytes: JPG })).rejects.toThrow("D1 down");
    expect(store.objects.size).toBe(0);
  });

  // [TC-US02-08] 同豆瓣 ID 第二次保存 409
  it("豆瓣 ID 重复", async () => {
    const { service } = setup();
    const douban = { doubanId: "27608239", doubanUrl: "https://book.douban.com/subject/27608239/" };
    const first = await service.create({ ...BASE, ...douban });
    const error = await service.create({ ...BASE, ...douban }).catch((e) => e);
    expect(error).toBeInstanceOf(DuplicateDoubanError);
    expect(error.existing).toEqual({ id: first.id, title: "原则" });
  });

  // [TC-US01-07][SC-MANAGE-13] 换封面后删旧；删旧失败只记日志
  it("换封面与移除封面", async () => {
    const { service, store, log } = setup();
    const entry = await service.create(BASE, { bytes: JPG });
    const old = entry.coverKey!;
    (store.delete as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("R2 down"));
    const replaced = await service.update(entry.id, BASE, { bytes: JPG });
    expect(replaced.coverKey).not.toBe(old);
    expect(log).toHaveBeenCalledWith("shelf_cover_delete_failed", expect.objectContaining({ key: old }));
    const removed = await service.update(entry.id, BASE, "remove");
    expect(removed.coverKey).toBeNull();
    expect(store.objects.has(replaced.coverKey!)).toBe(false);
    const kept = await service.update(entry.id, { ...BASE, title: "改" }, "keep");
    expect(kept.coverKey).toBeNull();
  });

  // [TC-US01-12][SC-MANAGE-20] 编辑时豆瓣字段只能保持或清除
  it("编辑时豆瓣字段只能保持原值或清除", async () => {
    const { service } = setup();
    const douban = { doubanId: "27608239", doubanUrl: "https://book.douban.com/subject/27608239/" };
    const entry = await service.create({ ...BASE, ...douban });
    const changed = await service.update(entry.id, { ...BASE, doubanId: "1292052", doubanUrl: "https://movie.douban.com/subject/1292052/" }, "keep");
    expect(changed.douban?.id).toBe("27608239");
    const cleared = await service.update(entry.id, { ...BASE, doubanId: null, doubanUrl: null }, "keep");
    expect(cleared.douban).toBeNull();
  });

  // [TC-US01-09][TC-US01-10][SC-MANAGE-15] 删除连同封面；钩子次数；不存在 404
  it("删除与钩子次数", async () => {
    const { service, store, hooks } = setup();
    const entry = await service.create(BASE, { bytes: JPG });
    await service.update(entry.id, BASE, "keep");
    await service.setHidden(entry.id, true);
    await service.setHidden(entry.id, true);
    await service.setHidden(entry.id, false);
    await service.remove(entry.id);
    expect(store.objects.size).toBe(0);
    expect(hooks.onShelfChanged).toHaveBeenCalledTimes(5); // 新增、编辑、隐藏、取消隐藏、删除；重复隐藏不触发
    await expect(service.remove(entry.id)).rejects.toBeInstanceOf(EntryNotFoundError);
    await expect(service.setHidden(999, true)).rejects.toBeInstanceOf(EntryNotFoundError);
    await expect(service.update(999, BASE, "keep")).rejects.toBeInstanceOf(EntryNotFoundError);
    expect(hooks.onShelfChanged).toHaveBeenCalledTimes(5);
  });
});

// SHELF-UT-14：游戏写操作（替身 repo / store / igdb；ADR-013）
const GAME = { type: "game", title: "塞尔达传说", status: "completed", markedOn: "2026-05-01", platform: "ps5" };
const igdbUrl = (size: string, id: string, ext: string) => `https://images.igdb.com/igdb/image/upload/${size}/${id}.${ext}`;
const T1080 = (id: string) => igdbUrl("t_1080p", id, "jpg");
const failure = (p: Promise<unknown>) => p.then(() => "ok", (e) => (e instanceof ShelfValidationError ? `400:${e.fields.join(",")}` : e?.code ?? String(e)));

afterEach(() => vi.useRealTimers());

describe("ShelfService 游戏写操作（SHELF-UT-14）", () => {
  // [TC-US01-26][SC-MANAGE-23] #1–3：链接规范化、读取宽高、无封面
  it("新增：规范化链接并读取宽高", async () => {
    const { service, igdb, hooks } = setup();
    const a = await service.create({ ...GAME, coverUrl: igdbUrl("t_cover_big", "co8h3y", "webp") });
    const b = await service.create({ ...GAME, coverUrl: igdbUrl("t_720p", "co5vmg", "png") });
    const c = await service.create({ ...GAME, coverUrl: null });
    expect([a, b, c].map((e) => [e.platform, e.coverUrl, e.coverWidth, e.coverHeight, e.coverKey])).toEqual([
      ["ps5", T1080("co8h3y"), 810, 1080, null],
      ["ps5", T1080("co5vmg"), 811, 1080, null],
      ["ps5", null, null, null, null],
    ]);
    expect([igdb.readSize.mock.calls.map((call) => call[0]), hooks.onShelfChanged.mock.calls.length]).toEqual([[T1080("co8h3y"), T1080("co5vmg")], 3]);
  });

  // [TC-US01-26][SC-MANAGE-23] #4–6、#8：平台必填与合法；非游戏忽略平台与链接；游戏不接受上传
  it("校验与非游戏忽略", async () => {
    const { service, igdb, repo, store } = setup();
    const noPlatform = { ...GAME, platform: undefined };
    const results = [
      await failure(service.create(noPlatform)),
      await failure(service.create({ ...GAME, platform: "xbox" })),
      await failure(service.create({ ...GAME, coverUrl: "https://example.com/a.jpg" })),
      await failure(service.create(GAME, { bytes: JPG })),
    ];
    const book = await service.create({ ...BASE, platform: "ps5", coverUrl: T1080("co8h3y") });
    expect({ results, book: [book.platform, book.coverUrl, book.coverWidth], igdb: igdb.readSize.mock.calls.length, rows: repo.rows.size, objects: store.objects.size }).toEqual({
      results: ["400:platform", "400:platform", "400:coverUrl", "BAD_REQUEST"],
      book: [null, null, null],
      igdb: 0,
      rows: 1,
      objects: 0,
    });
  });

  // [TC-US01-27][SC-MANAGE-24] #5、#7：读取失败 / 挂起 → COVER_LINK_UNREACHABLE，不写库
  it("读取宽高失败与超时", async () => {
    vi.useFakeTimers();
    const { service, repo } = setup();
    const notFound = failure(service.create({ ...GAME, coverUrl: T1080("nope000") }));
    const slow = failure(service.create({ ...GAME, coverUrl: T1080("coslow1") }));
    await vi.advanceTimersByTimeAsync(8000);
    expect([await notFound, await slow, repo.rows.size]).toEqual(["COVER_LINK_UNREACHABLE", "COVER_LINK_UNREACHABLE", 0]);
  });

  // [TC-US01-26][SC-MANAGE-23] #7：编辑时链接规范化后不变 → 不再请求，宽高保持；换链接才请求
  it("编辑：链接不变不请求", async () => {
    const { service, igdb } = setup();
    const entry = await service.create({ ...GAME, coverUrl: T1080("co8h3y") });
    const same = await service.update(entry.id, { ...GAME, title: "改", coverUrl: igdbUrl("t_cover_big", "co8h3y", "png") }, "keep");
    const calls = igdb.readSize.mock.calls.length;
    const changed = await service.update(entry.id, { ...GAME, coverUrl: T1080("co5vmg") }, "keep");
    expect([calls, [same.coverWidth, same.title], [changed.coverWidth, igdb.readSize.mock.calls.length]]).toEqual([1, [810, "改"], [811, 2]]);
    expect(await failure(service.update(entry.id, GAME, { bytes: JPG }))).toBe("BAD_REQUEST");
  });

  // [TC-US01-28][SC-MANAGE-25] 切换分类：书（有 R2 封面）→ 游戏删旧对象；游戏 → 桌游清空平台与链接；游戏去掉链接
  it("切换分类", async () => {
    const { service, store } = setup();
    const book = await service.create(BASE, { bytes: JPG });
    const oldKey = book.coverKey!;
    const toGame = await service.update(book.id, { ...GAME, platform: "switch", coverUrl: null }, "keep");
    const book2 = await service.create(BASE, { bytes: JPG });
    const toGameWithCover = await service.update(book2.id, { ...GAME, coverUrl: T1080("co8h3y") }, "keep");
    const toBoard = await service.update(toGameWithCover.id, { ...GAME, type: "boardgame", platform: "switch", coverUrl: T1080("co8h3y") }, "keep");
    const game = await service.create({ ...GAME, coverUrl: T1080("co8h3y") });
    const noCover = await service.update(game.id, { ...GAME, coverUrl: null }, "keep");
    expect({
      toGame: [toGame.coverKey, toGame.platform, store.objects.has(oldKey)],
      toGameWithCover: [toGameWithCover.coverKey, toGameWithCover.coverUrl, store.objects.has(book2.coverKey!)],
      toBoard: [toBoard.platform, toBoard.coverUrl, toBoard.coverWidth, toBoard.coverHeight],
      noCover: [noCover.coverUrl, noCover.coverWidth, noCover.coverHeight],
    }).toEqual({
      toGame: [null, "switch", false],
      toGameWithCover: [null, T1080("co8h3y"), false],
      toBoard: [null, null, null, null],
      noCover: [null, null, null],
    });
  });
});

