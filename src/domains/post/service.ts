// PostService（post domain-model §4）：新建、自动保存、读取、列表、发布、撤回、标签补全；删除由后续任务补充
import { normalizeContent, type DraftInput, type PostContent } from "./content";
import { contentHash } from "./content-hash";
import { MissingFieldsError, NotFoundError, NotPublishedError, SlugTakenError } from "./errors";
import { noopHooks, type PublicationChange, type PublicationHooks } from "./hooks";
import { deriveStatus, validateForPublish, type Post, type PostId, type PostStatus } from "./post";
import type { ListStatus, PostRepo, PostSummary, StatusCounts, TagSuggestion } from "./repo";

// API 中的文章对象（post api-contract §2）：内容取工作稿
export interface PostView {
  id: string;
  title: string;
  slug: string;
  tags: string[];
  summary: string;
  body: string;
  publishedAt: string | null;
  cover: string | null; // 工作稿封面（F-002）
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
    cover: post.draft.cover ?? null,
    ...deriveStatus(post),
    lastPublishedAt: post.lastPublishedAt?.toISOString() ?? null,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}

// 后台列表项（post api-contract §2 PostListItem）
export interface PostListItem {
  id: string;
  title: string;
  status: PostStatus;
  hasUnpublishedChanges: boolean;
  tags: string[];
  updatedAt: string;
}

export interface PostListResult {
  items: PostListItem[];
  page: number;
  pageSize: number;
  total: number;
  counts: StatusCounts;
}

export const PAGE_SIZE = 20;
export const TAG_SUGGESTIONS = 10;

function toListItem(row: PostSummary): PostListItem {
  return { id: String(row.id), title: row.title, ...deriveStatus(row), tags: row.tags, updatedAt: row.updatedAt.toISOString() };
}

export interface PostServiceDeps {
  repo: PostRepo;
  hooks?: PublicationHooks;
}

// 发布时 publishedAt 为空的兜底：取 UTC 当天（新建时前端已按作者本地日期填入）
const utcDate = (now: Date) => now.toISOString().slice(0, 10);

export function createPostService({ repo, hooks = noopHooks }: PostServiceDeps) {
  // 钩子失败只记日志，不让发布失败（作者可在 Cloudflare 控制台手动重建）
  async function notify(change: PublicationChange): Promise<void> {
    try {
      await hooks.onPublicationChanged(change);
    } catch (error) {
      console.error("onPublicationChanged failed", change.kind, change.slug, error);
    }
  }

  async function load(id: PostId): Promise<Post> {
    const post = await repo.get(id);
    if (!post) throw new NotFoundError(id);
    return post;
  }

  // slug 全站唯一（不变量 3）：他人的工作稿或快照占用时整份不保存
  async function assertSlugFree(slug: string, exceptId?: PostId): Promise<void> {
    if (await repo.slugTaken(slug, exceptId)) throw new SlugTakenError(slug);
  }

  // 带条件的写入没有生效：slug 在检查之后被并发请求占用，或文章已被删除
  async function writeFailed(id: PostId, slug: string): Promise<never> {
    if (await repo.slugTaken(slug, id)) throw new SlugTakenError(slug);
    throw new NotFoundError(id);
  }

  return {
    async create(input: DraftInput, now: Date): Promise<PostView> {
      const draft = normalizeContent(input);
      await assertSlugFree(draft.slug);
      const id = await repo.insert({ draft, draftHash: await contentHash(draft), createdAt: now });
      if (id === null) throw new SlugTakenError(draft.slug); // 检查之后被并发请求占用
      return toPostView(await load(id));
    },

    // 整份覆盖工作稿；永远不改已发布快照（不变量 1）
    async saveDraft(id: PostId, input: DraftInput, now: Date): Promise<PostView> {
      const draft = normalizeContent(input);
      await load(id); // 先确认存在：不存在的文章应得到 POST_NOT_FOUND 而不是 SLUG_TAKEN
      await assertSlugFree(draft.slug, id);
      if (!(await repo.updateDraft(id, draft, await contentHash(draft), now))) await writeFailed(id, draft.slug);
      return toPostView(await load(id));
    },

    // 发布与发布更新共用；已发布且无修改时幂等（不更新时间、不触发钩子）
    async publish(id: PostId, now: Date): Promise<PostView> {
      const post = await load(id);
      const { status, hasUnpublishedChanges } = deriveStatus(post);
      if (status === "published" && !hasUnpublishedChanges) return toPostView(post);

      const check = validateForPublish(post.draft);
      if (!check.ok) throw new MissingFieldsError(check.missing);
      await assertSlugFree(post.draft.slug, id);

      let draft: PostContent = post.draft;
      let draftHash = post.draftHash;
      if (draft.publishedAt === null) {
        draft = { ...draft, publishedAt: utcDate(now) };
        draftHash = await contentHash(draft);
        if (!(await repo.updateDraft(id, draft, draftHash, now))) await writeFailed(id, draft.slug); // 补的日期同时写回工作稿
      }
      if (!(await repo.setPublished(id, draft, draftHash, now))) await writeFailed(id, draft.slug);

      const prevSlug = post.published?.slug;
      await notify(
        prevSlug === undefined
          ? { kind: "published", slug: draft.slug }
          : { kind: "updated", slug: draft.slug, ...(prevSlug !== draft.slug && { prevSlug }) },
      );
      return toPostView(await load(id));
    },

    // 撤回：清空快照与 lastPublishedAt，工作稿（含未发布修改）保持不变（US-08 S11）
    async unpublish(id: PostId): Promise<PostView> {
      const post = await load(id);
      if (!post.published) throw new NotPublishedError(id);
      await repo.setPublished(id, null, null, null);
      await notify({ kind: "unpublished", slug: post.published.slug });
      return toPostView(await load(id));
    },

    // 删除整行（US-09）；当前已发布时触发 deleted 钩子（读者页按快照 slug 重建）。
    // 曾发布但已撤回的文章读者端早已 404、撤回时已触发过钩子，不再触发。正文引用的图片不删
    async delete(id: PostId): Promise<void> {
      const removed = await repo.delete(id);
      if (!removed) throw new NotFoundError(id);
      if (removed.published) await notify({ kind: "deleted", slug: removed.published.slug });
    },

    // 列表（§6）：超出页码返回空 items，不报错
    async list({ status, q, page }: { status: ListStatus; q: string; page: number }): Promise<PostListResult> {
      const { rows, total, counts } = await repo.list({ status, q: q.trim(), page, pageSize: PAGE_SIZE });
      return { items: rows.map(toListItem), page, pageSize: PAGE_SIZE, total, counts };
    },

    // 标签补全（US-03-6）：q 为空时返回最常用的 10 个
    suggestTags(q: string): Promise<TagSuggestion[]> {
      return repo.tags(q.trim(), TAG_SUGGESTIONS);
    },

    async getForEdit(id: PostId): Promise<PostView | null> {
      const post = await repo.get(id);
      return post ? toPostView(post) : null;
    },
  };
}

export type PostService = ReturnType<typeof createPostService>;
