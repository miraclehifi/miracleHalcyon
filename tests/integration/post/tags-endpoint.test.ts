import type { APIContext } from "astro";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { D1PostRepo } from "../../../src/domains/post/repo";
import { createPostService } from "../../../src/domains/post/service";
import { createTagsHandler } from "../../../src/pages/api/admin/tags";

// GET /api/admin/tags?q=（post api-contract §3）
const NOW = new Date("2026-10-13T00:00:00.000Z");
const handler = createTagsHandler({ db: env.DB });

async function tags(search: string) {
  const url = new URL(`http://localhost:4321/api/admin/tags${search}`);
  const response = await handler({ request: new Request(url), url } as unknown as APIContext);
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

describe("GET /api/admin/tags", () => {
  it("返回 { tags: [{ name, count }] }；q 超过 100 字 400", async () => {
    const service = createPostService({ repo: new D1PostRepo(env.DB) });
    await service.create({ title: "", slug: "", tags: ["Astro", "读书"], summary: "", body: "", publishedAt: null }, NOW);

    expect({
      all: await tags(""),
      filtered: await tags("?q=ast"),
      tooLong: (await tags(`?q=${"字".repeat(101)}`)).status,
    }).toEqual({
      all: { status: 200, body: { tags: [{ name: "Astro", count: 1 }, { name: "读书", count: 1 }] } },
      filtered: { status: 200, body: { tags: [{ name: "Astro", count: 1 }] } },
      tooLong: 400,
    });
  });
});
