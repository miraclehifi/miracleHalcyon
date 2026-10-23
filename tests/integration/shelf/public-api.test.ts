import type { APIContext } from "astro";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { createPublicShelfHandler } from "../../../src/pages/api/shelf";
import { JPG, makeShelf, MIN, SITE } from "./shelf-fixtures";

// GET /api/shelf（shelf api-contract §3）：读者页构建时读取，公开
const shelf = makeShelf();

async function getPublic() {
  const request = new Request(`${SITE}/api/shelf`);
  const response = await createPublicShelfHandler({ db: env.DB, bucket: env.MEDIA })({ request, url: new URL(request.url), params: {}, locals: {} } as unknown as APIContext);
  return { status: response.status, cacheControl: response.headers.get("Cache-Control"), body: await response.json<{ items: Record<string, unknown>[] }>() };
}

describe("公开书影音列表", () => {
  // [TC-US03-08][SC-SHELF-10][SC-SHELF-18] 隐藏不返回、id 降序、字段最小集、no-store；未登录可访问（locals 无会话）
  it("只含显示中条目，按 id 降序，字段为 ShelfPublicEntry", async () => {
    await shelf.create({ ...MIN, title: "旧" });
    const hidden = (await shelf.create({ ...MIN, title: "隐书" })).body.id;
    await shelf.hide(hidden);
    await shelf.create(
      { type: "movie", title: "新", creator: "导演", year: 1994, status: "completed", rating: 5, markedOn: "2026-08-20", comment: "好", doubanUrl: "https://movie.douban.com/subject/1292052/", doubanId: "1292052" },
      JPG,
    );
    const res = await getPublic();
    expect({ status: res.status, cache: res.cacheControl, titles: res.body.items.map((e) => e.title), first: res.body.items[0] }).toEqual({
      status: 200,
      cache: "no-store",
      titles: ["新", "旧"],
      first: {
        type: "movie",
        title: "新",
        creator: "导演",
        year: 1994,
        status: "completed",
        rating: 5,
        markedOn: "2026-08-20",
        comment: "好",
        cover: expect.stringMatching(/^\/covers\/\d{4}\/\d{2}\/[a-z2-7]{12}\.jpg$/),
        doubanUrl: "https://movie.douban.com/subject/1292052/",
      },
    });
  });
});
