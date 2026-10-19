import { afterEach, describe, expect, it, vi } from "vitest";
import { LIVE_PREF_KEY, readLivePref, writeLivePref } from "../../../src/lib/upload/live-pref";

// UT-162（SC-LIVE-14、SC-LIVE-15）：实况开关存储——键 mh:live-photo，值 '1' / '0'；读写异常按关闭、静默失败
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("live-pref", () => {
  it("无值为 false；写入后读回；值存为 1 / 0", () => {
    const empty = readLivePref();
    writeLivePref(true);
    const on = [readLivePref(), localStorage.getItem(LIVE_PREF_KEY)];
    writeLivePref(false);
    const off = [readLivePref(), localStorage.getItem(LIVE_PREF_KEY)];
    expect({ key: LIVE_PREF_KEY, empty, on, off }).toEqual({ key: "mh:live-photo", empty: false, on: [true, "1"], off: [false, "0"] });
  });

  it("getItem / setItem 抛错：读为 false，写不抛出", () => {
    localStorage.setItem(LIVE_PREF_KEY, "1");
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    expect({ read: readLivePref(), write: (() => (writeLivePref(true), "ok"))() }).toEqual({ read: false, write: "ok" });
  });
});
