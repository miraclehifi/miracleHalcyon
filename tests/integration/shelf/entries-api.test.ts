import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { makeShelf, MIN, NOW, rowCount } from "./shelf-fixtures";

// /api/admin/shelf/entries（shelf api-contract §3）
const shelf = makeShelf();

describe("书影音条目接口", () => {
  // [TC-US01-03][SC-MANAGE-05][SC-MANAGE-06] 最小字段与全字段往返；响应字段齐全
  it("新增：最小字段与全字段", async () => {
    const min = await shelf.create(MIN);
    const full = await shelf.create({ type: "game", platform: "switch", title: "塞尔达传说", creator: "任天堂", year: 2023, status: "completed", rating: 5, markedOn: "2026-05-01", comment: "神作" });
    const read = await shelf.get(full.body.id);
    expect({ status: [min.status, full.status], min: min.body, read: read.body }).toEqual({
      status: [201, 201],
      min: {
        id: expect.stringMatching(/^\d+$/), ...MIN, creator: null, year: null, rating: null, comment: null, cover: null,
        platform: null, coverUrl: null, coverWidth: null, coverHeight: null, doubanUrl: null, doubanId: null, hidden: false, createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(),
      },
      read: expect.objectContaining({ type: "game", title: "塞尔达传说", creator: "任天堂", year: 2023, rating: 5, markedOn: "2026-05-01", comment: "神作" }),
    });
  });

  // [TC-US01-04][SC-MANAGE-07][SC-MANAGE-08] 校验失败 400、不写库；请求格式错误 400 BAD_REQUEST
  it("校验与请求格式", async () => {
    const before = await rowCount();
    const bad = await shelf.create({ ...MIN, title: " ", rating: 6, year: 23 });
    const notForm = await shelf.create(null, null, JSON.stringify(MIN));
    const noFields = await shelf.create(null, null, new FormData());
    const badJson = new FormData();
    badJson.append("fields", "{not json");
    const broken = await shelf.create(null, null, badJson);
    expect({
      bad: [bad.status, bad.body.error.code, bad.body.error.fields],
      others: [notForm, noFields, broken].map((r) => [r.status, r.body.error.code]),
      rows: (await rowCount()) - before,
    }).toEqual({ bad: [400, "VALIDATION_FAILED", ["title", "year", "rating"]], others: new Array(3).fill([400, "BAD_REQUEST"]), rows: 0 });
  });

  // [TC-US01-04][SC-MANAGE-07] 已去掉的分类 anime（drop-anime-type）：接口 400；库约束也拒绝
  it("分类 anime 不再接受", async () => {
    const res = await shelf.create({ ...MIN, type: "anime" });
    const insert = env.DB.prepare(
      "INSERT INTO shelf_entries (type, title, status, marked_on, created_at, updated_at) VALUES ('anime', 'x', 'completed', '2026-10-01', ?1, ?1)",
    ).bind(NOW.toISOString());
    await expect(insert.run()).rejects.toThrow(/CHECK constraint failed/);
    expect([res.status, res.body.error.fields]).toEqual([400, ["type"]]);
  });

  // [TC-US01-02][SC-MANAGE-02] 列表排序、含隐藏、counts；type 缺省 book，非法 400
  it("列表排序与计数", async () => {
    const make = (title: string, status: string, markedOn: string) => shelf.create({ type: "comic", title, status, markedOn });
    const ids: Record<string, string> = {};
    for (const [t, s, d] of [["A", "completed", "2026-03-01"], ["B", "in_progress", "2026-01-10"], ["C", "completed", "2026-09-15"], ["D", "in_progress", "2026-08-01"], ["E", "completed", "2026-09-15"]] as const) {
      ids[t] = (await make(t, s, d)).body.id;
    }
    await shelf.hide(ids.C);
    const list = await shelf.list("comic");
    const fallback = await shelf.list();
    const bad = await shelf.list("music");
    expect({
      order: list.body.items.map((e: { title: string }) => e.title),
      hiddenFlag: list.body.items.find((e: { title: string }) => e.title === "C").hidden,
      counts: list.body.counts,
      fallbackType: fallback.body.items.every((e: { type: string }) => e.type === "book"),
      bad: [bad.status, bad.body.error.fields],
    }).toEqual({ order: ["D", "B", "E", "C", "A"], hiddenFlag: true, counts: { total: 4, inProgress: 2, hidden: 1 }, fallbackType: true, bad: [400, ["type"]] });
  });

  // [TC-US01-06][SC-MANAGE-12] 在读 → 读过
  it("编辑：在读改为读过", async () => {
    const id = (await shelf.create({ ...MIN, title: "三体", status: "in_progress", markedOn: "2026-08-01" })).body.id;
    const res = await shelf.update(id, { ...MIN, title: "三体", status: "completed", rating: 4, comment: "好看", markedOn: "2026-10-20" });
    expect({ status: res.status, body: res.body }).toMatchObject({ status: 200, body: { status: "completed", rating: 4, comment: "好看", markedOn: "2026-10-20" } });
  });

  // [TC-US01-08][SC-MANAGE-14] 隐藏状态转换（幂等）；不存在 404
  it("隐藏与取消隐藏", async () => {
    const id = (await shelf.create(MIN)).body.id;
    const seq = [await shelf.hide(id), await shelf.hide(id), await shelf.unhide(id), await shelf.unhide(id), await shelf.hide("99999")];
    expect(seq.map((r) => [r.status, r.body?.hidden ?? r.body?.error.code])).toEqual([[200, true], [200, true], [200, false], [200, false], [404, "NOT_FOUND"]]);
  });

  // [TC-US01-09][SC-MANAGE-15] 删除 204；重复 404；非法 id 404
  it("删除", async () => {
    const id = (await shelf.create(MIN)).body.id;
    const seq = [await shelf.remove(id), await shelf.remove(id), await shelf.remove("abc"), await shelf.get(id)];
    expect(seq.map((r) => r.status)).toEqual([204, 404, 404, 404]);
  });

  // [TC-US01-10] 写操作触发重建（决策表）
  it("重建触发次数", async () => {
    const start = shelf.hookCalls.n;
    const id = (await shelf.create(MIN)).body.id; // +1
    await shelf.update(id, { ...MIN, title: "改" }); // +1
    await shelf.hide(id); // +1
    await shelf.hide(id); // 无变化
    await shelf.unhide(id); // +1
    await shelf.create({ ...MIN, title: "" }); // 400
    await shelf.remove("99999"); // 404
    await shelf.remove(id); // +1
    expect(shelf.hookCalls.n - start).toBe(5);
  });

  // [TC-US01-12][SC-MANAGE-20] 清除豆瓣链接；改写为他址被忽略
  it("豆瓣链接只能保留或清除", async () => {
    const douban = { doubanId: "27608239", doubanUrl: "https://book.douban.com/subject/27608239/" };
    const id = (await shelf.create({ ...MIN, ...douban })).body.id;
    const other = await shelf.update(id, { ...MIN, doubanId: "1292052", doubanUrl: "https://movie.douban.com/subject/1292052/" });
    const cleared = await shelf.update(id, { ...MIN, doubanId: null, doubanUrl: null });
    expect([other.body.doubanId, cleared.body.doubanId, cleared.body.doubanUrl]).toEqual(["27608239", null, null]);
  });

  // [TC-US01-15] 特殊字符原样存取
  it("特殊字符与换行", async () => {
    const fields = { ...MIN, title: "<script>alert(1)</script>", creator: `O'Brien & "Sons"`, comment: "<img src=x onerror=alert(1)>\n第二行" };
    const id = (await shelf.create(fields)).body.id;
    const row = await env.DB.prepare("SELECT title, creator, comment FROM shelf_entries WHERE id = ?").bind(Number(id)).first();
    expect(row).toEqual({ title: fields.title, creator: fields.creator, comment: fields.comment });
  });
});
