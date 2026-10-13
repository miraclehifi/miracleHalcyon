// 错误体约定（domains/_index.md"通用约定"）：{ error: { code, message } }，message 为可直接展示的中文
export function jsonError(status: number, code: string, message: string, headers?: HeadersInit): Response {
  return Response.json({ error: { code, message } }, { status, headers });
}

export const unauthenticated = () => jsonError(401, "UNAUTHENTICATED", "登录已过期，请重新登录");
export const forbiddenOrigin = () => jsonError(403, "FORBIDDEN_ORIGIN", "请求来源不受信任");
export const serverMisconfigured = () => jsonError(500, "SERVER_MISCONFIGURED", "服务器配置缺失，请联系管理员");
