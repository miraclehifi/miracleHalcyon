import { describe, expect, it, vi } from "vitest";
import type { CoverStore } from "../../../src/domains/shelf/cover-store";
import { CoverTooLargeError, CoverTypeError, DuplicateDoubanError, EntryNotFoundError } from "../../../src/domains/shelf/errors";
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

function setup(overrides: Partial<{ repo: ShelfRepo; store: CoverStore }> = {}) {
  const repo = fakeRepo();
  const store = fakeStore();
  const hooks = { onShelfChanged: vi.fn(async () => {}) };
  const log = vi.fn();
  const service = createShelfService({ repo: overrides.repo ?? repo, store: overrides.store ?? store, hooks, log, now: () => NOW });
  return { repo, store, hooks, log, service };
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
