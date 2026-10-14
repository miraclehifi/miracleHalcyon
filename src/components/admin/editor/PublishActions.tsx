// PublishActions（admin-post-editor.md"主按钮随状态变化"，editor module-spec §2"发布前"、§4"发布结果"）：顶栏主按钮
// 点击先 flush 自动保存（立即保存并等待），再 POST /publish；请求进行中按钮加载并禁用，防重复提交
// 草稿 → "发布"；已发布 · 有未发布修改 → "发布更新"；已发布且无修改 → "发布更新"置灰。
// UnpublishAction：设置抽屉里的"撤回为草稿"与确认框
import { useId, useState } from "react";
import type { PostView } from "../../../domains/post/service";
import { Button } from "../../ui/Button";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import type { BadgeStatus } from "../../ui/StatusBadge";
import { useToast } from "../../ui/Toast";

export type RequiredField = "title" | "slug" | "body";

export interface PublishActionsProps {
  status: BadgeStatus;
  getPostId(): string | null; // 新建文章首次保存后才有 id
  flush(): Promise<boolean>;
  onPublished(post: PostView): void;
  onMissingFields(fields: RequiredField[]): void;
  onSlugTaken(message: string): void;
}

const FIELD_LABELS: Record<RequiredField, string> = { title: "标题", slug: "slug", body: "正文" };
const ALL_FIELDS: RequiredField[] = ["title", "slug", "body"];
const FAILED = "发布失败，请重试";
const UP_TO_DATE = "没有未发布的修改";

interface ErrorBody {
  error?: { code?: string; message?: string; fields?: RequiredField[] };
}

export function PublishActions({ status, getPostId, flush, onPublished, onMissingFields, onSlugTaken }: PublishActionsProps) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const reasonId = useId();
  const label = status === "draft" ? "发布" : "发布更新";

  const missing = (fields: RequiredField[]) => {
    onMissingFields(fields);
    toast.show({ tone: "error", message: `发布前请填写：${fields.map((field) => FIELD_LABELS[field]).join("、")}` });
  };

  async function publish() {
    if (!(await flush())) {
      toast.show({ tone: "error", message: FAILED }); // slug 冲突等字段错误已由自动保存显示在字段上
      return;
    }
    const id = getPostId();
    if (id === null) return missing(ALL_FIELDS); // 新建且什么都没写：没有可发布的文章
    const response = await fetch(`/api/admin/posts/${id}/publish`, { method: "POST" });
    if (response.ok) {
      onPublished((await response.json()) as PostView);
      toast.show({ tone: "success", message: status === "draft" ? "已发布，几分钟后读者可见" : "已发布更新" });
      return;
    }
    const { error } = ((await response.json().catch(() => ({}))) as ErrorBody) ?? {};
    if (response.status === 422 && error?.fields?.length) return missing(error.fields);
    if (error?.code === "SLUG_TAKEN") return onSlugTaken(error.message ?? "slug 已存在，请换一个");
    toast.show({ tone: "error", message: FAILED });
  }

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await publish();
    } catch {
      toast.show({ tone: "error", message: FAILED }); // 网络失败
    } finally {
      setBusy(false);
    }
  };

  // 已发布且无修改：置灰但保持可聚焦（aria-disabled），说明原因；悬停提示先用 title，Sprint 2 换成 Tooltip（US-10）
  const upToDate = status === "published";
  return (
    <>
      <Button
        icon={busy ? "loader" : undefined}
        disabled={busy}
        aria-busy={busy || undefined}
        aria-disabled={upToDate || undefined}
        aria-describedby={upToDate ? reasonId : undefined}
        title={upToDate ? UP_TO_DATE : undefined}
        onClick={() => void onClick()}
        className="[&_svg]:animate-spin motion-reduce:[&_svg]:animate-none"
      >
        {label}
      </Button>
      <span id={reasonId} hidden>
        {UP_TO_DATE}
      </span>
    </>
  );
}

export interface UnpublishActionProps {
  postId: string;
  onUnpublished(post: PostView): void;
}

// 设置抽屉里的"撤回为草稿"（仅已发布时由页面渲染）：确认框确认后 POST /unpublish；内容保留，读者不可见
export function UnpublishAction({ postId, onUnpublished }: UnpublishActionProps) {
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const unpublish = async () => {
    setConfirming(false);
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/posts/${postId}/unpublish`, { method: "POST" });
      if (!response.ok) throw new Error(String(response.status));
      onUnpublished((await response.json()) as PostView);
      toast.show({ tone: "success", message: "已撤回为草稿" });
    } catch {
      toast.show({ tone: "error", message: "撤回失败，请重试" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="secondary" disabled={busy} aria-busy={busy || undefined} onClick={() => setConfirming(true)}>
        撤回为草稿
      </Button>
      <ConfirmDialog
        open={confirming}
        tone="default"
        icon="undo-2"
        title="撤回为草稿？"
        description="文章将对读者不可见，内容会保留，之后可以重新发布。"
        confirmLabel="撤回为草稿"
        onConfirm={() => void unpublish()}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
