// 实况照片开关的本地存储（media-upload module-spec §3"实况开关"，admin-post-editor"实况照片开关"）：
// 键 mh:live-photo，值 '1' / '0'，缺省关闭；存储读不到（隐私模式、被禁用）按关闭，写不进静默失败，本次页面内切换照常生效
export const LIVE_PREF_KEY = "mh:live-photo";

export function readLivePref(): boolean {
  try {
    return localStorage.getItem(LIVE_PREF_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeLivePref(enabled: boolean): void {
  try {
    localStorage.setItem(LIVE_PREF_KEY, enabled ? "1" : "0");
  } catch {
    // 写不进：只影响下次打开页面时的默认值
  }
}
