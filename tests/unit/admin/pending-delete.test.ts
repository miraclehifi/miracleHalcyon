import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPendingDelete } from "../../../src/lib/admin/pending-delete";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup() {
  const commit = vi.fn<(item: string) => void>();
  const target = new EventTarget();
  const pending = createPendingDelete({ commit, target });
  return { commit, target, pending };
}

// [SC-DELETE-07][SC-DELETE-08] 列表删除的延迟提交（frontend-unit-tests §15）
describe("createPendingDelete", () => {
  it("[UT-148] 6 秒到期提交", () => {
    const { commit, pending } = setup();
    pending.schedule("B");
    vi.advanceTimersByTime(5999);
    const before = commit.mock.calls.length;
    vi.advanceTimersByTime(1);
    expect({ before, calls: commit.mock.calls }).toEqual({ before: 0, calls: [["B"]] });
  });

  it("[UT-149] 撤销不提交；暂停期间不计时", () => {
    const { commit, pending } = setup();
    pending.schedule("B");
    vi.advanceTimersByTime(3000);
    const undone = pending.undo();
    vi.advanceTimersByTime(20_000);
    const afterUndo = commit.mock.calls.length;

    pending.schedule("B");
    vi.advanceTimersByTime(1000);
    pending.hold(true);
    vi.advanceTimersByTime(10_000);
    const whileHeld = commit.mock.calls.length;
    pending.hold(false);
    vi.advanceTimersByTime(4999);
    const almost = commit.mock.calls.length;
    vi.advanceTimersByTime(1);

    expect({ undone, afterUndo, whileHeld, almost, calls: commit.mock.calls, nothing: pending.undo() }).toEqual({
      undone: "B",
      afterUndo: 0,
      whileHeld: 0,
      almost: 0,
      calls: [["B"]],
      nothing: null,
    });
  });

  it("[UT-150] 再删一条时先提交上一条", () => {
    const { commit, pending } = setup();
    pending.schedule("A");
    vi.advanceTimersByTime(2000);
    pending.schedule("B");
    const atSecond = commit.mock.calls.map(([item]) => item);
    vi.advanceTimersByTime(5999);
    const almost = commit.mock.calls.length;
    vi.advanceTimersByTime(60_000);
    expect({ atSecond, almost, calls: commit.mock.calls.map(([item]) => item) }).toEqual({ atSecond: ["A"], almost: 1, calls: ["A", "B"] });
  });

  it("[UT-151] pagehide 立即提交；dispose 后不再监听", () => {
    const { commit, target, pending } = setup();
    pending.schedule("A");
    target.dispatchEvent(new Event("pagehide"));
    const afterHide = commit.mock.calls.map(([item]) => item);
    pending.schedule("B");
    pending.dispose();
    const afterDispose = commit.mock.calls.map(([item]) => item);
    pending.schedule("C");
    target.dispatchEvent(new Event("pagehide"));
    vi.advanceTimersByTime(60_000);
    expect({ afterHide, afterDispose, calls: commit.mock.calls.map(([item]) => item) }).toEqual({
      afterHide: ["A"],
      afterDispose: ["A", "B"],
      calls: ["A", "B", "C"],
    });
  });
});
