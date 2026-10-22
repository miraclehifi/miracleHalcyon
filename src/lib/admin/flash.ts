// 跨页提示：保存 / 删除后整页跳回列表，列表挂载时取出一次并显示轻提示。sessionStorage 不可用时静默跳过
const KEY = "admin:flash";

export interface Flash {
  tone: "success" | "error";
  message: string;
}

export function setFlash(flash: Flash): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(flash));
  } catch {
    // 隐私模式等：提示丢失可接受
  }
}

export function takeFlash(): Flash | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return raw ? (JSON.parse(raw) as Flash) : null;
  } catch {
    return null;
  }
}
