// 单元测试用内存文章仓储，行为与 D1PostRepo 一致
import type { PostContent } from "../../../src/domains/post/content";
import type { Post, PostId } from "../../../src/domains/post/post";
import type { NewPostRow, PostRepo } from "../../../src/domains/post/repo";

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

  async slugTaken(slug: string, exceptId: PostId = 0): Promise<boolean> {
    if (slug === "") return false;
    return [...this.rows.values()].some((p) => p.id !== exceptId && (p.draft.slug === slug || p.published?.slug === slug));
  }
}
