// PostSettingsDrawer（admin-post-editor.md"设置抽屉"）：Slug、标签、摘要、发布日期
// 受控组件：字段值与 slug 跟随规则由 PostEditorPage 管理；标签输入、撤回 / 删除由后续任务接入
import type { ReactNode } from "react";
import { isValidSlug } from "../../../domains/post/slug";
import { Field, FIELD_CONTROL_CLASS } from "../../ui/Field";
import { IconButton } from "../../ui/IconButton";

export const SUMMARY_MAX = 200;

export interface PostSettingsDrawerProps {
  slug: string;
  slugTitleFallback: boolean; // 标题非空但生成不出 slug（如中文标题）
  slugError?: string; // 服务端错误，如"slug 已存在，请换一个"
  summary: string;
  publishedAt: string; // YYYY-MM-DD；水合前为空串
  tagsField?: ReactNode;
  onSlugChange(slug: string): void;
  onSummaryChange(summary: string): void;
  onPublishedAtChange(date: string): void;
  onClose(): void;
}

// 与服务端一致按码位计数，避免前端放行、保存时被拒
const charCount = (text: string) => [...text].length;

function slugNote(slug: string, fallback: boolean): { hint?: string; error?: string } {
  if (slug && !isValidSlug(slug)) return { error: "仅允许小写字母、数字和连字符" };
  if (!slug && fallback) return { hint: "请填写英文 slug" };
  return { hint: `/posts/${slug} · 仅小写字母、数字、连字符` };
}

export function PostSettingsDrawer(props: PostSettingsDrawerProps) {
  const { slug, slugTitleFallback, slugError, summary, publishedAt, tagsField } = props;
  const note = slugNote(slug, slugTitleFallback);
  const summaryCount = charCount(summary);
  const summaryOver = summaryCount > SUMMARY_MAX;

  // 摘要超过 200 字后不能再变长（粘贴超出部分截掉）；已有的超长内容可以删减
  const onSummaryInput = (next: string) => {
    if (charCount(next) > SUMMARY_MAX && charCount(next) > summaryCount) {
      props.onSummaryChange([...next].slice(0, Math.max(SUMMARY_MAX, summaryCount)).join(""));
      return;
    }
    props.onSummaryChange(next);
  };

  return (
    <aside
      id="post-settings"
      aria-label="文章设置"
      className="flex w-[340px] shrink-0 flex-col gap-5 overflow-y-auto border-l border-line bg-bg px-6 py-5 max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:z-10 max-lg:shadow-xl max-md:w-full"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-title-sm font-semibold text-ink">文章设置</h2>
        <IconButton icon="x" aria-label="关闭设置" onClick={props.onClose} />
      </div>
      <Field label="Slug（文章网址）" hint={note.hint} error={slugError ?? note.error}>
        <input
          value={slug}
          onChange={(event) => props.onSlugChange(event.target.value)}
          spellCheck={false}
          autoCapitalize="off"
          className="font-mono md:text-meta"
        />
      </Field>
      {tagsField}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <label htmlFor="post-summary" className="text-meta font-medium text-ink-muted">
            摘要
          </label>
          <span aria-live="polite" className={`text-caption tabular-nums ${summaryOver ? "text-danger" : "text-ink-faint"}`}>
            {summaryCount} / {SUMMARY_MAX}
          </span>
        </div>
        <textarea
          id="post-summary"
          rows={4}
          value={summary}
          onChange={(event) => onSummaryInput(event.target.value)}
          aria-invalid={summaryOver || undefined}
          aria-describedby="post-summary-note"
          className={`${FIELD_CONTROL_CLASS} resize-none`}
        />
        <p id="post-summary-note" className={`text-caption ${summaryOver ? "text-danger" : "text-ink-faint"}`}>
          {summaryOver ? `摘要不能超过 ${SUMMARY_MAX} 字` : "留空时读者端自动截取正文开头"}
        </p>
      </div>
      <Field label="发布日期">
        <input type="date" value={publishedAt} onChange={(event) => props.onPublishedAtChange(event.target.value)} />
      </Field>
    </aside>
  );
}
