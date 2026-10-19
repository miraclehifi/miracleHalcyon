import type { APIContext } from "astro";
import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it } from "vitest";
import { createCleanupHandler } from "../../../src/pages/api/admin/storage/cleanup";
import { createOrphansHandler } from "../../../src/pages/api/admin/storage/orphans";
import { clearAll, imageKey, NOW, seedImages, seedPosts, videoKeyOf } from "./storage-fixtures";

// POST /api/admin/storage/cleanup（media api-contract，F-006 US-02）：[MEDIA-UT-10]
const SITE = "http://localhost:4321";
const cleanup = createCleanupHandler({ db: env.DB, bucket: env.MEDIA, now: () => NOW });
const detect = createOrphansHandler({ db: env.DB, bucket: env.MEDIA, now: () => NOW });

async function call(handler: typeof cleanup, method = "POST") {
  const request = new Request(`${SITE}/api/admin/storage/${method === "POST" ? "cleanup" : "orphans"}`, { method });
  const response = await handler({ request, url: new URL(request.url) } as unknown as APIContext);
  return { status: response.status, body: (await response.json()) as Record<string, unknown> & { summary?: Record<string, number> } };
}

const exists = async (key: string) => (await env.MEDIA.head(key)) !== null;
const row = (key: string) => env.DB.prepare("SELECT key, size, video_key, video_size FROM images WHERE key = ?").bind(key).first();

afterEach(clearAll);

describe("POST /api/admin/storage/cleanup", () => {
  it("[TC-US02-01][SC-CLEANUP-01] 未引用图片连同视频删除，被引用图片只删未引用视频；返回数量与体积；再检测为 0", async () => {
    const [o1, o2, v] = [1, 2, 3].map((n) => imageKey(n));
    await seedImages([
      { key: o1, size: 1000, videoSize: 5000, r2: true },
      { key: o2, size: 2000, r2: true },
      { key: v, size: 300, videoSize: 7000, r2: true },
    ]);
    await seedPosts([{ body: `![v](/${v})` }]);
    const result = await call(cleanup);
    const after = await call(detect, "GET");

    expect({
      result,
      r2: [await exists(o1), await exists(videoKeyOf(o1)), await exists(o2), await exists(v), await exists(videoKeyOf(v))],
      rows: [await row(o1), await row(o2), (await row(v))?.key],
      after: after.body.summary,
    }).toEqual({
      result: { status: 200, body: { removedImages: 2, removedVideos: 1, freedBytes: 15000 } },
      r2: [false, false, false, true, false],
      rows: [null, null, v],
      after: { orphanImageCount: 0, orphanImageBytes: 0, orphanVideoCount: 0, orphanVideoBytes: 0, totalOrphanBytes: 0, protectedCount: 0 },
    });
  });

  it("[TC-US02-02][SC-CLEANUP-02] 只清理视频：视频列置空、其余字段不变、图片对象保留", async () => {
    const v = imageKey(1);
    await seedImages([{ key: v, size: 300, videoSize: 7000, r2: true }]);
    await seedPosts([{ body: `![a](/${v})` }, { body: `![b](/${v}#wide)` }]);
    const before = await env.DB.prepare("SELECT mime, size, width, height, rgb, original_name, created_at FROM images WHERE key = ?").bind(v).first();
    const result = await call(cleanup);
    const afterRow = await env.DB.prepare("SELECT mime, size, width, height, rgb, original_name, created_at, video_key, video_size FROM images WHERE key = ?").bind(v).first();

    expect({ result: result.body, image: await exists(v), video: await exists(videoKeyOf(v)), afterRow }).toEqual({
      result: { removedImages: 0, removedVideos: 1, freedBytes: 7000 },
      image: true,
      video: false,
      afterRow: { ...before, video_key: null, video_size: null },
    });
  });

  it("[TC-US02-03][SC-CLEANUP-07] 不碰被引用、带 live 引用、保护期内的记录，只删保护期外的未引用图片", async () => {
    const [a, b, c2, live, fresh, o] = [1, 2, 3, 4, 5, 6].map((n) => imageKey(n));
    await seedImages([
      { key: a, r2: true },
      { key: b, r2: true },
      { key: c2, r2: true },
      { key: live, videoSize: 10, r2: true },
      { key: fresh, ageHours: 23, r2: true },
      { key: o, r2: true },
    ]);
    await seedPosts([{ body: `/${a} ![l](/${live}#live)` }, { body: "x", pubBody: `/${b}`, pubCover: `/${c2}` }]);
    const result = await call(cleanup);
    const kept = await Promise.all([a, b, c2, live, videoKeyOf(live), fresh].map(exists));

    expect({ result: result.body, kept, o: await exists(o), liveRow: (await row(live))?.video_key }).toEqual({
      result: { removedImages: 1, removedVideos: 0, freedBytes: 1000 },
      kept: [true, true, true, true, true, true],
      o: false,
      liveRow: videoKeyOf(live),
    });
  });

  it("[TC-US02-04][SC-CLEANUP-06][SC-CLEANUP-08] 检测后又被插回文章的图片不被删除：清理按当时内容重新判定，结果按实际数量", async () => {
    const [r, s, t] = [1, 2, 3].map((n) => imageKey(n));
    await seedImages([r, s, t].map((key) => ({ key, size: 1_048_576, r2: true })));
    const detected = await call(detect, "GET");
    await seedPosts([{ body: `![r](/${r})` }]); // 打开存储页之后，在写文章页插回 R 并已自动保存
    const result = await call(cleanup);

    expect({ detected: detected.body.summary?.orphanImageCount, result: result.body, r: [await exists(r), (await row(r))?.key], s: await exists(s) }).toEqual({
      detected: 3,
      result: { removedImages: 2, removedVideos: 0, freedBytes: 2_097_152 },
      r: [true, r],
      s: false,
    });
  });

  it("[TC-US02-09][SC-CLEANUP-01] 无候选：返回 0，不调用 R2 删除", async () => {
    let deletes = 0;
    const bucket = new Proxy(env.MEDIA, {
      get: (target, prop) => (prop === "delete" ? (...args: unknown[]) => (deletes++, (target.delete as (...a: unknown[]) => unknown)(...args)) : Reflect.get(target, prop)),
    });
    const handler = createCleanupHandler({ db: env.DB, bucket, now: () => NOW });
    const result = await call(handler);

    expect({ result: result.body, deletes }).toEqual({ result: { removedImages: 0, removedVideos: 0, freedBytes: 0 }, deletes: 0 });
  });
});
