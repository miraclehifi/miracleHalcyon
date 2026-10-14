// 列表删除的延迟提交（admin-post-list.md"删除与撤销"，feature-architecture US-09）：
// 删除后先进入撤销期，6 秒到期才提交；撤销期内可撤销（不提交）、可暂停计时（提示被悬停或聚焦）；
// 再删一条时先提交上一条；页面卸载（pagehide）时立即提交。同一时间最多一条待删除
export const UNDO_TIMEOUT_MS = 6000;

export interface PendingDelete<T> {
  schedule(item: T): void; // 进入撤销期；已有待删除时先提交它
  undo(): T | null; // 撤销并返回该条；没有待删除时返回 null
  hold(held: boolean): void; // 暂停 / 恢复计时
  flush(): void; // 立即提交待删除的一条
  dispose(): void; // 立即提交并移除 pagehide 监听
}

export interface PendingDeleteOptions<T> {
  commit: (item: T) => void;
  delayMs?: number;
  target?: Pick<Window, "addEventListener" | "removeEventListener">; // 监听 pagehide 的对象，缺省为 window
}

export function createPendingDelete<T>({ commit, delayMs = UNDO_TIMEOUT_MS, target = window }: PendingDeleteOptions<T>): PendingDelete<T> {
  let pending: { item: T; remaining: number; startedAt: number; timer: ReturnType<typeof setTimeout> | undefined } | null = null;

  const start = () => {
    if (!pending) return;
    pending.startedAt = Date.now();
    pending.timer = setTimeout(flush, pending.remaining);
  };
  const stop = () => {
    if (!pending?.timer) return;
    clearTimeout(pending.timer);
    pending.timer = undefined;
    pending.remaining = Math.max(0, pending.remaining - (Date.now() - pending.startedAt));
  };

  function flush() {
    if (!pending) return;
    const { item, timer } = pending;
    clearTimeout(timer);
    pending = null;
    commit(item);
  }

  target.addEventListener("pagehide", flush);

  return {
    schedule(item) {
      flush();
      pending = { item, remaining: delayMs, startedAt: 0, timer: undefined };
      start();
    },
    undo() {
      if (!pending) return null;
      const { item, timer } = pending;
      clearTimeout(timer);
      pending = null;
      return item;
    },
    hold(held) {
      if (held) stop();
      else if (pending && !pending.timer) start();
    },
    flush,
    dispose() {
      target.removeEventListener("pagehide", flush);
      flush();
    },
  };
}
