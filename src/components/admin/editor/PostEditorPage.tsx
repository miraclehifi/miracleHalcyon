// 写文章页（admin-post-editor.md，US-03 / US-06）：状态容器 + 布局。文章由页面 SSR 传入（新建为 null）
// 桌面三栏：编辑 | 预览 | 设置抽屉（340px）；< 1024px 只显示编辑区，抽屉浮在内容上方
// 任何字段变化都交给自动保存（停止输入 2 秒后保存；Ctrl / ⌘ + S 立即保存）；预览渲染、发布由后续任务接入
import { useEffect, useState } from "react";
import type { DraftInput } from "../../../domains/post/content";
import type { PostStatus } from "../../../domains/post/post";
import { slugify } from "../../../domains/post/slug";
import type { PostView } from "../../../domains/post/service";
import type { AutosaveState } from "../../../lib/autosave/controller";
import { useAutosave } from "../../../lib/autosave/useAutosave";
import { useHydrated } from "../../../lib/dom/hydration";
import { localDate } from "../../../lib/format/local-date";
import { Button } from "../../ui/Button";
import { SaveIndicator, type SaveState } from "../../ui/SaveIndicator";
import { badgeStatus } from "../../ui/StatusBadge";
import { EditorTopBar } from "./EditorTopBar";
import { MarkdownEditor } from "./MarkdownEditor";
import { PostSettingsDrawer } from "./PostSettingsDrawer";
import { TagInput } from "./TagInput";

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

interface ServerState {
  status: PostStatus;
  hasUnpublishedChanges: boolean;
}

function initialDraft(post: PostView | null): DraftState {
  if (!post) return { title: "", slug: "", tags: [], summary: "", body: "", publishedAt: null };
  const { title, slug, tags, summary, body, publishedAt } = post;
  return { title, slug, tags, summary, body, publishedAt };
}

// 自动保存状态 → 顶栏保存状态（idle：新建未保存过，不显示）。冲突 / 校验错误显示在字段上，这里只显示"未保存"
function saveIndicatorState({ status, error }: AutosaveState): SaveState | null {
  if (status === "idle") return null;
  if (status === "failed") return error?.kind === "network" || error?.kind === "server" ? "failed" : "unsaved";
  return status === "dirty" ? "unsaved" : status;
}

const isSaveShortcut = (event: KeyboardEvent) => (event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "s";

export function PostEditorPage({ initial }: PostEditorPageProps) {
  const [draft, setDraft] = useState(() => initialDraft(initial));
  const [server, setServer] = useState<ServerState>(() => ({
    status: initial?.status ?? "draft",
    hasUnpublishedChanges: initial?.hasUnpublishedChanges ?? false,
  }));
  // slug 跟随标题，直到作者手动改过（editor module-spec §4）；已有文章 slug ≠ slugify(标题) 即视为改过；不持久化
  const [slugTouched, setSlugTouched] = useState(() => initial !== null && initial.slug !== slugify(initial.title));
  // 抽屉默认：新建时打开（方便填信息），编辑已有文章时关闭；不跨文章记忆
  const [settingsOpen, setSettingsOpen] = useState(initial === null);
  const [slugError, setSlugError] = useState<string | undefined>(); // 服务端 409 SLUG_TAKEN，改 slug 后清除
  const hydrated = useHydrated();
  // 发布日期默认浏览器本地的今天；服务端不知道作者时区，水合前留空
  const publishedAt = draft.publishedAt ?? (hydrated ? localDate(new Date()) : "");

  const autosave = useAutosave({
    postId: initial?.id ?? null,
    getContent: (): DraftInput => ({ ...draft, publishedAt: publishedAt || null }),
    onCreated: (id) => window.history.replaceState(null, "", `/admin/posts/${id}`), // 不刷新，光标与内容保留
    onSaved: (post) => setServer({ status: post.status, hasUnpublishedChanges: post.hasUnpublishedChanges }),
    onError: (error) => {
      if (error.code !== "SLUG_TAKEN") return;
      setSlugError(error.message ?? "slug 已存在，请换一个");
      setSettingsOpen(true); // 自动打开设置抽屉，让作者看到字段错误
    },
  });
  const { edit, flush } = autosave;
  const unsaved = autosave.status === "dirty" || autosave.status === "saving" || autosave.status === "failed";

  // 有未保存修改时离开页面 → 浏览器原生离开确认
  useEffect(() => {
    if (!unsaved) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [unsaved]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isSaveShortcut(event)) return;
      event.preventDefault(); // 不弹浏览器"另存为"
      void flush();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [flush]);

  const update = (patch: Partial<DraftState>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    edit();
  };
  const onTitleChange = (title: string) => update(slugTouched ? { title } : { title, slug: slugify(title) });
  const onSlugChange = (slug: string) => {
    setSlugTouched(true);
    setSlugError(undefined);
    update({ slug });
  };

  const status = badgeStatus(server.status, server.hasUnpublishedChanges);
  const indicator = saveIndicatorState(autosave);

  return (
    <div className="flex h-dvh flex-col">
      <EditorTopBar
        status={status}
        saveIndicator={indicator && <SaveIndicator state={indicator} savedAt={autosave.savedAt ? new Date(autosave.savedAt) : undefined} />}
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
            slugError={slugError}
            tagsField={<TagInput tags={draft.tags} onChange={(tags) => update({ tags })} />}
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
