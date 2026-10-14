// 自动保存状态机（editor module-spec §2）：与框架无关，useAutosave 负责接到 React
//   idle ──编辑──▶ dirty ──2s 无输入──▶ saving ──成功──▶ saved
//   保存中又编辑：完成后立即再保存；网络错误 / 5xx：failed + 退避重试（2s、4s、8s… 上限 60s；online 立即重试）
//   409 / 400 / 401 等客户端错误：failed，不重试（401 的本地暂存与跳转在 Sprint 2）
//   本地暂存（stash，见 local-draft.ts）：每次编辑都写；保存成功且期间没有再编辑时清除；新建创建成功后 new → id
//   disable：删除文章期间暂停（等进行中的保存结束，之后只记录状态不发请求）；删除失败时 enable 恢复并补存
import type { DraftInput } from "../../domains/post/content";
import type { PostView } from "../../domains/post/service";
import type { DraftStash } from "./local-draft";

export type AutosaveStatus = "idle" | "dirty" | "saving" | "saved" | "failed";

export interface SaveError {
  kind: "network" | "server" | "conflict" | "invalid" | "unauthenticated";
  code?: string;
  message?: string;
  fields?: string[];
}

export interface AutosaveState {
  status: AutosaveStatus;
  savedAt: string | null; // 最近一次成功保存的 updatedAt
  error: SaveError | null;
}

export interface AutosaveOptions {
  postId: string | null; // null：新建，首次保存用 POST
  getContent(): DraftInput;
  onChange?(state: AutosaveState): void;
  onCreated?(id: string): void;
  onSaved?(post: PostView): void;
  onError?(error: SaveError): void; // 每次保存失败调用（如 409 时打开设置抽屉）
  fetch?: typeof fetch;
  delayMs?: number;
  stash?: DraftStash;
}

export interface AutosaveController {
  state(): AutosaveState;
  edit(): void;
  flush(): Promise<boolean>; // 立即保存并等待；成功（或无需保存）返回 true
  disable(): Promise<void>; // 停止发请求，等进行中的保存结束
  enable(): void;
  clearStash(): void; // 文章已删除：清除本地暂存并取消节流中的写入
  dispose(): void;
}

export const AUTOSAVE_DELAY_MS = 2000;
const RETRY_BASE_MS = 2000;
const RETRY_MAX_MS = 60_000;

const KIND_BY_STATUS: Record<number, SaveError["kind"]> = { 400: "invalid", 401: "unauthenticated", 409: "conflict", 413: "invalid" };
const isRetryable = (error: SaveError) => error.kind === "network" || error.kind === "server";

async function errorFromResponse(response: Response): Promise<SaveError> {
  const kind = response.status >= 500 ? "server" : (KIND_BY_STATUS[response.status] ?? "invalid");
  try {
    const body = (await response.json()) as { error?: { code?: string; message?: string; fields?: string[] } };
    const { code, message, fields } = body.error ?? {};
    return { kind, ...(code && { code }), ...(message && { message }), ...(fields && { fields }) };
  } catch {
    return { kind };
  }
}

export function createAutosaveController(options: AutosaveOptions): AutosaveController {
  const request = options.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const delayMs = options.delayMs ?? AUTOSAVE_DELAY_MS;
  let postId = options.postId;
  let current: AutosaveState = { status: "idle", savedAt: null, error: null };
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let attempts = 0; // 连续失败次数，决定退避时长
  let inFlight: Promise<boolean> | null = null;
  let editedDuringSave = false;
  let disabled = false;

  const set = (patch: Partial<AutosaveState>) => {
    current = { ...current, ...patch };
    options.onChange?.(current);
  };
  const clearTimers = () => {
    clearTimeout(debounceTimer);
    clearTimeout(retryTimer);
  };

  async function send(): Promise<boolean> {
    const isNew = postId === null;
    const response = await request(isNew ? "/api/admin/posts" : `/api/admin/posts/${postId}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(options.getContent()),
    }).catch((): null => null);
    if (!response) return fail({ kind: "network" });
    if (!response.ok) return fail(await errorFromResponse(response));
    const post = (await response.json()) as PostView;
    if (isNew) {
      postId = post.id;
      options.stash?.move(null, post.id);
      options.onCreated?.(post.id);
    }
    attempts = 0;
    if (!editedDuringSave) options.stash?.clear(postId);
    options.onSaved?.(post);
    set({ status: editedDuringSave ? "dirty" : "saved", savedAt: post.updatedAt, error: null });
    return true;
  }

  function fail(error: SaveError): false {
    set({ status: "failed", error });
    options.onError?.(error);
    if (isRetryable(error)) {
      attempts++;
      retryTimer = setTimeout(save, Math.min(RETRY_BASE_MS * 2 ** (attempts - 1), RETRY_MAX_MS));
    }
    return false;
  }

  function save(): Promise<boolean> {
    if (disabled) return Promise.resolve(false);
    if (inFlight) {
      editedDuringSave = true;
      return inFlight;
    }
    clearTimers();
    editedDuringSave = false;
    set({ status: "saving" });
    inFlight = send().finally(() => {
      inFlight = null;
      if (!editedDuringSave || current.status === "failed") return;
      if (disabled) set({ status: "dirty" }); // 暂停中：只记下有未保存修改，enable 后再存
      else void save(); // 保存中又编辑：立即再保存
    });
    return inFlight;
  }

  const onOnline = () => {
    if (current.status === "failed" && current.error && isRetryable(current.error)) void save();
  };
  if (typeof window !== "undefined") window.addEventListener("online", onOnline);

  return {
    state: () => current,
    edit() {
      options.stash?.save(postId, options.getContent);
      if (inFlight) {
        editedDuringSave = true;
        return;
      }
      clearTimers();
      attempts = 0;
      set({ status: "dirty" });
      if (!disabled) debounceTimer = setTimeout(save, delayMs);
    },
    async flush() {
      if (disabled) return false;
      while (inFlight) await inFlight; // 保存中又编辑时，完成后会接着再存一次，要等到最后一次
      if (current.status === "dirty" || current.status === "failed") return save();
      return true; // idle / saved：没有待保存的内容
    },
    async disable() {
      disabled = true;
      clearTimers();
      while (inFlight) await inFlight.catch(() => false);
    },
    enable() {
      disabled = false;
      if (current.status === "dirty") debounceTimer = setTimeout(save, delayMs);
      else if (current.status === "failed" && current.error && isRetryable(current.error)) void save();
    },
    clearStash() {
      options.stash?.clear(postId);
    },
    dispose() {
      clearTimers();
      options.stash?.dispose();
      if (typeof window !== "undefined") window.removeEventListener("online", onOnline);
    },
  };
}
