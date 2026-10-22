import type { APIContext } from "astro";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { createReadCoverHandler } from "../../../src/pages/covers/[...key]";
import { JPG, keyOf, makeShelf, MIN, objectExists, PNG, rowCount, SITE, WEBP } from "./shelf-fixtures";

// 封面上传、替换、删除与 GET /covers/*（shelf api-contract、data-model"R2 对象"）
const shelf = makeShelf();
const read = createReadCoverHandler({ bucket: env.MEDIA });

async function getCover(path: string) {
  const request = new Request(`${SITE}${path}`);
  const key = new URL(request.url).pathname.replace(/^\/covers\//, "");
  return read({ request, url: new URL(request.url), params: { key } } as unknown as APIContext);
}

describe("书影音封面", () => {
  // [TC-US01-05][SC-MANAGE-10][SC-MANAGE-11] jpg / png / webp 成功；5 MiB 边界；svg、伪装 jpg、超限 400，不写库不留对象
  it("上传：格式与大小", async () => {
    const ok = await Promise.all([JPG, PNG, WEBP].map((bytes) => shelf.create(MIN, bytes)));
    const edge = new Uint8Array(5 * 1024 * 1024);
    edge.set(JPG);
    const atLimit = await shelf.create(MIN, edge);
    const over = new Uint8Array(5 * 1024 * 1024 + 1);
    over.set(JPG);
    const before = await rowCount();
    const objectsBefore = (await env.MEDIA.list({ prefix: "covers/" })).objects.length;
    const bad = [await shelf.create(MIN, new TextEncoder().encode("<svg/>")), await shelf.create(MIN, new TextEncoder().encode("not a jpeg")), await shelf.create(MIN, over)];
    expect({
      ok: ok.map((r) => [r.status, r.body.cover.split(".").pop()]),
      atLimit: atLimit.status,
      types: await Promise.all(ok.map(async (r) => (await env.MEDIA.head(keyOf(r.body.cover)))?.httpMetadata?.contentType)),
      bad: bad.map((r) => [r.status, r.body.error.code]),
      rows: (await rowCount()) - before,
      objects: (await env.MEDIA.list({ prefix: "covers/" })).objects.length - objectsBefore,
    }).toEqual({
      ok: [[201, "jpg"], [201, "png"], [201, "webp"]],
      atLimit: 201,
      types: ["image/jpeg", "image/png", "image/webp"],
      bad: [[400, "COVER_TYPE_INVALID"], [400, "COVER_TYPE_INVALID"], [400, "COVER_TOO_LARGE"]],
      rows: 0,
      objects: 0,
    });
  });

  // [TC-US01-07][SC-MANAGE-13] 换封面删旧、移除封面删除、不改封面保持；cover 与 coverAction=remove 同时给 400
  it("替换、移除与保持", async () => {
    const x = (await shelf.create(MIN, JPG)).body;
    const replaced = (await shelf.update(x.id, MIN, { cover: PNG })).body;
    const oldGone = !(await objectExists(x.cover));
    const replacedNew = replaced.cover !== x.cover && (await objectExists(replaced.cover));
    const removed = (await shelf.update(x.id, MIN, { coverAction: "remove" })).body;
    const y = (await shelf.create(MIN, JPG)).body;
    const kept = (await shelf.update(y.id, { ...MIN, title: "改" })).body;
    const conflict = await shelf.update(y.id, MIN, { cover: PNG, coverAction: "remove" });
    expect({
      replacedNew,
      oldGone,
      removed: [removed.cover, await objectExists(replaced.cover)],
      kept: [kept.cover === y.cover, await objectExists(y.cover)],
      conflict: [conflict.status, conflict.body.error.code],
    }).toEqual({ replacedNew: true, oldGone: true, removed: [null, false], kept: [true, true], conflict: [400, "BAD_REQUEST"] });
  });

  // [TC-US01-09] 删除条目连同封面
  it("删除条目删除封面", async () => {
    const x = (await shelf.create(MIN, JPG)).body;
    await shelf.remove(x.id);
    expect(await objectExists(x.cover)).toBe(false);
  });

  // 跨 Feature 影响（F-006）：封面不写 images 表
  it("封面不写 images 表", async () => {
    await shelf.create(MIN, JPG);
    expect((await env.DB.prepare("SELECT COUNT(*) AS n FROM images WHERE key LIKE 'covers/%'").first<{ n: number }>())!.n).toBe(0);
  });

  // GET /covers/*：200 带长缓存与类型；非法 key、不存在 404
  it("读取封面", async () => {
    const x = (await shelf.create(MIN, PNG)).body;
    const hit = await getCover(x.cover);
    const bytes = new Uint8Array(await hit.arrayBuffer());
    const misses = [await getCover("/covers/2026/10/aaaaaaaaaaaa.jpg"), await getCover("/covers/../img/x.jpg"), await getCover("/covers/2026/10/ABC.jpg")];
    expect({
      status: hit.status,
      type: hit.headers.get("Content-Type"),
      cache: hit.headers.get("Cache-Control"),
      nosniff: hit.headers.get("X-Content-Type-Options"),
      bytes: [...bytes],
      misses: misses.map((r) => r.status),
    }).toEqual({ status: 200, type: "image/png", cache: "public, max-age=31536000, immutable", nosniff: "nosniff", bytes: [...PNG], misses: [404, 404, 404] });
  });
});
