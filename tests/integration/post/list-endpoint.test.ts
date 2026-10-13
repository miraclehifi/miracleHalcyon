import type { APIContext } from "astro";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { D1PostRepo } from "../../../src/domains/post/repo";
import { createPostService } from "../../../src/domains/post/service";
import { createListPostsHandler } from "../../../src/pages/api/admin/posts/index";

// GET /api/admin/posts（post api-contract §3）
const NOW = new Date("2026-10-13T00:00:00.000Z");
const handler = createListPostsHandler({ db: env.DB });

async function list(search: string) {
  const url = new URL(`http://localhost:4321/api/admin/posts${search}`);
  const response = await handler({ request: new Request(url), url } as unknown as APIContext);
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

const errorCode = (result: { body: Record<string, unknown> }) => (result.body.error as { code: string } | undefined)?.code;

describe("GET /api/admin/posts", () => {
  it("响应结构与默认参数；非法 status / page / 过长 q → 400", async () => {
    const service = createPostService({ repo: new D1PostRepo(env.DB) });
    await service.create({ title: "Hello Astro", slug: "", tags: ["Astro"], summary: "", body: "", publishedAt: null }, NOW);

    const ok = await list("");
    const searched = await list("?status=draft&q=astro&page=1");

    expect({
      ok: ok.body,
      searched: { status: searched.status, total: searched.body.total },
      badStatus: [(await list("?status=archived")).status, errorCode(await list("?status=archived"))],
      badPage: [(await list("?page=0")).status, (await list("?page=abc")).status, (await list("?page=1.5")).status],
      longQ: (await list(`?q=${"a".repeat(101)}`)).status,
      maxQ: (await list(`?q=${"a".repeat(100)}`)).status,
    }).toEqual({
      ok: {
        items: [{ id: expect.any(String), title: "Hello Astro", status: "draft", hasUnpublishedChanges: false, tags: ["Astro"], updatedAt: NOW.toISOString() }],
        page: 1,
        pageSize: 20,
        total: 1,
        counts: { all: 1, draft: 1, published: 0 },
      },
      searched: { status: 200, total: 1 },
      badStatus: [400, "VALIDATION_FAILED"],
      badPage: [400, 400, 400],
      longQ: 400,
      maxQ: 200,
    });
  });
});
