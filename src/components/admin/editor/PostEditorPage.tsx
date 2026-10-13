// 写文章页（admin-post-editor.md，US-03）：状态容器 + 布局。文章由页面 SSR 传入（新建为 null）
// 桌面三栏：编辑 | 预览 | 设置抽屉（340px）；< 1024px 只显示编辑区，抽屉浮在内容上方
// 标签、预览渲染、自动保存、发布由后续任务接入
import { useState } from "react";
import { slugify } from "../../../domains/post/slug";
import type { PostView } from "../../../domains/post/service";
import { useHydrated } from "../../../lib/dom/hydration";
import { localDate } from "../../../lib/format/local-date";
import { Button } from "../../ui/Button";
import { badgeStatus } from "../../ui/StatusBadge";
import { EditorTopBar } from "./EditorTopBar";
import { MarkdownEditor } from "./MarkdownEditor";
import { PostSettingsDrawer } from "./PostSettingsDrawer";

export interface PostEditorPageProps {
  initial: PostView | null; // null：新建
}

export interface DraftState {
  title: string;
  slug: string;
  tags: string[];
  summary: string;
  body: string;
  publishedAt: string | null; // null：新建未选择，按今天
}

function initialDraft(post: PostView | null): DraftState {
  if (!post) return { title: "", slug: "", tags: [], summary: "", body: "", publishedAt: null };
  const { title, slug, tags, summary, body, publishedAt } = post;
  return { title, slug, tags, summary, body, publishedAt };
}

export function PostEditorPage({ initial }: PostEditorPageProps) {
  const [draft, setDraft] = useState(() => initialDraft(initial));
  // slug 跟随标题，直到作者手动改过（editor module-spec §4）；已有文章 slug ≠ slugify(标题) 即视为改过；不持久化
  const [slugTouched, setSlugTouched] = useState(() => initial !== null && initial.slug !== slugify(initial.title));
  // 抽屉默认：新建时打开（方便填信息），编辑已有文章时关闭；不跨文章记忆
  const [settingsOpen, setSettingsOpen] = useState(initial === null);
  const hydrated = useHydrated();
  const status = initial ? badgeStatus(initial.status, initial.hasUnpublishedChanges) : "draft";
  // 发布日期默认浏览器本地的今天；服务端不知道作者时区，水合前留空
  const publishedAt = draft.publishedAt ?? (hydrated ? localDate(new Date()) : "");

  const update = (patch: Partial<DraftState>) => setDraft((prev) => ({ ...prev, ...patch }));
  const onTitleChange = (title: string) => update(slugTouched ? { title } : { title, slug: slugify(title) });
  const onSlugChange = (slug: string) => {
    setSlugTouched(true);
    update({ slug });
  };

  return (
    <div className="flex h-dvh flex-col">
      <EditorTopBar
        status={status}
        settingsOpen={settingsOpen}
        onToggleSettings={() => setSettingsOpen((open) => !open)}
        primaryAction={<Button disabled>{status === "draft" ? "发布" : "发布更新"}</Button>}
      />
      <div className="relative flex min-h-0 flex-1">
        <section aria-label="编辑" className="flex min-w-0 flex-1 flex-col border-r border-line px-9 pt-7 max-lg:border-r-0 max-md:px-4 max-md:pt-4">
          <MarkdownEditor title={draft.title} body={draft.body} onTitleChange={onTitleChange} onBodyChange={(body) => update({ body })} />
        </section>
        <section aria-label="预览" className="min-w-0 flex-1 overflow-y-auto bg-surface px-10 py-7 max-lg:hidden">
          <p className="text-caption tracking-[1px] text-ink-faint">预览</p>
          <h1 className="mt-4 font-prose-heading text-display font-bold text-ink">{draft.title || "无标题"}</h1>
        </section>
        {settingsOpen && (
          <PostSettingsDrawer
            slug={draft.slug}
            slugTitleFallback={draft.title.trim() !== "" && slugify(draft.title) === ""}
            summary={draft.summary}
            publishedAt={publishedAt}
            onSlugChange={onSlugChange}
            onSummaryChange={(summary) => update({ summary })}
            onPublishedAtChange={(date) => update({ publishedAt: date || null })}
            onClose={() => setSettingsOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
