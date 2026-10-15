import type { APIContext } from "astro";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type { DraftInput } from "../../../src/domains/post/content";
import { D1PostRepo } from "../../../src/domains/post/repo";
import { createPostService } from "../../../src/domains/post/service";
import { createPostHandlers } from "../../../src/pages/api/admin/posts/[id]";

// slug 全站唯一（post domain-model §2.3 不变量 3）：检查与写入在同一条语句中完成，并发写同一 slug 只有一个成功，另一个 409
const NOW = new Date("2026-10-15T00:00:00.000Z");
const draft = (title: string, slug: string): DraftInput => ({ title, slug, tags: [], summary: "", body: "正文", publishedAt: "2026-10-15", cover: null });
const service = createPostService({ repo: new D1PostRepo(env.DB) });
const handlers = createPostHandlers({ db: env.DB, now: () => NOW });

async function put(id: string, body: DraftInput) {
  const request = new Request(`http://localhost:4321/api/admin/posts/${id}`, { method: "PUT", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
  const response = await handlers.PUT({ request, url: new URL(request.url), params: { id } } as unknown as APIContext);
  const json = (await response.json()) as { error?: { code: string } };
  return `${response.status}${json.error ? ` ${json.error.code}` : ""}`;
}

const slugOwners = async (slug: string) =>
  (await env.DB.prepare("SELECT COUNT(*) AS n FROM posts WHERE slug = ?1 OR pub_slug = ?1").bind(slug).first<{ n: number }>())?.n;

describe("slug 并发冲突", () => {
  it("[SC-POSTINFO-08] 两篇文章同时 PUT 同一 slug：一个 200、一个 409 SLUG_TAKEN", async () => {
    const a = (await service.create(draft("A", "race-a"), NOW)).id;
    const b = (await service.create(draft("B", "race-b"), NOW)).id;
    const results = await Promise.all([put(a, draft("A", "race-same")), put(b, draft("B", "race-same"))]);
    expect({ results: results.sort(), owners: await slugOwners("race-same") }).toEqual({ results: ["200", "409 SLUG_TAKEN"], owners: 1 });
  });

  it("[SC-POSTINFO-08] 同时新建两篇同 slug 文章：只有一篇成功", async () => {
    const outcomes = await Promise.allSettled([service.create(draft("C", "race-new"), NOW), service.create(draft("D", "race-new"), NOW)]);
    const rejected = outcomes.flatMap((o) => (o.status === "rejected" ? [(o.reason as Error).name] : []));
    expect({ rejected, owners: await slugOwners("race-new") }).toEqual({ rejected: ["SlugTakenError"], owners: 1 });
  });

  it("[SC-POSTINFO-08] 工作稿改成别人已发布快照的 slug（跨列）：409", async () => {
    const a = Number((await service.create(draft("A", "race-x"), NOW)).id);
    await service.publish(a, NOW);
    await service.saveDraft(a, draft("A", "race-x2"), NOW); // A 工作稿改名，快照仍占用 race-x
    const b = (await service.create(draft("B", "race-b2"), NOW)).id;
    expect(await put(b, draft("B", "race-x"))).toBe("409 SLUG_TAKEN");
  });
});
