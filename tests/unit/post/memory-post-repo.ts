// 单元测试用内存文章仓储，行为与 D1PostRepo 一致
import type { PostContent } from "../../../src/domains/post/content";
import type { Post, PostId } from "../../../src/domains/post/post";
import type { ListQuery, NewPostRow, PostRepo, PostSummary, StatusCounts, TagSuggestion } from "../../../src/domains/post/repo";

export class MemoryPostRepo implements PostRepo {
  rows = new Map<PostId, Post>();
  private nextId = 1;

  async insert({ draft, draftHash, createdAt }: NewPostRow): Promise<PostId> {
    const id = this.nextId++;
    this.rows.set(id, { id, draft, draftHash, published: null, pubHash: null, lastPublishedAt: null, createdAt, updatedAt: createdAt });
    return id;
  }

  async get(id: PostId): Promise<Post | null> {
    return this.rows.get(id) ?? null;
  }

  async updateDraft(id: PostId, draft: PostContent, draftHash: string, now: Date): Promise<boolean> {
    const post = this.rows.get(id);
    if (!post) return false;
    this.rows.set(id, { ...post, draft, draftHash, updatedAt: now });
    return true;
  }

  async setPublished(id: PostId, published: PostContent | null, pubHash: string | null, at: Date | null): Promise<boolean> {
    const post = this.rows.get(id);
    if (!post) return false;
    this.rows.set(id, { ...post, published, pubHash, lastPublishedAt: at });
    return true;
  }

  async delete(id: PostId): Promise<Post | null> {
    const post = this.rows.get(id) ?? null;
    this.rows.delete(id);
    return post;
  }

  async slugTaken(slug: string, exceptId: PostId = 0): Promise<boolean> {
    if (slug === "") return false;
    return [...this.rows.values()].some((p) => p.id !== exceptId && (p.draft.slug === slug || p.published?.slug === slug));
  }

  async list({ status, q, page, pageSize }: ListQuery): Promise<{ rows: PostSummary[]; total: number; counts: StatusCounts }> {
    const matched = [...this.rows.values()].filter((p) => p.draft.title.toLowerCase().includes(q.toLowerCase()));
    const filtered = matched
      .filter((p) => status === "all" || (status === "draft") === (p.pubHash === null))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime() || b.id - a.id);
    const rows = filtered.slice((page - 1) * pageSize, page * pageSize).map((p) => ({
      id: p.id,
      title: p.draft.title,
      tags: p.draft.tags,
      draftHash: p.draftHash,
      pubHash: p.pubHash,
      updatedAt: p.updatedAt,
    }));
    const draft = matched.filter((p) => p.pubHash === null).length;
    return { rows, total: filtered.length, counts: { all: matched.length, draft, published: matched.length - draft } };
  }

  // 标签补全只在 D1 集成测试中验证（tests/integration/post/tags-query.test.ts）
  async tags(): Promise<TagSuggestion[]> {
    return [];
  }
}
