// 会话 Cookie（auth api-contract）：本地 http 开发环境去掉 Secure
export const SESSION_COOKIE = "mh_session";
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function attributes(url: URL): string {
  return url.protocol === "https:" ? "HttpOnly; Secure; SameSite=Lax; Path=/" : "HttpOnly; SameSite=Lax; Path=/";
}

export function sessionCookie(token: string, url: URL): string {
  return `${SESSION_COOKIE}=${token}; ${attributes(url)}; Max-Age=${MAX_AGE_SECONDS}`;
}
