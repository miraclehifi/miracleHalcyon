import type { APIContext } from "astro";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { createCreatePostHandler } from "../../../src/pages/api/admin/posts/index";

// POST /api/admin/posts（post api-contract §3）
const NOW = new Date("2026-10-13T06:30:00.000Z");
const handler = createCreatePostHandler({ db: env.DB, now: () => NOW });

async function call(body: unknown) {
  const request = new Request("http://localhost:4321/api/admin/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  const response = await handler({ request, url: new URL(request.url) } as unknown as APIContext);
  return { status: response.status, location: response.headers.get("Location"), body: (await response.json()) as Record<string, unknown> };
}

describe("POST /api/admin/posts", () => {
  it("201 + Location + PostView 全字段；400 带 fields；409 SLUG_TAKEN", async () => {
    const created = await call({ title: "", slug: "hello-astro", tags: ["Astro"], summary: "", body: "正文", publishedAt: "2026-10-13" });
    const defaults = await call({});
    const invalid = await call({ summary: "字".repeat(201), tags: "Astro", slug: "Hello_World" });
    const badJson = await call("{");
    const taken = await call({ slug: "hello-astro" });

    expect({
      created: { status: created.status, location: created.location, body: created.body },
      defaults: { status: defaults.status, title: defaults.body.title, slug: defaults.body.slug, tags: defaults.body.tags, publishedAt: defaults.body.publishedAt },
      invalid: { status: invalid.status, error: invalid.body.error },
      badJson: { status: badJson.status, code: (badJson.body.error as { code: string }).code },
      taken: { status: taken.status, error: taken.body.error },
    }).toEqual({
      created: {
        status: 201,
        location: `/api/admin/posts/${created.body.id}`,
        body: {
          id: expect.stringMatching(/^\d+$/),
          title: "无标题",
          slug: "hello-astro",
          tags: ["Astro"],
          summary: "",
          body: "正文",
          publishedAt: "2026-10-13",
          status: "draft",
          hasUnpublishedChanges: false,
          lastPublishedAt: null,
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
        },
      },
      defaults: { status: 201, title: "无标题", slug: "", tags: [], publishedAt: null },
      invalid: {
        status: 400,
        error: {
          code: "VALIDATION_FAILED",
          message: "slug 只能包含小写字母、数字和连字符；标签最多 10 个，每个不超过 32 字；摘要不能超过 200 字",
          fields: ["slug", "tags", "summary"],
        },
      },
      badJson: { status: 400, code: "VALIDATION_FAILED" },
      taken: { status: 409, error: { code: "SLUG_TAKEN", message: "slug 已存在，请换一个" } },
    });
  });
});
