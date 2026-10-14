// 登出（US-02）：POST /api/admin/logout 后跳登录页。接口幂等，401 / 网络失败也照样跳——
// 若会话其实仍有效，登录页会把人送回后台，不会停在半登出状态
import { navigate } from "../dom/navigate";

export const LOGIN_PAGE = "/admin/login";

export async function logout() {
  await fetch("/api/admin/logout", { method: "POST" }).catch(() => null);
  navigate(LOGIN_PAGE);
}
