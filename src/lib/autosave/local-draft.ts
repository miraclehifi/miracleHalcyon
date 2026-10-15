// 本地暂存（editor module-spec §2"本地暂存""恢复判断"）：localStorage['mh:draft:{id|new}'] = { savedAt, content }
// 每次编辑节流 500ms 写入（距上次写入已超过 500ms 时下一轮事件循环就写；内容在写入时才读取——
// 页面调用 edit() 时新状态尚未提交）；服务端保存成功且期间没有再编辑时清除；新建文章创建成功后从 new 迁到 id。
// localStorage 不可用（隐私模式、配额满）时读写都静默失败，自动保存照常
import type { DraftInput } from "../../domains/post/content";

export interface LocalDraft {
  savedAt: string; // ISO
  content: DraftInput;
}

export type RestoreDecision = "promptRestore" | "discard" | "none";

const THROTTLE_MS = 500;

export const draftKey = (postId: string | null) => `mh:draft:${postId ?? "new"}`;

const isDraft = (value: unknown): value is LocalDraft => {
  if (typeof value !== "object" || value === null) return false;
  const { savedAt, content } = value as Partial<LocalDraft>;
  return typeof savedAt === "string" && !Number.isNaN(Date.parse(savedAt)) && typeof content === "object" && content !== null && typeof content.body === "string";
};

export function readLocalDraft(postId: string | null): LocalDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(postId));
    if (raw === null) return null;
    const value: unknown = JSON.parse(raw);
    // F-002 之前的暂存没有 cover：按无封面读出
    return isDraft(value) ? { ...value, content: { ...value.content, cover: value.content.cover ?? null } } : null;
  } catch {
    return null;
  }
}

export function writeLocalDraft(postId: string | null, content: DraftInput, savedAt = new Date().toISOString()) {
  try {
    localStorage.setItem(draftKey(postId), JSON.stringify({ savedAt, content } satisfies LocalDraft));
  } catch {
    // 存不下就不暂存
  }
}

export function clearLocalDraft(postId: string | null) {
  try {
    localStorage.removeItem(draftKey(postId));
  } catch {
    // 同上
  }
}

const FIELDS = ["title", "slug", "tags", "summary", "body", "publishedAt", "cover"] as const satisfies readonly (keyof DraftInput)[];
const sameContent = (a: DraftInput, b: DraftInput) => FIELDS.every((field) => JSON.stringify(a[field] ?? null) === JSON.stringify(b[field] ?? null));
const isBlank = (content: DraftInput) => [content.title, content.slug, content.summary, content.body].every((text) => !text?.trim()) && content.tags.length === 0;

// server 为 null：新建页（没有服务端版本），有非空暂存即提示
export function compareLocalStash(stash: LocalDraft | null, server: { updatedAt: string; content: DraftInput } | null): RestoreDecision {
  if (!stash) return "none";
  if (!server) return isBlank(stash.content) ? "discard" : "promptRestore";
  const newer = Date.parse(stash.savedAt) > Date.parse(server.updatedAt);
  return newer && !sameContent(stash.content, server.content) ? "promptRestore" : "discard";
}

// 自动保存控制器使用的暂存接口
export interface DraftStash {
  save(postId: string | null, getContent: () => DraftInput): void;
  clear(postId: string | null): void;
  move(from: string | null, to: string): void; // 新建文章创建成功：new → id
  flush(): void; // 立即写入节流中的内容
  dispose(): void; // 同 flush（卸载时）
}

export function createLocalDraftStash(): DraftStash {
  let lastWrite = -Infinity;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: { postId: string | null; getContent: () => DraftInput } | null = null;

  const write = () => {
    timer = undefined;
    if (!pending) return;
    writeLocalDraft(pending.postId, pending.getContent());
    lastWrite = Date.now();
    pending = null;
  };
  const cancel = () => {
    clearTimeout(timer);
    timer = undefined;
    pending = null;
  };

  return {
    save(postId, getContent) {
      pending = { postId, getContent };
      if (timer === undefined) timer = setTimeout(write, Math.max(0, lastWrite + THROTTLE_MS - Date.now()));
    },
    clear(postId) {
      cancel();
      clearLocalDraft(postId);
    },
    move(from, to) {
      if (pending?.postId === from) pending.postId = to;
      const draft = readLocalDraft(from);
      clearLocalDraft(from);
      if (draft) writeLocalDraft(to, draft.content, draft.savedAt);
    },
    flush() {
      clearTimeout(timer);
      write();
    },
    dispose() {
      clearTimeout(timer);
      write(); // 卸载时把节流中的最后一次写掉
    },
  };
}
