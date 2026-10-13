import type { APIContext } from "astro";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type { DraftInput } from "../../../src/domains/post/content";
import { D1PostRepo } from "../../../src/domains/post/repo";
import { createPostService } from "../../../src/domains/post/service";
import { createPostHandlers } from "../../../src/pages/api/admin/posts/[id]";

// PUT /api/admin/posts/:id（post api-contract §3）：自动保存，整份工作稿
const CREATED = new Date("2026-10-13T00:00:00.000Z");
const SAVED = new Date("2026-10-13T06:30:00.000Z");
const handlers = createPostHandlers({ db: env.DB, now: () => SAVED });
const draft = (slug: string, body = "正文"): DraftInput => ({ title: "Hello", slug, tags: [], summary: "", body, publishedAt: "2026-10-13" });

async function put(id: string, body: unknown) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  const request = new Request(`http://localhost:4321/api/admin/posts/${id}`, { method: "PUT", body: text, headers: { "Content-Type": "application/json" } });
  const response = await handlers.PUT({ request, url: new URL(request.url), params: { id } } as unknown as APIContext);
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

const code = (result: { body: Record<string, unknown> }) => (result.body.error as { code: string; fields?: string[] }) ?? null;

describe("PUT /api/admin/posts/:id", () => {
  it("200；缺字段 400；status 字段被忽略；404；409；> 1MB 413", async () => {
    const service = createPostService({ repo: new D1PostRepo(env.DB) });
    const { id } = await service.create(draft("mine"), CREATED);
    await service.create(draft("taken"), CREATED);

    const ok = await put(id, { ...draft("mine", "新正文"), status: "published", hasUnpublishedChanges: true, id: "999" });
    const withoutBody: Partial<DraftInput> = draft("mine");
    delete withoutBody.body;
    const missingField = await put(id, withoutBody);
    const missing = await put("9999", draft("x"));
    const taken = await put(id, draft("taken", "冲突时不保存"));
    const tooLarge = await put(id, JSON.stringify({ ...draft("mine"), body: "x".repeat(1024 * 1024) }));
    const after = await service.getForEdit(Number(id));

    expect({
      ok: { status: ok.status, body: ok.body.body, statusField: ok.body.status, id: ok.body.id, updatedAt: ok.body.updatedAt },
      missingField: { status: missingField.status, error: code(missingField) },
      missing: { status: missing.status, code: code(missing)?.code },
      taken: { status: taken.status, code: code(taken)?.code },
      tooLarge: { status: tooLarge.status, code: code(tooLarge)?.code },
      notOverwritten: after?.body,
    }).toEqual({
      ok: { status: 200, body: "新正文", statusField: "draft", id, updatedAt: SAVED.toISOString() },
      missingField: { status: 400, error: { code: "VALIDATION_FAILED", message: "请求缺少字段：body", fields: ["body"] } },
      missing: { status: 404, code: "POST_NOT_FOUND" },
      taken: { status: 409, code: "SLUG_TAKEN" },
      tooLarge: { status: 413, code: "PAYLOAD_TOO_LARGE" },
      notOverwritten: "新正文",
    });
  });
});
