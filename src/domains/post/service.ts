// PostService（post domain-model §4）：新建、自动保存、读取；发布 / 撤回等由后续任务补充
import { normalizeContent, type DraftInput } from "./content";
import { contentHash } from "./content-hash";
import { NotFoundError } from "./errors";
import { deriveStatus, type Post, type PostId, type PostStatus } from "./post";
import type { PostRepo } from "./repo";

// API 中的文章对象（post api-contract §2）：内容取工作稿
export interface PostView {
  id: string;
  title: string;
  slug: string;
  tags: string[];
  summary: string;
  body: string;
  publishedAt: string | null;
  status: PostStatus;
  hasUnpublishedChanges: boolean;
  lastPublishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toPostView(post: Post): PostView {
  return {
    id: String(post.id),
    ...post.draft,
    tags: [...post.draft.tags],
    ...deriveStatus(post),
    lastPublishedAt: post.lastPublishedAt?.toISOString() ?? null,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}

export interface PostServiceDeps {
  repo: PostRepo;
}

export function createPostService({ repo }: PostServiceDeps) {
  async function load(id: PostId): Promise<Post> {
    const post = await repo.get(id);
    if (!post) throw new NotFoundError(id);
    return post;
  }

  return {
    async create(input: DraftInput, now: Date): Promise<PostView> {
      const draft = normalizeContent(input);
      const id = await repo.insert({ draft, draftHash: await contentHash(draft), createdAt: now });
      return toPostView(await load(id));
    },

    // 整份覆盖工作稿；永远不改已发布快照（不变量 1）
    async saveDraft(id: PostId, input: DraftInput, now: Date): Promise<PostView> {
      const draft = normalizeContent(input);
      if (!(await repo.updateDraft(id, draft, await contentHash(draft), now))) throw new NotFoundError(id);
      return toPostView(await load(id));
    },

    async getForEdit(id: PostId): Promise<PostView | null> {
      const post = await repo.get(id);
      return post ? toPostView(post) : null;
    },
  };
}

export type PostService = ReturnType<typeof createPostService>;
