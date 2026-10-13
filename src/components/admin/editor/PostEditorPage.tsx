// 写文章页（admin-post-editor.md，US-03）：状态容器 + 布局。文章由页面 SSR 传入（新建为 null）
// 桌面三栏：编辑 | 预览 | 设置抽屉（340px）；< 1024px 只显示编辑区，抽屉浮在内容上方
// 编辑区细节、设置字段、预览渲染、自动保存、发布由后续任务接入
import { useState } from "react";
import type { PostView } from "../../../domains/post/service";
import { Button } from "../../ui/Button";
import { IconButton } from "../../ui/IconButton";
import { badgeStatus } from "../../ui/StatusBadge";
import { EditorTopBar } from "./EditorTopBar";

export interface PostEditorPageProps {
  initial: PostView | null; // null：新建
}

export interface DraftState {
  title: string;
  slug: string;
  tags: string[];
  summary: string;
  body: string;
  publishedAt: string | null;
}

function initialDraft(post: PostView | null): DraftState {
  if (!post) return { title: "", slug: "", tags: [], summary: "", body: "", publishedAt: null };
  const { title, slug, tags, summary, body, publishedAt } = post;
  return { title, slug, tags, summary, body, publishedAt };
}

export function PostEditorPage({ initial }: PostEditorPageProps) {
  const [draft, setDraft] = useState(() => initialDraft(initial));
  // 抽屉默认：新建时打开（方便填信息），编辑已有文章时关闭；不跨文章记忆
  const [settingsOpen, setSettingsOpen] = useState(initial === null);
  const status = initial ? badgeStatus(initial.status, initial.hasUnpublishedChanges) : "draft";
  const update = (patch: Partial<DraftState>) => setDraft((prev) => ({ ...prev, ...patch }));

  return (
    <div className="flex h-dvh flex-col">
      <EditorTopBar
        status={status}
        settingsOpen={settingsOpen}
        onToggleSettings={() => setSettingsOpen((open) => !open)}
        primaryAction={<Button disabled>{status === "draft" ? "发布" : "发布更新"}</Button>}
      />
      <div className="relative flex min-h-0 flex-1">
        <section aria-label="编辑" className="flex min-w-0 flex-1 flex-col gap-[18px] border-r border-line px-9 pt-7 max-lg:border-r-0 max-md:px-4 max-md:pt-4">
          <input
            aria-label="标题"
            placeholder="无标题"
            value={draft.title}
            onChange={(event) => update({ title: event.target.value })}
            className="w-full bg-transparent text-display font-semibold text-ink outline-none placeholder:text-ink-faint max-md:text-[26px]"
          />
          <textarea
            aria-label="正文"
            value={draft.body}
            onChange={(event) => update({ body: event.target.value })}
            spellCheck={false}
            className="min-h-0 w-full flex-1 resize-none bg-transparent font-mono text-ui leading-[1.5] text-ink outline-none max-md:text-base"
          />
        </section>
        <section aria-label="预览" className="min-w-0 flex-1 overflow-y-auto bg-surface px-10 py-7 max-lg:hidden">
          <p className="text-caption tracking-[1px] text-ink-faint">预览</p>
          <h1 className="mt-4 font-prose-heading text-display font-bold text-ink">{draft.title || "无标题"}</h1>
        </section>
        {settingsOpen && (
          <aside
            id="post-settings"
            aria-label="文章设置"
            className="flex w-[340px] shrink-0 flex-col gap-5 border-l border-line bg-bg px-6 py-5 max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:z-10 max-lg:shadow-xl max-md:w-full"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-ui font-semibold text-ink">文章设置</h2>
              <IconButton icon="x" aria-label="关闭设置" onClick={() => setSettingsOpen(false)} />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
