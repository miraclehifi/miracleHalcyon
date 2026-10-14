// PublishActions（admin-post-editor.md"主按钮随状态变化"，editor module-spec §2"发布前"、§4"发布结果"）：顶栏主按钮
// 点击先 flush 自动保存（立即保存并等待），再 POST /publish；请求进行中按钮加载并禁用，防重复提交
// 发布更新的置灰态、撤回由后续任务接入
import { useState } from "react";
import type { PostView } from "../../../domains/post/service";
import { Button } from "../../ui/Button";
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

interface ErrorBody {
  error?: { code?: string; message?: string; fields?: RequiredField[] };
}

export function PublishActions({ status, getPostId, flush, onPublished, onMissingFields, onSlugTaken }: PublishActionsProps) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
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

  return (
    <Button
      icon={busy ? "loader" : undefined}
      disabled={busy}
      aria-busy={busy || undefined}
      onClick={() => void onClick()}
      className="[&_svg]:animate-spin motion-reduce:[&_svg]:animate-none"
    >
      {label}
    </Button>
  );
}
