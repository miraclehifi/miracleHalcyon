import { describe, expect, it } from "vitest";
import type { DraftInput } from "../../../src/domains/post/content";
import type { PublicationChange } from "../../../src/domains/post/hooks";
import { createPostService } from "../../../src/domains/post/service";
import { MemoryPostRepo } from "./memory-post-repo";

// [SC-DELETE-01][SC-DELETE-04] TC-US09-06：任意状态 → deleted；deleted 上的操作一律 POST_NOT_FOUND
const NOW = new Date("2026-10-14T03:00:00.000Z");
const input = (slug: string, body = "正文"): DraftInput => ({ title: "Hello", slug, tags: [], summary: "", body, publishedAt: "2026-10-14" });

async function setup() {
  const repo = new MemoryPostRepo();
  const changes: PublicationChange[] = [];
  const service = createPostService({ repo, hooks: { onPublicationChanged: async (change) => void changes.push(change) } });
  const create = async (slug: string) => Number((await service.create(input(slug), NOW)).id);
  return { repo, changes, service, create };
}

const code = (promise: Promise<unknown>) => promise.then(() => "ok", (error: { code?: string }) => error.code);

describe("PostService.delete", () => {
  it("D1–D4：草稿、撤回后的草稿、已发布（clean / dirty）都能删除；只有当前已发布的触发 deleted 钩子（快照 slug）", async () => {
    const { repo, changes, service, create } = await setup();
    const neverPublished = await create("d1");
    const unpublished = await create("d2");
    await service.publish(unpublished, NOW);
    await service.unpublish(unpublished);
    const clean = await create("d3");
    await service.publish(clean, NOW);
    const dirty = await create("d4");
    await service.publish(dirty, NOW);
    await service.saveDraft(dirty, input("d4-renamed", "D2"), NOW);
    changes.length = 0;

    for (const id of [neverPublished, unpublished, clean, dirty]) await service.delete(id);

    expect({ remaining: repo.rows.size, changes }).toEqual({
      remaining: 0,
      changes: [
        { kind: "deleted", slug: "d3" },
        { kind: "deleted", slug: "d4" },
      ],
    });
  });

  it("D5–D7：已删除的文章再删除、发布、撤回、保存都是 POST_NOT_FOUND，且不重新创建", async () => {
    const { repo, service, create } = await setup();
    const id = await create("gone");
    await service.delete(id);
    expect({
      codes: await Promise.all([code(service.delete(id)), code(service.publish(id, NOW)), code(service.unpublish(id)), code(service.saveDraft(id, input("gone"), NOW))]),
      rows: repo.rows.size,
      edit: await service.getForEdit(id),
    }).toEqual({ codes: ["POST_NOT_FOUND", "POST_NOT_FOUND", "POST_NOT_FOUND", "POST_NOT_FOUND"], rows: 0, edit: null });
  });

  it("删除释放 slug；钩子失败不影响删除", async () => {
    const repo = new MemoryPostRepo();
    const service = createPostService({ repo, hooks: { onPublicationChanged: async () => Promise.reject(new Error("deploy hook down")) } });
    const id = Number((await service.create(input("reuse"), NOW)).id);
    await service.publish(id, NOW);
    await service.delete(id);
    expect(await code(service.create(input("reuse"), NOW))).toBe("ok");
  });
});
